"use client";

import { useMemo, useState } from "react";
import { McqQuestion, QuestionBank } from "@/lib/schema";
import { shuffle } from "@/lib/gameHelpers";
import { GameHeader, ResultsScreen, EmptyState } from "./QuizGame";

interface Statement {
  question: McqQuestion;
  shownChoice: string;
  isTrue: boolean;
}

export default function TrueFalseGame({ bank, onExit }: { bank: QuestionBank; onExit: () => void }) {
  const statements = useMemo<Statement[]>(() => {
    const mcqs = bank.questions.filter((q): q is McqQuestion => q.type === "mcq" && q.choices.length >= 2);
    return shuffle(
      mcqs.map((q) => {
        const showCorrect = Math.random() < 0.5;
        let shownChoice = q.choices[q.correctIndex];
        if (!showCorrect) {
          const wrongOptions = q.choices.filter((_, i) => i !== q.correctIndex);
          shownChoice = wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
        }
        return { question: q, shownChoice, isTrue: showCorrect };
      })
    );
  }, [bank]);

  const [index, setIndex] = useState(0);
  const [answered, setAnswered] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  if (statements.length === 0) {
    return <EmptyState onExit={onExit} message="This question bank has no multiple-choice questions to convert to True/False." />;
  }

  const current = statements[index];

  function answer(choseTrue: boolean) {
    if (answered !== null) return;
    setAnswered(choseTrue);
    if (choseTrue === current.isTrue) setScore((s) => s + 1);
  }

  function next() {
    if (index + 1 >= statements.length) {
      setDone(true);
      return;
    }
    setIndex((i) => i + 1);
    setAnswered(null);
  }

  function restart() {
    setIndex(0);
    setAnswered(null);
    setScore(0);
    setDone(false);
  }

  if (done) {
    return <ResultsScreen score={score} total={statements.length} onRestart={restart} onExit={onExit} />;
  }

  const wasCorrect = answered !== null && answered === current.isTrue;

  return (
    <div className="max-w-xl mx-auto">
      <GameHeader title="True or False" progress={`${index + 1} / ${statements.length}`} onExit={onExit} />

      <div className="mt-6 bg-white border border-zinc-200 rounded-xl p-6">
        <p className="text-xs uppercase tracking-wide text-zinc-400 font-medium">Statement</p>
        <p className="text-lg font-semibold text-zinc-900 mt-1">
          {current.question.prompt} <span className="text-indigo-700">{current.shownChoice}</span>
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            onClick={() => answer(true)}
            disabled={answered !== null}
            className={[
              "py-4 rounded-lg border font-semibold text-lg cursor-pointer",
              answered === null ? "border-green-400 text-green-700 bg-green-50 hover:bg-green-100" : "",
              answered !== null && current.isTrue ? "border-green-400 text-green-700 bg-green-50" : "",
              answered !== null && !current.isTrue ? "border-zinc-200 text-zinc-400 bg-white opacity-60" : "",
            ].join(" ")}
          >
            True
          </button>
          <button
            onClick={() => answer(false)}
            disabled={answered !== null}
            className={[
              "py-4 rounded-lg border font-semibold text-lg cursor-pointer",
              answered === null ? "border-red-400 text-red-700 bg-red-50 hover:bg-red-100" : "",
              answered !== null && !current.isTrue ? "border-red-400 text-red-700 bg-red-50" : "",
              answered !== null && current.isTrue ? "border-zinc-200 text-zinc-400 bg-white opacity-60" : "",
            ].join(" ")}
          >
            False
          </button>
        </div>

        {answered !== null && (
          <>
            <p className={`mt-4 text-sm font-medium ${wasCorrect ? "text-green-700" : "text-red-700"}`}>
              {wasCorrect ? "Correct!" : `Not quite — the correct answer was "${current.question.choices[current.question.correctIndex]}".`}
            </p>
            <button
              onClick={next}
              className="mt-4 bg-zinc-900 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-zinc-700 cursor-pointer"
            >
              {index + 1 >= statements.length ? "See results" : "Next"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
