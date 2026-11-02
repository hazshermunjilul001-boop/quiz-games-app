"use client";

import { ReactNode } from "react";

interface GameIntroProps {
  title: string;
  description: string;
  icon: string;
  onStart: () => void;
  /** Optional gold chip shown above the start button — used on shared
   * student links to prompt the attempt number before they begin, e.g.
   * "Attempt #2 — you've taken this quiz 1 time before". */
  attemptBadge?: ReactNode;
}

export default function GameIntro({ title, description, icon, onStart, attemptBadge }: GameIntroProps) {
  return (
    <div className="max-w-xl mx-auto text-center">
      <div className="bg-white/90 backdrop-blur border border-white rounded-3xl p-10 shadow-lg">
        <span className="text-5xl">{icon}</span>
        <h2 className="text-3xl font-extrabold text-[var(--foreground)] mt-3 tracking-tight">{title}</h2>
        <p className="text-zinc-600 mt-2 text-base">{description}</p>

        {attemptBadge && <div className="mt-5 flex justify-center">{attemptBadge}</div>}

        <button
          onClick={onStart}
          className="mt-8 mx-auto w-24 h-24 rounded-full bg-brand text-white flex items-center justify-center shadow-lg hover:bg-brand-dark hover:scale-105 active:scale-95 transition-all cursor-pointer"
          aria-label="Start"
        >
          <svg viewBox="0 0 24 24" width="34" height="34" fill="currentColor" className="ml-1">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
        <p className="mt-3 text-sm font-bold text-brand-dark tracking-wide">START</p>
      </div>
    </div>
  );
}
