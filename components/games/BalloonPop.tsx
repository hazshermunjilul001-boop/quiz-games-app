"use client";

import { useMemo, useState } from "react";
import { QuestionBank, TermDefinitionQuestion } from "@/lib/schema";
import { shuffle } from "@/lib/gameHelpers";
import { GameHeader, ResultsScreen, EmptyState } from "./QuizGame";

const COLORS = ["#ef4444", "#3b82f6", "#eab308", "#22c55e", "#a855f7", "#f97316"];
const ROUND_MS = 7000;

interface Balloon {
  key: string;
  term: string;
  isCorrect: boolean;
  leftPct: number;
  durationMs: number;
  delayMs: number;
  color: string;
}

export default function BalloonPop({ bank, onExit }: { bank: QuestionBank; onExit: () => void }) {
  const pairs = useMemo(
    () => shuffle(bank.questions.filter((q): q is TermDefinitionQuestion => q.type === "term-definition")),
    [bank]
  );
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [poppedKey, setPoppedKey] = useState<string | null>(null);
  const [result, setResult] = useState<"correct" | "missed" | null>(null);
  const [roundKey, setRoundKey] = useState(0);

  const current = pairs[index];

  const balloons = useMemo<Balloon[]>(() => {
    if (!current) return [];
    const decoys = shuffle(pairs.filter((p) => p.id !== current.id)).slice(0, 4).map((p) => p.term);
    const options = shuffle([current.term, ...decoys]);
    return options.map((term, i) => ({
      key: `${current.id}-${i}-${roundKey}`,
      term,
      isCorrect: term === current.term,
      leftPct: 8 + i * (84 / Math.max(options.length - 1, 1)),
      durationMs: 4500 + Math.random() * 2000,
      delayMs: Math.random() * 1200,
      color: COLORS[i % COLORS.length],
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, roundKey]);

  if (pairs.length === 0) {
    return <EmptyState onExit={onExit} message="This question bank has no term/definition pairs for Balloon Pop." />;
  }

  function pop(balloon: Balloon) {
    if (result !== null) return;
    setPoppedKey(balloon.key);
    setResult(balloon.isCorrect ? "correct" : "missed");
    if (balloon.isCorrect) setScore((s) => s + 1);
    setTimeout(advance, 900);
  }

  function advance() {
    setPoppedKey(null);
    setResult(null);
    setRoundKey((k) => k + 1);
    if (index + 1 >= pairs.length) {
      setDone(true);
      return;
    }
    setIndex((i) => i + 1);
  }

  function restart() {
    setIndex(0);
    setScore(0);
    setDone(false);
    setPoppedKey(null);
    setResult(null);
    setRoundKey((k) => k + 1);
  }

  if (done) {
    return <ResultsScreen score={score} total={pairs.length} onRestart={restart} onExit={onExit} />;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <GameHeader title="Balloon Pop" progress={`${index + 1} / ${pairs.length} · score ${score}`} onExit={onExit} />

      <div className="mt-6 bg-white border border-zinc-200 rounded-xl p-4">
        <p className="font-semibold text-zinc-900 text-center mb-3">Pop the balloon for: {current.definition}</p>

        <div className="relative h-72 rounded-lg overflow-hidden bg-gradient-to-b from-sky-50 to-sky-100">
          {balloons.map((b) => (
            <button
              key={b.key}
              onClick={() => pop(b)}
              disabled={result !== null}
              className={`balloon absolute px-3 py-4 rounded-full text-white text-xs font-semibold shadow-md cursor-pointer text-center ${
                poppedKey === b.key ? (b.isCorrect ? "scale-0 opacity-0" : "animate-pulse") : ""
              }`}
              style={{
                left: `${b.leftPct}%`,
                backgroundColor: b.color,
                animationDuration: `${b.durationMs}ms`,
                animationDelay: `${b.delayMs}ms`,
                width: "84px",
                height: "100px",
                transition: "transform 300ms, opacity 300ms",
              }}
            >
              {b.term}
            </button>
          ))}
        </div>
      </div>

      <style jsx>{`
        .balloon {
          bottom: -120px;
          animation-name: float-up;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        @keyframes float-up {
          from {
            transform: translateY(0);
          }
          to {
            transform: translateY(-420px);
          }
        }
      `}</style>
    </div>
  );
}
