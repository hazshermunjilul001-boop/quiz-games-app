"use client";

import { useMemo, useState } from "react";
import { QuestionBank, TermDefinitionQuestion } from "@/lib/schema";
import { shuffle } from "@/lib/gameHelpers";
import { GameHeader, EmptyState } from "./QuizGame";
import CompletionCard from "./CompletionCard";

export default function MatchUp({ bank, onExit }: { bank: QuestionBank; onExit: () => void }) {
  const pairs = useMemo(
    () => bank.questions.filter((q): q is TermDefinitionQuestion => q.type === "term-definition"),
    [bank]
  );
  const terms = useMemo(() => shuffle(pairs), [pairs]);
  const definitions = useMemo(() => shuffle(pairs), [pairs]);

  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);
  const [matches, setMatches] = useState<Record<string, string>>({}); // termId -> defId
  const [wrongFlashPair, setWrongFlashPair] = useState<[string, string] | null>(null);

  if (pairs.length === 0) {
    return <EmptyState onExit={onExit} message="This question bank has no term/definition pairs to match up." />;
  }

  const allMatched = Object.keys(matches).length === pairs.length;

  function clickTerm(id: string) {
    if (matches[id]) return;
    setSelectedTermId(id === selectedTermId ? null : id);
  }

  function clickDefinition(defId: string) {
    if (!selectedTermId) return;
    if (Object.values(matches).includes(defId)) return;

    if (selectedTermId === defId) {
      setMatches((prev) => ({ ...prev, [selectedTermId]: defId }));
      setSelectedTermId(null);
    } else {
      setWrongFlashPair([selectedTermId, defId]);
      setTimeout(() => setWrongFlashPair(null), 600);
      setSelectedTermId(null);
    }
  }

  function restart() {
    setMatches({});
    setSelectedTermId(null);
    setWrongFlashPair(null);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <GameHeader title="Match Up" progress={`${Object.keys(matches).length} / ${pairs.length}`} onExit={onExit} />
      <p className="text-xs text-zinc-500 mt-1">Tap a keyword, then tap its matching definition.</p>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="space-y-2">
          {terms.map((p) => {
            const isMatched = !!matches[p.id];
            const isSelected = selectedTermId === p.id;
            const isWrong = wrongFlashPair?.[0] === p.id;
            return (
              <button
                key={p.id}
                onClick={() => clickTerm(p.id)}
                disabled={isMatched}
                className={[
                  "w-full text-left px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors",
                  isMatched ? "bg-green-50 border-green-300 text-green-700 opacity-60" : "",
                  isWrong ? "bg-red-50 border-red-400 text-red-700" : "",
                  !isMatched && !isWrong && isSelected ? "bg-indigo-50 border-indigo-400 text-indigo-900" : "",
                  !isMatched && !isWrong && !isSelected ? "bg-white border-zinc-300 text-zinc-900 hover:bg-zinc-50 cursor-pointer" : "",
                ].join(" ")}
              >
                {p.term}
              </button>
            );
          })}
        </div>
        <div className="space-y-2">
          {definitions.map((p) => {
            const isMatched = Object.values(matches).includes(p.id);
            const isWrong = wrongFlashPair?.[1] === p.id;
            return (
              <button
                key={p.id}
                onClick={() => clickDefinition(p.id)}
                disabled={isMatched}
                className={[
                  "w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors",
                  isMatched ? "bg-green-50 border-green-300 text-green-700 opacity-60" : "",
                  isWrong ? "bg-red-50 border-red-400 text-red-700" : "",
                  !isMatched && !isWrong ? "bg-white border-zinc-300 text-zinc-700 hover:bg-zinc-50 cursor-pointer" : "",
                ].join(" ")}
              >
                {p.definition}
              </button>
            );
          })}
        </div>
      </div>

      {allMatched && <CompletionCard message="All matched up!" onAction={restart} />}
    </div>
  );
}
