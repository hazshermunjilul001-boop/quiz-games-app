"use client";

// components/StudentGate.tsx
// The sign-in gate shown to students who open a teacher's shared quiz link
// (/play/[code]). Nobody gets to the quiz until they've signed in with
// their name — that's what their attempts and results are tied to (see
// lib/attempts.ts). No email/password by design: this is a classroom, not
// a bank. If the device was used by a classmate before, "Switch user" on
// the bar above the quiz swaps accounts.

import { FormEvent, useState } from "react";
import { BRAND_NAME } from "@/lib/brand";

export default function StudentGate({
  quizTitle,
  questionCount,
  onSignIn,
}: {
  quizTitle: string;
  questionCount?: number;
  onSignIn: (name: string, section: string) => void;
}) {
  const [name, setName] = useState("");
  const [section, setSection] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError("Please enter your full name (at least 2 characters).");
      return;
    }
    setError(null);
    onSignIn(name, section);
  }

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-5">
          <span className="text-4xl">🎓</span>
          <p className="text-xs font-bold uppercase tracking-widest text-brand mt-2">{BRAND_NAME}</p>
        </div>

        <div className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-sm">
          <h1 className="text-2xl font-extrabold text-[var(--foreground)] tracking-tight text-center">
            Sign in to take this quiz
          </h1>
          <p className="text-sm text-zinc-500 mt-2 text-center">
            Your teacher shared <strong className="text-zinc-700">{quizTitle}</strong>
            {typeof questionCount === "number" && questionCount > 0 && (
              <> · {questionCount} question{questionCount === 1 ? "" : "s"}</>
            )}
            . Sign in with your name so your attempts and results are recorded.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            <div>
              <label htmlFor="student-name" className="block text-sm font-bold text-[var(--foreground)] mb-1">
                Full name <span className="text-incorrect">*</span>
              </label>
              <input
                id="student-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Juan Dela Cruz"
                autoComplete="off"
                className="w-full border-2 border-zinc-200 rounded-xl p-3 text-sm bg-white text-zinc-900 placeholder:text-zinc-400 focus:border-brand focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label htmlFor="student-section" className="block text-sm font-bold text-[var(--foreground)] mb-1">
                Section / Grade <span className="text-zinc-400 font-medium">(optional)</span>
              </label>
              <input
                id="student-section"
                type="text"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                placeholder="e.g. 8-Sampaguita"
                autoComplete="off"
                className="w-full border-2 border-zinc-200 rounded-xl p-3 text-sm bg-white text-zinc-900 placeholder:text-zinc-400 focus:border-brand focus:outline-none transition-colors"
              />
            </div>

            {error && <p className="text-sm text-incorrect font-medium">{error}</p>}

            <button
              type="submit"
              className="w-full bg-brand text-white rounded-xl px-4 py-3.5 font-bold text-base hover:bg-brand-dark active:scale-[0.98] transition-all cursor-pointer shadow-sm"
            >
              Sign in &amp; start
            </button>
          </form>

          <p className="text-xs text-zinc-400 mt-4 text-center">
            Answers are hidden while you work — you&rsquo;ll see your full results, time, and attempt
            number when you finish.
          </p>
        </div>
      </div>
    </div>
  );
}
