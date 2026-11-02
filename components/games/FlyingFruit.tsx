"use client";

import { QuestionBank } from "@/lib/schema";
import { AttemptContext } from "@/lib/attempts";
import MovingTargetsGame from "./MovingTargetsGame";

export default function FlyingFruit({
  bank,
  onExit,
  attemptContext,
}: {
  bank: QuestionBank;
  onExit: () => void;
  /** Present only on a signed-in shared student link. */
  attemptContext?: AttemptContext;
}) {
  return (
    <MovingTargetsGame
      bank={bank}
      onExit={onExit}
      attemptContext={attemptContext}
      variant={{
        gameId: "flying-fruit",
        title: "Flying Fruit",
        icon: "🍎",
        laneDurationMs: [9000, 11000],
        background: "bg-gradient-to-b from-lime-50 to-lime-100",
      }}
    />
  );
}
