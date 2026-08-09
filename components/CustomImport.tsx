"use client";

import { useState } from "react";
import { parseRankOrderText, parseClozeText, parseCrosswordCluesText, parseGroupSortText, CustomParseResult } from "@/lib/customFormats";

type FormatId = "rank-order" | "complete-the-sentence" | "crossword" | "group-sort";

interface FormatSpec {
  id: FormatId;
  label: string;
  icon: string;
  instructions: string;
  example: string;
  parse: (raw: string, title: string) => CustomParseResult;
}

const FORMATS: FormatSpec[] = [
  {
    id: "rank-order",
    label: "Rank Order",
    icon: "📶",
    instructions:
      "Write a title line, then the items numbered in the CORRECT order. Leave a blank line between separate rounds.",
    example: `Steps in the water cycle
1. Evaporation
2. Condensation
3. Precipitation
4. Collection

Order of operations
1. Parentheses
2. Exponents
3. Multiplication and Division
4. Addition and Subtraction`,
    parse: parseRankOrderText,
  },
  {
    id: "complete-the-sentence",
    label: "Complete the Sentence",
    icon: "💬",
    instructions: 'Write a sentence with exactly one ___ blank, then an "Answer:" line. Leave a blank line between sentences.',
    example: `The mitochondria is the ___ of the cell.
Answer: powerhouse

Water boils at ___ degrees Celsius at sea level.
Answer: 100`,
    parse: parseClozeText,
  },
  {
    id: "crossword",
    label: "Crossword",
    icon: "📝",
    instructions: "One word and clue per line, separated by a colon. Words must be a single word, 2–15 letters.",
    example: `MITOSIS: The process of cell division
ENZYME: A protein that speeds up reactions
NUCLEUS: Contains the cell's DNA`,
    parse: parseCrosswordCluesText,
  },
  {
    id: "group-sort",
    label: "Group Sort",
    icon: "🗃️",
    instructions: 'Write "Category: <name>", then one item per line until the next category. Needs at least 2 categories.',
    example: `Category: Mammals
Dog
Cat
Whale

Category: Reptiles
Snake
Lizard
Turtle`,
    parse: parseGroupSortText,
  },
];

export default function CustomImport({
  onParsed,
  onBack,
}: {
  onParsed: (result: CustomParseResult) => void;
  onBack: () => void;
}) {
  const [selected, setSelected] = useState<FormatSpec>(FORMATS[0]);
  const [text, setText] = useState(selected.example);
  const [error, setError] = useState<string | null>(null);

  function selectFormat(f: FormatSpec) {
    setSelected(f);
    setText(f.example);
    setError(null);
  }

  function handleParse() {
    setError(null);
    try {
      const result = selected.parse(text, selected.label);
      onParsed(result);
    } catch (e: any) {
      setError(e.message ?? "Couldn't parse this input.");
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={onBack} className="text-sm text-brand hover:text-brand-dark font-medium cursor-pointer transition-colors">
        ← Back to import
      </button>
      <h1 className="text-3xl font-extrabold text-[var(--foreground)] tracking-tight mt-2">Create custom content</h1>
      <p className="text-zinc-600 mt-2 text-base">
        For these 4 games, writing content directly (instead of importing an MCQ test) gives much better results —
        a real ranking sequence, a natural sentence, a short crossword clue, or your own categories.
      </p>

      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {FORMATS.map((f) => (
          <button
            key={f.id}
            onClick={() => selectFormat(f)}
            className={[
              "p-3 rounded-xl border-2 text-center transition-all cursor-pointer",
              selected.id === f.id ? "border-brand bg-brand-light" : "border-zinc-200 bg-white hover:border-zinc-300",
            ].join(" ")}
          >
            <span className="text-xl">{f.icon}</span>
            <p className="text-xs font-bold text-[var(--foreground)] mt-1">{f.label}</p>
          </button>
        ))}
      </div>

      <div className="mt-5 bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
        <p className="text-sm text-zinc-600">{selected.instructions}</p>

        <textarea
          className="w-full h-64 mt-3 border-2 border-zinc-200 rounded-xl p-3 text-sm font-mono bg-white text-zinc-900 focus:border-brand focus:outline-none transition-colors"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        {error && (
          <div className="mt-3 bg-incorrect-bg border-2 border-incorrect/30 text-incorrect text-sm font-medium rounded-xl p-3 whitespace-pre-line">
            {error}
          </div>
        )}

        <button
          onClick={handleParse}
          className="mt-4 bg-brand text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-brand-dark active:scale-95 transition-all cursor-pointer shadow-sm"
        >
          Parse & Continue
        </button>
      </div>
    </div>
  );
}
