"use client";

import { useMemo, useState } from "react";
import { QuestionBank, SingleTermQuestion } from "@/lib/schema";
import { generateWordSearch, PlacedWord } from "@/lib/wordSearchGen";
import { GameHeader, EmptyState } from "./QuizGame";
import CompletionCard from "./CompletionCard";

export default function WordSearch({ bank, onExit }: { bank: QuestionBank; onExit: () => void }) {
  const terms = useMemo(() => bank.questions.filter((q): q is SingleTermQuestion => q.type === "single-term"), [bank]);

  const grid = useMemo(() => generateWordSearch(terms.map((t) => t.term)), [terms]);
  const [foundWords, setFoundWords] = useState<Set<string>>(new Set());
  const [selStart, setSelStart] = useState<{ r: number; c: number } | null>(null);
  const [invalidFlash, setInvalidFlash] = useState(false);
  const [foundCells, setFoundCells] = useState<Set<string>>(new Set());

  if (terms.length === 0) {
    return <EmptyState onExit={onExit} message="This question bank has no single words for Word Search." />;
  }
  if (grid.placed.length === 0) {
    return <EmptyState onExit={onExit} message="None of the words in this bank could be placed in a word search grid." />;
  }

  const allFound = foundWords.size === grid.placed.length;

  function cellClick(r: number, c: number) {
    if (!selStart) {
      setSelStart({ r, c });
      return;
    }
    tryMatch(selStart, { r, c });
    setSelStart(null);
  }

  function tryMatch(start: { r: number; c: number }, end: { r: number; c: number }) {
    const dRow = Math.sign(end.r - start.r);
    const dCol = Math.sign(end.c - start.c);
    if (dRow === 0 && dCol === 0) return;

    for (const word of grid.placed) {
      if (foundWords.has(word.word)) continue;
      if (matchesSelection(word, start, end, dRow, dCol)) {
        setFoundWords((prev) => new Set(prev).add(word.word));
        setFoundCells((prev) => {
          const next = new Set(prev);
          for (let i = 0; i < word.word.length; i++) {
            next.add(`${word.row + word.dRow * i},${word.col + word.dCol * i}`);
          }
          return next;
        });
        return;
      }
    }
    setInvalidFlash(true);
    setTimeout(() => setInvalidFlash(false), 400);
  }

  function restart() {
    setFoundWords(new Set());
    setFoundCells(new Set());
    setSelStart(null);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <GameHeader title="Word Search" progress={`${foundWords.size} / ${grid.placed.length} found`} onExit={onExit} />
      <p className="text-xs text-zinc-500 mt-1">Tap the first letter of a word, then tap its last letter.</p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {grid.placed.map((w) => (
          <span
            key={w.word}
            className={`text-xs px-2 py-1 rounded-full border ${
              foundWords.has(w.word) ? "bg-green-50 border-green-300 text-green-700 line-through" : "bg-zinc-50 border-zinc-200 text-zinc-600"
            }`}
          >
            {terms.find((t) => t.term.toUpperCase().replace(/[^A-Z]/g, "") === w.word)?.term ?? w.word}
          </span>
        ))}
      </div>

      <div
        className={`mt-4 inline-grid gap-0.5 select-none ${invalidFlash ? "animate-pulse" : ""}`}
        style={{ gridTemplateColumns: `repeat(${grid.size}, minmax(0, 1fr))` }}
      >
        {grid.letters.map((row, r) =>
          row.map((letter, c) => {
            const isSelected = selStart?.r === r && selStart?.c === c;
            const isFound = foundCells.has(`${r},${c}`);
            return (
              <button
                key={`${r}-${c}`}
                onClick={() => cellClick(r, c)}
                className={[
                  "w-7 h-7 flex items-center justify-center text-xs font-bold rounded cursor-pointer border",
                  isFound ? "bg-green-100 border-green-300 text-green-800" : "",
                  isSelected ? "bg-indigo-100 border-indigo-400 text-indigo-900" : "",
                  !isFound && !isSelected ? "bg-white border-zinc-200 text-zinc-800 hover:bg-zinc-50" : "",
                ].join(" ")}
              >
                {letter}
              </button>
            );
          })
        )}
      </div>

      {allFound && <CompletionCard message="All words found!" onAction={restart} />}
    </div>
  );
}

function matchesSelection(
  word: PlacedWord,
  start: { r: number; c: number },
  end: { r: number; c: number },
  dRow: number,
  dCol: number
): boolean {
  const endRowExpected = word.row + word.dRow * (word.word.length - 1);
  const endColExpected = word.col + word.dCol * (word.word.length - 1);

  const forward =
    start.r === word.row && start.c === word.col && end.r === endRowExpected && end.c === endColExpected && dRow === word.dRow && dCol === word.dCol;
  const backward =
    start.r === endRowExpected && start.c === endColExpected && end.r === word.row && end.c === word.col && dRow === -word.dRow && dCol === -word.dCol;

  return forward || backward;
}
