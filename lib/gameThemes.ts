// lib/gameThemes.ts
// Tailwind gradient classes per template id, applied as a full-bleed
// background behind the game while it's being played. Picked per game's
// mood (sky for flying/airplane games, grassy for maze/mole, parchment for
// word/paper games) rather than one flat color for the whole app — this is
// what makes each game feel distinct to a student, not just re-skinned.

export const GAME_THEMES: Record<string, string> = {
  quiz: "from-violet-200 via-fuchsia-100 to-purple-200",
  "true-false": "from-sky-200 via-cyan-100 to-blue-200",
  "flash-cards": "from-amber-100 via-orange-100 to-amber-200",
  "open-the-box": "from-yellow-200 via-amber-100 to-orange-200",
  "spin-the-wheel": "from-pink-200 via-rose-100 to-fuchsia-200",
  "matching-pairs": "from-teal-200 via-emerald-100 to-teal-300",
  "match-up": "from-lime-200 via-green-100 to-lime-300",
  "group-sort": "from-indigo-200 via-blue-100 to-indigo-300",
  unjumble: "from-orange-200 via-amber-100 to-red-200",
  "word-magnets": "from-sky-200 via-indigo-100 to-blue-300",
  "rank-order": "from-purple-200 via-indigo-100 to-purple-300",
  "balloon-pop": "from-sky-200 via-blue-100 to-sky-300",
  "whack-a-mole": "from-lime-300 via-green-200 to-emerald-300",
  "flying-fruit": "from-lime-200 via-yellow-100 to-lime-300",
  airplane: "from-sky-300 via-blue-200 to-cyan-300",
  "maze-chase": "from-emerald-300 via-teal-200 to-emerald-400",
  anagram: "from-fuchsia-200 via-purple-100 to-fuchsia-300",
  "spell-the-word": "from-rose-200 via-pink-100 to-rose-300",
  hangman: "from-stone-300 via-neutral-200 to-stone-400",
  wordsearch: "from-amber-200 via-yellow-100 to-amber-300",
  crossword: "from-zinc-200 via-slate-100 to-zinc-300",
  "complete-the-sentence": "from-cyan-200 via-teal-100 to-cyan-300",
};

export function getGameTheme(templateId: string): string {
  return GAME_THEMES[templateId] ?? "from-brand-light via-white to-brand-light";
}
