"use client";

import { QuestionBank } from "@/lib/schema";
import ReorderGame from "./ReorderGame";

export default function WordMagnets({ bank, onExit }: { bank: QuestionBank; onExit: () => void }) {
  return (
    <ReorderGame
      bank={bank}
      onExit={onExit}
      variant={{
        title: "Word Magnets",
        instructions: "Tap the colorful magnets to place them, tap again to pull one back.",
        tileStyle: "shadow-md font-mono font-bold rounded-lg border-2",
        tileColors: ["#E4574B", "#2F9E5B", "#3B82F6", "#E8A93B", "#8B5CF6", "#EC4899", "#0891B2"],
      }}
    />
  );
}
