"use client";

import { useMemo, useState } from "react";
import { QuestionBank, TermDefinitionQuestion } from "@/lib/schema";
import { shuffle } from "@/lib/gameHelpers";
import { GameHeader, EmptyState } from "./QuizGame";

export default function FlashCards({ bank, onExit }: { bank: QuestionBank; onExit: () => void }) {
  const [cards, setCards] = useState<TermDefinitionQuestion[]>(() =>
    shuffle(bank.questions.filter((q): q is TermDefinitionQuestion => q.type === "term-definition"))
  );
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (cards.length === 0) {
    return <EmptyState onExit={onExit} message="This question bank has no term/definition pairs to make flash cards from." />;
  }

  const current = cards[index];

  function go(delta: number) {
    setFlipped(false);
    setIndex((i) => Math.max(0, Math.min(cards.length - 1, i + delta)));
  }

  function reshuffle() {
    setCards(shuffle(cards));
    setIndex(0);
    setFlipped(false);
  }

  return (
    <div className="max-w-xl mx-auto">
      <GameHeader title="Flash Cards" progress={`${index + 1} / ${cards.length}`} onExit={onExit} />

      <div className="mt-6">
        <button
          onClick={() => setFlipped((f) => !f)}
          className="w-full h-64 bg-white border border-zinc-200 rounded-xl flex items-center justify-center p-8 text-center cursor-pointer hover:bg-zinc-50 transition-colors"
        >
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-400 font-medium mb-3">
              {flipped ? "Answer" : "Term"} · tap to flip
            </p>
            <p className="text-xl font-semibold text-zinc-900">{flipped ? current.definition : current.term}</p>
          </div>
        </button>

        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={() => go(-1)}
            disabled={index === 0}
            className="border border-zinc-300 bg-white text-zinc-900 text-sm font-medium px-4 py-2 rounded-md hover:bg-zinc-50 disabled:opacity-40 cursor-pointer"
          >
            ← Previous
          </button>
          <button
            onClick={reshuffle}
            className="text-sm text-zinc-500 hover:text-zinc-800 cursor-pointer"
          >
            Shuffle deck
          </button>
          <button
            onClick={() => go(1)}
            disabled={index === cards.length - 1}
            className="border border-zinc-300 bg-white text-zinc-900 text-sm font-medium px-4 py-2 rounded-md hover:bg-zinc-50 disabled:opacity-40 cursor-pointer"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
