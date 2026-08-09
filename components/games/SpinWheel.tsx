"use client";

import { useMemo, useState } from "react";
import { QuestionBank } from "@/lib/schema";
import { shuffle, questionDisplay, pickRandom } from "@/lib/gameHelpers";
import { GameHeader, EmptyState } from "./QuizGame";
import CompletionCard from "./CompletionCard";

const COLORS = ["#4f46e5", "#059669", "#d97706", "#dc2626", "#7c3aed", "#0891b2", "#db2777", "#65a30d"];
const MAX_SEGMENTS = 10;
const SPIN_DURATION_MS = 4000;

export default function SpinWheel({ bank, onExit }: { bank: QuestionBank; onExit: () => void }) {
  const items = useMemo(() => shuffle(bank.questions).slice(0, MAX_SEGMENTS), [bank]);
  const segmentAngle = 360 / (items.length || 1);

  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [usedIndices, setUsedIndices] = useState<Set<number>>(new Set());
  const [landedIndex, setLandedIndex] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  if (items.length === 0) {
    return <EmptyState onExit={onExit} message="This question bank is empty." />;
  }

  const remaining = items.map((_, i) => i).filter((i) => !usedIndices.has(i));
  const allUsed = remaining.length === 0;

  function spin() {
    if (spinning || allUsed) return;
    const targetIdx = pickRandom(remaining);
    const centerAngle = targetIdx * segmentAngle + segmentAngle / 2;
    const currentMod = ((rotation % 360) + 360) % 360;
    const neededFinalMod = (360 - centerAngle) % 360;
    let delta = neededFinalMod - currentMod;
    if (delta < 0) delta += 360;
    const extraSpins = 4;

    setSpinning(true);
    setLandedIndex(null);
    setRevealed(false);
    setRotation((r) => r + extraSpins * 360 + delta);

    setTimeout(() => {
      setSpinning(false);
      setLandedIndex(targetIdx);
      setUsedIndices((prev) => new Set(prev).add(targetIdx));
    }, SPIN_DURATION_MS);
  }

  function reset() {
    setUsedIndices(new Set());
    setLandedIndex(null);
    setRevealed(false);
  }

  const gradient = `conic-gradient(from 0deg, ${items
    .map((_, i) => `${COLORS[i % COLORS.length]} ${i * segmentAngle}deg ${(i + 1) * segmentAngle}deg`)
    .join(", ")})`;

  const landed = landedIndex !== null ? questionDisplay(items[landedIndex]) : null;

  return (
    <div className="max-w-xl mx-auto">
      <GameHeader title="Spin the Wheel" progress={`${usedIndices.size} / ${items.length} spun`} onExit={onExit} />

      <div className="mt-6 flex flex-col items-center">
        <div className="relative w-72 h-72">
          {/* pointer */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-2 z-10 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[18px] border-l-transparent border-r-transparent border-t-zinc-900" />
          <div
            className="w-72 h-72 rounded-full border-4 border-zinc-900"
            style={{
              background: gradient,
              transform: `rotate(${rotation}deg)`,
              transition: `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.17, 0.67, 0.12, 0.99)`,
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-10 h-10 rounded-full bg-white border-4 border-zinc-900" />
          </div>
        </div>

        <button
          onClick={spin}
          disabled={spinning || allUsed}
          className="mt-6 bg-zinc-900 text-white text-sm font-semibold px-6 py-3 rounded-md hover:bg-zinc-700 disabled:opacity-40 cursor-pointer"
        >
          {spinning ? "Spinning..." : allUsed ? "All items spun" : "Spin"}
        </button>

        {landed && !spinning && (
          <div className="mt-6 w-full bg-white border border-zinc-200 rounded-xl p-5 text-center">
            <p className="text-xs uppercase tracking-wide text-zinc-400 font-medium">Landed on</p>
            <p className="text-lg font-semibold text-zinc-900 mt-1">{landed.title}</p>
            {landed.detail && (
              revealed ? (
                <p className="text-indigo-700 mt-1 font-medium">{landed.detail}</p>
              ) : (
                <button
                  onClick={() => setRevealed(true)}
                  className="mt-3 border-2 border-brand text-brand text-sm font-bold px-4 py-2 rounded-xl hover:bg-brand-light active:scale-95 transition-all cursor-pointer"
                >
                  Reveal answer
                </button>
              )
            )}
          </div>
        )}
      </div>

      {allUsed && <CompletionCard message="You've spun every item!" actionLabel="Reset wheel" onAction={reset} />}
    </div>
  );
}
