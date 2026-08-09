// lib/wordSearchGen.ts
// Pure grid-generation logic for the Word Search template. Kept separate
// from the React component so the placement algorithm can be unit tested
// on its own before any UI depends on it.

export interface PlacedWord {
  word: string; // uppercase, letters only
  row: number;
  col: number;
  dRow: number; // direction vector, e.g. (0,1) = left-to-right
  dCol: number;
}

export interface WordSearchGrid {
  size: number;
  letters: string[][]; // size x size, uppercase
  placed: PlacedWord[]; // words that were successfully placed
  skipped: string[]; // words that didn't fit and were left out
}

const DIRECTIONS: [number, number][] = [
  [0, 1], // →
  [1, 0], // ↓
  [1, 1], // ↘
  [0, -1], // ←
  [-1, 0], // ↑
  [-1, -1], // ↖
  [1, -1], // ↙
  [-1, 1], // ↗
];

/** Deterministic-ish PRNG hook point: callers can pass their own random fn
 * (e.g. for reproducible tests); defaults to Math.random. */
export function generateWordSearch(
  rawWords: string[],
  opts: { size?: number; random?: () => number } = {}
): WordSearchGrid {
  const random = opts.random ?? Math.random;
  const words = Array.from(
    new Set(
      rawWords
        .map((w) => w.toUpperCase().replace(/[^A-Z]/g, ""))
        .filter((w) => w.length > 0)
    )
  ).sort((a, b) => b.length - a.length); // longest first — easier to place

  const size = Math.max(opts.size ?? 0, ...words.map((w) => w.length), 8);
  const grid: (string | null)[][] = Array.from({ length: size }, () => Array(size).fill(null));

  const placed: PlacedWord[] = [];
  const skipped: string[] = [];

  for (const word of words) {
    const placement = tryPlaceWord(grid, word, size, random);
    if (placement) {
      placed.push(placement);
    } else {
      skipped.push(word);
    }
  }

  // Fill remaining empty cells with random letters
  const letters: string[][] = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => grid[r][c] ?? String.fromCharCode(65 + Math.floor(random() * 26)))
  );

  return { size, letters, placed, skipped };
}

function tryPlaceWord(
  grid: (string | null)[][],
  word: string,
  size: number,
  random: () => number,
  attempts = 60
): PlacedWord | null {
  const dirs = shuffleWithRandom([...DIRECTIONS], random);

  for (let attempt = 0; attempt < attempts; attempt++) {
    const [dRow, dCol] = dirs[attempt % dirs.length];
    const row = Math.floor(random() * size);
    const col = Math.floor(random() * size);

    if (canPlace(grid, word, row, col, dRow, dCol, size)) {
      for (let i = 0; i < word.length; i++) {
        grid[row + dRow * i][col + dCol * i] = word[i];
      }
      return { word, row, col, dRow, dCol };
    }
  }
  return null;
}

function canPlace(
  grid: (string | null)[][],
  word: string,
  row: number,
  col: number,
  dRow: number,
  dCol: number,
  size: number
): boolean {
  for (let i = 0; i < word.length; i++) {
    const r = row + dRow * i;
    const c = col + dCol * i;
    if (r < 0 || r >= size || c < 0 || c >= size) return false;
    const existing = grid[r][c];
    if (existing !== null && existing !== word[i]) return false;
  }
  return true;
}

function shuffleWithRandom<T>(arr: T[], random: () => number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
