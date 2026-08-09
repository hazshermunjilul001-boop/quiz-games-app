import { importFromText, deriveTermDefinitionPairs, deriveOrderedSequenceFromMcq, deriveSingleTermFromMcq, deriveLetterSequenceFromMcq, deriveClozeFromMcq } from "../importPipeline";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error("❌ FAIL:", msg);
    process.exitCode = 1;
  } else {
    console.log("✅", msg);
  }
}

// --- Test 1: printed test text matching TOS AI Generator's exact layout ---
const printedText = `
1. What is the capital of the Philippines? [Remembering]
A. Cebu City
B. Manila
C. Davao City
D. Baguio City

2. Which of the following is a prime number? [Applying]
A. 4
B. 6
C. 7
D. 9

ANSWER KEY
1. B
2. C
`;

const { bank: bank1, warnings: warnings1 } = importFromText(printedText, "Sample Test");
assert(bank1.questions.length === 2, "parses 2 questions from printed text");
assert(bank1.questions[0].type === "mcq", "question type is mcq");
assert(
  bank1.questions[0].type === "mcq" && bank1.questions[0].choices[bank1.questions[0].correctIndex] === "Manila",
  "correct answer resolved to 'Manila' via answer key letter B"
);
assert(
  bank1.questions[1].type === "mcq" && bank1.questions[1].choices[bank1.questions[1].correctIndex] === "7",
  "correct answer resolved to '7' via answer key letter C"
);
assert(warnings1.length === 0, "no warnings when answer key is present and complete");

// --- Test 2: missing answer key should warn, not crash ---
const noKeyText = `
1. What color is the sky? 
A. Red
B. Blue
C. Green
`;
const { bank: bank2, warnings: warnings2 } = importFromText(noKeyText, "No Key Test");
assert(bank2.questions.length === 1, "parses question even without answer key");
assert(warnings2.length === 1, "warns when answer key is missing");

// --- Test 3: TOS AI Generator raw JSON item shape ---
const tosJson = JSON.stringify([
  {
    number: 1,
    question: "What is 2+2?",
    choices: { A: "3", B: "4", C: "5", D: "6" },
    answer: "B",
    difficulty: "Easy",
  },
]);
const { bank: bank3 } = importFromText(tosJson, "TOS JSON Test");
assert(bank3.source === "tos-ai-generator", "detects TOS AI Generator JSON source");
assert(
  bank3.questions[0].type === "mcq" && bank3.questions[0].choices[bank3.questions[0].correctIndex] === "4",
  "resolves correct answer from TOS JSON answer letter"
);

// --- Test 4: canonical QuestionBank round-trip ---
const canonicalJson = JSON.stringify(bank1);
const { bank: bank4 } = importFromText(canonicalJson, "Roundtrip");
assert(bank4.questions.length === bank1.questions.length, "round-trips its own canonical export format");

// --- Test 5: derive term-definition pairs for Matching Pairs / Flash Cards ---
const derived = deriveTermDefinitionPairs(bank1);
assert(derived.questions.length === 2, "derives term-definition pairs from mcq bank");
assert(
  derived.questions[0].type === "term-definition" && derived.questions[0].term === "Manila",
  "derived pair uses correct choice as the term"
);

// --- Test 6: garbage input throws a helpful error instead of silently failing ---
try {
  importFromText("this is not a test at all, just prose.", "Garbage");
  assert(false, "should have thrown on unparseable input");
} catch (e: any) {
  assert(/multiple-choice/i.test(e.message), "throws a helpful error on unparseable input");
}

// --- Test 7: question numbers prefixed with a blank-to-write-on
//     ("______1." instead of "1.") — the format DepEd answer-blank tests use,
//     and the exact shape that used to throw "no questions found". ---
const blankPrefixText = `
______1. What is the capital of the Philippines?
A. Cebu City
B. Manila
C. Davao City
D. Baguio City

______2. Which of the following is a prime number?
A. 4
B. 6
C. 7
D. 9

ANSWER KEY
1. B
2. C
`;
const { bank: bank5, warnings: warnings5 } = importFromText(blankPrefixText, "Blank Prefix Test");
assert(bank5.questions.length === 2, "parses questions with a leading answer-blank before the number");
assert(
  bank5.questions[0].type === "mcq" && bank5.questions[0].choices[bank5.questions[0].correctIndex] === "Manila",
  "resolves correct answer for blank-prefixed question numbering"
);
assert(warnings5.length === 0, "no warnings for a complete blank-prefixed test");

// --- Test 8: answer key as a flattened docx TABLE — the actual shape
//     mammoth produces from TOS AI Generator's real answer-key table
//     (verified directly against a generated .docx): each cell on its own
//     line, header cells interspersed, no "1. B" combined text anywhere. ---
const flattenedTableText = `
1. What is the capital of the Philippines?
A. Cebu City
B. Manila
C. Davao City
D. Baguio City

2. Which of the following is a prime number?
A. 4
B. 6
C. 7
D. 9

ANSWER KEY
Item #

Answer

Item #

Answer

1

B

2

C

`;
const { bank: bank6, warnings: warnings6 } = importFromText(flattenedTableText, "Flattened Table Test");
assert(
  bank6.questions[0].type === "mcq" && bank6.questions[0].choices[bank6.questions[0].correctIndex] === "Manila",
  "resolves answer key from a flattened docx-table extraction (cells on separate lines)"
);
assert(
  bank6.questions[1].type === "mcq" && bank6.questions[1].choices[bank6.questions[1].correctIndex] === "7",
  "resolves second answer from flattened docx-table extraction"
);
assert(warnings6.length === 0, "no warnings when answer key arrives as a flattened table");

// --- Test 9: category captured from bracketed Bloom's level tag ---
const withLevelTags = `
1. What is the capital of the Philippines? [Remembering]
A. Cebu City
B. Manila
C. Davao City
D. Baguio City

ANSWER KEY
1. B
`;
const { bank: bank7 } = importFromText(withLevelTags, "Level Tag Test");
assert(bank7.questions[0].category === "Remembering", "captures bracketed level tag as category instead of discarding it");

// --- Test 10: ordered-sequence derivation from multi-word correct answers ---
const multiWordBank = importFromText(
  `
1. What is the powerhouse of the cell?
A. Nucleus
B. The mitochondria
C. Ribosome
D. Golgi body

2. What is 2+2?
A. 3
B. 4
C. 5
D. 6

ANSWER KEY
1. B
2. B
`,
  "Multi-word Test"
).bank;
const seqBank = deriveOrderedSequenceFromMcq(multiWordBank);
assert(seqBank.questions.length === 1, "skips single-word answers, keeps only multi-word ones for Unjumble");
assert(
  seqBank.questions[0].type === "ordered-sequence" && seqBank.questions[0].items.join(" ") === "The mitochondria",
  "splits the multi-word correct answer into ordered word items"
);

// --- Test 11: single-term derivation for Anagram/Hangman/Word Search/Crossword ---
const termsBank = deriveSingleTermFromMcq(
  importFromText(
    `
1. What is the capital of France?
A. Berlin
B. Madrid
C. Paris
D. Rome

2. What is 5 times 5?
A. 20
B. 25
C. 30
D. 35

ANSWER KEY
1. C
2. B
`,
    "Terms Test"
  ).bank
);
assert(termsBank.questions.length === 1, "keeps only alphabetic answers (skips '25')");
assert(
  termsBank.questions[0].type === "single-term" && termsBank.questions[0].term === "Paris" && (termsBank.questions[0].clue ?? "").includes("capital"),
  "derives term + clue from the mcq question and correct answer"
);

// --- Test 12: letter-sequence derivation for Anagram ---
const letterBank = deriveLetterSequenceFromMcq(
  importFromText(
    `
1. What is the capital of France?
A. Berlin
B. Madrid
C. Paris
D. Rome

2. What is the powerhouse of the cell?
A. Nucleus
B. The mitochondria
C. Ribosome
D. Golgi body

ANSWER KEY
1. C
2. B
`,
    "Letter Test"
  ).bank
);
assert(letterBank.questions.length === 1, "keeps only single-word alphabetic answers for Anagram (skips 'The mitochondria')");
assert(
  letterBank.questions[0].type === "ordered-sequence" && letterBank.questions[0].items.join("") === "Paris",
  "splits single-word answer into individual letter tiles"
);

// --- Test 13: cloze derivation for Complete the Sentence / Spell the Word ---
const clozeBank = deriveClozeFromMcq(
  importFromText(
    `
1. What is the capital of France?
A. Berlin
B. Madrid
C. Paris
D. Rome

ANSWER KEY
1. C
`,
    "Cloze Test"
  ).bank
);
assert(
  clozeBank.questions[0].type === "cloze" &&
    clozeBank.questions[0].text.includes("capital of France") &&
    clozeBank.questions[0].blanks[0] === "Paris",
  "generates a cloze sentence with the correct answer as the blank"
);

// --- Test 14: word-only derivation excludes phrase answers (Word Search / Crossword safety) ---
const { deriveWordOnlyTermsFromMcq } = require("../importPipeline");
const phraseBank = importFromText(
  `
1. What is the capital of France?
A. Berlin
B. Madrid
C. Paris
D. Rome

2. What is the main purpose of a questionnaire in social research?
A. To collect data systematically from a target population.
B. To entertain respondents with interesting questions.
C. To prove a hypothesis without gathering new information.
D. To confuse participants and test their critical thinking.

ANSWER KEY
1. C
2. A
`,
  "Phrase Test"
).bank;
const wordOnlyBank = deriveWordOnlyTermsFromMcq(phraseBank);
assert(wordOnlyBank.questions.length === 1, "drops multi-word phrase answers, keeps only genuine single words");
assert(wordOnlyBank.questions[0].term === "Paris", "the single word that survives is the correct one");

console.log("\nDone.");
