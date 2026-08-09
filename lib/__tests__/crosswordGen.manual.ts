import { generateCrossword } from "../crosswordGen";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error("❌ FAIL:", msg);
    process.exitCode = 1;
  } else {
    console.log("✅", msg);
  }
}

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// --- Test 1: words sharing letters intersect and all read correctly ---
const entries1 = [
  { word: "cell", clue: "Basic unit of life" },
  { word: "enzyme", clue: "Speeds up reactions" },
  { word: "nucleus", clue: "Contains DNA" },
];
const grid1 = generateCrossword(entries1, { random: seededRandom(1) });
assert(grid1.placed.length >= 2, `at least 2 of 3 words placed via intersection (got ${grid1.placed.length})`);

let allCorrect = true;
for (const p of grid1.placed) {
  for (let i = 0; i < p.word.length; i++) {
    const r = p.direction === "down" ? p.row + i : p.row;
    const c = p.direction === "across" ? p.col + i : p.col;
    if (grid1.cells[r][c] !== p.word[i]) allCorrect = false;
  }
}
assert(allCorrect, "every placed word reads correctly in the trimmed grid");

// --- Test 2: no conflicting letters anywhere in the grid ---
// (implicitly covered by allCorrect above, but double check overlap cells specifically)
let conflictFound = false;
for (let r = 0; r < grid1.height; r++) {
  for (let c = 0; c < grid1.width; c++) {
    const wordsHere = grid1.placed.filter((p) => {
      for (let i = 0; i < p.word.length; i++) {
        const pr = p.direction === "down" ? p.row + i : p.row;
        const pc = p.direction === "across" ? p.col + i : p.col;
        if (pr === r && pc === c) return true;
      }
      return false;
    });
    if (wordsHere.length > 1) {
      const letters = new Set(
        wordsHere.map((p) => {
          const idx = p.direction === "down" ? r - p.row : c - p.col;
          return p.word[idx];
        })
      );
      if (letters.size > 1) conflictFound = true;
    }
  }
}
assert(!conflictFound, "no cell has two different letters from crossing words");

// --- Test 3: every placed word has a number ---
assert(
  grid1.placed.every((p) => typeof p.number === "number" && p.number > 0),
  "every placed word has a positive crossword number"
);

// --- Test 4: a single word still produces a valid (if trivial) grid ---
const grid2 = generateCrossword([{ word: "photosynthesis", clue: "Plants make food" }], { random: seededRandom(2) });
assert(grid2.placed.length === 1, "a single-word input still places that one word");
assert(grid2.width === 14 && grid2.height === 1, "single across word produces a 1-row grid matching its length");

// --- Test 5: totally unrelated words (no shared letters) — first placed, rest skipped gracefully ---
// "xyz" vs "qwj" share no letters at all
const grid3 = generateCrossword(
  [
    { word: "xyz", clue: "c1" },
    { word: "qwj", clue: "c2" },
  ],
  { random: seededRandom(3) }
);
assert(grid3.placed.length + grid3.skipped.length === 2, "no words lost or duplicated — every input word is either placed or skipped");
assert(grid3.placed.length >= 1, "at least the first (anchor) word is always placed");

// --- Test 6: doesn't crash on empty input ---
const grid4 = generateCrossword([], { random: seededRandom(4) });
assert(grid4.placed.length === 0 && grid4.width === 0, "empty input produces an empty grid, not a crash");

// --- Test 7: duplicate words are skipped, not placed twice ---
const grid5 = generateCrossword(
  [
    { word: "cell", clue: "c1" },
    { word: "cell", clue: "c2 (dup)" },
  ],
  { random: seededRandom(5) }
);
assert(grid5.placed.length === 1, "an exact duplicate word is not placed a second time");
assert(grid5.skipped.length === 1, "the duplicate shows up in skipped rather than silently vanishing");

// --- Test 8: larger realistic word list — sanity check on scale ---
const entries6 = [
  { word: "mitosis", clue: "Cell division" },
  { word: "meiosis", clue: "Reduction division" },
  { word: "gene", clue: "Unit of heredity" },
  { word: "allele", clue: "Gene variant" },
  { word: "genome", clue: "Full genetic code" },
  { word: "protein", clue: "Made of amino acids" },
];
const grid6 = generateCrossword(entries6, { random: seededRandom(6) });
assert(grid6.placed.length >= 3, `at least half of a realistic 6-word list gets placed (got ${grid6.placed.length}/6)`);
assert(grid6.placed.length + grid6.skipped.length === 6, "every input word accounted for (placed or skipped), none lost");

console.log("\nDone.");
