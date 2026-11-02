"use client";

// components/StudentGate.tsx
// The sign-in gate shown to students who open a teacher's shared quiz link
// (/play/[code]). Nobody sees quiz content until they've signed in with
// their own Google account (via Supabase Auth) — the name recorded on
// every attempt comes from that verified account, so a student can't
// preview the answers under a made-up name first. The only thing still
// typed here is the optional Section / Grade, which is remembered before
// the redirect and attached to their account after they come back.

import { FormEvent, useState } from "react";
import { BRAND_NAME } from "@/lib/brand";
import { savePendingSection, signInWithGoogle } from "@/lib/studentAuth";

/** The official four-color Google "G". */
function GoogleG({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="shrink-0">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.57 5.57 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29A7.2 7.2 0 0 1 4.89 12c0-.8.14-1.57.38-2.29V6.62H1.29a12 12 0 0 0 0 10.76l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}

export default function StudentGate({
  quizTitle,
  questionCount,
  shareCode,
  notice,
}: {
  quizTitle: string;
  questionCount?: number;
  shareCode: string;
  /** Shown above the form — e.g. a failed or cancelled sign-in attempt. */
  notice?: string | null;
}) {
  const [section, setSection] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  async function handleGoogle(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setRedirecting(true);
    try {
      // Remember the optional section now — the Google redirect reloads
      // the page and it gets bound to the account on the way back.
      savePendingSection(shareCode, section);
      await signInWithGoogle(`${window.location.origin}/play/${shareCode}`);
      // Success navigates away to Google's consent screen; if we're still
      // here something blocked the navigation.
      setError("Sign-in didn't start. Check your internet connection and try again.");
      setRedirecting(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed. Please try again.");
      setRedirecting(false);
    }
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
            . Sign in with your Google account so your attempts are recorded under your real name.
          </p>

          {notice && (
            <p className="mt-5 text-sm font-medium text-gold-dark bg-gold/15 border border-gold/40 rounded-xl px-4 py-3">
              {notice}
            </p>
          )}

          <form onSubmit={handleGoogle} className="mt-6 space-y-3">
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
              disabled={redirecting}
              className="w-full bg-white text-zinc-800 rounded-xl px-4 py-3.5 font-bold text-base border-2 border-zinc-300 hover:bg-zinc-50 hover:border-zinc-400 active:scale-[0.98] transition-all cursor-pointer shadow-sm flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-wait"
            >
              {redirecting ? (
                <>
                  <span
                    className="inline-block w-4 h-4 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin"
                    aria-hidden
                  />
                  Opening Google…
                </>
              ) : (
                <>
                  <GoogleG />
                  Continue with Google
                </>
              )}
            </button>
          </form>

          <p className="text-xs text-zinc-400 mt-4 text-center">
            Only your name, email, and quiz results are shared with your teacher. Answers stay hidden while you work —
            you&rsquo;ll see your full results, time, and attempt number when you finish.
          </p>
        </div>
      </div>
    </div>
  );
}
