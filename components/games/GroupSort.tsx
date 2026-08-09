"use client";

import { useMemo, useState } from "react";
import { Question, QuestionBank } from "@/lib/schema";
import { shuffle, questionDisplay } from "@/lib/gameHelpers";
import { GameHeader, EmptyState } from "./QuizGame";
import CompletionCard from "./CompletionCard";

export default function GroupSort({ bank, onExit }: { bank: QuestionBank; onExit: () => void }) {
  const categorized = useMemo(() => bank.questions.filter((q) => q.category), [bank]);
  const groups = useMemo(() => Array.from(new Set(categorized.map((q) => q.category!))), [categorized]);
  const items = useMemo(() => shuffle(categorized), [categorized]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [placements, setPlacements] = useState<Record<string, { group: string; correct: boolean }>>({});

  if (categorized.length === 0 || groups.length < 2) {
    return (
      <EmptyState
        onExit={onExit}
        message="This question bank doesn't have at least two distinct categories to sort by."
      />
    );
  }

  const allPlaced = Object.keys(placements).length === items.length;
  const correctCount = Object.values(placements).filter((p) => p.correct).length;

  function selectItem(id: string) {
    if (placements[id]) return;
    setSelectedId(id === selectedId ? null : id);
  }

  function placeIntoGroup(group: string) {
    if (!selectedId) return;
    const item = items.find((q) => q.id === selectedId)!;
    setPlacements((prev) => ({ ...prev, [selectedId]: { group, correct: item.category === group } }));
    setSelectedId(null);
  }

  function restart() {
    setPlacements({});
    setSelectedId(null);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <GameHeader title="Group Sort" progress={`${Object.keys(placements).length} / ${items.length}`} onExit={onExit} />
      <p className="text-xs text-zinc-500 mt-1">Tap an item, then tap the group it belongs to.</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {items
          .filter((q) => !placements[q.id])
          .map((q) => {
            const { title } = questionDisplay(q);
            const isSelected = selectedId === q.id;
            return (
              <button
                key={q.id}
                onClick={() => selectItem(q.id)}
                className={[
                  "px-3 py-2 rounded-lg border text-sm font-medium cursor-pointer transition-colors max-w-xs text-left",
                  isSelected ? "bg-indigo-50 border-indigo-400 text-indigo-900" : "bg-white border-zinc-300 text-zinc-900 hover:bg-zinc-50",
                ].join(" ")}
              >
                {title}
              </button>
            );
          })}
      </div>

      <div className="mt-6 grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(groups.length, 3)}, minmax(0, 1fr))` }}>
        {groups.map((group) => (
          <div key={group} className="bg-white border border-zinc-200 rounded-lg p-3 min-h-40">
            <button
              onClick={() => placeIntoGroup(group)}
              disabled={!selectedId}
              className={[
                "w-full text-sm font-semibold rounded-md py-1.5 mb-2 border cursor-pointer",
                selectedId ? "border-indigo-400 text-indigo-700 bg-indigo-50 hover:bg-indigo-100" : "border-zinc-200 text-zinc-700 bg-zinc-50",
              ].join(" ")}
            >
              {group}
            </button>
            <div className="space-y-1.5">
              {items
                .filter((q) => placements[q.id]?.group === group)
                .map((q) => {
                  const { title } = questionDisplay(q);
                  const correct = placements[q.id].correct;
                  return (
                    <div
                      key={q.id}
                      className={`text-xs px-2 py-1.5 rounded-md ${correct ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
                    >
                      {title} {correct ? "✓" : `✗ (should be ${q.category})`}
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>

      {allPlaced && (
        <CompletionCard message={`${correctCount} / ${items.length} sorted correctly`} onAction={restart} />
      )}
    </div>
  );
}
