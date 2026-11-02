"use client";

// components/games/MovingTargetsGame.tsx
// Shared engine for the "answers fly across the screen" arcade games
// (Flying Fruit, Airplane). EXAM MODE: the student taps the token they
// think is the correct answer — but nothing ever tells them if they were
// right. No "Correct!", no `Missed — it was "..."` reveal, no live score;
// each round just moves on. Rounds are scored silently and the full
// item-by-item review, the time taken, and the attempt number appear
// together on the results screen at the end (QuizResults). On a signed-in
// shared link, the completed run is recorded as a numbered attempt
// (lib/attempts.ts).

import { useEffect, useMemo, useRef, useState } from "react";
import { McqQuestion, QuestionBank } from "@/lib/schema";
import { shuffle } from "@/lib/gameHelpers";
import { GameHeader, EmptyState } from "./QuizGame";
import QuizResults, { ReviewItem } from "./QuizResults";
import {
  AttemptContext,
  AttemptSummary,
  getNextAttemptNumber,
  refreshAttemptNumber,
  saveCompletedAttempt,
} from "@/lib/attempts";

export interface MovingTargetsVariant {
  /** Template id used when recording attempts ("flying-fruit", "airplane"). */
  gameId: string;
  title: string;
  icon: string; // emoji used for each moving token
  laneDurationMs: [number, number]; // min/max time to cross the screen
  background: string; // Tailwind classes for the play area
}

interface Token {
  key: string;
  text: string;
  isCorrect: boolean;
  lane: number; // 0-3, vertical position
  durationMs: number;
  delayMs: number;
}

const LANES = 4;
const ROUND_MS = 13000; // time allowed per question before auto-advancing — must comfortably exceed the slowest lane duration
/** Neutral beat between rounds — nothing revealing is shown, this just
 * keeps the arcade pacing. */
const NEXT_ROUND_MS = 700;

export default function MovingTargetsGame({
  bank,
  onExit,
  variant,
  attemptContext,
}: {
  bank: QuestionBank;
  onExit: () => void;
  variant: MovingTargetsVariant;
  /** Present only on a signed-in shared student link. */
  attemptContext?: AttemptContext;
}) {
  const questions = useMemo(
    () => shuffle(bank.questions.filter((q): q is McqQuestion => q.type === "mcq" && q.choices.length >= 2)),
    [bank]
  );
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
  /** What the student tapped each round, in question order — null when the
   * round timed out untouched. Scored silently at the end, never shown
   * during play. */
  const [picks, setPicks] = useState<(string | null)[]>(() => questions.map(() => null));
  const [roundOver, setRoundOver] = useState(false);
  /** Increments on every retake so the header timer restarts each run. */
  const [runId, setRunId] = useState(0);
  const roundKeyRef = useRef(0);

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
  const [saving, setSaving] = useState(false);

  const current = questions[index];

  const tokens = useMemo<Token[]>(() => {
    if (!current) return [];
    // Cap to at most 4 choices on screen at once (one per lane) so it stays readable.
    const choices = current.choices.slice(0, LANES).map((text, i) => ({ text, isCorrect: i === current.correctIndex }));
    // Guarantee the correct answer is included even if it got sliced off.
    if (!choices.some((c) => c.isCorrect)) {
      choices[choices.length - 1] = { text: current.choices[current.correctIndex], isCorrect: true };
    }
    const shuffledLanes = shuffle([...Array(LANES).keys()]);
    return shuffle(choices).map((c, i) => ({
      key: `${current.id}-${i}-${roundKeyRef.current}`,
      text: c.text,
      isCorrect: c.isCorrect,
      lane: shuffledLanes[i % LANES],
      durationMs: variant.laneDurationMs[0] + Math.random() * (variant.laneDurationMs[1] - variant.laneDurationMs[0]),
      delayMs: Math.random() * 1000,
    }));
  }, [current, variant.laneDurationMs]);

  useEffect(() => {
    setRoundOver(false);
    if (!current) return;
    const timer = setTimeout(() => {
      // Time ran out — no feedback, the next round just starts.
      setRoundOver(true);
    }, ROUND_MS);
    return () => clearTimeout(timer);
  }, [current]);

  useEffect(() => {
    if (!roundOver || saving) return;
    const t = setTimeout(() => advance(), NEXT_ROUND_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundOver]);

  if (questions.length === 0) {
    return <EmptyState onExit={onExit} message="This question bank has no multiple-choice questions for this game." />;
  }

  function tap(token: Token) {
    if (roundOver) return;
    setPicks((prev) => {
      const next = [...prev];
      next[index] = token.text;
      return next;
    });
    // NOTE: deliberately no correct/wrong reveal here — students find out
    // everything on the results screen at the end.
    setRoundOver(true);
  }

  function advance() {
    roundKeyRef.current += 1;
    if (index + 1 >= questions.length) {
      finish();
      return;
    }
    setIndex((i) => i + 1);
  }

  /** Scores the run, records the attempt, and builds the item review. */
  async function finish() {
    const items: ReviewItem[] = questions.map((q, qi) => {
      const picked = picks[qi];
      const correctText = q.choices[q.correctIndex];
      const isCorrect = picked !== null && picked === correctText;
      return {
        label: `Item ${qi + 1}`,
        prompt: q.prompt,
        yourAnswer: picked ?? "No answer",
        correctAnswer: correctText,
        isCorrect,
      };
    });
    const score = items.filter((i) => i.isCorrect).length;

    const secs = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
    setDurationSec(secs);
    setReview(items);
    setSaving(true);

    let summary: AttemptSummary | null = null;
    if (attemptContext) {
      summary = await saveCompletedAttempt(attemptContext, {
        durationSec: secs,
        score,
        total: questions.length,
        game: variant.gameId,
        details: items,
      });
    } else if (attemptNumber > 0) {
      summary = { attemptNumber, totalAttempts: attemptNumber };
    }
    setAttemptSummary(summary);
    setSaving(false);
    setDone(true);
  }

  function restart() {
    roundKeyRef.current += 1;
    setIndex(0);
    setPicks(questions.map(() => null));
    setDone(false);
    setRoundOver(false);
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
        total={questions.length}
        review={review}
        durationSec={durationSec}
        attemptSummary={attemptSummary ?? undefined}
        retakeLabel={attemptContext ? `Play again · Attempt #${attemptNumber + 1}` : "Play again"}
        onRetake={restart}
        onExit={onExit}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <GameHeader
        key={runId}
        title={variant.title}
        progress={`${index + 1} / ${questions.length}`}
        attemptLabel={attemptNumber > 0 ? `Attempt #${attemptNumber}` : undefined}
        onExit={onExit}
      />

      <div className="mt-6 bg-white border border-zinc-200 rounded-xl p-4">
        <p className="font-semibold text-zinc-900 text-center mb-3">{current.prompt}</p>

        <div className={`relative h-64 rounded-lg overflow-hidden ${variant.background}`}>
          {tokens.map((token) => (
            <button
              key={token.key}
              onClick={() => tap(token)}
              className="moving-target absolute px-3 py-1.5 rounded-full bg-white/90 border border-zinc-300 text-sm font-medium text-zinc-900 hover:bg-white cursor-pointer whitespace-nowrap"
              style={{
                top: `${(token.lane / LANES) * 100 + 100 / LANES / 2}%`,
                animationDuration: `${token.durationMs}ms`,
                animationDelay: `${token.delayMs}ms`,
              }}
            >
              {variant.icon} {token.text}
            </button>
          ))}

          {roundOver && (
            <div className="absolute inset-x-0 bottom-2 flex justify-center pointer-events-none">
              <span className="bg-white/90 border border-zinc-200 text-zinc-500 text-sm font-bold px-4 py-1.5 rounded-full shadow-sm">
                {saving ? "Finishing up…" : "Next one coming up…"}
              </span>
            </div>
          )}
        </div>

        <p className="mt-3 text-xs text-zinc-400 text-center">
          Answers stay hidden until you finish — you&rsquo;ll get a full review at the end.
        </p>
      </div>

      <style jsx>{`
        .moving-target {
          left: 100%;
          animation-name: fly-across;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          transform: translateY(-50%);
        }
        @keyframes fly-across {
          from {
            transform: translate(0, -50%);
          }
          to {
            transform: translate(-1000px, -50%);
          }
        }
      `}</style>
    </div>
  );
}
