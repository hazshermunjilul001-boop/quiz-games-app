// lib/importPipeline.ts
// Turns raw input (pasted text, uploaded .txt/.docx/.pdf, or JSON) into a
// canonical QuestionBank. This is the ONE place import logic lives — every
// game template downstream trusts the QuestionBank shape and never parses
// raw text itself.

import { McqQuestion, Question, QuestionBank, QuestionType } from "./schema";
import { ExtractedImage } from "./fileParse";

let idCounter = 0;
function makeId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

/** Raw item shape produced internally by TOS AI Generator (app/page.tsx),
 * in case a future "Export to Quiz Games" button sends this directly. */
interface TosGeneratorItem {
  number: number;
  question: string;
  choices: { A: string; B: string; C: string; D: string; [k: string]: string };
  answer: string; // letter, e.g. "B"
  difficulty?: "Easy" | "Medium" | "Hard";
}

export interface ImportResult {
  bank: QuestionBank;
  warnings: string[];
}

export function importFromText(
  raw: string,
  title = "Imported Quiz",
  images: ExtractedImage[] = [],
  source: QuestionBank["source"] = "paste"
): ImportResult {
  const trimmed = raw.trim();

  // 1. Try canonical QuestionBank JSON (this app's own export format)
  const asBank = tryParseAsQuestionBank(trimmed);
  if (asBank) return attachExtractedImages(asBank, images);

  // 2. Try TOS AI Generator's raw JSON item array
  const asTosJson = tryParseAsTosJson(trimmed, title);
  if (asTosJson) return attachExtractedImages(asTosJson.bank, images, asTosJson.warnings);

  // 3. Fall back to parsing printed test text (matches TOS AI Generator's
  //    printed layout: "1. Question [level]" / "A. choice" ... / answer key)
  const parsed = parsePrintedMcqText(trimmed, title, images);
  parsed.bank.source = source;
  return parsed;
}

function attachExtractedImages(
  bank: QuestionBank,
  images: ExtractedImage[],
  existingWarnings: string[] = [],
  questionNumbers?: number[]
): ImportResult {
  if (images.length === 0) return { bank, warnings: existingWarnings };

  const questions = bank.questions.filter((q): q is McqQuestion => q.type === "mcq");
  const questionByNumber = new Map<number, McqQuestion>();
  questionNumbers?.forEach((number, index) => {
    const question = questions[index];
    if (question) questionByNumber.set(number, question);
  });
  const used = new Set<number>();
  const warnings = [...existingWarnings];

  const normalized = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const filenameMatches = (image: ExtractedImage, question: McqQuestion) => {
    if (!image.nameHint) return false;
    const hint = normalized(image.nameHint);
    if (["figure", "image", "diagram", "photo", "picture"].includes(hint)) return false;
    return Boolean(hint) && normalized(question.prompt).includes(hint);
  };

  const setImage = (question: McqQuestion | undefined, image: ExtractedImage, imageIndex: number) => {
    if (!question) return;
    question.imageUrl = image.dataUrl;
    question.imageAlt = image.alt || question.imageAlt || "Question diagram";
    used.add(imageIndex);
  };

  const setChoiceImage = (question: McqQuestion | undefined, image: ExtractedImage, imageIndex: number) => {
    if (!question || image.choiceIndex === undefined || image.choiceIndex < 0) return;
    const choiceImages = [...(question.choiceImages ?? [])];
    const choiceImageAlts = [...(question.choiceImageAlts ?? [])];
    choiceImages[image.choiceIndex] = image.dataUrl;
    choiceImageAlts[image.choiceIndex] = image.alt || choiceImageAlts[image.choiceIndex] || `Diagram for choice ${String.fromCharCode(65 + image.choiceIndex)}`;
    question.choiceImages = choiceImages;
    question.choiceImageAlts = choiceImageAlts;
    used.add(imageIndex);
  };

  // A single Word image may contain four labeled panels (A–D) used as the
  // answer choices for a consecutive group of questions. Give every question
  // the same four choice labels, then attach the matching cropped panel.
  images.forEach((image) => {
    if (!image.choiceGroupQuestions) return;
    image.choiceGroupQuestions.forEach((number) => {
      const question = questionByNumber.get(number);
      if (question && question.choices.length < 2) {
        question.choices = ["Graph A", "Graph B", "Graph C", "Graph D"];
      }
    });
  });

  // Choice diagrams are handled first. Their choice index is carried from the
  // nearest A., B., C. or D. paragraph in the DOCX, and their question number
  // is resolved against the original printed numbering rather than array index.
  images.forEach((image, imageIndex) => {
    if (image.choiceIndex === undefined) return;
    if (image.choiceGroupQuestions) {
      image.choiceGroupQuestions.forEach((number) => {
        setChoiceImage(questionByNumber.get(number), image, imageIndex);
      });
      return;
    }
    const question = image.questionNumber === undefined
      ? undefined
      : questionByNumber.get(image.questionNumber);
    setChoiceImage(question, image, imageIndex);
    if (!used.has(imageIndex)) {
      warnings.push(`Choice diagram ${imageIndex + 1} could not be matched to its question and answer choice.`);
    }
  });

  // 1. Explicit filename/alt mention in the question stem.
  images.forEach((image, imageIndex) => {
    if (image.choiceIndex !== undefined) return;
    const question = questions.find((q) => !q.imageUrl && filenameMatches(image, q));
    if (question) setImage(question, image, imageIndex);
  });

  // 2. Mammoth document-order question-number hints.
  images.forEach((image, imageIndex) => {
    if (used.has(imageIndex) || image.choiceIndex !== undefined || image.questionNumber === undefined) return;
    const numbered = questionByNumber.get(image.questionNumber);
    const question = numbered && !numbered.imageUrl
      ? numbered
      : questions.find(
          (q) => !q.imageUrl && new RegExp(`(?:^|\\D)${image.questionNumber}(?:\\D|$)`).test(q.prompt)
        );
    setImage(question, image, imageIndex);
  });

  // 3. Remaining images attach to the next unillustrated MCQ in order.
  let nextQuestion = 0;
  images.forEach((image, imageIndex) => {
    if (used.has(imageIndex)) return;
    if (image.choiceIndex !== undefined) {
      return;
    }
    while (nextQuestion < questions.length && questions[nextQuestion].imageUrl) nextQuestion++;
    if (nextQuestion < questions.length) {
      setImage(questions[nextQuestion], image, imageIndex);
      nextQuestion++;
    } else {
      warnings.push(`Image ${imageIndex + 1} could not be matched to a multiple-choice question.`);
    }
  });

  return { bank, warnings };
}

function tryParseAsQuestionBank(text: string): QuestionBank | null {
  try {
    const data = JSON.parse(text);
    if (data && Array.isArray(data.questions) && typeof data.title === "string") {
      return data as QuestionBank;
    }
  } catch {
    /* not JSON, or not this shape — fall through */
  }
  return null;
}

function tryParseAsTosJson(text: string, title: string): ImportResult | null {
  try {
    const data = JSON.parse(text);
    const items: TosGeneratorItem[] | null = Array.isArray(data)
      ? data
      : Array.isArray(data?.items)
      ? data.items
      : null;
    if (!items || items.length === 0) return null;
    if (!items[0]?.choices || !items[0]?.answer) return null;

    const warnings: string[] = [];
    const questions: McqQuestion[] = items.map((it, idx) => {
      const letters = Object.keys(it.choices);
      const choices = letters.map((l) => it.choices[l]);
      const correctIndex = letters.indexOf(it.answer.trim().toUpperCase());
      if (correctIndex === -1) {
        warnings.push(`Item ${it.number ?? idx + 1}: couldn't match answer key "${it.answer}" to a choice — defaulted to A.`);
      }
      return {
        id: makeId("q"),
        type: "mcq",
        prompt: it.question,
        choices,
        correctIndex: correctIndex === -1 ? 0 : correctIndex,
        difficulty: it.difficulty,
        category: it.difficulty,
      };
    });

    return {
      bank: {
        id: makeId("bank"),
        title,
        source: "tos-ai-generator",
        createdAt: new Date().toISOString(),
        questions,
      },
      warnings,
    };
  } catch {
    return null;
  }
}

/**
 * Parses plain text formatted like a printed MCQ test:
 *   1. What is the capital of the Philippines? [Remembering]
 *   A. Cebu
 *   B. Manila
 *   C. Davao
 *   D. Baguio
 *   ...
 *   ANSWER KEY
 *   1. B
 *   2. D
 *
 * The answer key section may also arrive as a flattened table — this is what
 * happens when a .docx answer-key TABLE (TOS AI Generator's actual export
 * format) gets extracted by mammoth: each cell lands on its own line
 * ("Item #", "Answer", "1", "A", "2", "B", ...) instead of "1. A" combined.
 * So instead of matching whole lines, we tokenize the answer-key section and
 * pair up (number, letter) tokens in sequence, skipping header/noise words.
 *
 * If no answer key is found at all, correctIndex defaults to 0 and a warning
 * is added so the teacher knows to fix it in the editor.
 */
function parsePrintedMcqText(text: string, title: string, images: ExtractedImage[] = []): ImportResult {
  const warnings: string[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const questionLineRe = /^_*\s*(\d+)[.)]\s+(.*)$/;
  const choiceLineRe = /^([A-F])[.)]\s+(.*)$/;
  const answerKeyHeaderRe = /^answer\s*key/i;
  const ANSWER_KEY_STOPWORDS = new Set(["item", "no", "answer", "key", "#"]);

  type Draft = { number: number; prompt: string; choices: string[]; level?: string };
  const drafts: Draft[] = [];
  const answerKey = new Map<number, string>();
  const answerKeyLines: string[] = [];

  let inAnswerKey = false;
  let current: Draft | null = null;
  let sharedStem: string | undefined;
  let sharedStemNumbers: number[] = [];

  const cleanContinuation = (line: string) =>
    line.startsWith("__TABLE_ROW__") ? line.replace(/^__TABLE_ROW__/, "") : line;

  const appendPromptLine = (line: string) => {
    if (!current) return;
    const value = cleanContinuation(line);
    if (value) current.prompt = current.prompt ? `${current.prompt}\n${value}` : value;
  };

  for (const line of lines) {
    if (answerKeyHeaderRe.test(line)) {
      inAnswerKey = true;
      if (current) drafts.push(current);
      current = null;
      continue;
    }

    if (inAnswerKey) {
      answerKeyLines.push(line);
      continue;
    }

    const qMatch = line.match(questionLineRe);
    if (qMatch) {
      if (current) drafts.push(current);
      const bracketMatch = qMatch[2].match(/\[([A-Za-z\s]+)\]\s*$/);
      const promptRaw = qMatch[2].replace(/\[[A-Za-z\s]+\]\s*$/, "").trim();
      const number = parseInt(qMatch[1], 10);
      const shared = sharedStemNumbers.includes(number) && sharedStem ? `${sharedStem}\n\n` : "";
      current = { number, prompt: `${shared}${promptRaw}`, choices: [], level: bracketMatch?.[1].trim() };
      continue;
    }

    const sharedMatch = line.match(/^(.*?\b(?:questions?|items?)\s+(\d+)\s*(?:and|to|[-–])\s*(\d+)\b.*)$/i);
    if (sharedMatch) {
      sharedStem = sharedMatch[1].trim();
      const start = Number(sharedMatch[2]);
      const end = Number(sharedMatch[3]);
      sharedStemNumbers = Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index);
      continue;
    }

    const cMatch = line.match(choiceLineRe);
    if (cMatch && current) {
      current.choices.push(cMatch[2]);
      continue;
    }

    if (current) {
      if (current.choices.length > 0) {
        const last = current.choices.length - 1;
        current.choices[last] = `${current.choices[last]} ${cleanContinuation(line)}`.trim();
      } else {
        appendPromptLine(line);
      }
    }
  }
  if (current) drafts.push(current);

  // Tokenize the whole answer-key section and pair (number, letter) tokens
  // in order. This is format-agnostic: works for "1. B" on one line, for
  // "1" and "B" on separate lines (flattened docx table cells), and for
  // "1  B  2  D" space-separated on one line.
  answerKeyLines.forEach((line) => {
    const row = line.match(/^__TABLE_ROW__\s*(\d+)\s*\|\s*([A-F])\b/i);
    if (row) answerKey.set(Number(row[1]), row[2].toUpperCase());
  });

  const tokens = answerKeyLines
    .filter((line) => !line.startsWith("__TABLE_ROW__"))
    .join(" ")
    .split(/\s+/)
    .map((t) => t.replace(/[.,:)]+$/, ""))
    .filter((t) => t.length > 0 && !ANSWER_KEY_STOPWORDS.has(t.toLowerCase()));

  let pendingNumber: number | null = null;
  for (const tok of tokens) {
    if (/^\d+$/.test(tok)) {
      pendingNumber = parseInt(tok, 10);
    } else if (/^[A-F]$/i.test(tok) && pendingNumber !== null) {
      answerKey.set(pendingNumber, tok.toUpperCase());
      pendingNumber = null;
    }
    // anything else (stray noise) is ignored rather than breaking the scan
  }

  if (drafts.length === 0) {
    throw new Error(
      "Couldn't find any numbered multiple-choice questions in this text. " +
        "Expected a format like:\n1. Question text\nA. Choice\nB. Choice\n..."
    );
  }

  const letterToIndex = (l: string) => "ABCDEF".indexOf(l);

  const questions: Question[] = drafts.map((d) => {
    const keyLetter = answerKey.get(d.number);
    let correctIndex = keyLetter ? letterToIndex(keyLetter) : -1;
    if (correctIndex === -1) {
      warnings.push(`Question ${d.number}: no answer key entry found — defaulted to choice A. Please fix in the editor.`);
      correctIndex = 0;
    }
    if (d.choices.length < 2) {
      warnings.push(`Question ${d.number}: found fewer than 2 choices — check formatting.`);
    }
    return {
      id: makeId("q"),
      type: "mcq" as QuestionType,
      number: d.number,
      prompt: d.prompt,
      choices: d.choices,
      correctIndex,
      category: d.level,
    } as McqQuestion;
  });

  const result: ImportResult = {
    bank: {
      id: makeId("bank"),
      title,
      source: "paste",
      createdAt: new Date().toISOString(),
      questions,
    },
    warnings,
  };

  return attachExtractedImages(result.bank, images, result.warnings, drafts.map((d) => d.number));
}

/** Derives term-definition pairs from an MCQ bank (prompt -> correct choice),
 * used to unlock Matching Pairs / Flash Cards / Match Up from a plain MCQ import
 * without asking the teacher for extra input. */
export function deriveTermDefinitionPairs(bank: QuestionBank): QuestionBank {
  const derived: Question[] = bank.questions
    .filter((q): q is McqQuestion => q.type === "mcq")
    .map((q) => ({
      id: makeId("td"),
      type: "term-definition",
      term: q.choices[q.correctIndex],
      definition: q.prompt,
      difficulty: q.difficulty,
    }));

  return {
    id: makeId("bank"),
    title: `${bank.title} (Matching)`,
    source: bank.source,
    createdAt: new Date().toISOString(),
    questions: derived,
  };
}

/** Derives ordered-sequence items (for Unjumble / Word Magnets) from an MCQ
 * bank: any question whose correct answer is more than one word becomes a
 * "put the words of the answer back in order" item. Questions whose correct
 * answer is a single word are skipped — there's nothing to reorder. This is
 * a real teacher-meaningful activity (recomposing a definition/phrase), not
 * just word-scramble filler, and it means Unjumble/Word Magnets are usable
 * on a typical MCQ import without asking the teacher to author new content. */
export function deriveOrderedSequenceFromMcq(bank: QuestionBank): QuestionBank {
  const derived: Question[] = bank.questions
    .filter((q): q is McqQuestion => q.type === "mcq")
    .map((q) => {
      const answerText = q.choices[q.correctIndex];
      const words = answerText.trim().split(/\s+/);
      if (words.length < 2) return null;
      return {
        id: makeId("seq"),
        type: "ordered-sequence" as const,
        prompt: q.prompt,
        items: words,
        difficulty: q.difficulty,
        category: q.category,
      };
    })
    .filter((q): q is Exclude<typeof q, null> => q !== null);

  return {
    id: makeId("bank"),
    title: `${bank.title} (Unjumble)`,
    source: bank.source,
    createdAt: new Date().toISOString(),
    questions: derived,
  };
}

/** Derives single-term items (term + clue) from an MCQ bank, for Anagram,
 * Hangman, Word Search, and Crossword — all of which need a plain word or
 * short phrase to work with, not a full multiple-choice question. Only
 * alphabetic answers are kept (numbers/symbols can't be spelled/searched
 * meaningfully); spaces are allowed for Hangman but stripped for grid games. */
export function deriveSingleTermFromMcq(bank: QuestionBank): QuestionBank {
  const derived: Question[] = bank.questions
    .filter((q): q is McqQuestion => q.type === "mcq")
    .map((q) => {
      const answer = q.choices[q.correctIndex].trim();
      if (!/^[A-Za-z ]+$/.test(answer)) return null;
      return {
        id: makeId("term"),
        type: "single-term" as const,
        term: answer,
        clue: q.prompt,
        difficulty: q.difficulty,
        category: q.category,
      };
    })
    .filter((q): q is Exclude<typeof q, null> => q !== null);

  return {
    id: makeId("bank"),
    title: `${bank.title} (Terms)`,
    source: bank.source,
    createdAt: new Date().toISOString(),
    questions: derived,
  };
}

/** Stricter version of deriveSingleTermFromMcq, for Word Search and
 * Crossword specifically. Those two generators strip ALL non-letter
 * characters — including spaces — before placing a word in the grid, so a
 * multi-word answer like "collect data systematically" doesn't become
 * three grid words, it becomes one fused 25-letter word that barely fits
 * anywhere and dominates the grid. Restricting to genuine single words
 * (no spaces) avoids that failure mode entirely, at the cost of dropping
 * phrase-style answers — which is the right tradeoff for a letter grid. */
export function deriveWordOnlyTermsFromMcq(bank: QuestionBank): QuestionBank {
  const MAX_LEN = 15;
  const derived: Question[] = bank.questions
    .filter((q): q is McqQuestion => q.type === "mcq")
    .map((q) => {
      const answer = q.choices[q.correctIndex].trim();
      if (!/^[A-Za-z]+$/.test(answer) || answer.length > MAX_LEN) return null;
      return {
        id: makeId("wterm"),
        type: "single-term" as const,
        term: answer,
        clue: q.prompt,
        difficulty: q.difficulty,
        category: q.category,
      };
    })
    .filter((q): q is Exclude<typeof q, null> => q !== null);

  return {
    id: makeId("bank"),
    title: `${bank.title} (Word Terms)`,
    source: bank.source,
    createdAt: new Date().toISOString(),
    questions: derived,
  };
}

/** Derives per-letter ordered-sequence items from single-word MCQ answers —
 * this is what powers Anagram, by reusing the same ReorderGame engine as
 * Unjumble/Word Magnets but with individual letters as the tiles instead of
 * whole words. Multi-word answers are skipped (nothing sensible to scramble
 * letter-by-letter across a phrase for this template). */
export function deriveLetterSequenceFromMcq(bank: QuestionBank): QuestionBank {
  const derived: Question[] = bank.questions
    .filter((q): q is McqQuestion => q.type === "mcq")
    .map((q) => {
      const answer = q.choices[q.correctIndex].trim();
      if (!/^[A-Za-z]+$/.test(answer)) return null; // single word, letters only
      return {
        id: makeId("anagram"),
        type: "ordered-sequence" as const,
        prompt: q.prompt,
        items: answer.split(""),
        difficulty: q.difficulty,
        category: q.category,
      };
    })
    .filter((q): q is Exclude<typeof q, null> => q !== null);

  return {
    id: makeId("bank"),
    title: `${bank.title} (Anagram)`,
    source: bank.source,
    createdAt: new Date().toISOString(),
    questions: derived,
  };
}

/** Derives a cloze sentence from each MCQ question — used by Complete the
 * Sentence and Spell the Word. TOS AI Generator questions are direct
 * questions ("What is X?"), not fill-in-the-blank sentences, so this
 * generates a mechanical but genuinely testable sentence rather than
 * pretending to detect a blank that isn't there. */
export function deriveClozeFromMcq(bank: QuestionBank): QuestionBank {
  const derived: Question[] = bank.questions
    .filter((q): q is McqQuestion => q.type === "mcq")
    .map((q) => {
      const answer = q.choices[q.correctIndex].trim();
      const cleanPrompt = q.prompt.replace(/\?+$/, "");
      return {
        id: makeId("cloze"),
        type: "cloze" as const,
        text: `The answer to "${cleanPrompt}" is ___.`,
        blanks: [answer],
        difficulty: q.difficulty,
        category: q.category,
      };
    });

  return {
    id: makeId("bank"),
    title: `${bank.title} (Cloze)`,
    source: bank.source,
    createdAt: new Date().toISOString(),
    questions: derived,
  };
}
