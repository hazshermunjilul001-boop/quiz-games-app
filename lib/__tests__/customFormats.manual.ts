import { parseRankOrderText, parseClozeText, parseCrosswordCluesText, parseGroupSortText } from "../customFormats";

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
} catch (e: any) {
  assert(/ranking sets/i.test(e.message), "throws a helpful error when nothing parses");
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
} catch (e: any) {
  assert(/complete sentences/i.test(e.message), "throws a helpful error when nothing parses");
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
} catch (e: any) {
  assert(/word: clue/i.test(e.message), "throws a helpful error when nothing parses");
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
} catch (e: any) {
  assert(/at least 2 categories/i.test(e.message), "throws a helpful error when fewer than 2 categories present");
}

console.log("\nDone.");
