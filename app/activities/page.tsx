"use client";

import { useEffect, useState } from "react";
import { useCurrentUser } from "@/lib/auth";
import { listMyBanks, deleteBank, SavedActivity } from "@/lib/persistence";
import { isSupabaseConfigured } from "@/lib/supabaseClient";

export default function ActivitiesPage() {
  const { user, loading: authLoading } = useCurrentUser();
  const [activities, setActivities] = useState<SavedActivity[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [deletingCode, setDeletingCode] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    listMyBanks()
      .then(setActivities)
      .catch((e: any) => setError(e.message ?? "Couldn't load your activities."));
  }, [user]);

  async function handleDelete(code: string) {
    if (!confirm("Delete this saved quiz? This can't be undone, and any share link for it will stop working.")) return;
    setDeletingCode(code);
    try {
      await deleteBank(code);
      setActivities((prev) => prev?.filter((a) => a.code !== code) ?? null);
    } catch (e: any) {
      setError(e.message ?? "Couldn't delete this quiz.");
    } finally {
      setDeletingCode(null);
    }
  }

  async function copyLink(code: string) {
    await navigator.clipboard.writeText(`${window.location.origin}/play/${code}`);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1500);
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <main className="max-w-3xl mx-auto py-12 px-6">
        <h1 className="text-3xl font-extrabold text-[var(--foreground)] tracking-tight">My Activities</h1>
        <p className="text-zinc-600 mt-2 text-base">Quizzes you&rsquo;ve saved while signed in.</p>

        {!isSupabaseConfigured && (
          <div className="mt-6 bg-white border border-zinc-200 rounded-3xl p-8 text-center shadow-sm">
            <p className="text-zinc-600">This feature isn&rsquo;t set up yet — see supabase/schema.sql.</p>
          </div>
        )}

        {isSupabaseConfigured && authLoading && <p className="mt-6 text-zinc-500 text-center">Loading...</p>}

        {isSupabaseConfigured && !authLoading && !user && (
          <div className="mt-6 bg-white border border-zinc-200 rounded-3xl p-8 text-center shadow-sm">
            <p className="text-zinc-600">Sign in from the banner above to see your saved quizzes.</p>
          </div>
        )}

        {error && (
          <div className="mt-4 bg-incorrect-bg border-2 border-incorrect/30 text-incorrect text-sm font-medium rounded-xl p-4">
            {error}
          </div>
        )}

        {user && activities !== null && activities.length === 0 && (
          <div className="mt-6 bg-white border border-zinc-200 rounded-3xl p-8 text-center shadow-sm">
            <p className="text-zinc-600">
              No saved quizzes yet. Import a test, click <strong>Save &amp; Get Share Link</strong> while signed in,
              and it&rsquo;ll show up here.
            </p>
          </div>
        )}

        {user && activities !== null && activities.length > 0 && (
          <div className="mt-6 space-y-3">
            {activities.map((a) => (
              <div key={a.code} className="bg-white border border-zinc-200 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm">
                <div className="min-w-0">
                  <p className="font-bold text-[var(--foreground)] truncate">{a.title}</p>
                  <p className="text-sm text-zinc-500">
                    {a.questionCount} questions · {new Date(a.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={`/play/${a.code}`}
                    className="bg-brand text-white text-sm font-bold px-3 py-2 rounded-lg hover:bg-brand-dark active:scale-95 transition-all"
                  >
                    Play
                  </a>
                  <a
                    href={`/dashboard?quiz=${a.code}`}
                    className="border-2 border-gold/50 bg-gold/10 text-gold-dark text-sm font-bold px-3 py-2 rounded-lg hover:bg-gold/20 active:scale-95 transition-all"
                  >
                    Results
                  </a>
                  <button
                    onClick={() => copyLink(a.code)}
                    className="border-2 border-zinc-200 bg-white text-[var(--foreground)] text-sm font-bold px-3 py-2 rounded-lg hover:bg-zinc-50 active:scale-95 transition-all cursor-pointer"
                  >
                    {copiedCode === a.code ? "Copied!" : "Copy link"}
                  </button>
                  <button
                    onClick={() => handleDelete(a.code)}
                    disabled={deletingCode === a.code}
                    className="text-incorrect text-sm font-bold px-3 py-2 rounded-lg hover:bg-incorrect-bg disabled:opacity-50 active:scale-95 transition-all cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
