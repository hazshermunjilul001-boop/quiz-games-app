"use client";

// components/games/QuizResults.tsx
// Shared end-of-run results screen for every attempt-tracked, answers-
// hidden format (Quiz, True or False, and the exam-mode arcade games:
// Whack-a-Mole, Flying Fruit, Airplane, Maze Chase). Shows everything a
// student (and their teacher) needs after a take: the score, how LONG the
// quiz took, WHICH attempt this was out of how many, and a full
// item-by-item review of every question — what the student answered, what
// they got right, what they got wrong, and the correct answer for every
// missed item.

import { ReactNode } from "react";
import Confetti from "./Confetti";
import { formatDuration, AttemptSummary } from "@/lib/attempts";

export interface ReviewItem {
  /** "Item 1", "Item 2", ... label shown in the review list. */
  label: string;
  /** The question text (for True/False this includes the shown statement). */
  prompt: string;
  /** What the student answered, shown under the prompt. */
  yourAnswer: string;
  /** The right answer — always shown for wrong items. */
  correctAnswer: string;
  isCorrect: boolean;
}

export default function QuizResults({
  score,
  total,
  review,
  durationSec,
  attemptSummary,
  retakeLabel,
  onRetake,
  onExit,
  children,
}: {
  score: number;
  total: number;
  review: ReviewItem[];
  /** Seconds the run took, measured from the first question. */
  durationSec: number;
  /** Present only on a signed-in shared link — shows attempt numbering. */
  attemptSummary?: AttemptSummary;
  /** Label for the retake button — callers pass the next attempt number. */
  retakeLabel?: string;
  onRetake: () => void;
  onExit: () => void;
  /** Optional extra content (e.g. game-specific stats) above the review. */
  children?: ReactNode;
}) {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const cheer = pct === 100 ? "Perfect score!" : pct >= 80 ? "Great work!" : pct >= 50 ? "Good effort!" : "Keep practicing!";
  const wrongCount = total - score;

  return (
    <div className="max-w-xl mx-auto text-center bg-white border border-zinc-200 rounded-3xl p-8 sm:p-10 shadow-sm relative overflow-hidden">
      <Confetti />
      <p className="text-xs font-bold uppercase tracking-widest text-brand">Quiz complete</p>
      <div className="stamp-pop inline-flex flex-col items-center justify-center w-40 h-40 rounded-full border-4 border-gold bg-gold/10 mx-auto mt-3">
        <p className="text-4xl font-black text-brand-dark leading-none">
          {score}
          <span className="text-2xl text-zinc-400">/{total}</span>
        </p>
        <p className="text-gold-dark font-bold text-sm mt-1">{pct}%</p>
      </div>
      <p className="text-xl font-bold text-[var(--foreground)] mt-6">{cheer}</p>

      {/* Time taken + attempt number — the facts the teacher asked for. */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm font-bold bg-brand-light text-brand-dark px-3.5 py-1.5 rounded-full">
          <span aria-hidden>⏱</span> Time taken: {formatDuration(durationSec)}
        </span>
        {attemptSummary && (
          <span className="inline-flex items-center gap-1.5 text-sm font-bold bg-gold/15 text-gold-dark px-3.5 py-1.5 rounded-full">
            <span aria-hidden>🔁</span> Attempt #{attemptSummary.attemptNumber} of {attemptSummary.totalAttempts}
          </span>
        )}
      </div>
      {attemptSummary && attemptSummary.totalAttempts > 1 && (
        <p className="text-xs text-zinc-500 mt-2">
          You&rsquo;ve taken this quiz {attemptSummary.totalAttempts} times so far.
        </p>
      )}

      {children}

      {/* Item-by-item review: exactly which items were right and wrong. */}
      <div className="mt-7 text-left">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="font-bold text-[var(--foreground)]">Your item review</h3>
          <p className="text-xs font-bold text-zinc-500">
            <span className="text-correct">{score} correct</span> · <span className="text-incorrect">{wrongCount} wrong</span>
          </p>
        </div>
        <p className="text-xs text-zinc-500 mt-0.5">
          Check what you missed below — the correct answer is shown for every wrong item.
        </p>

        <ol className="mt-3 space-y-2.5 max-h-96 overflow-y-auto pr-1">
          {review.map((item) => (
            <li
              key={item.label}
              className={[
                "rounded-2xl border-2 p-4",
                item.isCorrect ? "bg-correct-bg border-correct/25" : "bg-incorrect-bg border-incorrect/25",
              ].join(" ")}
            >
              <div className="flex items-start gap-2.5">
                <span
                  className={[
                    "shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-black text-white mt-0.5",
                    item.isCorrect ? "bg-correct" : "bg-incorrect",
                  ].join(" ")}
                  aria-label={item.isCorrect ? "Correct" : "Wrong"}
                >
                  {item.isCorrect ? "✓" : "✕"}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">{item.label}</p>
                  <p className="text-sm font-semibold text-[var(--foreground)] leading-snug">{item.prompt}</p>
                  <p className="text-sm mt-1.5">
                    <span className="text-zinc-500">Your answer: </span>
                    <span className={item.isCorrect ? "font-bold text-correct" : "font-bold text-incorrect"}>
                      {item.yourAnswer}
                    </span>
                  </p>
                  {!item.isCorrect && (
                    <p className="text-sm mt-0.5">
                      <span className="text-zinc-500">Correct answer: </span>
                      <span className="font-bold text-correct">{item.correctAnswer}</span>
                    </p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={onRetake}
          className="bg-brand text-white text-base font-bold px-6 py-3 rounded-xl hover:bg-brand-dark active:scale-95 transition-all cursor-pointer shadow-sm"
        >
          {retakeLabel ?? "Take it again"}
        </button>
        <button
          onClick={onExit}
          className="border-2 border-zinc-200 bg-white text-[var(--foreground)] text-base font-bold px-6 py-3 rounded-xl hover:bg-zinc-50 active:scale-95 transition-all cursor-pointer"
        >
          Back
        </button>
      </div>
    </div>
  );
}
