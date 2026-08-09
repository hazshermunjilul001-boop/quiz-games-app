"use client";

import { QuestionBank } from "@/lib/schema";
import ReorderGame from "./ReorderGame";

export default function Unjumble({ bank, onExit }: { bank: QuestionBank; onExit: () => void }) {
  return (
    <ReorderGame
      bank={bank}
      onExit={onExit}
      variant={{
        title: "Unjumble",
        instructions: "Tap the words in the correct order to rebuild the answer.",
        tileStyle: "",
      }}
    />
  );
}
