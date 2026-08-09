// lib/crosswordGen.ts
// Pure crossword layout logic, kept separate from the React component so
// the intersection-placement algorithm can be unit tested before any UI
// depends on it. This is a simplified generator: it places the first word,
// then greedily finds a valid letter-intersection for each subsequent word
// against whatever's already placed. A word that shares no letter with
// anything already on the board — or only has conflicting intersections —
// gets skipped rather than forced onto the grid. That's an honest tradeoff:
// a real crossword compiler backtracks and re-orders to fit everything;
// this doesn't, so some inputs will lose a word or two.

export interface CrosswordEntry {
  word: string; // sanitized to letters only, uppercase
  clue: string;
}

export interface PlacedCrosswordWord {
  word: string;
  clue: string;
  row: number;
  col: number;
  direction: "across" | "down";
  number: number;
}

export interface CrosswordGrid {
  width: number;
  height: number;
  cells: (string | null)[][]; // trimmed to the used bounding box
  placed: PlacedCrosswordWord[];
  skipped: CrosswordEntry[];
}

interface InternalPlacement {
  word: string;
  clue: string;
  row: number;
  col: number;
  direction: "across" | "down";
}

export function generateCrossword(rawEntries: CrosswordEntry[], opts: { random?: () => number } = {}): CrosswordGrid {
  const random = opts.random ?? Math.random;

  const entries = rawEntries
    .map((e) => ({ word: e.word.toUpperCase().replace(/[^A-Z]/g, ""), clue: e.clue }))
    .filter((e) => e.word.length >= 2)
    .sort((a, b) => b.word.length - a.word.length); // longest first — most constraints, easiest to anchor others to

  if (entries.length === 0) {
    return { width: 0, height: 0, cells: [], placed: [], skipped: rawEntries };
  }

  // Work on an oversized virtual grid so placements never run off the edge;
  // trim to the actual bounding box at the end.
  const OFFSET = 30;
  const SIZE = 60;
  const grid: (string | null)[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));

  const placements: InternalPlacement[] = [];
  const skipped: CrosswordEntry[] = [];
  const seen = new Set<string>();

  // Place the first (longest) word across, through the center.
  const first = entries[0];
  const firstRow = OFFSET;
  const firstCol = OFFSET;
  placeOnGrid(grid, first.word, firstRow, firstCol, "across");
  placements.push({ word: first.word, clue: first.clue, row: firstRow, col: firstCol, direction: "across" });
  seen.add(first.word);

  for (let i = 1; i < entries.length; i++) {
    const entry = entries[i];
    if (seen.has(entry.word)) {
      skipped.push(entry); // exact duplicate word, can't have two identical crossword entries
      continue;
    }

    const candidates = findIntersections(grid, placements, entry.word, SIZE, random);
    if (candidates.length > 0) {
      const choice = candidates[Math.floor(random() * candidates.length)];
      placeOnGrid(grid, entry.word, choice.row, choice.col, choice.direction);
      placements.push({ word: entry.word, clue: entry.clue, row: choice.row, col: choice.col, direction: choice.direction });
      seen.add(entry.word);
    } else {
      skipped.push(entry);
    }
  }

  return trimAndNumber(grid, placements, SIZE, skipped);
}

function placeOnGrid(grid: (string | null)[][], word: string, row: number, col: number, direction: "across" | "down") {
  for (let i = 0; i < word.length; i++) {
    const r = direction === "down" ? row + i : row;
    const c = direction === "across" ? col + i : col;
    grid[r][c] = word[i];
  }
}

/** Finds every valid placement of `word` that intersects at least one
 * already-placed word at a matching letter, with no conflicting overlaps
 * and no accidental adjacency collisions along the word's length. */
function findIntersections(
  grid: (string | null)[][],
  placements: InternalPlacement[],
  word: string,
  size: number,
  random: () => number
): { row: number; col: number; direction: "across" | "down" }[] {
  const candidates: { row: number; col: number; direction: "across" | "down" }[] = [];

  for (const placed of placements) {
    for (let wi = 0; wi < word.length; wi++) {
      for (let pi = 0; pi < placed.word.length; pi++) {
        if (word[wi] !== placed.word[pi]) continue;

        // placed word is across -> new word must run down through this cell, and vice versa
        const newDirection: "across" | "down" = placed.direction === "across" ? "down" : "across";
        const intersectRow = placed.direction === "across" ? placed.row : placed.row + pi;
        const intersectCol = placed.direction === "across" ? placed.col + pi : placed.col;

        const row = newDirection === "down" ? intersectRow - wi : intersectRow;
        const col = newDirection === "across" ? intersectCol - wi : intersectCol;

        if (isValidPlacement(grid, word, row, col, newDirection, size)) {
          candidates.push({ row, col, direction: newDirection });
        }
      }
    }
  }

  // de-dup identical candidates (same row/col/direction found via multiple letter matches)
  const unique = Array.from(new Map(candidates.map((c) => [`${c.row},${c.col},${c.direction}`, c])).values());
  return shuffleWithRandom(unique, random);
}

function isValidPlacement(
  grid: (string | null)[][],
  word: string,
  row: number,
  col: number,
  direction: "across" | "down",
  size: number
): boolean {
  for (let i = 0; i < word.length; i++) {
    const r = direction === "down" ? row + i : row;
    const c = direction === "across" ? col + i : col;
    if (r < 0 || r >= size || c < 0 || c >= size) return false;

    const existing = grid[r][c];
    if (existing !== null && existing !== word[i]) return false; // conflicting letter

    // If this cell is empty, check its neighbors PERPENDICULAR to the word's
    // direction aren't occupied — prevents an unrelated word from running
    // flush alongside this one (a real crossword rule: no two parallel
    // letters touching unless they're part of an intended intersection).
    if (existing === null) {
      const perpNeighbors =
        direction === "across"
          ? [
              [r - 1, c],
              [r + 1, c],
            ]
          : [
              [r, c - 1],
              [r, c + 1],
            ];
      for (const [nr, nc] of perpNeighbors) {
        if (nr >= 0 && nr < size && nc >= 0 && nc < size && grid[nr][nc] !== null) return false;
      }
    }
  }

  // Check the cells immediately before/after the word (along its own axis)
  // are empty, so this word doesn't run straight into another one.
  const beforeR = direction === "down" ? row - 1 : row;
  const beforeC = direction === "across" ? col - 1 : col;
  const afterR = direction === "down" ? row + word.length : row;
  const afterC = direction === "across" ? col + word.length : col;
  if (beforeR >= 0 && beforeC >= 0 && beforeR < size && beforeC < size && grid[beforeR][beforeC] !== null) return false;
  if (afterR >= 0 && afterC >= 0 && afterR < size && afterC < size && grid[afterR][afterC] !== null) return false;

  return true;
}

function trimAndNumber(
  grid: (string | null)[][],
  placements: InternalPlacement[],
  size: number,
  skipped: CrosswordEntry[]
): CrosswordGrid {
  let minRow = size,
    maxRow = 0,
    minCol = size,
    maxCol = 0;
  for (const p of placements) {
    const endRow = p.direction === "down" ? p.row + p.word.length - 1 : p.row;
    const endCol = p.direction === "across" ? p.col + p.word.length - 1 : p.col;
    minRow = Math.min(minRow, p.row);
    maxRow = Math.max(maxRow, endRow);
    minCol = Math.min(minCol, p.col);
    maxCol = Math.max(maxCol, endCol);
  }

  const height = maxRow - minRow + 1;
  const width = maxCol - minCol + 1;
  const cells: (string | null)[][] = Array.from({ length: height }, (_, r) =>
    Array.from({ length: width }, (_, c) => grid[minRow + r][minCol + c])
  );

  // Standard crossword numbering: a cell gets a number if it starts an
  // across word (no letter cell immediately to its left, and there IS one
  // to its right) or a down word (no letter cell above, and there IS one
  // below). Shared start cells get one number.
  const numberAt = new Map<string, number>();
  let nextNumber = 1;
  const startsAcross = new Set<string>();
  const startsDown = new Set<string>();

  for (const p of placements) {
    const r = p.row - minRow;
    const c = p.col - minCol;
    const key = `${r},${c}`;
    if (p.direction === "across") startsAcross.add(key);
    else startsDown.add(key);
  }

  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const key = `${r},${c}`;
      if (startsAcross.has(key) || startsDown.has(key)) {
        numberAt.set(key, nextNumber++);
      }
    }
  }

  const placed: PlacedCrosswordWord[] = placements.map((p) => ({
    word: p.word,
    clue: p.clue,
    row: p.row - minRow,
    col: p.col - minCol,
    direction: p.direction,
    number: numberAt.get(`${p.row - minRow},${p.col - minCol}`)!,
  }));

  return { width, height, cells, placed, skipped };
}

function shuffleWithRandom<T>(arr: T[], random: () => number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
