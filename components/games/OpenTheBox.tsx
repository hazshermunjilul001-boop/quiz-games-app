"use client";

import { useMemo, useState } from "react";
import { QuestionBank } from "@/lib/schema";
import { shuffle, questionDisplay } from "@/lib/gameHelpers";
import { GameHeader, EmptyState } from "./QuizGame";
import CompletionCard from "./CompletionCard";

export default function OpenTheBox({ bank, onExit }: { bank: QuestionBank; onExit: () => void }) {
  const items = useMemo(() => shuffle(bank.questions), [bank]);
  const [openedIds, setOpenedIds] = useState<Set<string>>(new Set());

  if (items.length === 0) {
    return <EmptyState onExit={onExit} message="This question bank is empty." />;
  }

  function openBox(id: string) {
    setOpenedIds((prev) => new Set(prev).add(id));
  }

  function reset() {
    setOpenedIds(new Set());
  }

  return (
    <div className="max-w-2xl mx-auto">
      <GameHeader title="Open the Box" progress={`${openedIds.size} / ${items.length} opened`} onExit={onExit} />

      <div className="mt-6 grid grid-cols-3 sm:grid-cols-4 gap-3">
        {items.map((q, i) => {
          const isOpen = openedIds.has(q.id);
          const { title, detail } = questionDisplay(q);
          return (
            <button
              key={q.id}
              onClick={() => openBox(q.id)}
              disabled={isOpen}
              className={[
                "aspect-square rounded-lg border p-2 flex flex-col items-center justify-center text-center transition-colors",
                isOpen
                  ? "bg-indigo-50 border-indigo-300 cursor-default"
                  : "bg-zinc-900 border-zinc-900 text-white hover:bg-zinc-700 cursor-pointer",
              ].join(" ")}
            >
              {isOpen ? (
                <>
                  <p className="text-xs font-semibold text-indigo-900 leading-snug line-clamp-3">{title}</p>
                  {detail && <p className="text-[11px] text-indigo-600 mt-1 leading-snug line-clamp-2">{detail}</p>}
                </>
              ) : (
                <span className="text-2xl font-bold">{i + 1}</span>
              )}
            </button>
          );
        })}
      </div>

      {openedIds.size === items.length && (
        <CompletionCard message="All boxes opened!" actionLabel="Close all boxes and play again" onAction={reset} />
      )}
    </div>
  );
}
