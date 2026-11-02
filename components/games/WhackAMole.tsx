"use client";

// components/games/WhackAMole.tsx
// ARCADE GAME, EXAM MODE: moles pop up one at a time and the student whacks
// the one they think carries the correct answer — but nothing ever tells
// them if they were right. No "Correct hit!", no score ticking up mid-game,
// no reveal of the right mole; each round just moves on. Every round IS
// scored silently, and the full item-by-item review, the time taken, and
// the attempt number all appear together on the results screen at the end
// (QuizResults). On a signed-in shared link, the completed run is recorded
// as a numbered attempt (lib/attempts.ts).

import { useEffect, useMemo, useRef, useState } from "react";
import { McqQuestion, QuestionBank } from "@/lib/schema";
import { shuffle, pickRandom } from "@/lib/gameHelpers";
import { GameHeader, EmptyState } from "./QuizGame";
import QuizResults, { ReviewItem } from "./QuizResults";
import {
  AttemptContext,
  AttemptSummary,
  getNextAttemptNumber,
  refreshAttemptNumber,
  saveCompletedAttempt,
} from "@/lib/attempts";

const HOLES = 6;
const MOLE_UP_MS = 1300;
const SPAWN_GAP_MS = 300;
const ROUND_MS = 8000;
/** Neutral beat between rounds — enough to keep the arcade pace, too short
 * for anything revealing to be shown (nothing is). */
const NEXT_ROUND_MS = 700;

interface Mole {
  id: number;
  hole: number;
  text: string;
  isCorrect: boolean;
}

export default function WhackAMole({
  bank,
  onExit,
  attemptContext,
}: {
  bank: QuestionBank;
  onExit: () => void;
  /** Present only on a signed-in shared student link. */
  attemptContext?: AttemptContext;
}) {
  const questions = useMemo(
    () => shuffle(bank.questions.filter((q): q is McqQuestion => q.type === "mcq" && q.choices.length >= 2)),
    [bank]
  );
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [mole, setMole] = useState<Mole | null>(null);
  const [roundOver, setRoundOver] = useState(false);
  /** What the student whacked each round, in question order — null when
   * the round ended untouched. Scored silently at the end, never shown
   * during play. */
  const [picks, setPicks] = useState<(string | null)[]>(() => questions.map(() => null));
  /** Increments on every retake so the header timer restarts each run. */
  const [runId, setRunId] = useState(0);

  const startedAtRef = useRef(0);
  useEffect(() => {
    startedAtRef.current = Date.now();
  }, [runId]);

  // The attempt THIS run is. Starts from the best number on this device,
  // then gets corrected once the server answers (the student may have
  // played on another device).
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

  const moleIdRef = useRef(0);
  const spawnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roundTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = questions[index];

  function clearAllTimers() {
    if (spawnTimerRef.current) clearTimeout(spawnTimerRef.current);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (roundTimerRef.current) clearTimeout(roundTimerRef.current);
  }

  useEffect(() => {
    if (!current) return;
    setMole(null);
    setRoundOver(false);
    clearAllTimers();

    const decoys = shuffle(current.choices.filter((_, i) => i !== current.correctIndex));
    const correctAnswer = current.choices[current.correctIndex];

    function spawnNext() {
      moleIdRef.current += 1;
      const showCorrect = Math.random() < 0.4; // correct answer appears ~40% of spawns
      const text = showCorrect ? correctAnswer : pickRandom(decoys.length ? decoys : [correctAnswer]);
      const newMole: Mole = { id: moleIdRef.current, hole: Math.floor(Math.random() * HOLES), text, isCorrect: text === correctAnswer };
      setMole(newMole);
      hideTimerRef.current = setTimeout(() => {
        setMole((m) => (m?.id === newMole.id ? null : m));
        spawnTimerRef.current = setTimeout(spawnNext, SPAWN_GAP_MS);
      }, MOLE_UP_MS);
    }

    spawnTimerRef.current = setTimeout(spawnNext, 400);
    roundTimerRef.current = setTimeout(() => {
      // Time ran out — no feedback, the next round just starts.
      clearAllTimers();
      setMole(null);
      setRoundOver(true);
    }, ROUND_MS);

    return clearAllTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  useEffect(() => {
    if (!roundOver || saving) return;
    const t = setTimeout(advance, NEXT_ROUND_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundOver]);

  if (questions.length === 0) {
    return <EmptyState onExit={onExit} message="This question bank has no multiple-choice questions for Whack-a-Mole." />;
  }

  function whack(m: Mole) {
    if (roundOver) return;
    clearAllTimers();
    setMole(null);
    setPicks((prev) => {
      const next = [...prev];
      next[index] = m.text;
      return next;
    });
    // NOTE: deliberately no correct/wrong reveal here — students find out
    // everything on the results screen at the end.
    setRoundOver(true);
  }

  function advance() {
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
        game: "whack-a-mole",
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
    setIndex(0);
    setPicks(questions.map(() => null));
    setDone(false);
    setMole(null);
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
    <div className="max-w-xl mx-auto">
      <GameHeader
        key={runId}
        title="Whack-a-Mole"
        progress={`${index + 1} / ${questions.length}`}
        attemptLabel={attemptNumber > 0 ? `Attempt #${attemptNumber}` : undefined}
        onExit={onExit}
      />

      <div className="mt-6 bg-white border border-zinc-200 rounded-xl p-4">
        <p className="font-semibold text-zinc-900 text-center mb-3">
          Whack the answer to: <span className="text-indigo-700">{current.prompt}</span>
        </p>

        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: HOLES }, (_, i) => (
            <div key={i} className="relative aspect-square bg-amber-900/10 rounded-full border-4 border-amber-900/20 flex items-center justify-center overflow-hidden">
              {mole?.hole === i && (
                <button
                  onClick={() => whack(mole)}
                  className="absolute inset-2 rounded-full bg-amber-700 text-white text-xs font-semibold flex items-center justify-center text-center p-1 cursor-pointer hover:bg-amber-600"
                >
                  {mole.text}
                </button>
              )}
            </div>
          ))}
        </div>

        {roundOver && (
          <p className="mt-4 text-center font-medium text-zinc-500">
            {saving ? "Finishing up…" : "Next one coming up…"}
          </p>
        )}

        <p className="mt-3 text-xs text-zinc-400 text-center">
          Answers stay hidden until you finish — you&rsquo;ll get a full review at the end.
        </p>
      </div>
    </div>
  );
}
