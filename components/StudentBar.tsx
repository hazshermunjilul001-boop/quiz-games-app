"use client";

// components/StudentBar.tsx
// Slim strip shown above the quiz while a student is signed in on a shared
// link. Confirms WHO is taking the quiz and gives shared-device classmates
// a way to switch accounts (each student keeps their own attempt history,
// keyed by name — see lib/attempts.ts).

import { StudentSession } from "@/lib/studentAuth";

export default function StudentBar({
  student,
  onSwitchUser,
}: {
  student: StudentSession;
  onSwitchUser: () => void;
}) {
  return (
    <div className="bg-white/70 backdrop-blur border-b border-white/60">
      <div className="max-w-3xl mx-auto px-6 py-2 flex items-center justify-between gap-3">
        <p className="text-xs sm:text-sm text-zinc-600 font-medium truncate">
          <span aria-hidden>👤</span> Signed in as{" "}
          <strong className="text-[var(--foreground)]">{student.name}</strong>
          {student.section && <span className="text-zinc-500"> · {student.section}</span>}
        </p>
        <button
          onClick={onSwitchUser}
          className="shrink-0 text-xs sm:text-sm font-bold text-brand hover:text-brand-dark underline underline-offset-2 cursor-pointer"
        >
          Not you? Switch user
        </button>
      </div>
    </div>
  );
}
