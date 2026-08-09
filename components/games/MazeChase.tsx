"use client";

import { useMemo, useState } from "react";
import { McqQuestion, QuestionBank } from "@/lib/schema";
import { shuffle } from "@/lib/gameHelpers";
import { GameHeader, ResultsScreen, EmptyState } from "./QuizGame";

const GRID = 5;
const START = { row: 2, col: 0 };

interface Cell {
  kind: "empty" | "enemy" | "choice";
  label?: string;
  isCorrect?: boolean;
}

export default function MazeChase({ bank, onExit }: { bank: QuestionBank; onExit: () => void }) {
  const questions = useMemo(
    () => shuffle(bank.questions.filter((q): q is McqQuestion => q.type === "mcq" && q.choices.length >= 2)),
    [bank]
  );
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [pos, setPos] = useState(START);
  const [bumpMsg, setBumpMsg] = useState<string | null>(null);
  const [roundOver, setRoundOver] = useState<"correct" | "wrong" | null>(null);

  const current = questions[index];

  const grid = useMemo<Cell[][]>(() => {
    if (!current) return [];
    const cells: Cell[][] = Array.from({ length: GRID }, () => Array.from({ length: GRID }, () => ({ kind: "empty" as const })));

    const usedPositions = new Set<string>([`${START.row},${START.col}`]);
    function randomFreeCell() {
      let r: number, c: number;
      do {
        r = Math.floor(Math.random() * GRID);
        c = Math.floor(Math.random() * GRID);
      } while (usedPositions.has(`${r},${c}`));
      usedPositions.add(`${r},${c}`);
      return { r, c };
    }

    const choices = current.choices.slice(0, 4);
    choices.forEach((text, i) => {
      const { r, c } = randomFreeCell();
      cells[r][c] = { kind: "choice", label: text, isCorrect: i === current.correctIndex };
    });

    const enemyCount = 4;
    for (let i = 0; i < enemyCount; i++) {
      const { r, c } = randomFreeCell();
      cells[r][c] = { kind: "enemy" };
    }

    return cells;
  }, [current]);

  if (questions.length === 0) {
    return <EmptyState onExit={onExit} message="This question bank has no multiple-choice questions for Maze Chase." />;
  }

  function move(dr: number, dc: number) {
    if (roundOver) return;
    const nr = Math.min(GRID - 1, Math.max(0, pos.row + dr));
    const nc = Math.min(GRID - 1, Math.max(0, pos.col + dc));
    if (nr === pos.row && nc === pos.col) return;

    const cell = grid[nr][nc];
    if (cell.kind === "enemy") {
      setBumpMsg("Caught by an enemy — back to start!");
      setPos(START);
      setTimeout(() => setBumpMsg(null), 900);
      return;
    }
    setPos({ row: nr, col: nc });

    if (cell.kind === "choice") {
      if (cell.isCorrect) {
        setScore((s) => s + 1);
        setRoundOver("correct");
      } else {
        setRoundOver("wrong");
      }
      setTimeout(advance, 900);
    }
  }

  function advance() {
    setPos(START);
    setRoundOver(null);
    setBumpMsg(null);
    if (index + 1 >= questions.length) {
      setDone(true);
      return;
    }
    setIndex((i) => i + 1);
  }

  function restart() {
    setIndex(0);
    setScore(0);
    setDone(false);
    setPos(START);
    setRoundOver(null);
    setBumpMsg(null);
  }

  if (done) {
    return <ResultsScreen score={score} total={questions.length} onRestart={restart} onExit={onExit} />;
  }

  return (
    <div className="max-w-xl mx-auto">
      <GameHeader title="Maze Chase" progress={`${index + 1} / ${questions.length} · score ${score}`} onExit={onExit} />

      <div className="mt-6 bg-white border border-zinc-200 rounded-xl p-4">
        <p className="font-semibold text-zinc-900 text-center mb-3">
          Run to the answer for: <span className="text-indigo-700">{current.prompt}</span>
        </p>

        <div className="grid gap-1 mx-auto" style={{ gridTemplateColumns: `repeat(${GRID}, minmax(0, 1fr))`, maxWidth: 340 }}>
          {grid.map((row, r) =>
            row.map((cell, c) => {
              const isPlayer = pos.row === r && pos.col === c;
              return (
                <div
                  key={`${r}-${c}`}
                  className={[
                    "aspect-square rounded-md border flex items-center justify-center text-[10px] font-medium text-center p-0.5 leading-tight",
                    cell.kind === "enemy" ? "bg-red-100 border-red-300 text-red-700" : "",
                    cell.kind === "choice" ? "bg-indigo-50 border-indigo-300 text-indigo-800" : "",
                    cell.kind === "empty" ? "bg-zinc-50 border-zinc-200" : "",
                  ].join(" ")}
                >
                  {isPlayer ? "🧑" : cell.kind === "enemy" ? "👾" : cell.label}
                </div>
              );
            })
          )}
        </div>

        <div className="mt-4 flex flex-col items-center gap-1">
          <button onClick={() => move(-1, 0)} className="w-10 h-10 rounded-md border border-zinc-300 bg-white hover:bg-zinc-50 cursor-pointer">↑</button>
          <div className="flex gap-1">
            <button onClick={() => move(0, -1)} className="w-10 h-10 rounded-md border border-zinc-300 bg-white hover:bg-zinc-50 cursor-pointer">←</button>
            <button onClick={() => move(1, 0)} className="w-10 h-10 rounded-md border border-zinc-300 bg-white hover:bg-zinc-50 cursor-pointer">↓</button>
            <button onClick={() => move(0, 1)} className="w-10 h-10 rounded-md border border-zinc-300 bg-white hover:bg-zinc-50 cursor-pointer">→</button>
          </div>
        </div>

        {bumpMsg && <p className="mt-3 text-center text-sm font-medium text-red-700">{bumpMsg}</p>}
        {roundOver && (
          <p className={`mt-3 text-center font-medium ${roundOver === "correct" ? "text-green-700" : "text-red-700"}`}>
            {roundOver === "correct" ? "Correct zone!" : `Wrong zone — the answer was "${current.choices[current.correctIndex]}".`}
          </p>
        )}
      </div>
    </div>
  );
}
