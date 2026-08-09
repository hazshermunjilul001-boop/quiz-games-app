"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { McqQuestion, QuestionBank } from "@/lib/schema";
import { shuffle, pickRandom } from "@/lib/gameHelpers";
import { GameHeader, ResultsScreen, EmptyState } from "./QuizGame";

const HOLES = 6;
const MOLE_UP_MS = 1300;
const SPAWN_GAP_MS = 300;
const ROUND_MS = 8000;

interface Mole {
  id: number;
  hole: number;
  text: string;
  isCorrect: boolean;
}

export default function WhackAMole({ bank, onExit }: { bank: QuestionBank; onExit: () => void }) {
  const questions = useMemo(
    () => shuffle(bank.questions.filter((q): q is McqQuestion => q.type === "mcq" && q.choices.length >= 2)),
    [bank]
  );
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [mole, setMole] = useState<Mole | null>(null);
  const [feedback, setFeedback] = useState<"hit-correct" | "hit-wrong" | null>(null);
  const [roundOver, setRoundOver] = useState(false);
  const moleIdRef = useRef(0);
  const spawnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roundTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = questions[index];

  function clearAllTimers() {
    if (spawnTimerRef.current) clearTimeout(spawnTimerRef.current);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (roundTimerRef.current) clearTimeout(roundTimerRef.current);
  }

  useEffect(() => {
    if (!current) return;
    setMole(null);
    setFeedback(null);
    setRoundOver(false);
    clearAllTimers();

    const decoys = shuffle(current.choices.filter((_, i) => i !== current.correctIndex));
    const correctAnswer = current.choices[current.correctIndex];

    function spawnNext() {
      moleIdRef.current += 1;
      const showCorrect = Math.random() < 0.4; // correct answer appears ~40% of spawns
      const text = showCorrect ? correctAnswer : pickRandom(decoys.length ? decoys : [correctAnswer]);
      const newMole: Mole = { id: moleIdRef.current, hole: Math.floor(Math.random() * HOLES), text, isCorrect: text === correctAnswer };
      setMole(newMole);
      hideTimerRef.current = setTimeout(() => {
        setMole((m) => (m?.id === newMole.id ? null : m));
        spawnTimerRef.current = setTimeout(spawnNext, SPAWN_GAP_MS);
      }, MOLE_UP_MS);
    }

    spawnTimerRef.current = setTimeout(spawnNext, 400);
    roundTimerRef.current = setTimeout(() => {
      clearAllTimers();
      setMole(null);
      setRoundOver(true);
    }, ROUND_MS);

    return clearAllTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  useEffect(() => {
    if (!roundOver) return;
    const t = setTimeout(advance, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundOver]);

  if (questions.length === 0) {
    return <EmptyState onExit={onExit} message="This question bank has no multiple-choice questions for Whack-a-Mole." />;
  }

  function whack(m: Mole) {
    if (roundOver) return;
    clearAllTimers();
    setMole(null);
    if (m.isCorrect) {
      setScore((s) => s + 1);
      setFeedback("hit-correct");
    } else {
      setFeedback("hit-wrong");
    }
    setRoundOver(true);
  }

  function advance() {
    if (index + 1 >= questions.length) {
      setDone(true);
      return;
    }
    setIndex((i) => i + 1);
  }

  function restart() {
    setIndex(0);
    setScore(0);
    setDone(false);
    setMole(null);
    setFeedback(null);
    setRoundOver(false);
  }

  if (done) {
    return <ResultsScreen score={score} total={questions.length} onRestart={restart} onExit={onExit} />;
  }

  return (
    <div className="max-w-xl mx-auto">
      <GameHeader title="Whack-a-Mole" progress={`${index + 1} / ${questions.length} · score ${score}`} onExit={onExit} />

      <div className="mt-6 bg-white border border-zinc-200 rounded-xl p-4">
        <p className="font-semibold text-zinc-900 text-center mb-3">
          Whack the answer to: <span className="text-indigo-700">{current.prompt}</span>
        </p>

        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: HOLES }, (_, i) => (
            <div key={i} className="relative aspect-square bg-amber-900/10 rounded-full border-4 border-amber-900/20 flex items-center justify-center overflow-hidden">
              {mole?.hole === i && (
                <button
                  onClick={() => whack(mole)}
                  className="absolute inset-2 rounded-full bg-amber-700 text-white text-xs font-semibold flex items-center justify-center text-center p-1 cursor-pointer hover:bg-amber-600"
                >
                  {mole.text}
                </button>
              )}
            </div>
          ))}
        </div>

        {roundOver && (
          <p className={`mt-4 text-center font-medium ${feedback === "hit-correct" ? "text-green-700" : "text-red-700"}`}>
            {feedback === "hit-correct" && "Correct hit!"}
            {feedback === "hit-wrong" && "That was the wrong mole."}
            {!feedback && "Time's up — you didn't whack the right one."}
          </p>
        )}
      </div>
    </div>
  );
}
