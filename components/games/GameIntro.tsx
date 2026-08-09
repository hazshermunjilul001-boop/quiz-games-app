"use client";

interface GameIntroProps {
  title: string;
  description: string;
  icon: string;
  onStart: () => void;
}

export default function GameIntro({ title, description, icon, onStart }: GameIntroProps) {
  return (
    <div className="max-w-xl mx-auto text-center">
      <div className="bg-white/90 backdrop-blur border border-white rounded-3xl p-10 shadow-lg">
        <span className="text-5xl">{icon}</span>
        <h2 className="text-3xl font-extrabold text-[var(--foreground)] mt-3 tracking-tight">{title}</h2>
        <p className="text-zinc-600 mt-2 text-base">{description}</p>

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
