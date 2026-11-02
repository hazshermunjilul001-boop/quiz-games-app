"use client";

// components/games/MazeChase.tsx
// ARCADE GAME, EXAM MODE: the student runs to the answer tile they think is
// correct — but nothing ever tells them if they were right. No "Correct
// zone!", no `Wrong zone — the answer was "..."` reveal, no live score;
// each maze just moves on. (Being caught by an enemy still bounces you back
// to start — that's the arcade challenge, not answer feedback.) Rounds are
// scored silently and the full item-by-item review, the time taken, and the
// attempt number appear together on the results screen at the end
// (QuizResults). On a signed-in shared link, the completed run is recorded
// as a numbered attempt (lib/attempts.ts).

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

const GRID = 5;
const START = { row: 2, col: 0 };
/** Neutral beat after stepping on an answer tile — nothing revealing is
 * shown, this just keeps the game from snapping to the next maze. */
const NEXT_ROUND_MS = 700;

interface Cell {
  kind: "empty" | "enemy" | "choice";
  label?: string;
  isCorrect?: boolean;
}

export default function MazeChase({
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
  const [pos, setPos] = useState(START);
  const [bumpMsg, setBumpMsg] = useState<string | null>(null);
  const [roundOver, setRoundOver] = useState(false);
  /** What the student ran to each round, in question order — they must
   * step on a tile to move on, so this is never null for a completed run.
   * Scored silently at the end, never shown during play. */
  const [picks, setPicks] = useState<(string | null)[]>(() => questions.map(() => null));
  /** Increments on every retake so the header timer restarts each run. */
  const [runId, setRunId] = useState(0);

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

  const grid = useMemo<Cell[][]>(() => {
    if (!current) return [];
    const cells: Cell[][] = Array.from({ length: GRID }, () => Array.from({ length: GRID }, () => ({ kind: "empty" as const })));

    const usedPositions = new Set<string>([`${START.row},${START.col}`]);
    function randomFreeCell() {
      let r: number, c: number;
      do {
        r = Math.floor(Math.random() * GRID);
        c = Math.floor(Math.random() * GRID);
      } while (usedPositions.has(`${r},${c}`));
      usedPositions.add(`${r},${c}`);
      return { r, c };
    }

    const choices = current.choices.slice(0, 4);
    choices.forEach((text, i) => {
      const { r, c } = randomFreeCell();
      cells[r][c] = { kind: "choice", label: text, isCorrect: i === current.correctIndex };
    });

    const enemyCount = 4;
    for (let i = 0; i < enemyCount; i++) {
      const { r, c } = randomFreeCell();
      cells[r][c] = { kind: "enemy" };
    }

    return cells;
  }, [current]);

  if (questions.length === 0) {
    return <EmptyState onExit={onExit} message="This question bank has no multiple-choice questions for Maze Chase." />;
  }

  function move(dr: number, dc: number) {
    if (roundOver) return;
    const nr = Math.min(GRID - 1, Math.max(0, pos.row + dr));
    const nc = Math.min(GRID - 1, Math.max(0, pos.col + dc));
    if (nr === pos.row && nc === pos.col) return;

    const cell = grid[nr][nc];
    if (cell.kind === "enemy") {
      setBumpMsg("Caught by an enemy — back to start!");
      setPos(START);
      setTimeout(() => setBumpMsg(null), 900);
      return;
    }
    setPos({ row: nr, col: nc });

    if (cell.kind === "choice") {
      setPicks((prev) => {
        const next = [...prev];
        next[index] = cell.label ?? null;
        return next;
      });
      // NOTE: deliberately no correct/wrong reveal here — students find out
      // everything on the results screen at the end.
      setRoundOver(true);
    }
  }

  useEffect(() => {
    if (!roundOver || saving) return;
    const t = setTimeout(advance, NEXT_ROUND_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundOver]);

  function advance() {
    setPos(START);
    setRoundOver(false);
    setBumpMsg(null);
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
        game: "maze-chase",
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
    setPos(START);
    setRoundOver(false);
    setBumpMsg(null);
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
        title="Maze Chase"
        progress={`${index + 1} / ${questions.length}`}
        attemptLabel={attemptNumber > 0 ? `Attempt #${attemptNumber}` : undefined}
        onExit={onExit}
      />

      <div className="mt-6 bg-white border border-zinc-200 rounded-xl p-4">
        <p className="font-semibold text-zinc-900 text-center mb-3">
          Run to the answer for: <span className="text-indigo-700">{current.prompt}</span>
        </p>

        <div className="grid gap-1 mx-auto" style={{ gridTemplateColumns: `repeat(${GRID}, minmax(0, 1fr))`, maxWidth: 340 }}>
          {grid.map((row, r) =>
            row.map((cell, c) => {
              const isPlayer = pos.row === r && pos.col === c;
              return (
                <div
                  key={`${r}-${c}`}
                  className={[
                    "aspect-square rounded-md border flex items-center justify-center text-[10px] font-medium text-center p-0.5 leading-tight",
                    cell.kind === "enemy" ? "bg-red-100 border-red-300 text-red-700" : "",
                    cell.kind === "choice" ? "bg-indigo-50 border-indigo-300 text-indigo-800" : "",
                    cell.kind === "empty" ? "bg-zinc-50 border-zinc-200" : "",
                  ].join(" ")}
                >
                  {isPlayer ? "🧑" : cell.kind === "enemy" ? "👾" : cell.label}
                </div>
              );
            })
          )}
        </div>

        <div className="mt-4 flex flex-col items-center gap-1">
          <button onClick={() => move(-1, 0)} className="w-10 h-10 rounded-md border border-zinc-300 bg-white hover:bg-zinc-50 cursor-pointer">↑</button>
          <div className="flex gap-1">
            <button onClick={() => move(0, -1)} className="w-10 h-10 rounded-md border border-zinc-300 bg-white hover:bg-zinc-50 cursor-pointer">←</button>
            <button onClick={() => move(1, 0)} className="w-10 h-10 rounded-md border border-zinc-300 bg-white hover:bg-zinc-50 cursor-pointer">↓</button>
            <button onClick={() => move(0, 1)} className="w-10 h-10 rounded-md border border-zinc-300 bg-white hover:bg-zinc-50 cursor-pointer">→</button>
          </div>
        </div>

        {bumpMsg && <p className="mt-3 text-center text-sm font-medium text-red-700">{bumpMsg}</p>}
        {roundOver && (
          <p className="mt-3 text-center font-medium text-zinc-500">
            {saving ? "Finishing up…" : "Next maze coming up…"}
          </p>
        )}

        <p className="mt-3 text-xs text-zinc-400 text-center">
          Answers stay hidden until you finish — you&rsquo;ll get a full review at the end.
        </p>
      </div>
    </div>
  );
}
