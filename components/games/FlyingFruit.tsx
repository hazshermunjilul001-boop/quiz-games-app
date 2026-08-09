"use client";

import { QuestionBank } from "@/lib/schema";
import MovingTargetsGame from "./MovingTargetsGame";

export default function FlyingFruit({ bank, onExit }: { bank: QuestionBank; onExit: () => void }) {
  return (
    <MovingTargetsGame
      bank={bank}
      onExit={onExit}
      variant={{
        title: "Flying Fruit",
        icon: "🍎",
        laneDurationMs: [9000, 11000],
        background: "bg-gradient-to-b from-lime-50 to-lime-100",
      }}
    />
  );
}
