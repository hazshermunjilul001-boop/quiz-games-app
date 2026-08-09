"use client";

import { useEffect, useMemo, useState } from "react";
import { McqQuestion, QuestionBank } from "@/lib/schema";
import { shuffle } from "@/lib/gameHelpers";
import Confetti from "./Confetti";

export default function QuizGame({ bank, onExit }: { bank: QuestionBank; onExit: () => void }) {
  const questions = useMemo(
    () => shuffle(bank.questions.filter((q): q is McqQuestion => q.type === "mcq")),
    [bank]
  );
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const current = questions[index];
  // Shuffle each question's choice order once per question, but remember
  // which shuffled position is correct.
  const shuffledChoices = useMemo(() => {
    if (!current) return [];
    const withIndex = current.choices.map((text, i) => ({ text, isCorrect: i === current.correctIndex }));
    return shuffle(withIndex);
  }, [current]);

  if (questions.length === 0) {
    return (
      <EmptyState onExit={onExit} message="This question bank has no multiple-choice questions to quiz on." />
    );
  }

  function choose(i: number) {
    if (selected !== null) return; // lock after first answer
    setSelected(i);
    if (shuffledChoices[i].isCorrect) setScore((s) => s + 1);
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
    return (
      <ResultsScreen
        score={score}
        total={questions.length}
        onRestart={restart}
        onExit={onExit}
      />
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <GameHeader title="Quiz" progress={`${index + 1} / ${questions.length}`} onExit={onExit} />

      <div className="mt-6 bg-white border border-zinc-200 rounded-3xl p-8 shadow-sm">
        <p className="text-2xl font-bold text-[var(--foreground)] leading-snug">{current.prompt}</p>

        <div className="mt-6 grid gap-3">
          {shuffledChoices.map((c, i) => {
            const isSelected = selected === i;
            const revealCorrect = selected !== null && c.isCorrect;
            const revealWrong = selected !== null && isSelected && !c.isCorrect;
            return (
              <button
                key={i}
                onClick={() => choose(i)}
                disabled={selected !== null}
                className={[
                  "text-left px-5 py-4 rounded-2xl border-2 text-lg font-semibold transition-all",
                  revealCorrect ? "bg-correct-bg border-correct text-correct stamp-pop" : "",
                  revealWrong ? "bg-incorrect-bg border-incorrect text-incorrect" : "",
                  selected === null ? "border-zinc-200 bg-white text-[var(--foreground)] hover:border-brand hover:bg-brand-light active:scale-[0.98] cursor-pointer" : "",
                  selected !== null && !revealCorrect && !revealWrong ? "border-zinc-100 bg-white text-zinc-400" : "",
                ].join(" ")}
              >
                {c.text}
              </button>
            );
          })}
        </div>

        {selected !== null && (
          <button
            onClick={next}
            className="mt-6 bg-brand text-white text-base font-bold px-6 py-3 rounded-xl hover:bg-brand-dark active:scale-95 transition-all cursor-pointer shadow-sm"
          >
            {index + 1 >= questions.length ? "See results" : "Next question"}
          </button>
        )}
      </div>
    </div>
  );
}

export function GameHeader({
  title,
  progress,
  onExit,
}: {
  title: string;
  progress?: string;
  onExit: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(interval);
  }, []);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  return (
    <div className="flex items-center justify-between">
      <div>
        <button onClick={onExit} className="text-sm text-brand hover:text-brand-dark font-medium cursor-pointer transition-colors">
          ← Back to templates
        </button>
        <h2 className="text-3xl font-extrabold text-[var(--foreground)] mt-1 tracking-tight">{title}</h2>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold font-mono bg-white/80 text-[var(--foreground)] px-3 py-1.5 rounded-full border border-zinc-200">
          ⏱ {mins}:{secs.toString().padStart(2, "0")}
        </span>
        {progress && (
          <span className="text-sm font-bold font-mono bg-brand-light text-brand-dark px-3 py-1.5 rounded-full">
            {progress}
          </span>
        )}
      </div>
    </div>
  );
}

export function ResultsScreen({
  score,
  total,
  onRestart,
  onExit,
}: {
  score: number;
  total: number;
  onRestart: () => void;
  onExit: () => void;
}) {
  const pct = Math.round((score / total) * 100);
  const cheer = pct === 100 ? "Perfect score!" : pct >= 80 ? "Great work!" : pct >= 50 ? "Good effort!" : "Keep practicing!";
  return (
    <div className="max-w-xl mx-auto text-center bg-white border border-zinc-200 rounded-3xl p-10 shadow-sm relative overflow-hidden">
      <Confetti />
      <p className="text-xs font-bold uppercase tracking-widest text-brand">Game complete</p>
      <div className="stamp-pop inline-flex flex-col items-center justify-center w-40 h-40 rounded-full border-4 border-gold bg-gold/10 mx-auto mt-3">
        <p className="text-4xl font-black text-brand-dark leading-none">
          {score}<span className="text-2xl text-zinc-400">/{total}</span>
        </p>
        <p className="text-gold-dark font-bold text-sm mt-1">{pct}%</p>
      </div>
      <p className="text-xl font-bold text-[var(--foreground)] mt-6">{cheer}</p>
      <div className="mt-6 flex gap-3 justify-center">
        <button
          onClick={onRestart}
          className="bg-brand text-white text-base font-bold px-6 py-3 rounded-xl hover:bg-brand-dark active:scale-95 transition-all cursor-pointer shadow-sm"
        >
          Play again
        </button>
        <button
          onClick={onExit}
          className="border-2 border-zinc-200 bg-white text-[var(--foreground)] text-base font-bold px-6 py-3 rounded-xl hover:bg-zinc-50 active:scale-95 transition-all cursor-pointer"
        >
          Back to templates
        </button>
      </div>
    </div>
  );
}

export function EmptyState({ onExit, message }: { onExit: () => void; message: string }) {
  return (
    <div className="max-w-xl mx-auto text-center bg-white border border-zinc-200 rounded-3xl p-10 shadow-sm">
      <p className="text-lg text-zinc-600">{message}</p>
      <button
        onClick={onExit}
        className="mt-5 border-2 border-zinc-200 bg-white text-[var(--foreground)] text-base font-bold px-6 py-3 rounded-xl hover:bg-zinc-50 active:scale-95 transition-all cursor-pointer"
      >
        Back to templates
      </button>
    </div>
  );
}
