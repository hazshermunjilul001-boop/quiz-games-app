// lib/customFormats.ts
// Dedicated plain-text formats for the four games where auto-deriving from
// an MCQ answer is weak or impossible: Rank Order (no derivation exists at
// all), Complete the Sentence (derivation produces a robotic sentence),
// Crossword (derivation reuses the whole question as the clue, which reads
// badly on a grid), and Group Sort (derivation only works if Bloom's-level
// tags happen to be present). These are optional, separate from the main
// MCQ import — a teacher only reaches for one of these when they want a
// specific game to work really well, not as their everyday import path.

import { ClozeQuestion, OrderedSequenceQuestion, QuestionBank, SingleTermQuestion } from "./schema";

let idCounter = 0;
function makeId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

export interface CustomParseResult {
  bank: QuestionBank;
  warnings: string[];
}

/**
 * Rank Order format — a title line, then numbered items in the CORRECT
 * order. Blank line separates multiple rounds.
 *
 *   Steps in the water cycle
 *   1. Evaporation
 *   2. Condensation
 *   3. Precipitation
 *   4. Collection
 *
 *   Order of operations
 *   1. Parentheses
 *   2. Exponents
 *   3. Multiplication and Division
 *   4. Addition and Subtraction
 */
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

/**
 * Complete the Sentence format — a sentence with a blank marked ___, then
 * an "Answer:" line. Blank line separates multiple sentences.
 *
 *   The mitochondria is the ___ of the cell.
 *   Answer: powerhouse
 *
 *   Water boils at ___ degrees Celsius at sea level.
 *   Answer: 100
 */
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
      warnings.push(`Skipped a block — no sentence with a ___ blank found.`);
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

    questions.push({
      id: makeId("cloze"),
      type: "cloze",
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

/**
 * Crossword format — WORD: clue, one per line. Word must be a single word
 * (letters only) since the crossword grid can't place anything else.
 *
 *   MITOSIS: The process of cell division
 *   ENZYME: A protein that speeds up reactions
 *   NUCLEUS: Contains the cell's DNA
 */
export function parseCrosswordCluesText(raw: string, title = "Crossword"): CustomParseResult {
  const lines = raw.trim().split("\n").map((l) => l.trim()).filter(Boolean);
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
    questions.push({ id: makeId("cw"), type: "single-term", term: word.toUpperCase(), clue: clue.trim() });
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

/**
 * Group Sort format — "Category: <name>" header, then one item per line
 * until the next category or end of input.
 *
 *   Category: Mammals
 *   Dog
 *   Cat
 *   Whale
 *
 *   Category: Reptiles
 *   Snake
 *   Lizard
 *   Turtle
 */
export function parseGroupSortText(raw: string, title = "Group Sort"): CustomParseResult {
  const lines = raw.trim().split("\n").map((l) => l.trim()).filter(Boolean);
  const warnings: string[] = [];
  const categoryLineRe = /^category:\s*(.+)$/i;

  const questions: SingleTermQuestion[] = [];
  let currentCategory: string | null = null;

  for (const line of lines) {
    const catMatch = line.match(categoryLineRe);
    if (catMatch) {
      currentCategory = catMatch[1].trim();
      continue;
    }
    if (!currentCategory) {
      warnings.push(`Skipped "${line}" — appears before any "Category:" line.`);
      continue;
    }
    questions.push({ id: makeId("gs"), type: "single-term", term: line, category: currentCategory });
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
