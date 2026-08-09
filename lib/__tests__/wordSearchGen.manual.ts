import { generateWordSearch } from "../wordSearchGen";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error("❌ FAIL:", msg);
    process.exitCode = 1;
  } else {
    console.log("✅", msg);
  }
}

// Seeded PRNG for reproducible tests
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// --- Test 1: all words get placed when there's plenty of room ---
const words1 = ["MITOSIS", "CELL", "NUCLEUS", "ENZYME"];
const grid1 = generateWordSearch(words1, { size: 15, random: seededRandom(1) });
assert(grid1.placed.length === words1.length, `all ${words1.length} words placed on a roomy grid (got ${grid1.placed.length})`);
assert(grid1.skipped.length === 0, "no words skipped on a roomy grid");

// --- Test 2: every placed word actually reads correctly in the grid ---
let allReadCorrectly = true;
for (const p of grid1.placed) {
  let reconstructed = "";
  for (let i = 0; i < p.word.length; i++) {
    reconstructed += grid1.letters[p.row + p.dRow * i][p.col + p.dCol * i];
  }
  if (reconstructed !== p.word) allReadCorrectly = false;
}
assert(allReadCorrectly, "every placed word reads correctly along its stored direction/position");

// --- Test 3: grid is fully filled (no null cells) ---
let hasEmpty = false;
for (const row of grid1.letters) {
  for (const cell of row) {
    if (!cell || cell.length !== 1) hasEmpty = true;
  }
}
assert(!hasEmpty, "every grid cell is filled with exactly one letter");

// --- Test 4: overlapping words with a shared letter can coexist ---
const words2 = ["CAT", "CAR"]; // share "CA"
const grid2 = generateWordSearch(words2, { size: 10, random: seededRandom(42) });
assert(grid2.placed.length === 2, "words sharing a letter prefix can both be placed");

// --- Test 5: a word too long for the grid gets skipped, not crashed ---
const words3 = ["SUPERCALIFRAGILISTICEXPIALIDOCIOUS", "CAT"];
const grid3 = generateWordSearch(words3, { size: 8, random: seededRandom(7) });
assert(grid3.skipped.length >= 1, "oversized word is skipped rather than crashing");
assert(grid3.placed.some((p) => p.word === "CAT"), "shorter word still placed even when a longer one is skipped");

// --- Test 6: non-alphabetic input is sanitized, not left broken in the grid ---
const grid4 = generateWordSearch(["water-cycle", "3D shapes"], { size: 12, random: seededRandom(3) });
assert(
  grid4.placed.every((p) => /^[A-Z]+$/.test(p.word)),
  "input words are sanitized to letters-only before placement"
);

// --- Test 7: duplicate words (case-insensitive) are deduplicated ---
const grid5 = generateWordSearch(["Cell", "cell", "CELL"], { size: 10, random: seededRandom(9) });
assert(grid5.placed.length + grid5.skipped.length === 1, "duplicate words (case-insensitive) collapse into one");

console.log("\nDone.");
