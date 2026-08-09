// lib/gameHelpers.ts
// Small, template-agnostic helpers shared across game renderers.

import { Question } from "./schema";

export function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** A short display label + longer detail for any question type — used by
 * templates (Open the Box, Spin the Wheel) that just need "what's in here"
 * rather than an interactive quiz flow. */
export function questionDisplay(q: Question): { title: string; detail?: string } {
  switch (q.type) {
    case "mcq":
      return { title: q.prompt, detail: q.choices[q.correctIndex] };
    case "term-definition":
      return { title: q.term, detail: q.definition };
    case "single-term":
      return { title: q.term, detail: q.clue };
    case "cloze":
      return { title: q.text, detail: q.blanks.join(", ") };
    case "ordered-sequence":
      return { title: q.prompt || "Sequence", detail: q.items.join(" → ") };
  }
}
