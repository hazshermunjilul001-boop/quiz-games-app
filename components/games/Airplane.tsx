"use client";

import { QuestionBank } from "@/lib/schema";
import { AttemptContext } from "@/lib/attempts";
import MovingTargetsGame from "./MovingTargetsGame";

export default function Airplane({
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
        gameId: "airplane",
        title: "Airplane",
        icon: "✈️",
        laneDurationMs: [8000, 10000],
        background: "bg-gradient-to-b from-sky-50 to-sky-100",
      }}
    />
  );
}
