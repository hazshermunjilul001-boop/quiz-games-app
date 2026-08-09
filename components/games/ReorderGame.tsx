"use client";

import { useMemo, useState } from "react";
import { OrderedSequenceQuestion, QuestionBank } from "@/lib/schema";
import { shuffle } from "@/lib/gameHelpers";
import { GameHeader, ResultsScreen, EmptyState } from "./QuizGame";

interface Tile {
  tileId: string;
  text: string;
}

export interface ReorderVariant {
  title: string;
  instructions: string;
  tileStyle: string; // extra Tailwind classes for the "magnet"/tile look
  /** When provided, each tile gets one of these colors (cycled by position)
   * applied via inline style — this is what actually makes Word Magnets
   * look different from Unjumble, rather than a shared plain tile style. */
  tileColors?: string[];
}

export default function ReorderGame({
  bank,
  onExit,
  variant,
}: {
  bank: QuestionBank;
  onExit: () => void;
  variant: ReorderVariant;
}) {
  const questions = useMemo(
    () => shuffle(bank.questions.filter((q): q is OrderedSequenceQuestion => q.type === "ordered-sequence")),
    [bank]
  );
  const [index, setIndex] = useState(0);
  const [bankTiles, setBankTiles] = useState<Tile[]>(() => (questions[0] ? buildTiles(questions[0]) : []));
  const [placed, setPlaced] = useState<Tile[]>([]);
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  if (questions.length === 0) {
    return <EmptyState onExit={onExit} message="This question bank has no sequences to reorder." />;
  }

  const current = questions[index];
  const correctPositions = checked
    ? placed.map((t, i) => t.text === current.items[i])
    : [];
  const allCorrect = checked && correctPositions.every(Boolean);

  function addTile(tile: Tile) {
    if (checked) return;
    setPlaced((p) => [...p, tile]);
    setBankTiles((b) => b.filter((t) => t.tileId !== tile.tileId));
  }

  function removeTile(tile: Tile) {
    if (checked) return;
    setBankTiles((b) => [...b, tile]);
    setPlaced((p) => p.filter((t) => t.tileId !== tile.tileId));
  }

  function check() {
    setChecked(true);
    const correct = placed.every((t, i) => t.text === current.items[i]);
    if (correct) setScore((s) => s + 1);
  }

  function next() {
    if (index + 1 >= questions.length) {
      setDone(true);
      return;
    }
    const nextIndex = index + 1;
    setIndex(nextIndex);
    setBankTiles(buildTiles(questions[nextIndex]));
    setPlaced([]);
    setChecked(false);
  }

  function retry() {
    setBankTiles(buildTiles(current));
    setPlaced([]);
    setChecked(false);
  }

  function restart() {
    setIndex(0);
    setBankTiles(buildTiles(questions[0]));
    setPlaced([]);
    setChecked(false);
    setScore(0);
    setDone(false);
  }

  if (done) {
    return <ResultsScreen score={score} total={questions.length} onRestart={restart} onExit={onExit} />;
  }

  return (
    <div className="max-w-xl mx-auto">
      <GameHeader title={variant.title} progress={`${index + 1} / ${questions.length}`} onExit={onExit} />
      <p className="text-xs text-zinc-500 mt-1">{variant.instructions}</p>

      <div className="mt-6 bg-white border border-zinc-200 rounded-xl p-6">
        {current.prompt && <p className="font-semibold text-zinc-900 mb-4">{current.prompt}</p>}

        {/* Answer slots */}
        <div className="min-h-14 flex flex-wrap gap-2 p-3 border-2 border-dashed border-zinc-300 rounded-lg mb-4">
          {placed.length === 0 && <span className="text-sm text-zinc-400">Tap words below to build the answer here</span>}
          {placed.map((tile, i) => {
            const isCorrect = checked && correctPositions[i];
            const isWrong = checked && !correctPositions[i];
            const color = variant.tileColors?.[i % variant.tileColors.length];
            return (
              <button
                key={tile.tileId}
                onClick={() => removeTile(tile)}
                disabled={checked}
                className={[
                  "px-3 py-1.5 rounded-md border text-sm font-medium cursor-pointer",
                  variant.tileStyle,
                  isCorrect ? "bg-green-50 border-green-400 text-green-700" : "",
                  isWrong ? "bg-red-50 border-red-400 text-red-700" : "",
                  !checked && !color ? "bg-indigo-50 border-indigo-300 text-indigo-900 hover:bg-indigo-100" : "",
                ].join(" ")}
                style={!checked && color ? { backgroundColor: color, borderColor: color, color: "white" } : undefined}
              >
                {tile.text}
              </button>
            );
          })}
        </div>

        {/* Word bank */}
        <div className="flex flex-wrap gap-2">
          {bankTiles.map((tile, i) => {
            const color = variant.tileColors?.[i % variant.tileColors.length];
            return (
              <button
                key={tile.tileId}
                onClick={() => addTile(tile)}
                className={[
                  "px-3 py-1.5 rounded-md border text-sm font-medium cursor-pointer",
                  variant.tileStyle,
                  !color ? "bg-white border-zinc-300 text-zinc-900 hover:bg-zinc-50" : "hover:brightness-110",
                ].join(" ")}
                style={color ? { backgroundColor: color, borderColor: color, color: "white" } : undefined}
              >
                {tile.text}
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex gap-3">
          {!checked && (
            <button
              onClick={check}
              disabled={bankTiles.length > 0}
              className="bg-zinc-900 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-zinc-700 disabled:opacity-40 cursor-pointer"
            >
              Check
            </button>
          )}
          {checked && !allCorrect && (
            <button
              onClick={retry}
              className="border border-zinc-300 bg-white text-zinc-900 text-sm font-medium px-4 py-2 rounded-md hover:bg-zinc-50 cursor-pointer"
            >
              Try again
            </button>
          )}
          {checked && (
            <button
              onClick={next}
              className="bg-zinc-900 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-zinc-700 cursor-pointer"
            >
              {index + 1 >= questions.length ? "See results" : "Next"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function buildTiles(q: OrderedSequenceQuestion): Tile[] {
  return shuffle(q.items.map((text, i) => ({ tileId: `${q.id}-${i}`, text })));
}
