"use client";

// components/games/QuizGame.tsx
// The classic question-by-question quiz. EXAM MODE:
//  - Picking an answer never reveals whether it was right — no colors, no
//    stamps — students only see "Next question" and move on.
//  - The full item-by-item review (correct/wrong + the right answer for
//    every missed item), the time taken, and the attempt number appear all
//    at once on the results screen at the end.
//  - On a signed-in shared link (attemptContext prop), every completed run
//    is recorded as a numbered attempt for that student (lib/attempts.ts).

import { useEffect, useMemo, useRef, useState } from "react";
import { McqQuestion, QuestionBank } from "@/lib/schema";
import { shuffle } from "@/lib/gameHelpers";
import {
  AttemptContext,
  AttemptSummary,
  getNextAttemptNumber,
  refreshAttemptNumber,
  saveCompletedAttempt,
} from "@/lib/attempts";
import QuizResults, { ReviewItem } from "./QuizResults";
import Confetti from "./Confetti";

interface PreparedQuestion {
  q: McqQuestion;
  /** The choice order for THIS run, pre-shuffled once — remembered so the
   * end-of-quiz review can map the student's pick back to correctness. */
  shuffled: { text: string; isCorrect: boolean }[];
  /** Text of the correct choice, in the ORIGINAL choices order — used as
   * "Correct answer" in the review (stable regardless of shuffling). */
  correctText: string;
}

export default function QuizGame({
  bank,
  onExit,
  attemptContext,
}: {
  bank: QuestionBank;
  onExit: () => void;
  /** Present only on a signed-in shared student link. */
  attemptContext?: AttemptContext;
}) {
  // Prepare every question (shuffle all choices) once per run up front, so
  // answers can be scored and reviewed at the end.
  const questions = useMemo<PreparedQuestion[]>(
    () =>
      shuffle(bank.questions.filter((q): q is McqQuestion => q.type === "mcq")).map((q) => ({
        q,
        shuffled: shuffle(q.choices.map((text, i) => ({ text, isCorrect: i === q.correctIndex }))),
        correctText: q.choices[q.correctIndex],
      })),
    [bank]
  );

  const [index, setIndex] = useState(0);
  /** Chosen shuffled-choice index per question; null = not yet answered. */
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [done, setDone] = useState(false);
  /** Increments on every retake so the header timer restarts each run. */
  const [runId, setRunId] = useState(0);

  // When this run started (for "time taken"). Re-set after every remount
  // and retake — effects run before the student can possibly finish, so
  // finish() always reads a fresh timestamp.
  const startedAtRef = useRef(0);
  useEffect(() => {
    startedAtRef.current = Date.now();
  }, [runId]);

  // The attempt THIS run is, computed once at run start from the best
  // information on this device. 0 = not tracked (teacher's own local
  // session — no numbering, no recording). Corrected once the server
  // answers, in case the student played on another device too.
  const [attemptNumber, setAttemptNumber] = useState(() =>
    attemptContext ? getNextAttemptNumber(attemptContext) : 0
  );
  useEffect(() => {
    if (!attemptContext) return;
    let cancelled = false;
    refreshAttemptNumber(attemptContext).then((n) => {
      if (!cancelled) setAttemptNumber(n);
    });
    return () => {
      cancelled = true;
    };
  }, [attemptContext]);
  // Summary filled in when the run finishes (attempt recorded → totals known).
  const [attemptSummary, setAttemptSummary] = useState<AttemptSummary | null>(null);
  const [review, setReview] = useState<ReviewItem[]>([]);
  const [durationSec, setDurationSec] = useState(0);

  const current = questions[index];
  const selected = answers[index];

  if (questions.length === 0) {
    return (
      <EmptyState onExit={onExit} message="This question bank has no multiple-choice questions to quiz on." />
    );
  }

  function choose(i: number) {
    if (selected !== null) return; // lock after first answer
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = i;
      return next;
    });
    // NOTE: deliberately no scoring, no correct/wrong reveal here —
    // students find out everything at the end.
  }

  function next() {
    if (index + 1 >= questions.length) {
      finish();
      return;
    }
    setIndex((i) => i + 1);
  }

  /** Scores the run, records the attempt (device-local + Supabase, which
   * assigns the authoritative attempt number), and builds the item review. */
  async function finish() {
    const items: ReviewItem[] = [];
    let score = 0;
    questions.forEach((prepared, qi) => {
      const picked = answers[qi];
      const isCorrect = picked !== null && prepared.shuffled[picked].isCorrect;
      if (isCorrect) score++;
      items.push({
        label: `Item ${qi + 1}`,
        prompt: prepared.q.prompt,
        yourAnswer: picked === null ? "No answer" : prepared.shuffled[picked].text,
        correctAnswer: prepared.correctText,
        isCorrect,
      });
    });

    const secs = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
    setDurationSec(secs);
    setReview(items);

    let summary: AttemptSummary | null = null;
    if (attemptContext) {
      summary = await saveCompletedAttempt(attemptContext, {
        durationSec: secs,
        score,
        total: questions.length,
        game: "quiz",
        details: items,
      });
    } else if (attemptNumber > 0) {
      summary = { attemptNumber, totalAttempts: attemptNumber };
    }
    setAttemptSummary(summary);

    setDone(true);
  }

  function restart() {
    setIndex(0);
    setAnswers(questions.map(() => null));
    setDone(false);
    setAttemptSummary(null);
    setReview([]);
    setDurationSec(0);
    setRunId((r) => r + 1);
    if (attemptContext) {
      setAttemptNumber(getNextAttemptNumber(attemptContext));
    } else if (attemptNumber > 0) {
      setAttemptNumber((n) => n + 1);
    }
  }

  if (done) {
    return (
      <QuizResults
        score={countScore(review)}
        total={questions.length}
        review={review}
        durationSec={durationSec}
        attemptSummary={attemptSummary ?? undefined}
        retakeLabel={attemptContext ? `Take it again · Attempt #${attemptNumber + 1}` : "Play again"}
        onRetake={restart}
        onExit={onExit}
      />
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <GameHeader
        key={runId}
        title="Quiz"
        progress={`${index + 1} / ${questions.length}`}
        attemptLabel={attemptNumber > 0 ? `Attempt #${attemptNumber}` : undefined}
        onExit={onExit}
      />

      <div className="mt-6 bg-white border border-zinc-200 rounded-3xl p-8 shadow-sm">
        <p className="text-2xl font-bold text-[var(--foreground)] leading-snug">{current.q.prompt}</p>

        <div className="mt-6 grid gap-3">
          {current.shuffled.map((c, i) => {
            const isSelected = selected === i;
            const answered = selected !== null;
            return (
              <button
                key={i}
                onClick={() => choose(i)}
                disabled={answered}
                className={[
                  "text-left px-5 py-4 rounded-2xl border-2 text-lg font-semibold transition-all",
                  isSelected
                    // Neutral "your pick" styling — deliberately reveals
                    // nothing about correctness.
                    ? "border-brand bg-brand-light text-brand-dark"
                    : "border-zinc-200 bg-white text-[var(--foreground)]",
                  !answered ? "hover:border-brand hover:bg-brand-light active:scale-[0.98] cursor-pointer" : "",
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

        <p className="mt-4 text-xs text-zinc-400">
          Answers stay hidden until you finish — you&rsquo;ll get a full review at the end.
        </p>
      </div>
    </div>
  );
}

function countScore(review: ReviewItem[]): number {
  return review.filter((r) => r.isCorrect).length;
}

export function GameHeader({
  title,
  progress,
  attemptLabel,
  onExit,
}: {
  title: string;
  progress?: string;
  /** Optional gold chip, e.g. "Attempt #2" — shown on shared student links. */
  attemptLabel?: string;
  onExit: () => void;
}) {
  // GameHeader is mounted with key={runId} by the games, so a retake fully
  // remounts it and the timer restarts from 0:00 for the new attempt.
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
        {attemptLabel && (
          <span className="text-sm font-bold bg-gold/15 text-gold-dark px-3 py-1.5 rounded-full whitespace-nowrap">
            🔁 {attemptLabel}
          </span>
        )}
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
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
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
