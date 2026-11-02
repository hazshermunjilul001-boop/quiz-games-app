"use client";

// components/StudentBar.tsx
// Slim strip shown above the quiz while a student is signed in on a shared
// link. Confirms WHO is taking the quiz — now a verified Google account,
// not a typed name — so a student can immediately spot a wrong account
// (e.g. a classmate who forgot to sign out), and lets the next student on
// a shared device sign out. Attempt history is keyed by the Google account
// (see lib/attempts.ts).

import { StudentSession } from "@/lib/studentAuth";

export default function StudentBar({
  student,
  onSignOut,
}: {
  student: StudentSession;
  onSignOut: () => void;
}) {
  return (
    <div className="bg-white/70 backdrop-blur border-b border-white/60">
      <div className="max-w-3xl mx-auto px-6 py-2 flex items-center justify-between gap-3">
        <p className="text-xs sm:text-sm text-zinc-600 font-medium truncate">
          <span aria-hidden>👤</span> Signed in as{" "}
          <strong className="text-[var(--foreground)]">{student.name}</strong>
          {student.email && <span className="text-zinc-500"> · {student.email}</span>}
          {student.section && <span className="text-zinc-500"> · {student.section}</span>}
        </p>
        <button
          onClick={onSignOut}
          className="shrink-0 text-xs sm:text-sm font-bold text-brand hover:text-brand-dark underline underline-offset-2 cursor-pointer"
        >
          Not you? Sign out
        </button>
      </div>
    </div>
  );
}
