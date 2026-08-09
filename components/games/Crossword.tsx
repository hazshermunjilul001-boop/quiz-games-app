"use client";

import { useMemo, useState } from "react";
import { QuestionBank, SingleTermQuestion } from "@/lib/schema";
import { generateCrossword } from "@/lib/crosswordGen";
import { GameHeader, EmptyState } from "./QuizGame";

export default function Crossword({ bank, onExit }: { bank: QuestionBank; onExit: () => void }) {
  const terms = useMemo(() => bank.questions.filter((q): q is SingleTermQuestion => q.type === "single-term"), [bank]);

  const grid = useMemo(() => generateCrossword(terms.map((t) => ({ word: t.term, clue: t.clue ?? "" }))), [terms]);
  const [input, setInput] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);

  if (terms.length === 0) {
    return <EmptyState onExit={onExit} message="This question bank has no single words for a crossword." />;
  }
  if (grid.placed.length === 0) {
    return <EmptyState onExit={onExit} message="None of the words in this bank share enough letters to build a crossword." />;
  }

  const acrossClues = grid.placed.filter((p) => p.direction === "across").sort((a, b) => a.number - b.number);
  const downClues = grid.placed.filter((p) => p.direction === "down").sort((a, b) => a.number - b.number);

  function setLetter(r: number, c: number, value: string) {
    if (checked) return;
    const letter = value.slice(-1).toUpperCase().replace(/[^A-Z]/, "");
    setInput((prev) => ({ ...prev, [`${r},${c}`]: letter }));
  }

  function check() {
    setChecked(true);
  }

  function restart() {
    setInput({});
    setChecked(false);
  }

  const totalLetterCells = grid.cells.flat().filter((c) => c !== null).length;
  const correctCells = grid.cells.reduce((acc, row, r) => {
    return (
      acc +
      row.reduce((rowAcc, cell, c) => {
        if (cell === null) return rowAcc;
        return rowAcc + (input[`${r},${c}`] === cell ? 1 : 0);
      }, 0)
    );
  }, 0);

  return (
    <div className="max-w-3xl mx-auto">
      <GameHeader title="Crossword" onExit={onExit} />
      {grid.skipped.length > 0 && (
        <p className="text-xs text-amber-600 mt-1">
          {grid.skipped.length} word{grid.skipped.length > 1 ? "s" : ""} couldn&rsquo;t be fit into this grid and{" "}
          {grid.skipped.length > 1 ? "were" : "was"} left out: {grid.skipped.map((s) => s.word).join(", ")}
        </p>
      )}

      <div className="mt-4 grid md:grid-cols-[auto_1fr] gap-6">
        <div
          className="inline-grid gap-0.5 bg-zinc-900 p-0.5 rounded-md"
          style={{ gridTemplateColumns: `repeat(${grid.width}, minmax(0, 1fr))` }}
        >
          {grid.cells.map((row, r) =>
            row.map((cell, c) => {
              if (cell === null) return <div key={`${r}-${c}`} className="w-8 h-8 bg-zinc-900" />;
              const num = grid.placed.find((p) => p.row === r && p.col === c)?.number;
              const value = input[`${r},${c}`] ?? "";
              const isCorrect = checked && value === cell;
              const isWrong = checked && value !== cell;
              return (
                <div key={`${r}-${c}`} className="relative w-8 h-8 bg-white">
                  {num && <span className="absolute top-0 left-0.5 text-[8px] text-zinc-500 leading-none">{num}</span>}
                  <input
                    value={value}
                    onChange={(e) => setLetter(r, c, e.target.value)}
                    disabled={checked}
                    maxLength={1}
                    className={[
                      "w-8 h-8 text-center text-sm font-bold uppercase outline-none",
                      isCorrect ? "bg-green-50 text-green-700" : "",
                      isWrong ? "bg-red-50 text-red-700" : "",
                      !checked ? "text-zinc-900" : "",
                    ].join(" ")}
                  />
                </div>
              );
            })
          )}
        </div>

        <div className="space-y-4 text-sm">
          <div>
            <p className="font-semibold text-zinc-900 mb-1">Across</p>
            <ul className="space-y-0.5 text-zinc-700">
              {acrossClues.map((p) => (
                <li key={`a-${p.number}`}>
                  <span className="font-medium">{p.number}.</span> {p.clue}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-semibold text-zinc-900 mb-1">Down</p>
            <ul className="space-y-0.5 text-zinc-700">
              {downClues.map((p) => (
                <li key={`d-${p.number}`}>
                  <span className="font-medium">{p.number}.</span> {p.clue}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        {!checked ? (
          <button onClick={check} className="bg-zinc-900 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-zinc-700 cursor-pointer">
            Check
          </button>
        ) : (
          <>
            <p className="text-sm font-medium text-zinc-700">
              {correctCells} / {totalLetterCells} letters correct
            </p>
            <button onClick={restart} className="border border-zinc-300 bg-white text-zinc-900 text-sm font-medium px-4 py-2 rounded-md hover:bg-zinc-50 cursor-pointer">
              Try again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
