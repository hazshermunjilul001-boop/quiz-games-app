"use client";

import { useMemo, useState } from "react";
import { ClozeQuestion, QuestionBank } from "@/lib/schema";
import { shuffle } from "@/lib/gameHelpers";
import { GameHeader, ResultsScreen, EmptyState } from "./QuizGame";

export default function CompleteTheSentence({ bank, onExit }: { bank: QuestionBank; onExit: () => void }) {
  const questions = useMemo(
    () => shuffle(bank.questions.filter((q): q is ClozeQuestion => q.type === "cloze" && q.blanks.length === 1)),
    [bank]
  );
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const current = questions[index];

  const options = useMemo(() => {
    if (!current) return [];
    const decoys = shuffle(questions.filter((q) => q.id !== current.id).map((q) => q.blanks[0])).slice(0, 3);
    return shuffle([current.blanks[0], ...decoys]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  if (questions.length === 0) {
    return <EmptyState onExit={onExit} message="This question bank has no single-blank sentences to complete." />;
  }

  function choose(option: string) {
    if (selected !== null) return;
    setSelected(option);
    if (option === current.blanks[0]) setScore((s) => s + 1);
  }

  function next() {
    if (index + 1 >= questions.length) {
      setDone(true);
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
  }

  function restart() {
    setIndex(0);
    setSelected(null);
    setScore(0);
    setDone(false);
  }

  if (done) {
    return <ResultsScreen score={score} total={questions.length} onRestart={restart} onExit={onExit} />;
  }

  const parts = current.text.split("___");

  return (
    <div className="max-w-xl mx-auto">
      <GameHeader title="Complete the Sentence" progress={`${index + 1} / ${questions.length} · score ${score}`} onExit={onExit} />

      <div className="mt-6 bg-white border border-zinc-200 rounded-xl p-6">
        <p className="text-lg text-zinc-900 leading-relaxed">
          {parts[0]}
          <span
            className={[
              "inline-block min-w-24 px-2 border-b-2 text-center font-semibold mx-1",
              selected === null ? "border-zinc-400 text-zinc-400" : "",
              selected !== null && selected === current.blanks[0] ? "border-green-500 text-green-700" : "",
              selected !== null && selected !== current.blanks[0] ? "border-red-500 text-red-700" : "",
            ].join(" ")}
          >
            {selected ?? "____"}
          </span>
          {parts[1]}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          {options.map((opt) => {
            const isCorrect = selected !== null && opt === current.blanks[0];
            const isWrongPick = selected === opt && opt !== current.blanks[0];
            return (
              <button
                key={opt}
                onClick={() => choose(opt)}
                disabled={selected !== null}
                className={[
                  "px-4 py-2.5 rounded-lg border text-sm font-medium cursor-pointer",
                  isCorrect ? "bg-green-50 border-green-400 text-green-700" : "",
                  isWrongPick ? "bg-red-50 border-red-400 text-red-700" : "",
                  selected === null ? "bg-white border-zinc-300 text-zinc-900 hover:bg-zinc-50" : "",
                  selected !== null && !isCorrect && !isWrongPick ? "bg-white border-zinc-200 text-zinc-400" : "",
                ].join(" ")}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {selected !== null && (
          <button
            onClick={next}
            className="mt-5 bg-zinc-900 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-zinc-700 cursor-pointer"
          >
            {index + 1 >= questions.length ? "See results" : "Next"}
          </button>
        )}
      </div>
    </div>
  );
}
