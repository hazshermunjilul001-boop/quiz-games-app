"use client";

import { useMemo, useState } from "react";
import { QuestionBank, TermDefinitionQuestion } from "@/lib/schema";
import { shuffle } from "@/lib/gameHelpers";
import { GameHeader, ResultsScreen, EmptyState } from "./QuizGame";
import ThemedCard from "./ui/ThemedCard";
import HitBurst from "./ui/HitBurst";

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
    <div className="mx-auto w-full max-w-6xl">
      <GameHeader title="Balloon Pop" progress={`${index + 1} / ${pairs.length} · score ${score}`} onExit={onExit} />

      <ThemedCard family="arcade" className="mt-6">
        <p className="font-black text-white text-center mb-4 text-lg">Pop the balloon for: <span className="text-sky-100">{current.definition}</span></p>

        <div className="relative h-80 rounded-3xl overflow-hidden bg-gradient-to-b from-sky-400/70 via-sky-500/45 to-indigo-950/60 border border-white/30 shadow-inner">
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-indigo-950/35 to-transparent" />
          {balloons.map((b) => (
            <button
              key={b.key}
              onClick={() => pop(b)}
              disabled={result !== null}
              className={`balloon absolute px-3 py-4 text-white text-xs font-black shadow-xl cursor-pointer text-center ${
                poppedKey === b.key ? (b.isCorrect ? "balloon-popped" : "animate-pulse") : ""
              }`}
              style={{
                left: `${b.leftPct}%`,
                backgroundColor: b.color,
                animationDuration: `${b.durationMs}ms`,
                animationDelay: `${b.delayMs}ms`,
                width: "86px",
                height: "104px",
                transition: "transform 300ms, opacity 300ms",
              }}
            >
              {b.term}
              <span className="absolute left-1/2 top-full h-14 w-px -translate-x-1/2 bg-white/75" aria-hidden />
            </button>
          ))}
          {poppedKey && <HitBurst active tone="sky" />}
        </div>
      </ThemedCard>

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
          border-radius: 52% 52% 48% 48%;
          clip-path: polygon(50% 100%, 44% 91%, 12% 70%, 3% 42%, 12% 16%, 34% 2%, 50% 0, 66% 2%, 88% 16%, 97% 42%, 88% 70%, 56% 91%);
        }
        }
      `}</style>
    </div>
  );
}
