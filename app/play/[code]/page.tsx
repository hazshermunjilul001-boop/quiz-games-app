"use client";

// app/play/[code]/page.tsx
// The link teachers share with students. FLOW:
//   1. Load the quiz by its share code (Supabase).
//   2. Students MUST sign in first — with their own Google account, via
//      Supabase Auth — before they can see or answer anything
//      (components/StudentGate.tsx). The name on every attempt comes from
//      that verified account, not from typed input.
//   3. Signed-in students land on the game intro, prompted with the
//      attempt number they're about to take, answers stay hidden while
//      they work, and finishing shows time taken, attempts, and a full
//      item review.

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { loadBank } from "@/lib/persistence";
import { QuestionBank } from "@/lib/schema";
import { signOutStudent, useStudent } from "@/lib/studentAuth";
import PlaySession from "@/components/PlaySession";
import StudentGate from "@/components/StudentGate";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "not-found" }
  | { status: "ready"; bank: QuestionBank; templateId: string | null };

export default function SharedPlayPage() {
  const params = useParams<{ code: string }>();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  // Passing the share code binds the optional section typed at the gate to
  // the signed-in Google account after the redirect.
  const { student, loading: sessionLoading } = useStudent(params.code);
  /** Error after coming back from Google (cancelled consent, blocked
   * account, misconfigured provider…). */
  const [oauthNotice, setOauthNotice] = useState<string | null>(null);

  // Google can redirect back with an error in the URL (the student clicked
  // "Cancel", the account isn't allowed, the provider is misconfigured…).
  // Surface it as a readable notice and clean the URL. Deferred to a
  // timeout so state updates happen after the effect's synchronous body.
  useEffect(() => {
    const timer = setTimeout(() => {
      const search = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const description = search.get("error_description") ?? hash.get("error_description");
      const code = search.get("error") ?? hash.get("error");
      if (description || code) {
        setOauthNotice(
          description?.replace(/\+/g, " ") ||
            "Google sign-in didn't finish. Please try again, and ask your teacher to check the setup if it keeps failing."
        );
        window.history.replaceState(null, "", window.location.pathname);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadBank(params.code)
      .then((activity) => {
        if (cancelled) return;
        setState(activity ? { status: "ready", bank: activity.bank, templateId: activity.templateId } : { status: "not-found" });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setState({ status: "error", message: e instanceof Error ? e.message : "Couldn't load this quiz." });
      });
    return () => {
      cancelled = true;
    };
  }, [params.code]);

  async function handleSignOut() {
    try {
      await signOutStudent();
    } catch {
      // Signing out is best-effort; the gate shows either way.
    }
  }

  if (state.status === "ready") {
    // Wait for the session to be restored before choosing gate vs. game —
    // a student coming back from Google otherwise sees the gate flash.
    if (sessionLoading) {
      return (
        <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
          <p className="text-zinc-500 text-base">Checking sign-in…</p>
        </div>
      );
    }
    if (!student) {
      // The sign-in gate: no quiz content is rendered until they sign in.
      return (
        <StudentGate
          quizTitle={state.bank.title}
          questionCount={state.bank.questions.length}
          shareCode={params.code}
          notice={oauthNotice}
        />
      );
    }
    return (
      <PlaySession
        bank={state.bank}
        lockedTemplateId={state.templateId}
        student={student}
        onSignOut={handleSignOut}
        shareCode={params.code}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <main className="max-w-3xl mx-auto py-12 px-6">
        {state.status === "loading" && <p className="text-zinc-500 text-base text-center">Loading quiz...</p>}

        {state.status === "not-found" && (
          <div className="max-w-xl mx-auto text-center bg-white border border-zinc-200 rounded-3xl p-10 shadow-sm">
            <p className="text-[var(--foreground)] font-bold text-lg">Quiz not found</p>
            <p className="text-zinc-500 text-sm mt-1">This link may be mistyped, or the quiz may have been removed.</p>
          </div>
        )}

        {state.status === "error" && (
          <div className="max-w-xl mx-auto text-center bg-white border-2 border-incorrect/30 rounded-3xl p-10 shadow-sm">
            <p className="text-incorrect font-bold text-lg">Couldn&rsquo;t load this quiz</p>
            <p className="text-incorrect text-sm mt-1">{state.message}</p>
          </div>
        )}
      </main>
    </div>
  );
}
