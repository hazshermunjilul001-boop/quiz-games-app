"use client";

import { useMemo, useState } from "react";
import { QuestionBank, TermDefinitionQuestion } from "@/lib/schema";
import { shuffle } from "@/lib/gameHelpers";
import { GameHeader, EmptyState } from "./QuizGame";
import CompletionCard from "./CompletionCard";

interface Tile {
  key: string;
  pairId: string;
  label: string;
}

export default function MatchingPairs({ bank, onExit }: { bank: QuestionBank; onExit: () => void }) {
  const pairs = useMemo(
    () => bank.questions.filter((q): q is TermDefinitionQuestion => q.type === "term-definition"),
    [bank]
  );

  const [tiles, setTiles] = useState<Tile[]>(() => buildTiles(pairs));
  const [selected, setSelected] = useState<string[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrongFlash, setWrongFlash] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);

  if (pairs.length === 0) {
    return <EmptyState onExit={onExit} message="This question bank has no term/definition pairs to match." />;
  }

  const allMatched = matched.size === pairs.length * 2;

  function tap(tile: Tile) {
    if (selected.length === 2 || matched.has(tile.key) || selected.includes(tile.key)) return;
    const next = [...selected, tile.key];
    setSelected(next);

    if (next.length === 2) {
      setMoves((m) => m + 1);
      const [aKey, bKey] = next;
      const a = tiles.find((t) => t.key === aKey)!;
      const b = tiles.find((t) => t.key === bKey)!;
      if (a.pairId === b.pairId) {
        setTimeout(() => {
          setMatched((prev) => new Set(prev).add(aKey).add(bKey));
          setSelected([]);
        }, 400);
      } else {
        setWrongFlash(next);
        setTimeout(() => {
          setWrongFlash([]);
          setSelected([]);
        }, 700);
      }
    }
  }

  function restart() {
    setTiles(buildTiles(pairs));
    setSelected([]);
    setMatched(new Set());
    setWrongFlash([]);
    setMoves(0);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <GameHeader title="Matching Pairs" progress={`${matched.size / 2} / ${pairs.length} pairs · ${moves} moves`} onExit={onExit} />

      <div className="mt-6 grid grid-cols-3 sm:grid-cols-4 gap-3">
        {tiles.map((tile) => {
          const isMatched = matched.has(tile.key);
          const isSelected = selected.includes(tile.key);
          const isWrong = wrongFlash.includes(tile.key);
          return (
            <button
              key={tile.key}
              onClick={() => tap(tile)}
              disabled={isMatched}
              className={[
                "min-h-20 rounded-lg border p-2 text-xs font-medium flex items-center justify-center text-center transition-colors",
                isMatched ? "bg-green-50 border-green-300 text-green-700 opacity-60" : "",
                isWrong ? "bg-red-50 border-red-400 text-red-700" : "",
                !isMatched && !isWrong && isSelected ? "bg-indigo-50 border-indigo-400 text-indigo-900" : "",
                !isMatched && !isWrong && !isSelected ? "bg-white border-zinc-300 text-zinc-900 hover:bg-zinc-50 cursor-pointer" : "",
              ].join(" ")}
            >
              {tile.label}
            </button>
          );
        })}
      </div>

      {allMatched && (
        <CompletionCard message={`All matched in ${moves} moves!`} onAction={restart} />
      )}
    </div>
  );
}

function buildTiles(pairs: TermDefinitionQuestion[]): Tile[] {
  const tiles: Tile[] = pairs.flatMap((p) => [
    { key: `${p.id}-term`, pairId: p.id, label: p.term },
    { key: `${p.id}-def`, pairId: p.id, label: p.definition },
  ]);
  return shuffle(tiles);
}
