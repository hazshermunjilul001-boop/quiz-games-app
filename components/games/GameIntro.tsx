"use client";

import { ReactNode } from "react";
import GameButton from "./ui/GameButton";

interface GameIntroProps {
  title: string;
  description: string;
  icon: string;
  onStart: () => void;
  attemptBadge?: ReactNode;
}

const FLAVOR: Record<string, string> = {
  "Whack-a-Mole": "Keep your eyes sharp and make your move before it disappears.",
  "Balloon Pop": "Pick a balloon, pop it, and keep the streak flying.",
  "Flying Fruit": "Track the motion, trust your instincts, and tap on the fly.",
  Airplane: "Choose your lane and pilot your answer through the sky.",
  "Maze Chase": "Navigate the maze, dodge the trouble, and find your answer.",
  "Spin the Wheel": "Give it a spin and see where your next challenge lands.",
};

export default function GameIntro({ title, description, icon, onStart, attemptBadge }: GameIntroProps) {
  return (
    <div className="max-w-xl mx-auto text-center">
      <div className="game-surface game-surface-classic p-7 sm:p-10">
        <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-[2rem] bg-gradient-to-br from-brand to-brand-dark text-6xl shadow-[0_14px_0_rgb(22_63_53/.2)] ring-8 ring-brand-light/70 animate-[float_3s_ease-in-out_infinite]">
          <span aria-hidden>{icon}</span>
        </div>
        <p className="mt-6 text-xs font-black uppercase tracking-[.22em] text-brand">Ready when you are</p>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--foreground)] mt-2 tracking-tight">{title}</h2>
        <p className="text-zinc-600 mt-3 text-base leading-relaxed">{description}</p>
        <p className="mt-3 text-sm font-semibold text-brand-dark">{FLAVOR[title] ?? "Make every choice count and enjoy the challenge."}</p>

        {attemptBadge && <div className="mt-6 flex justify-center">{attemptBadge}</div>}

        <GameButton
          onClick={onStart}
          className="mt-8 mx-auto min-h-14 w-full sm:w-auto px-10 bg-brand text-white text-lg shadow-[0_6px_0_var(--brand-dark)] hover:-translate-y-1 hover:bg-brand-dark"
          aria-label={`Start ${title}`}
        >
          <svg viewBox="0 0 24 24" width="25" height="25" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
          Start game
        </GameButton>
        <p className="mt-4 text-xs font-bold text-zinc-500">Answers stay hidden until the end</p>
      </div>
    </div>
  );
}
