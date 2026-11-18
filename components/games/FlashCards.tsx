"use client";

import { useMemo, useState } from "react";
import { QuestionBank, TermDefinitionQuestion } from "@/lib/schema";
import { shuffle } from "@/lib/gameHelpers";
import { GameHeader, EmptyState } from "./QuizGame";
import ThemedCard from "./ui/ThemedCard";
import GameButton from "./ui/GameButton";

export default function FlashCards({ bank, onExit }: { bank: QuestionBank; onExit: () => void }) {
  const [cards, setCards] = useState<TermDefinitionQuestion[]>(() => shuffle(bank.questions.filter((q): q is TermDefinitionQuestion => q.type === "term-definition")));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (cards.length === 0) return <EmptyState onExit={onExit} message="This question bank has no term/definition pairs to make flash cards from." />;
  const current = cards[index];

  function go(delta: number) { setFlipped(false); setIndex((i) => Math.max(0, Math.min(cards.length - 1, i + delta))); }
  function reshuffle() { setCards(shuffle(cards)); setIndex(0); setFlipped(false); }

  return (
    <div className="max-w-xl mx-auto">
      <GameHeader title="Flash Cards" progress={`${index + 1} / ${cards.length}`} onExit={onExit} />
      <ThemedCard family="paper" className="mt-6 p-0">
        <button onClick={() => setFlipped((f) => !f)} className="w-full h-64 rounded-[1.7rem] flex items-center justify-center p-8 text-center cursor-pointer hover:bg-white/50 transition-all active:scale-[.99]">
          <div>
            <p className="text-xs uppercase tracking-[.2em] text-amber-800/65 font-black mb-3">{flipped ? "Answer" : "Term"} · tap to flip</p>
            <p className="text-2xl font-black text-zinc-900">{flipped ? current.definition : current.term}</p>
          </div>
        </button>
      </ThemedCard>
      <div className="mt-4 flex items-center justify-between gap-2">
        <GameButton onClick={() => go(-1)} disabled={index === 0} className="border-2 border-amber-800/20 bg-white/80 text-zinc-900 text-sm px-4 py-2 hover:bg-white">← Previous</GameButton>
        <button onClick={reshuffle} className="text-sm font-bold text-zinc-600 hover:text-zinc-900 cursor-pointer">Shuffle deck</button>
        <GameButton onClick={() => go(1)} disabled={index === cards.length - 1} className="border-2 border-amber-800/20 bg-white/80 text-zinc-900 text-sm px-4 py-2 hover:bg-white">Next →</GameButton>
      </div>
    </div>
  );
}
