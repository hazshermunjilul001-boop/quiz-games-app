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
    <div className="mt-6 max-w-xl mx-auto bg-gradient-to-br from-white via-brand-light/70 to-amber-50 border border-white rounded-[2rem] p-8 text-center shadow-[0_20px_60px_rgb(28_43_36/.16)] relative overflow-hidden">
      <Confetti />
      <p className="text-xs font-black uppercase tracking-[.2em] text-brand">Challenge complete</p>
      <p className="stamp-pop text-2xl font-black text-[var(--foreground)] mt-3">{message}</p>
      <button
        onClick={onAction}
        className="game-button mt-5 bg-brand text-white text-base font-black px-7 py-3 rounded-2xl hover:bg-brand-dark active:scale-95 transition-all cursor-pointer shadow-[0_5px_0_var(--brand-dark)]"
      >
        {actionLabel}
      </button>
    </div>
  );
}
