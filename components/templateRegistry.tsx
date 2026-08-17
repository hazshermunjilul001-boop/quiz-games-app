import { ComponentType } from "react";
import { QuestionBank, QuestionType } from "@/lib/schema";
import { deriveTermDefinitionPairs, deriveOrderedSequenceFromMcq, deriveSingleTermFromMcq, deriveLetterSequenceFromMcq, deriveClozeFromMcq, deriveWordOnlyTermsFromMcq } from "@/lib/importPipeline";
import QuizGame from "@/components/games/QuizGame";
import TrueFalseGame from "@/components/games/TrueFalseGame";
import FlashCards from "@/components/games/FlashCards";
import OpenTheBox from "@/components/games/OpenTheBox";
import SpinWheel from "@/components/games/SpinWheel";
import MatchingPairs from "@/components/games/MatchingPairs";
import MatchUp from "@/components/games/MatchUp";
import GroupSort from "@/components/games/GroupSort";
import Unjumble from "@/components/games/Unjumble";
import WordMagnets from "@/components/games/WordMagnets";
import RankOrder from "@/components/games/RankOrder";
import BalloonPop from "@/components/games/BalloonPop";
import WhackAMole from "@/components/games/WhackAMole";
import FlyingFruit from "@/components/games/FlyingFruit";
import Airplane from "@/components/games/Airplane";
import MazeChase from "@/components/games/MazeChase";
import Anagram from "@/components/games/Anagram";
import SpellTheWord from "@/components/games/SpellTheWord";
import Hangman from "@/components/games/Hangman";
import WordSearch from "@/components/games/WordSearch";
import Crossword from "@/components/games/Crossword";
import CompleteTheSentence from "@/components/games/CompleteTheSentence";

export interface GameProps {
  bank: QuestionBank;
  onExit: () => void;
}

export type TemplateCategory = "review" | "word" | "action";

export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategory, string> = {
  review: "Review games",
  word: "Word games",
  action: "Action games",
};

export interface TemplateDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  /** Which section this template appears under on the Welcome page. */
  category: TemplateCategory;
  /** Shown to teachers before/while choosing a template — what kind of
   * source questions actually work well for this game. */
  teacherTip: string;
  /** Question type this template needs. Undefined = works with any type.
   * Ignored if a custom isAvailable/getBank pair is provided instead. */
  requiredType?: QuestionType;
  /** Custom availability check, for templates whose requirement isn't just
   * "has this question type" (e.g. Group Sort needs 2+ distinct categories). */
  isAvailable?: (bank: QuestionBank) => boolean;
  /** Custom bank transform, for templates that need a derived/reshaped bank
   * beyond the standard term-definition derivation. */
  getBank?: (bank: QuestionBank) => QuestionBank;
  component: ComponentType<GameProps>;
}

/** Word Search and Crossword both need genuine single words (no spaces) —
 * see deriveWordOnlyTermsFromMcq for why. This combines any natively-typed
 * single-term questions that happen to already be word-only with the
 * stricter MCQ derivation, so both paths get the same safety filter. */
function getWordOnlyBank(bank: QuestionBank): QuestionBank {
  const nativeWordOnly = bank.questions.filter(
    (q): q is import("@/lib/schema").SingleTermQuestion => q.type === "single-term" && /^[A-Za-z]+$/.test(q.term)
  );
  if (nativeWordOnly.length > 0) {
    return { ...bank, questions: nativeWordOnly };
  }
  return deriveWordOnlyTermsFromMcq(bank);
}

export const TEMPLATES: TemplateDef[] = [
  {
    id: "quiz",
    category: "review",
    icon: "🎯",
    name: "Quiz",
    description: "A series of multiple choice questions. Tap the correct answer to proceed.",
    teacherTip: "Works with any multiple-choice test, no special formatting needed.",
    requiredType: "mcq",
    component: QuizGame,
  },
  {
    id: "true-false",
    category: "review",
    icon: "⚖️",
    name: "True or False",
    description: "Decide whether each statement is true or false.",
    teacherTip: "Best with clear factual questions that have one definitively correct answer — avoid opinion-based items.",
    requiredType: "mcq",
    component: TrueFalseGame,
  },
  {
    id: "flash-cards",
    category: "review",
    icon: "🗂️",
    name: "Flash Cards",
    description: "Test yourself using cards with prompts on the front and answers on the back.",
    teacherTip: "Works best when the correct answer is a short term or name, since the question becomes the 'back' of the card.",
    requiredType: "term-definition",
    component: FlashCards,
  },
  {
    id: "open-the-box",
    category: "review",
    icon: "📦",
    name: "Open the Box",
    description: "Tap each box in turn to open them up and reveal the item inside.",
    teacherTip: "Works with any question type — good for a quick vocabulary reveal or warm-up review.",
    component: OpenTheBox,
  },
  {
    id: "spin-the-wheel",
    category: "review",
    icon: "🎡",
    name: "Spin the Wheel",
    description: "Spin the wheel to see which item comes up next.",
    teacherTip: "Works with any question type — handy for randomly picking which item a student answers next.",
    component: SpinWheel,
  },
  {
    id: "matching-pairs",
    category: "review",
    icon: "🧩",
    name: "Matching Pairs",
    description: "Tap a pair of tiles at a time to reveal if they are a match.",
    teacherTip: "Best with short factual questions — the correct answer becomes one tile, the question becomes its pair.",
    requiredType: "term-definition",
    component: MatchingPairs,
  },
  {
    id: "match-up",
    category: "review",
    icon: "🔗",
    name: "Match Up",
    description: "Tap each keyword next to its definition.",
    teacherTip: "Best with short factual questions, same pairing logic as Matching Pairs.",
    requiredType: "term-definition",
    component: MatchUp,
  },
  {
    id: "group-sort",
    category: "review",
    icon: "🗃️",
    name: "Group Sort",
    description: "Sort each item into its correct group.",
    teacherTip: "Needs category tags to sort by — automatically uses Bloom's Taxonomy level tags like [Remembering] or [Applying] if your test has them (TOS AI Generator adds these automatically).",
    isAvailable: (bank) => {
      const categories = new Set(bank.questions.filter((q) => q.category).map((q) => q.category));
      return categories.size >= 2;
    },
    component: GroupSort,
  },
  {
    id: "unjumble",
    category: "word",
    icon: "🔀",
    name: "Unjumble",
    description: "Tap the words in the correct order to rebuild the answer.",
    teacherTip: "Needs correct answers that are short phrases (2–4 words) — single-word answers won't have anything to unscramble.",
    isAvailable: (bank) => deriveOrderedSequenceFromMcq(bank).questions.length > 0 || bank.questions.some((q) => q.type === "ordered-sequence"),
    getBank: (bank) =>
      bank.questions.some((q) => q.type === "ordered-sequence") ? bank : deriveOrderedSequenceFromMcq(bank),
    component: Unjumble,
  },
  {
    id: "word-magnets",
    category: "word",
    icon: "🧲",
    name: "Word Magnets",
    description: "Drag and drop the words to arrange into sentences.",
    teacherTip: "Needs correct answers that are short phrases (2–4 words), same requirement as Unjumble.",
    isAvailable: (bank) => deriveOrderedSequenceFromMcq(bank).questions.length > 0 || bank.questions.some((q) => q.type === "ordered-sequence"),
    getBank: (bank) =>
      bank.questions.some((q) => q.type === "ordered-sequence") ? bank : deriveOrderedSequenceFromMcq(bank),
    component: WordMagnets,
  },
  {
    id: "rank-order",
    category: "review",
    icon: "📶",
    name: "Rank Order",
    description: "Tap the items into their correct order.",
    teacherTip: "Needs manually-authored sequence data (like steps in a process) — not auto-generated from typical multiple-choice questions yet.",
    requiredType: "ordered-sequence",
    component: RankOrder,
  },
  {
    id: "balloon-pop",
    category: "review",
    icon: "🎈",
    name: "Balloon Pop",
    description: "Pop the balloons to drop each keyword onto its matching definition.",
    teacherTip: "Best with short factual questions — the correct answer becomes the keyword to pop.",
    requiredType: "term-definition",
    component: BalloonPop,
  },
  {
    id: "whack-a-mole",
    category: "action",
    icon: "🔨",
    name: "Whack-a-Mole",
    description: "Moles appear one at a time, hit only the correct ones to win.",
    teacherTip: "Works with any multiple-choice test.",
    requiredType: "mcq",
    component: WhackAMole,
  },
  {
    id: "flying-fruit",
    category: "action",
    icon: "🍎",
    name: "Flying Fruit",
    description: "Answers move across the screen. Tap the correct answer when you see it.",
    teacherTip: "Works with any multiple-choice test — best with shorter answer choices that are easy to read while moving.",
    requiredType: "mcq",
    component: FlyingFruit,
  },
  {
    id: "airplane",
    category: "action",
    icon: "✈️",
    name: "Airplane",
    description: "Tap into the correct answers and avoid the wrong ones.",
    teacherTip: "Works with any multiple-choice test — best with shorter answer choices that are easy to read while moving.",
    requiredType: "mcq",
    component: Airplane,
  },
  {
    id: "maze-chase",
    category: "action",
    icon: "🏃",
    name: "Maze Chase",
    description: "Run to the correct answer zone, whilst avoiding enemies.",
    teacherTip: "Works with any multiple-choice test.",
    requiredType: "mcq",
    component: MazeChase,
  },
  {
    id: "anagram",
    category: "word",
    icon: "🔤",
    name: "Anagram",
    description: "Drag the letters into their correct positions to unscramble the word.",
    teacherTip: "Needs a correct answer that's a single word — a vocabulary term or name works best. Phrases won't qualify.",
    isAvailable: (bank) => deriveLetterSequenceFromMcq(bank).questions.length > 0 || bank.questions.some((q) => q.type === "ordered-sequence"),
    getBank: (bank) => (bank.questions.some((q) => q.type === "ordered-sequence") ? bank : deriveLetterSequenceFromMcq(bank)),
    component: Anagram,
  },
  {
    id: "spell-the-word",
    category: "word",
    icon: "✍️",
    name: "Spell the Answer",
    description: "Type the letters to spell the answer.",
    teacherTip: "Best with questions where the correct answer is a specific term, name, or short phrase.",
    isAvailable: (bank) => deriveSingleTermFromMcq(bank).questions.length > 0 || bank.questions.some((q) => q.type === "single-term"),
    getBank: (bank) => (bank.questions.some((q) => q.type === "single-term") ? bank : deriveSingleTermFromMcq(bank)),
    component: SpellTheWord,
  },
  {
    id: "hangman",
    category: "word",
    icon: "🎩",
    name: "Hangman",
    description: "Try to complete the word by picking the correct letters.",
    teacherTip: "Best with questions where the correct answer is a specific term, name, or short phrase.",
    isAvailable: (bank) => deriveSingleTermFromMcq(bank).questions.length > 0 || bank.questions.some((q) => q.type === "single-term"),
    getBank: (bank) => (bank.questions.some((q) => q.type === "single-term") ? bank : deriveSingleTermFromMcq(bank)),
    component: Hangman,
  },
  {
    id: "wordsearch",
    category: "word",
    icon: "🔍",
    name: "Word Search",
    description: "Words are hidden in a letter grid. Find them as fast as you can.",
    teacherTip: "Needs a correct answer that's a single word — long phrases are automatically excluded to keep the grid readable.",
    isAvailable: (bank) => getWordOnlyBank(bank).questions.length > 0,
    getBank: getWordOnlyBank,
    component: WordSearch,
  },
  {
    id: "crossword",
    category: "word",
    icon: "📝",
    name: "Crossword",
    description: "Use the clues to solve the crossword.",
    teacherTip: "Needs a correct answer that's a single word, same requirement as Word Search.",
    isAvailable: (bank) => getWordOnlyBank(bank).questions.length > 0,
    getBank: getWordOnlyBank,
    component: Crossword,
  },
  {
    id: "complete-the-sentence",
    category: "review",
    icon: "💬",
    name: "Complete the Sentence",
    description: "A cloze activity where you drag words into blanks within a text.",
    teacherTip: "Works with any multiple-choice test — a fill-in-the-blank sentence is generated automatically from each question.",
    isAvailable: (bank) => deriveClozeFromMcq(bank).questions.length > 0 || bank.questions.some((q) => q.type === "cloze"),
    getBank: (bank) => (bank.questions.some((q) => q.type === "cloze") ? bank : deriveClozeFromMcq(bank)),
    component: CompleteTheSentence,
  },
];

/** Can this template be played with this bank — either directly, or via a
 * derivable transform (e.g. Flash Cards can derive term/definition pairs
 * from a plain MCQ bank)? */
export function isTemplateAvailable(bank: QuestionBank, template: TemplateDef): boolean {
  if (bank.questions.length === 0) return false;
  if (template.isAvailable) return template.isAvailable(bank);
  if (!template.requiredType) return true;
  if (bank.questions.some((q) => q.type === template.requiredType)) return true;
  // term-definition is always derivable from an mcq bank
  if (template.requiredType === "term-definition") {
    return bank.questions.some((q) => q.type === "mcq");
  }
  return false;
}

/** Returns the bank a template should actually receive — deriving
 * term-definition or ordered-sequence data on the fly from MCQ if the bank
 * has none of the native type. */
export function getBankForTemplate(bank: QuestionBank, template: TemplateDef): QuestionBank {
  if (template.getBank) return template.getBank(bank);
  if (template.requiredType === "term-definition" && !bank.questions.some((q) => q.type === "term-definition")) {
    return deriveTermDefinitionPairs(bank);
  }
  return bank;
}
