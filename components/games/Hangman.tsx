"use client";

import { useMemo, useState } from "react";
import { QuestionBank, SingleTermQuestion } from "@/lib/schema";
import { shuffle } from "@/lib/gameHelpers";
import { GameHeader, ResultsScreen, EmptyState } from "./QuizGame";

const MAX_WRONG = 6;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export default function Hangman({ bank, onExit }: { bank: QuestionBank; onExit: () => void }) {
  const terms = useMemo(
    () => shuffle(bank.questions.filter((q): q is SingleTermQuestion => q.type === "single-term")),
    [bank]
  );
  const [index, setIndex] = useState(0);
  const [guessed, setGuessed] = useState<Set<string>>(new Set());
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  if (terms.length === 0) {
    return <EmptyState onExit={onExit} message="This question bank has no terms for Hangman." />;
  }

  const current = terms[index];
  const words = current.term.toUpperCase().split(" ");
  const letters = current.term.toUpperCase().split("");
  const uniqueLetters = new Set(letters.filter((l) => /[A-Z]/.test(l)));
  const wrongGuesses = Array.from(guessed).filter((g) => !uniqueLetters.has(g));
  const wrongCount = wrongGuesses.length;
  const isWon = Array.from(uniqueLetters).every((l) => guessed.has(l));
  const isLost = wrongCount >= MAX_WRONG;
  const roundOver = isWon || isLost;

  function guess(letter: string) {
    if (roundOver || guessed.has(letter)) return;
    const next = new Set(guessed).add(letter);
    setGuessed(next);
  }

  function advance() {
    if (isWon) setScore((s) => s + 1);
    if (index + 1 >= terms.length) {
      setDone(true);
      return;
    }
    setIndex((i) => i + 1);
    setGuessed(new Set());
  }

  function restart() {
    setIndex(0);
    setGuessed(new Set());
    setScore(0);
    setDone(false);
  }

  if (done) {
    return <ResultsScreen score={score} total={terms.length} onRestart={restart} onExit={onExit} />;
  }

  return (
    <div className="max-w-xl mx-auto">
      <GameHeader title="Hangman" progress={`${index + 1} / ${terms.length} · score ${score}`} onExit={onExit} />

      <div className="mt-6 bg-white border border-zinc-200 rounded-xl p-6">
        <p className="text-xs uppercase tracking-wide text-zinc-400 font-medium">Clue</p>
        <p className="text-lg font-semibold text-zinc-900 mt-1">{current.clue}</p>

        <p className="text-sm text-zinc-500 mt-3">
          Wrong guesses: {wrongCount} / {MAX_WRONG}
        </p>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 justify-center">
          {words.map((word, wi) => (
            <div key={wi} className="flex gap-2">
              {word.split("").map((l, i) => (
                <span
                  key={i}
                  className="w-8 h-10 flex items-center justify-center border-b-2 border-zinc-400 text-xl font-mono font-bold text-zinc-900"
                >
                  {guessed.has(l) || roundOver ? l : ""}
                </span>
              ))}
            </div>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-7 sm:grid-cols-9 gap-1.5">
          {ALPHABET.map((l) => {
            const isGuessed = guessed.has(l);
            const isRight = isGuessed && uniqueLetters.has(l);
            const isWrong = isGuessed && !uniqueLetters.has(l);
            return (
              <button
                key={l}
                onClick={() => guess(l)}
                disabled={isGuessed || roundOver}
                className={[
                  "h-8 rounded-md border text-sm font-semibold cursor-pointer",
                  isRight ? "bg-green-50 border-green-400 text-green-700" : "",
                  isWrong ? "bg-red-50 border-red-400 text-red-700" : "",
                  !isGuessed ? "bg-white border-zinc-300 text-zinc-900 hover:bg-zinc-50" : "",
                ].join(" ")}
              >
                {l}
              </button>
            );
          })}
        </div>

        {roundOver && (
          <div className="mt-5 text-center">
            <p className={`font-medium ${isWon ? "text-green-700" : "text-red-700"}`}>
              {isWon ? "You got it!" : `Out of guesses — the word was "${current.term}".`}
            </p>
            <button
              onClick={advance}
              className="mt-3 bg-zinc-900 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-zinc-700 cursor-pointer"
            >
              {index + 1 >= terms.length ? "See results" : "Next word"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
