"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { McqQuestion, QuestionBank } from "@/lib/schema";
import { shuffle } from "@/lib/gameHelpers";
import { GameHeader, ResultsScreen, EmptyState } from "./QuizGame";

export interface MovingTargetsVariant {
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

export default function MovingTargetsGame({
  bank,
  onExit,
  variant,
}: {
  bank: QuestionBank;
  onExit: () => void;
  variant: MovingTargetsVariant;
}) {
  const questions = useMemo(
    () => shuffle(bank.questions.filter((q): q is McqQuestion => q.type === "mcq" && q.choices.length >= 2)),
    [bank]
  );
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [roundResult, setRoundResult] = useState<"correct" | "missed" | null>(null);
  const roundKeyRef = useRef(0);

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
    setRoundResult(null);
    if (!current) return;
    const timer = setTimeout(() => {
      setRoundResult((r) => r ?? "missed");
    }, ROUND_MS);
    return () => clearTimeout(timer);
  }, [current]);

  useEffect(() => {
    if (roundResult === null) return;
    const t = setTimeout(() => advance(), 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundResult]);

  if (questions.length === 0) {
    return <EmptyState onExit={onExit} message="This question bank has no multiple-choice questions for this game." />;
  }

  function tap(token: Token) {
    if (roundResult !== null) return;
    if (token.isCorrect) {
      setScore((s) => s + 1);
      setRoundResult("correct");
    } else {
      setRoundResult("missed");
    }
  }

  function advance() {
    roundKeyRef.current += 1;
    if (index + 1 >= questions.length) {
      setDone(true);
      return;
    }
    setIndex((i) => i + 1);
  }

  function restart() {
    roundKeyRef.current += 1;
    setIndex(0);
    setScore(0);
    setDone(false);
    setRoundResult(null);
  }

  if (done) {
    return <ResultsScreen score={score} total={questions.length} onRestart={restart} onExit={onExit} />;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <GameHeader title={variant.title} progress={`${index + 1} / ${questions.length} · score ${score}`} onExit={onExit} />

      <div className="mt-6 bg-white border border-zinc-200 rounded-xl p-4">
        <p className="font-semibold text-zinc-900 text-center mb-3">{current.prompt}</p>

        <div className={`relative h-64 rounded-lg overflow-hidden ${variant.background}`}>
          {tokens.map((token) => (
            <button
              key={token.key}
              onClick={() => tap(token)}
              disabled={roundResult !== null}
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

          {roundResult && (
            <div
              className={`absolute inset-0 flex items-center justify-center text-lg font-bold ${
                roundResult === "correct" ? "bg-green-50/90 text-green-700" : "bg-red-50/90 text-red-700"
              }`}
            >
              {roundResult === "correct" ? "Correct!" : `Missed — it was "${current.choices[current.correctIndex]}"`}
            </div>
          )}
        </div>
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
