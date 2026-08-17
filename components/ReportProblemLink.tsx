"use client";

import { FEEDBACK_EMAIL } from "@/lib/brand";

export default function ReportProblemLink({ quizTitle }: { quizTitle?: string }) {
  const subject = encodeURIComponent(quizTitle ? `Problem with "${quizTitle}"` : "Problem with a quiz");
  const body = encodeURIComponent(
    quizTitle
      ? `Quiz: ${quizTitle}\n\nWhat went wrong:\n`
      : "What went wrong:\n"
  );

  return (
    <a
      href={`mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`}
      className="text-xs text-zinc-400 hover:text-zinc-600 underline underline-offset-2 transition-colors"
    >
      Report a problem with this quiz
    </a>
  );
}
