// lib/schema.ts
// The canonical question-bank format. Every game template (Quiz, Matching
// Pairs, Anagram, Wordsearch, ...) renders from THIS shape — templates never
// read raw imported text directly. One import pipeline, many renderers.

export type QuestionType =
  | "mcq" // multiple choice — powers Quiz, True/False (2-choice), Open the Box, Spin the Wheel, Gameshow Quiz, Win or Lose Quiz, Flying Fruit, Whack-a-Mole, Airplane, Balloon Pop, Find the Match
  | "term-definition" // keyword + definition pair — powers Matching Pairs, Match Up, Flash Cards, Speaking Cards, Group Sort (by category), Pair or No Pair
  | "ordered-sequence" // items with a correct order — powers Unjumble, Rank Order, Word Magnets
  | "cloze" // sentence with blank(s) — powers Complete the Sentence, Spell the Word
  | "single-term"; // one word/phrase, no pairing needed — powers Anagram, Hangman, Wordsearch, Crossword, Watch and Memorize

export interface BaseQuestion {
  id: string;
  type: QuestionType;
  /** Optional grouping label, e.g. topic or category — used by Group Sort, Crossword clue sets. */
  category?: string;
  /** Optional — carried over from TOS AI Generator's difficulty rating, unused by most templates. */
  difficulty?: "Easy" | "Medium" | "Hard";
}

export interface McqQuestion extends BaseQuestion {
  type: "mcq";
  prompt: string;
  choices: string[]; // 2-6 choices
  correctIndex: number; // index into choices
}

export interface TermDefinitionQuestion extends BaseQuestion {
  type: "term-definition";
  term: string;
  definition: string;
}

export interface OrderedSequenceQuestion extends BaseQuestion {
  type: "ordered-sequence";
  prompt: string; // e.g. "Put these steps in order" or empty for a sentence to unjumble
  items: string[]; // in CORRECT order; game templates shuffle for play
}

export interface ClozeQuestion extends BaseQuestion {
  type: "cloze";
  /** Sentence with blanks marked as ___ (three underscores) */
  text: string;
  blanks: string[]; // answers for each ___ in order
}

export interface SingleTermQuestion extends BaseQuestion {
  type: "single-term";
  term: string;
  /** Optional clue/definition, used by Crossword and Hangman prompts */
  clue?: string;
}

export type Question =
  | McqQuestion
  | TermDefinitionQuestion
  | OrderedSequenceQuestion
  | ClozeQuestion
  | SingleTermQuestion;

export interface QuestionBank {
  id: string;
  title: string;
  /** Where this bank came from — shown in the UI, useful for debugging imports */
  source: "tos-ai-generator" | "paste" | "docx" | "pdf" | "manual";
  createdAt: string; // ISO timestamp
  questions: Question[];
}

/** Which game templates a given question type can be rendered as. Used to
 * grey out / filter templates in the UI once a bank is imported. */
export const TEMPLATE_COMPATIBILITY: Record<QuestionType, string[]> = {
  mcq: [
    "quiz",
    "true-false",
    "open-the-box",
    "spin-the-wheel",
    "gameshow-quiz",
    "win-or-lose-quiz",
    "flying-fruit",
    "whack-a-mole",
    "airplane",
    "balloon-pop",
    "find-the-match",
  ],
  "term-definition": [
    "matching-pairs",
    "match-up",
    "flash-cards",
    "speaking-cards",
    "group-sort",
    "pair-or-no-pair",
    "labelled-diagram",
  ],
  "ordered-sequence": ["unjumble", "rank-order", "word-magnets"],
  cloze: ["complete-the-sentence", "spell-the-word"],
  "single-term": ["anagram", "hangman", "wordsearch", "crossword", "watch-and-memorize"],
};
