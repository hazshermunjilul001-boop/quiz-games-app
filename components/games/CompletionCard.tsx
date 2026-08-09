"use client";

import Confetti from "./Confetti";

export default function CompletionCard({
  message,
  actionLabel = "Play again",
  onAction,
}: {
  message: string;
  actionLabel?: string;
  onAction: () => void;
}) {
  return (
    <div className="mt-6 max-w-xl mx-auto bg-white border border-zinc-200 rounded-3xl p-8 text-center shadow-sm relative overflow-hidden">
      <Confetti />
      <p className="text-xs font-bold uppercase tracking-widest text-brand">Game complete</p>
      <p className="stamp-pop text-xl font-bold text-[var(--foreground)] mt-3">{message}</p>
      <button
        onClick={onAction}
        className="mt-5 bg-brand text-white text-base font-bold px-6 py-3 rounded-xl hover:bg-brand-dark active:scale-95 transition-all cursor-pointer shadow-sm"
      >
        {actionLabel}
      </button>
    </div>
  );
}
