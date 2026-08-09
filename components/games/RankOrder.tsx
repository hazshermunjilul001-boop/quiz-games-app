"use client";

import { QuestionBank } from "@/lib/schema";
import ReorderGame from "./ReorderGame";

export default function RankOrder({ bank, onExit }: { bank: QuestionBank; onExit: () => void }) {
  return (
    <ReorderGame
      bank={bank}
      onExit={onExit}
      variant={{
        title: "Rank Order",
        instructions: "Tap the items in the correct order, from first to last.",
        tileStyle: "",
      }}
    />
  );
}
