"use client";

import { QuestionBank } from "@/lib/schema";
import MovingTargetsGame from "./MovingTargetsGame";

export default function Airplane({ bank, onExit }: { bank: QuestionBank; onExit: () => void }) {
  return (
    <MovingTargetsGame
      bank={bank}
      onExit={onExit}
      variant={{
        title: "Airplane",
        icon: "✈️",
        laneDurationMs: [8000, 10000],
        background: "bg-gradient-to-b from-sky-50 to-sky-100",
      }}
    />
  );
}
