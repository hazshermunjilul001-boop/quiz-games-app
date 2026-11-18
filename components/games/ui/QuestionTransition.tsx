"use client";

import { ReactNode } from "react";

export default function QuestionTransition({ children, transitionKey }: { children: ReactNode; transitionKey: string | number }) {
  return <div key={transitionKey} className="question-transition">{children}</div>;
}
