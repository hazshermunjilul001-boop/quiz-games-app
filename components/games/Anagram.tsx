"use client";

import { QuestionBank } from "@/lib/schema";
import ReorderGame from "./ReorderGame";

export default function Anagram({ bank, onExit }: { bank: QuestionBank; onExit: () => void }) {
  return (
    <ReorderGame
      bank={bank}
      onExit={onExit}
      variant={{
        title: "Anagram",
        instructions: "Tap the letters in order to unscramble the word.",
        tileStyle: "font-mono uppercase",
      }}
    />
  );
}
