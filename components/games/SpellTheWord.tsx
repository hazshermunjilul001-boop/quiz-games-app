"use client";

import { useMemo, useState } from "react";
import { QuestionBank, SingleTermQuestion } from "@/lib/schema";
import { shuffle } from "@/lib/gameHelpers";
import { GameHeader, ResultsScreen, EmptyState } from "./QuizGame";

export default function SpellTheWord({ bank, onExit }: { bank: QuestionBank; onExit: () => void }) {
  const terms = useMemo(
    () => shuffle(bank.questions.filter((q): q is SingleTermQuestion => q.type === "single-term")),
    [bank]
  );
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState("");
  const [checked, setChecked] = useState<"correct" | "wrong" | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  if (terms.length === 0) {
    return <EmptyState onExit={onExit} message="This question bank has no terms to spell." />;
  }

  const current = terms[index];

  function check() {
    if (checked) return;
    const correct = input.trim().toLowerCase() === current.term.trim().toLowerCase();
    setChecked(correct ? "correct" : "wrong");
    if (correct) setScore((s) => s + 1);
  }

  function next() {
    if (index + 1 >= terms.length) {
      setDone(true);
      return;
    }
    setIndex((i) => i + 1);
    setInput("");
    setChecked(null);
  }

  function restart() {
    setIndex(0);
    setInput("");
    setChecked(null);
    setScore(0);
    setDone(false);
  }

  if (done) {
    return <ResultsScreen score={score} total={terms.length} onRestart={restart} onExit={onExit} />;
  }

  return (
    <div className="max-w-xl mx-auto">
      <GameHeader title="Spell the Answer" progress={`${index + 1} / ${terms.length} · score ${score}`} onExit={onExit} />

      <div className="mt-6 bg-white border border-zinc-200 rounded-xl p-6">
        <p className="text-xs uppercase tracking-wide text-zinc-400 font-medium">Clue</p>
        <p className="text-lg font-semibold text-zinc-900 mt-1">{current.clue}</p>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && check()}
          disabled={checked !== null}
          autoFocus
          placeholder="Type your answer..."
          className={[
            "mt-4 w-full border rounded-md p-3 text-sm bg-white text-zinc-900 placeholder:text-zinc-400",
            checked === "correct" ? "border-green-400 bg-green-50" : "",
            checked === "wrong" ? "border-red-400 bg-red-50" : "",
            checked === null ? "border-zinc-300" : "",
          ].join(" ")}
        />

        {checked && (
          <p className={`mt-2 text-sm font-medium ${checked === "correct" ? "text-green-700" : "text-red-700"}`}>
            {checked === "correct" ? "Correct!" : `Not quite — the correct spelling is "${current.term}".`}
          </p>
        )}

        <div className="mt-4 flex gap-3">
          {!checked && (
            <button
              onClick={check}
              className="bg-zinc-900 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-zinc-700 cursor-pointer"
            >
              Check
            </button>
          )}
          {checked && (
            <button
              onClick={next}
              className="bg-zinc-900 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-zinc-700 cursor-pointer"
            >
              {index + 1 >= terms.length ? "See results" : "Next"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
