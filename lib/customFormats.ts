// Dedicated plain-text formats for game-first native authoring. These parsers
// are intentionally separate from the MCQ importer and all return the same
// canonical QuestionBank consumed by the existing PlaySession.

import {
  deriveClozeFromMcq,
  deriveOrderedSequenceFromMcq,
  deriveTermDefinitionPairs,
  deriveWordOnlyTermsFromMcq,
} from "./importPipeline";
import {
  ClozeQuestion,
  OrderedSequenceQuestion,
  QuestionBank,
  SingleTermQuestion,
  TermDefinitionQuestion,
} from "./schema";

let idCounter = 0;
function makeId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

export interface CustomParseResult {
  bank: QuestionBank;
  warnings: string[];
}

export type NativeFormatId =
  | "term-definition"
  | "word-clue"
  | "ordered-sequence"
  | "cloze"
  | "spell-the-word"
  | "group-sort";

export interface NativeFormatSpec {
  id: NativeFormatId;
  label: string;
  instructions: string;
  example: string;
}

const NATIVE_FORMATS: Record<NativeFormatId, NativeFormatSpec> = {
  "term-definition": {
    id: "term-definition",
    label: "Term and definition",
    instructions:
      "Write one pair per line as Term: Definition or Term | Definition. Add at least two pairs.",
    example: `Photosynthesis: The process plants use sunlight to make glucose
Mitochondrion | The cell organelle that releases energy through cellular respiration
Chlorophyll: The green pigment that absorbs light energy`,
  },
  "word-clue": {
    id: "word-clue",
    label: "Word and clue",
    instructions:
      "Write one entry per line as WORD: clue. Use a single word of 2–15 letters; avoid spaces, numbers, and symbols so it fits word grids.",
    example: `MITOSIS: The process by which one cell divides into two identical cells
ENZYME: A protein that speeds up a chemical reaction
NUCLEUS: The organelle that contains most of a cell's DNA`,
  },
  "ordered-sequence": {
    id: "ordered-sequence",
    label: "Ordered list",
    instructions:
      "Write a title line, then number the items in the correct order. Leave a blank line between separate rounds.",
    example: `Steps in the water cycle
1. Evaporation
2. Condensation
3. Precipitation
4. Collection

Order of operations
1. Parentheses
2. Exponents
3. Multiplication and Division
4. Addition and Subtraction`,
  },
  cloze: {
    id: "cloze",
    label: "Sentence blank and answer",
    instructions:
      'Write one sentence with exactly one ___ blank, followed by an "Answer:" line. Leave a blank line between sentences.',
    example: `Plants make food through the process called ___.
Answer: photosynthesis

Water boils at ___ degrees Celsius at sea level.
Answer: 100`,
  },
  "spell-the-word": {
    id: "spell-the-word",
    label: "Sentence blank and answer",
    instructions:
      'Write one sentence with exactly one ___ blank, followed by an "Answer:" line. Spell the answer as a term or short phrase; leave a blank line between items.',
    example: `The cell's control center that contains most of its DNA is the ___.
Answer: nucleus

The process by which plants use light to make food is ___.
Answer: photosynthesis`,
  },
  "group-sort": {
    id: "group-sort",
    label: "Category and items",
    instructions:
      'Write "Category: <name>", then one item per line until the next category. Include at least two categories with items.',
    example: `Category: Mammals
Dog
Cat
Whale

Category: Reptiles
Snake
Lizard
Turtle`,
  },
};

/** Native content is mapped per game, since some games adapt one text format
 * to a different canonical question type (for example, Anagram uses ordered
 * letter tiles rather than single-term questions). */
const NATIVE_FORMAT_BY_TEMPLATE: Record<string, NativeFormatId> = {
  "flash-cards": "term-definition",
  "matching-pairs": "term-definition",
  "match-up": "term-definition",
  "balloon-pop": "term-definition",
  "group-sort": "group-sort",
  unjumble: "ordered-sequence",
  "word-magnets": "ordered-sequence",
  "rank-order": "ordered-sequence",
  anagram: "word-clue",
  hangman: "word-clue",
  wordsearch: "word-clue",
  crossword: "word-clue",
  "complete-the-sentence": "cloze",
  "spell-the-word": "spell-the-word",
};

export function getNativeFormatForTemplate(templateId: string): NativeFormatSpec | undefined {
  const formatId = NATIVE_FORMAT_BY_TEMPLATE[templateId];
  return formatId ? NATIVE_FORMATS[formatId] : undefined;
}

/** Parse game-first native text and adapt it to the exact bank shape the
 * selected game already consumes. */
export function parseNativeContentForTemplate(
  templateId: string,
  raw: string,
  title: string
): CustomParseResult {
  const formatId = NATIVE_FORMAT_BY_TEMPLATE[templateId];
  if (!formatId) throw new Error("This game does not have a native content format yet.");

  if (templateId === "anagram") return parseAnagramWordCluesText(raw, title);
  if (templateId === "spell-the-word") return parseSpellTheWordText(raw, title);

  switch (formatId) {
    case "term-definition":
      return parseTermDefinitionText(raw, title);
    case "word-clue":
      return parseCrosswordCluesText(raw, title);
    case "ordered-sequence":
      return parseRankOrderText(raw, title);
    case "cloze":
      return parseClozeText(raw, title);
    case "group-sort":
      return parseGroupSortText(raw, title);
    case "spell-the-word":
      return parseSpellTheWordText(raw, title);
  }
}

/** Best-effort editable prefill for a native template from an existing bank.
 * Uses the established MCQ derivation helpers only to prepare text; it does
 * not modify or replace the MCQ import/conversion path. */
export function prefillNativeContentForTemplate(
  templateId: string,
  sourceBank: QuestionBank
): string | null {
  const formatId = NATIVE_FORMAT_BY_TEMPLATE[templateId];
  if (!formatId) return null;

  if (formatId === "term-definition") {
    const nativePairs = sourceBank.questions.filter(
      (q): q is TermDefinitionQuestion => q.type === "term-definition"
    );
    const pairs = nativePairs.length
      ? nativePairs
      : deriveTermDefinitionPairs(sourceBank).questions.filter(
          (q): q is TermDefinitionQuestion => q.type === "term-definition"
        );
    return pairs.length ? pairs.map((q) => `${q.term}: ${q.definition}`).join("\n") : null;
  }

  if (formatId === "word-clue") {
    const nativeTerms = sourceBank.questions.filter(
      (q): q is SingleTermQuestion => q.type === "single-term" && /^[A-Za-z]{2,15}$/.test(q.term)
    );
    const terms = nativeTerms.length
      ? nativeTerms
      : deriveWordOnlyTermsFromMcq(sourceBank).questions.filter(
          (q): q is SingleTermQuestion => q.type === "single-term"
        );
    return terms.length
      ? terms.map((q) => `${q.term.toUpperCase()}: ${q.clue ?? "Add a short clue"}`).join("\n")
      : null;
  }

  if (formatId === "ordered-sequence") {
    const nativeSequences = sourceBank.questions.filter(
      (q): q is OrderedSequenceQuestion => q.type === "ordered-sequence"
    );
    const sequences = nativeSequences.length
      ? nativeSequences
      : deriveOrderedSequenceFromMcq(sourceBank).questions.filter(
          (q): q is OrderedSequenceQuestion => q.type === "ordered-sequence"
        );
    return sequences.length
      ? sequences
          .map((q) => `${q.prompt || "Put these in the correct order"}\n${q.items.map((item, i) => `${i + 1}. ${item}`).join("\n")}`)
          .join("\n\n")
      : null;
  }

  if (formatId === "cloze" || formatId === "spell-the-word") {
    const nativeCloze = sourceBank.questions.filter(
      (q): q is ClozeQuestion => q.type === "cloze" && q.blanks.length === 1
    );
    const clozeItems = nativeCloze.length
      ? nativeCloze
      : deriveClozeFromMcq(sourceBank).questions.filter(
          (q): q is ClozeQuestion => q.type === "cloze" && q.blanks.length === 1
        );
    return clozeItems.length
      ? clozeItems.map((q) => `${q.text}\nAnswer: ${q.blanks[0]}`).join("\n\n")
      : null;
  }

  if (formatId === "group-sort") {
    const itemsByCategory = new Map<string, string[]>();
    for (const question of sourceBank.questions) {
      const category = question.category?.trim();
      if (!category) continue;
      let item: string | undefined;
      if (question.type === "mcq") item = question.choices[question.correctIndex];
      else if (question.type === "single-term") item = question.term;
      else if (question.type === "term-definition") item = question.term;
      if (!item?.trim()) continue;
      const items = itemsByCategory.get(category) ?? [];
      items.push(item.trim());
      itemsByCategory.set(category, items);
    }
    return itemsByCategory.size >= 2
      ? [...itemsByCategory.entries()]
          .map(([category, items]) => `Category: ${category}\n${items.join("\n")}`)
          .join("\n\n")
      : null;
  }

  return null;
}

/** Term: Definition (or Term | Definition), one pair per line. */
export function parseTermDefinitionText(raw: string, title = "Term and Definition"): CustomParseResult {
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const warnings: string[] = [];
  const questions: TermDefinitionQuestion[] = [];

  for (const line of lines) {
    const separators = [line.indexOf(":"), line.indexOf("|")].filter((index) => index > 0).sort((a, b) => a - b);
    const separatorIndex = separators[0];
    if (separatorIndex === undefined) {
      warnings.push(`Skipped "${line}" — expected Term: Definition or Term | Definition.`);
      continue;
    }
    const term = line.slice(0, separatorIndex).trim();
    const definition = line.slice(separatorIndex + 1).trim();
    if (!term || !definition) {
      warnings.push(`Skipped "${line}" — both the term and definition are required.`);
      continue;
    }
    questions.push({
      id: makeId("pair"),
      type: "term-definition",
      number: questions.length + 1,
      term,
      definition,
    });
  }

  if (questions.length < 2) {
    throw new Error(
      "Add at least two term-definition pairs. Expected one pair per line, for example:\n\nPhotosynthesis: The process plants use sunlight to make glucose\nMitochondrion | The cell organelle that releases energy"
    );
  }

  return {
    bank: { id: makeId("bank"), title, source: "manual", createdAt: new Date().toISOString(), questions },
    warnings,
  };
}

/** Rank Order / Unjumble / Word Magnets format — a title line, then numbered
 * items in the correct order. Blank line separates multiple rounds. */
export function parseRankOrderText(raw: string, title = "Rank Order"): CustomParseResult {
  const blocks = raw.trim().split(/\n\s*\n/).filter((b) => b.trim());
  const warnings: string[] = [];
  const itemLineRe = /^\d+[.)]\s*(.+)$/;
  const questions: OrderedSequenceQuestion[] = [];

  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    const titleLine = itemLineRe.test(lines[0]) ? null : lines[0];
    const itemLines = titleLine ? lines.slice(1) : lines;
    const items = itemLines
      .map((l) => {
        const m = l.match(itemLineRe);
        return m ? m[1].trim() : null;
      })
      .filter((x): x is string => x !== null);

    if (items.length < 2) {
      warnings.push(`Skipped a block${titleLine ? ` ("${titleLine}")` : ""} — needs at least 2 numbered items in order.`);
      continue;
    }

    questions.push({
      id: makeId("rank"),
      type: "ordered-sequence",
      number: questions.length + 1,
      prompt: titleLine ?? "Put these in the correct order",
      items,
    });
  }

  if (questions.length === 0) {
    throw new Error(
      "Couldn't find any ranking sets. Expected a format like:\n\nSteps in the water cycle\n1. Evaporation\n2. Condensation\n3. Precipitation"
    );
  }

  return {
    bank: { id: makeId("bank"), title, source: "manual", createdAt: new Date().toISOString(), questions },
    warnings,
  };
}

/** Complete the Sentence format — a sentence with a blank marked ___, then
 * an "Answer:" line. Blank line separates multiple sentences. */
export function parseClozeText(raw: string, title = "Complete the Sentence"): CustomParseResult {
  const blocks = raw.trim().split(/\n\s*\n/).filter((b) => b.trim());
  const warnings: string[] = [];
  const answerLineRe = /^answer:\s*(.+)$/i;
  const questions: ClozeQuestion[] = [];

  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    const sentenceLine = lines.find((l) => l.includes("___"));
    const answerLine = lines.find((l) => answerLineRe.test(l));

    if (!sentenceLine) {
      warnings.push("Skipped a block — no sentence with a ___ blank found.");
      continue;
    }
    if (!answerLine) {
      warnings.push(`Skipped "${sentenceLine}" — no "Answer:" line found.`);
      continue;
    }
    const answer = answerLine.match(answerLineRe)![1].trim();
    const blankCount = (sentenceLine.match(/___/g) ?? []).length;
    if (blankCount !== 1) {
      warnings.push(`Skipped "${sentenceLine}" — needs exactly one ___ blank (found ${blankCount}).`);
      continue;
    }
    if (!answer) {
      warnings.push(`Skipped "${sentenceLine}" — the answer is empty.`);
      continue;
    }

    questions.push({
      id: makeId("cloze"),
      type: "cloze",
      number: questions.length + 1,
      text: sentenceLine,
      blanks: [answer],
    });
  }

  if (questions.length === 0) {
    throw new Error(
      'Couldn\'t find any complete sentences. Expected a format like:\n\nThe mitochondria is the ___ of the cell.\nAnswer: powerhouse'
    );
  }

  return {
    bank: { id: makeId("bank"), title, source: "manual", createdAt: new Date().toISOString(), questions },
    warnings,
  };
}

/** WORD: clue; shared by Hangman, Anagram, Word Search, and Crossword.
 * Grid-safe terms are 2–15 letters. */
export function parseCrosswordCluesText(raw: string, title = "Crossword"): CustomParseResult {
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const warnings: string[] = [];
  const lineRe = /^([A-Za-z]+)\s*:\s*(.+)$/;
  const questions: SingleTermQuestion[] = [];

  for (const line of lines) {
    const m = line.match(lineRe);
    if (!m) {
      warnings.push(`Skipped "${line}" — expected format is WORD: clue.`);
      continue;
    }
    const [, word, clue] = m;
    if (word.length < 2 || word.length > 15) {
      warnings.push(`Skipped "${word}" — words should be 2–15 letters for a readable grid.`);
      continue;
    }
    questions.push({
      id: makeId("cw"),
      type: "single-term",
      number: questions.length + 1,
      term: word.toUpperCase(),
      clue: clue.trim(),
    });
  }

  if (questions.length === 0) {
    throw new Error(
      "Couldn't find any word: clue pairs. Expected a format like:\n\nMITOSIS: The process of cell division\nENZYME: A protein that speeds up reactions"
    );
  }

  return {
    bank: { id: makeId("bank"), title, source: "manual", createdAt: new Date().toISOString(), questions },
    warnings,
  };
}

/** Anagram uses the same editable WORD: clue authoring format, adapted to
 * ordered letter tiles for the existing ReorderGame engine. */
export function parseAnagramWordCluesText(raw: string, title = "Anagram"): CustomParseResult {
  const parsed = parseCrosswordCluesText(raw, title);
  const questions: OrderedSequenceQuestion[] = parsed.bank.questions
    .filter((q): q is SingleTermQuestion => q.type === "single-term")
    .map((q) => ({
      id: q.id,
      type: "ordered-sequence",
      number: q.number,
      category: q.category,
      difficulty: q.difficulty,
      prompt: q.clue ?? "Unscramble the word",
      items: Array.from(q.term.toUpperCase()),
    }));
  return { ...parsed, bank: { ...parsed.bank, questions } };
}

/** Spell the Word shares the sentence-and-answer editor, but its existing
 * game consumes single-term questions rather than cloze questions. */
export function parseSpellTheWordText(raw: string, title = "Spell the Word"): CustomParseResult {
  const parsed = parseClozeText(raw, title);
  const questions: SingleTermQuestion[] = parsed.bank.questions
    .filter((q): q is ClozeQuestion => q.type === "cloze")
    .map((q) => ({
      id: q.id,
      type: "single-term",
      number: q.number,
      category: q.category,
      difficulty: q.difficulty,
      term: q.blanks[0],
      clue: q.text.replace("___", "____"),
    }));
  return { ...parsed, bank: { ...parsed.bank, questions } };
}

/** Group Sort format — category header followed by one item per line until
 * the next category or end of input. */
export function parseGroupSortText(raw: string, title = "Group Sort"): CustomParseResult {
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const warnings: string[] = [];
  const categoryLineRe = /^category:\s*(.+)$/i;
  const questions: SingleTermQuestion[] = [];
  let currentCategory: string | null = null;

  for (const line of lines) {
    const catMatch = line.match(categoryLineRe);
    if (catMatch) {
      currentCategory = catMatch[1].trim();
      if (!currentCategory) warnings.push("Skipped an empty category name.");
      continue;
    }
    if (!currentCategory) {
      warnings.push(`Skipped "${line}" — appears before any "Category:" line.`);
      continue;
    }
    questions.push({
      id: makeId("gs"),
      type: "single-term",
      number: questions.length + 1,
      term: line,
      category: currentCategory,
    });
  }

  const distinctCategories = new Set(questions.map((q) => q.category));
  if (distinctCategories.size < 2) {
    throw new Error(
      'Need at least 2 categories with items. Expected a format like:\n\nCategory: Mammals\nDog\nCat\n\nCategory: Reptiles\nSnake\nLizard'
    );
  }

  return {
    bank: { id: makeId("bank"), title, source: "manual", createdAt: new Date().toISOString(), questions },
    warnings,
  };
}
