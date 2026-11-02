"use client";

// components/games/TrueFalseGame.tsx
// True/False variant of the exam-mode quiz: statements are judged one by
// one with NO reveal after each answer — the ✓/✗ review, the time taken,
// and the attempt number all appear together on the results screen at the
// end. On a signed-in shared link, completed runs are recorded as numbered
// attempts (lib/attempts.ts).

import { useMemo, useRef, useState, useEffect } from "react";
import { McqQuestion, QuestionBank } from "@/lib/schema";
import { shuffle, pickRandom, coinFlip } from "@/lib/gameHelpers";
import { GameHeader, EmptyState } from "./QuizGame";
import QuizResults, { ReviewItem } from "./QuizResults";
import {
  AttemptContext,
  AttemptSummary,
  getNextAttemptNumber,
  refreshAttemptNumber,
  saveCompletedAttempt,
} from "@/lib/attempts";

interface Statement {
  question: McqQuestion;
  shownChoice: string;
  isTrue: boolean;
}

export default function TrueFalseGame({
  bank,
  onExit,
  attemptContext,
}: {
  bank: QuestionBank;
  onExit: () => void;
  /** Present only on a signed-in shared student link. */
  attemptContext?: AttemptContext;
}) {
  const statements = useMemo<Statement[]>(() => {
    const mcqs = bank.questions.filter((q): q is McqQuestion => q.type === "mcq" && q.choices.length >= 2);
    return shuffle(
      mcqs.map((q) => {
        const showCorrect = coinFlip();
        let shownChoice = q.choices[q.correctIndex];
        if (!showCorrect) {
          const wrongOptions = q.choices.filter((_, i) => i !== q.correctIndex);
          shownChoice = pickRandom(wrongOptions);
        }
        return { question: q, shownChoice, isTrue: showCorrect };
      })
    );
  }, [bank]);

  const [index, setIndex] = useState(0);
  /** Student's True/False pick per statement; null = not yet answered. */
  const [answers, setAnswers] = useState<(boolean | null)[]>(() => statements.map(() => null));
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
  const [attemptSummary, setAttemptSummary] = useState<AttemptSummary | null>(null);
  const [review, setReview] = useState<ReviewItem[]>([]);
  const [durationSec, setDurationSec] = useState(0);

  if (statements.length === 0) {
    return <EmptyState onExit={onExit} message="This question bank has no multiple-choice questions to convert to True/False." />;
  }

  const current = statements[index];
  const answered = answers[index];

  function answer(choseTrue: boolean) {
    if (answered !== null) return;
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = choseTrue;
      return next;
    });
    // NOTE: deliberately no scoring, no correct/wrong reveal here —
    // students find out everything at the end.
  }

  function next() {
    if (index + 1 >= statements.length) {
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
    statements.forEach((s, si) => {
      const picked = answers[si];
      const isCorrect = picked !== null && picked === s.isTrue;
      if (isCorrect) score++;
      const correctLabel = s.isTrue
        ? "True"
        : `False — the correct answer is "${s.question.choices[s.question.correctIndex]}"`;
      items.push({
        label: `Item ${si + 1}`,
        prompt: `${s.question.prompt} "${s.shownChoice}"`,
        yourAnswer: picked === null ? "No answer" : picked ? "True" : "False",
        correctAnswer: correctLabel,
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
        total: statements.length,
        game: "true-false",
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
    setAnswers(statements.map(() => null));
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
        score={review.filter((r) => r.isCorrect).length}
        total={statements.length}
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
        title="True or False"
        progress={`${index + 1} / ${statements.length}`}
        attemptLabel={attemptNumber > 0 ? `Attempt #${attemptNumber}` : undefined}
        onExit={onExit}
      />

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
              "py-4 rounded-lg border-2 font-semibold text-lg transition-all",
              answered === null
                ? "border-green-400 text-green-700 bg-green-50 hover:bg-green-100 cursor-pointer active:scale-[0.98]"
                : "cursor-default",
              answered !== null && answered
                // Neutral "your pick" styling — reveals nothing.
                ? "!border-brand !bg-brand-light !text-brand-dark"
                : "",
              answered !== null && !answered ? "border-zinc-200 text-zinc-400 bg-white opacity-60" : "",
            ].join(" ")}
          >
            True
          </button>
          <button
            onClick={() => answer(false)}
            disabled={answered !== null}
            className={[
              "py-4 rounded-lg border-2 font-semibold text-lg transition-all",
              answered === null
                ? "border-red-400 text-red-700 bg-red-50 hover:bg-red-100 cursor-pointer active:scale-[0.98]"
                : "cursor-default",
              answered !== null && !answered
                ? "!border-brand !bg-brand-light !text-brand-dark"
                : "",
              answered !== null && answered ? "border-zinc-200 text-zinc-400 bg-white opacity-60" : "",
            ].join(" ")}
          >
            False
          </button>
        </div>

        {answered !== null && (
          <button
            onClick={next}
            className="mt-5 bg-zinc-900 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-zinc-700 cursor-pointer"
          >
            {index + 1 >= statements.length ? "See results" : "Next"}
          </button>
        )}

        <p className="mt-4 text-xs text-zinc-400">
          Answers stay hidden until you finish — you&rsquo;ll get a full review at the end.
        </p>
      </div>
    </div>
  );
}
