import {
  getNativeFormatForTemplate,
  parseClozeText,
  parseCrosswordCluesText,
  parseGroupSortText,
  parseNativeContentForTemplate,
  parseRankOrderText,
  parseTermDefinitionText,
  prefillNativeContentForTemplate,
} from "../customFormats";
import { QuestionBank } from "../schema";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error("❌ FAIL:", msg);
    process.exitCode = 1;
  } else {
    console.log("✅", msg);
  }
}

// ============ Rank Order ============

const rankText = `
Steps in the water cycle
1. Evaporation
2. Condensation
3. Precipitation
4. Collection

Order of operations
1. Parentheses
2. Exponents
3. Multiplication and Division
4. Addition and Subtraction
`;
const rankResult = parseRankOrderText(rankText);
assert(rankResult.bank.questions.length === 2, "parses 2 rank-order blocks");
assert(
  rankResult.bank.questions[0].type === "ordered-sequence" &&
    rankResult.bank.questions[0].prompt === "Steps in the water cycle" &&
    rankResult.bank.questions[0].items.join(",") === "Evaporation,Condensation,Precipitation,Collection",
  "first block has correct title and items in order"
);
assert(rankResult.warnings.length === 0, "no warnings for well-formed rank order input");

// Missing title (no non-numbered first line) — should still work with a default prompt
const rankNoTitle = parseRankOrderText("1. First\n2. Second\n3. Third");
assert(
  rankNoTitle.bank.questions[0].type === "ordered-sequence" && rankNoTitle.bank.questions[0].items.length === 3,
  "works even without a title line, using a default prompt"
);

// Too few items in a block
const rankTooFew = parseRankOrderText("Bad block\n1. Only one\n\nGood block\n1. A\n2. B\n3. C");
assert(rankTooFew.bank.questions.length === 1, "skips a block with fewer than 2 items");
assert(rankTooFew.warnings.length === 1, "warns about the skipped block");

// Completely invalid input throws
try {
  parseRankOrderText("just some random prose with no numbered list at all");
  assert(false, "should have thrown on input with no valid blocks");
} catch (e: unknown) {
  assert(e instanceof Error && /ranking sets/i.test(e.message), "throws a helpful error when nothing parses");
}

// ============ Complete the Sentence (Cloze) ============

const clozeText = `
The mitochondria is the ___ of the cell.
Answer: powerhouse

Water boils at ___ degrees Celsius at sea level.
Answer: 100
`;
const clozeResult = parseClozeText(clozeText);
assert(clozeResult.bank.questions.length === 2, "parses 2 cloze sentences");
assert(
  clozeResult.bank.questions[0].type === "cloze" &&
    clozeResult.bank.questions[0].text.includes("___") &&
    clozeResult.bank.questions[0].blanks[0] === "powerhouse",
  "first sentence has the blank marker and correct answer"
);
assert(clozeResult.warnings.length === 0, "no warnings for well-formed cloze input");

// Missing Answer: line
const clozeMissingAnswer = parseClozeText("The sky is ___ on a clear day.\n\nGrass is ___ in spring.\nAnswer: green");
assert(clozeMissingAnswer.bank.questions.length === 1, "skips a sentence with no Answer: line");
assert(clozeMissingAnswer.warnings.length === 1, "warns about the sentence missing an answer");

// Two blanks in one sentence — invalid, should skip with warning (paired with a valid one so it doesn't throw)
const clozeTwoBlanks = parseClozeText("___ plus ___ equals four.\nAnswer: two\n\nThe sky is ___ on a clear day.\nAnswer: blue");
assert(clozeTwoBlanks.warnings.some((w) => /exactly one/i.test(w)), "warns when a sentence has more than one blank");
assert(clozeTwoBlanks.bank.questions.length === 1, "the malformed two-blank sentence is excluded, valid one kept");

try {
  parseClozeText("no blanks here at all, just prose");
  assert(false, "should have thrown when no sentence has a blank");
} catch (e: unknown) {
  assert(e instanceof Error && /complete sentences/i.test(e.message), "throws a helpful error when nothing parses");
}

// ============ Crossword clues ============

const crosswordText = `
MITOSIS: The process of cell division
ENZYME: A protein that speeds up reactions
NUCLEUS: Contains the cell's DNA
`;
const cwResult = parseCrosswordCluesText(crosswordText);
assert(cwResult.bank.questions.length === 3, "parses 3 word:clue pairs");
assert(
  cwResult.bank.questions[0].type === "single-term" &&
    cwResult.bank.questions[0].term === "MITOSIS" &&
    cwResult.bank.questions[0].clue?.includes("cell division") === true,
  "first entry has correct word and clue"
);
assert(cwResult.warnings.length === 0, "no warnings for well-formed crossword input");

// Malformed line (no colon)
const cwMalformed = parseCrosswordCluesText("MITOSIS: The process of cell division\nthis line has no colon separator");
assert(cwMalformed.bank.questions.length === 1, "skips a line with no colon separator");
assert(cwMalformed.warnings.length === 1, "warns about the malformed line");

// Word too long
const cwTooLong = parseCrosswordCluesText("SUPERCALIFRAGILISTICEXPIALIDOCIOUS: a nonsense word\nCAT: a small pet");
assert(cwTooLong.bank.questions.length === 1, "skips an oversized word, keeps the valid one");

try {
  parseCrosswordCluesText("nothing valid here");
  assert(false, "should have thrown when no valid pairs found");
} catch (e: unknown) {
  assert(e instanceof Error && /word: clue/i.test(e.message), "throws a helpful error when nothing parses");
}

// ============ Group Sort ============

const groupText = `
Category: Mammals
Dog
Cat
Whale

Category: Reptiles
Snake
Lizard
Turtle
`;
const groupResult = parseGroupSortText(groupText);
assert(groupResult.bank.questions.length === 6, "parses 6 items across 2 categories");
assert(
  groupResult.bank.questions[0].category === "Mammals" && groupResult.bank.questions[0].type === "single-term" && groupResult.bank.questions[0].term === "Dog",
  "first item has correct category and term"
);
assert(groupResult.warnings.length === 0, "no warnings for well-formed group sort input");

// Item before any category header
const groupOrphan = parseGroupSortText("Orphan item\nCategory: Mammals\nDog\nCat\n\nCategory: Reptiles\nSnake\nLizard");
assert(groupOrphan.warnings.length === 1, "warns about an item appearing before any category header");
assert(groupOrphan.bank.questions.length === 4, "orphan item excluded, valid items kept");

// Only one category — should throw (Group Sort needs at least 2 buckets)
try {
  parseGroupSortText("Category: Mammals\nDog\nCat");
  assert(false, "should have thrown with only 1 category");
} catch (e: unknown) {
  assert(e instanceof Error && /at least 2 categories/i.test(e.message), "throws a helpful error when fewer than 2 categories present");
}

// ============ Native term-definition pairs and per-game adapters ============

const pairsResult = parseTermDefinitionText(
  "Photosynthesis: Plants use light to make food\nMitochondrion | The cell organelle that releases energy\nChlorophyll: Green pigment that absorbs light"
);
assert(pairsResult.bank.questions.length === 3, "parses colon and pipe term-definition pairs");
assert(
  pairsResult.bank.questions[0].type === "term-definition" &&
    pairsResult.bank.questions[0].term === "Photosynthesis" &&
    pairsResult.bank.questions[0].definition.includes("light"),
  "term-definition parser produces the native matching question type"
);

const pairWithWarning = parseTermDefinitionText("Photosynthesis: Plants use light\nmalformed row\nChlorophyll: Green pigment");
assert(pairWithWarning.warnings.length === 1, "warns when a term-definition line has no separator");

const spellResult = parseNativeContentForTemplate(
  "spell-the-word",
  "The cell's control center that contains most of its DNA is the ___.\nAnswer: nucleus\n\nPlants make food through the process called ___.\nAnswer: photosynthesis",
  "Spell test"
);
assert(
  spellResult.bank.questions[0].type === "single-term" && spellResult.bank.questions[0].term === "nucleus",
  "Spell the Word sentence-and-answer input adapts to its existing single-term bank"
);
assert(
  spellResult.bank.questions[0].type === "single-term" && spellResult.bank.questions[0].clue?.includes("____") === true,
  "Spell the Word preserves its sentence prompt as a clue"
);

const anagramResult = parseNativeContentForTemplate(
  "anagram",
  "CAT: A common household pet\nDOG: A loyal companion animal",
  "Anagram test"
);
assert(
  anagramResult.bank.questions[0].type === "ordered-sequence" &&
    anagramResult.bank.questions[0].items.join("") === "CAT" &&
    anagramResult.bank.questions[0].prompt.includes("household pet"),
  "Anagram word-and-clue input adapts to ordered letter tiles"
);

assert(getNativeFormatForTemplate("matching-pairs")?.id === "term-definition", "matching games map to term-definition format");
assert(getNativeFormatForTemplate("anagram")?.id === "word-clue", "Anagram reuses the word-and-clue editor");
assert(getNativeFormatForTemplate("quiz") === undefined, "MCQ-only games do not get an unnecessary native format");

const sourceBank: QuestionBank = {
  id: "prefill-source",
  title: "Science Review",
  source: "paste",
  createdAt: new Date().toISOString(),
  questions: [
    {
      id: "mcq-1",
      type: "mcq",
      number: 1,
      prompt: "What process lets plants use light to make food?",
      choices: ["Photosynthesis", "Respiration"],
      correctIndex: 0,
      category: "Plants",
    },
    {
      id: "mcq-2",
      type: "mcq",
      number: 2,
      prompt: "Which organelle contains most of a cell's DNA?",
      choices: ["Nucleus", "Ribosome"],
      correctIndex: 0,
      category: "Cells",
    },
  ],
};
assert(
  prefillNativeContentForTemplate("matching-pairs", sourceBank)?.includes("Photosynthesis: What process") === true,
  "prefills term-definition text from a pure-MCQ bank without replacing the importer"
);
assert(
  prefillNativeContentForTemplate("wordsearch", sourceBank)?.includes("PHOTOSYNTHESIS:") === true,
  "prefills grid-safe word-and-clue text from derivable MCQ answers"
);
assert(
  prefillNativeContentForTemplate("group-sort", sourceBank)?.includes("Category: Plants") === true,
  "prefills Group Sort text when the imported bank already has usable category tags"
);

console.log("\nDone.");
