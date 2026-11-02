"use client";

// app/dashboard/page.tsx
// TEACHER DASHBOARD — every student's attempts on the teacher's quizzes,
// in one place. For each saved quiz it shows: how many students have taken
// it, how many attempts were completed, the class average, and a per-student
// breakdown (attempts, best/latest scores, time taken, when they played).
// Expanding a student lists each attempt; expanding an attempt shows the
// same item-by-item review the student saw at the end of that run — which
// items they got right, which they got wrong, and the correct answers.
//
// Data comes straight from Supabase (quiz_attempts), where every completed
// run on a signed-in share link is filed under the quiz's owner — see
// supabase/schema.sql. Only the owning teacher can read their rows (RLS).

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useCurrentUser } from "@/lib/auth";
import { listMyBanks, listAttemptsForMyQuizzes, AttemptRow, SavedActivity, SetupRequiredError } from "@/lib/persistence";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import { formatDuration } from "@/lib/attempts";

/** Friendly names for the games that record attempts. */
const GAME_NAMES: Record<string, string> = {
  "quiz": "Quiz",
  "true-false": "True or False",
  "whack-a-mole": "Whack-a-Mole",
  "flying-fruit": "Flying Fruit",
  "airplane": "Airplane",
  "maze-chase": "Maze Chase",
};

function gameName(id: string): string {
  return GAME_NAMES[id] ?? id;
}

function pct(score: number, total: number): number {
  return total > 0 ? Math.round((score / total) * 100) : 0;
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

interface StudentGroup {
  key: string;
  name: string;
  email: string;
  section: string;
  attempts: AttemptRow[]; // newest first
  bestPct: number;
}

function groupByStudent(attempts: AttemptRow[]): StudentGroup[] {
  const map = new Map<string, StudentGroup>();
  for (const a of attempts) {
    let g = map.get(a.studentKey);
    if (!g) {
      g = { key: a.studentKey, name: a.studentName, email: a.studentEmail, section: a.studentSection, attempts: [], bestPct: 0 };
      map.set(a.studentKey, g);
    }
    // Keep the most recent display identity the account signed in with.
    if (a.studentName.length >= g.name.length) g.name = a.studentName;
    if (a.studentEmail) g.email = a.studentEmail;
    if (a.studentSection) g.section = a.studentSection;
    g.attempts.push(a);
    g.bestPct = Math.max(g.bestPct, pct(a.score, a.total));
  }
  for (const g of map.values()) {
    g.attempts.sort((x, y) => Number(new Date(y.finishedAt)) - Number(new Date(x.finishedAt)));
  }
  return [...map.values()];
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useCurrentUser();
  const [activities, setActivities] = useState<SavedActivity[] | null>(null);
  const [attempts, setAttempts] = useState<AttemptRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  /** Which quiz cards / students / attempts are expanded. */
  const [openQuizzes, setOpenQuizzes] = useState<Set<string>>(new Set());
  const [openStudents, setOpenStudents] = useState<Set<string>>(new Set());
  const [openAttempts, setOpenAttempts] = useState<Set<string>>(new Set());
  const [sortMode, setSortMode] = useState<"name" | "lowest">("name");

  const loadData = useCallback(async () => {
    setLoadingData(true);
    setError(null);
    try {
      const [banks, rows] = await Promise.all([listMyBanks(), listAttemptsForMyQuizzes()]);
      setActivities(banks);
      setAttempts(rows);
    } catch (e) {
      if (e instanceof SetupRequiredError) {
        setSetupNeeded(true);
      } else {
        setError(e instanceof Error ? e.message : "Couldn't load the results.");
      }
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user, loadData]);

  // Deep link from My Activities / share screens: /dashboard?quiz=CODE
  // pre-expands that quiz's student list.
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("quiz");
    if (code) setOpenQuizzes(new Set([code]));
  }, []);

  function toggle(set: Set<string>, apply: (s: Set<string>) => void, key: string) {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    apply(next);
  }

  async function copyLink(code: string) {
    await navigator.clipboard.writeText(`${window.location.origin}/play/${code}`);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1500);
  }

  // A quiz → its attempts (attempts reference the quiz by share code).
  const attemptsByCode = useMemo(() => {
    const map = new Map<string, AttemptRow[]>();
    for (const a of attempts ?? []) {
      const list = map.get(a.shareCode) ?? [];
      list.push(a);
      map.set(a.shareCode, list);
    }
    return map;
  }, [attempts]);

  /** Quizzes ordered with the most recently played ones first. */
  const orderedActivities = useMemo(() => {
    if (!activities) return [];
    const lastPlayed = (code: string): number => {
      const rows = attemptsByCode.get(code);
      if (!rows || rows.length === 0) return 0;
      return Math.max(...rows.map((r) => Number(new Date(r.finishedAt))));
    };
    return [...activities].sort((x, y) => lastPlayed(y.code) - lastPlayed(x.code));
  }, [activities, attemptsByCode]);

  if (!isSupabaseConfigured) {
    return (
      <Shell>
        <div className="mt-6 bg-white border border-zinc-200 rounded-3xl p-8 text-center shadow-sm">
          <p className="text-zinc-600">This feature isn&rsquo;t set up yet — see supabase/schema.sql.</p>
        </div>
      </Shell>
    );
  }

  if (authLoading) {
    return (
      <Shell>
        <p className="mt-6 text-zinc-500 text-center">Loading...</p>
      </Shell>
    );
  }

  if (!user) {
    return (
      <Shell>
        <div className="mt-6 bg-white border border-zinc-200 rounded-3xl p-8 text-center shadow-sm">
          <p className="text-zinc-600">Sign in from the banner above to see your students&rsquo; results.</p>
          <p className="text-sm text-zinc-400 mt-2">
            Attempts are recorded on quizzes you saved while signed in, so they can be traced back to you here.
          </p>
        </div>
      </Shell>
    );
  }

  const anyData = activities !== null && attempts !== null;
  const totalAttempts = attempts?.length ?? 0;

  return (
    <Shell>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-extrabold text-[var(--foreground)] tracking-tight">Student Results</h1>
          <p className="text-zinc-600 mt-2 text-base">
            Every attempt your students completed on your share links — scores, time taken, and which items they got
            right or wrong. Students sign in with their Google account, so every result is tied to a real, verified
            identity (name + email).
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loadingData}
          className="shrink-0 border-2 border-zinc-200 bg-white text-[var(--foreground)] text-sm font-bold px-4 py-2 rounded-xl hover:bg-zinc-50 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
        >
          {loadingData ? "Refreshing…" : "↻ Refresh"}
        </button>
      </div>

      {error && (
        <div className="mt-4 bg-incorrect-bg border-2 border-incorrect/30 text-incorrect text-sm font-medium rounded-xl p-4">
          {error}
        </div>
      )}

      {setupNeeded && (
        <div className="mt-4 bg-gold/10 border-2 border-gold/40 rounded-2xl p-5">
          <p className="font-bold text-gold-dark">One-time setup needed: the results table isn&rsquo;t created yet</p>
          <p className="text-sm text-zinc-600 mt-2">
            Student attempts are stored in a <code className="font-mono text-xs bg-white border border-zinc-200 rounded px-1">quiz_attempts</code> table
            in your Supabase project, which doesn&rsquo;t exist there yet. Two minutes to fix:
          </p>
          <ol className="list-decimal list-inside text-sm text-zinc-700 mt-3 space-y-1.5">
            <li>
              Open your Supabase project &rarr; <strong>SQL Editor</strong> &rarr; New query.
            </li>
            <li>
              Copy the <strong>full contents</strong> of <code className="font-mono text-xs bg-white border border-zinc-200 rounded px-1">supabase/schema.sql</code> from
              this project, paste, and click <strong>Run</strong>.
            </li>
            <li>Come back here and click Refresh below.</li>
          </ol>
          <p className="text-xs text-zinc-400 mt-3">It&rsquo;s safe to run that file even if you&rsquo;ve run an older version of it before.</p>
          <button
            onClick={loadData}
            disabled={loadingData}
            className="mt-4 bg-brand text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-brand-dark active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            {loadingData ? "Refreshing…" : "↻ I&rsquo;ve run the SQL — refresh"}
          </button>
        </div>
      )}

      {!anyData && !error && <p className="mt-6 text-zinc-500 text-center">Loading results...</p>}

      {anyData && activities!.length === 0 && (
        <div className="mt-6 bg-white border border-zinc-200 rounded-3xl p-8 text-center shadow-sm">
          <p className="text-zinc-600">
            No saved quizzes yet. Import a test and click <strong>Save &amp; Get Share Link</strong> — once students
            take it, their attempts show up here.
          </p>
        </div>
      )}

      {anyData && activities!.length > 0 && totalAttempts === 0 && (
        <div className="mt-6 bg-white border border-zinc-200 rounded-3xl p-8 text-center shadow-sm">
          <p className="text-zinc-600">
            No student attempts recorded yet. Share a quiz link — every completed attempt (Quiz, True or False,
            Whack-a-Mole, Flying Fruit, Airplane, Maze Chase) is recorded here automatically.
          </p>
        </div>
      )}

      {anyData &&
        orderedActivities.map((activity) => {
          const rows = attemptsByCode.get(activity.code) ?? [];
          const students = groupByStudent(rows);
          const sorted = [...students].sort((a, b) => {
            if (sortMode === "name") return a.name.localeCompare(b.name);
            return a.bestPct - b.bestPct || a.name.localeCompare(b.name);
          });
          const avg = rows.length > 0 ? Math.round(rows.reduce((s, r) => s + pct(r.score, r.total), 0) / rows.length) : 0;
          const lastPlayed = rows.length > 0 ? rows[0].finishedAt : null;
          const isOpen = openQuizzes.has(activity.code);

          return (
            <div key={activity.code} className="mt-5 bg-white border border-zinc-200 rounded-3xl shadow-sm overflow-hidden">
              {/* Quiz header — always visible */}
              <div className="p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-bold text-lg text-[var(--foreground)] truncate">{activity.title}</p>
                    <p className="text-sm text-zinc-500">
                      Code <span className="font-mono font-bold text-zinc-700">{activity.code}</span> ·{" "}
                      {activity.questionCount} questions
                      {lastPlayed && <> · last played {shortDate(lastPlayed)}</>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/play/${activity.code}`}
                      className="border-2 border-zinc-200 bg-white text-[var(--foreground)] text-sm font-bold px-3 py-2 rounded-lg hover:bg-zinc-50 active:scale-95 transition-all"
                    >
                      Play
                    </Link>
                    <button
                      onClick={() => copyLink(activity.code)}
                      className="border-2 border-zinc-200 bg-white text-[var(--foreground)] text-sm font-bold px-3 py-2 rounded-lg hover:bg-zinc-50 active:scale-95 transition-all cursor-pointer"
                    >
                      {copiedCode === activity.code ? "Copied!" : "Copy link"}
                    </button>
                  </div>
                </div>

                {/* Class summary */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold bg-brand-light text-brand-dark px-3 py-1.5 rounded-full">
                    👥 {students.length} student{students.length === 1 ? "" : "s"}
                  </span>
                  <span className="text-sm font-bold bg-brand-light text-brand-dark px-3 py-1.5 rounded-full">
                    🔁 {rows.length} attempt{rows.length === 1 ? "" : "s"}
                  </span>
                  {rows.length > 0 && (
                    <span className="text-sm font-bold bg-gold/15 text-gold-dark px-3 py-1.5 rounded-full">
                      📊 {avg}% class average
                    </span>
                  )}
                  {rows.length > 0 && (
                    <button
                      onClick={() => toggle(openQuizzes, setOpenQuizzes, activity.code)}
                      className="text-sm font-bold text-brand hover:text-brand-dark px-3 py-1.5 cursor-pointer"
                    >
                      {isOpen ? "Hide students ▲" : "Show students ▼"}
                    </button>
                  )}
                </div>
              </div>

              {/* Student list */}
              {isOpen && students.length > 0 && (
                <div className="border-t border-zinc-100 bg-zinc-50/60 p-4">
                  {students.length > 1 && (
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Sort</span>
                      {(["name", "lowest"] as const).map((m) => (
                        <button
                          key={m}
                          onClick={() => setSortMode(m)}
                          className={[
                            "text-xs font-bold px-3 py-1.5 rounded-full cursor-pointer transition-colors",
                            sortMode === m
                              ? "bg-brand text-white"
                              : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100",
                          ].join(" ")}
                        >
                          {m === "name" ? "A–Z" : "Lowest score first"}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2">
                    {sorted.map((s) => {
                      const sKey = `${activity.code}:${s.key}`;
                      const sOpen = openStudents.has(sKey);
                      const latest = s.attempts[0];
                      return (
                        <div key={s.key} className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
                          <button
                            onClick={() => toggle(openStudents, setOpenStudents, sKey)}
                            className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 flex-wrap hover:bg-zinc-50 transition-colors cursor-pointer"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[var(--foreground)] truncate">{s.name}</span>
                                {s.section && (
                                  <span className="text-xs font-bold bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full whitespace-nowrap">
                                    {s.section}
                                  </span>
                                )}
                              </div>
                              {s.email && <p className="text-xs text-zinc-400 truncate">{s.email}</p>}
                            </div>
                            <div className="flex items-center gap-2 text-sm shrink-0 flex-wrap">
                              <span className="font-mono font-bold text-zinc-500">{s.attempts.length}×</span>
                              <span className="font-bold text-correct bg-correct-bg px-2 py-0.5 rounded-full">
                                best {s.bestPct}%
                              </span>
                              <span className="font-bold text-zinc-600">latest {pct(latest.score, latest.total)}%</span>
                              <span className="text-zinc-400 text-xs">{shortDate(latest.finishedAt)}</span>
                              <span className="text-zinc-300">{sOpen ? "▲" : "▼"}</span>
                            </div>
                          </button>

                          {sOpen && (
                            <div className="border-t border-zinc-100 px-4 py-3 space-y-2">
                              {s.attempts.map((a) => {
                                const aOpen = openAttempts.has(a.id);
                                const p = pct(a.score, a.total);
                                return (
                                  <div key={a.id} className="border border-zinc-100 rounded-xl overflow-hidden">
                                    <button
                                      onClick={() => toggle(openAttempts, setOpenAttempts, a.id)}
                                      className="w-full text-left px-3 py-2.5 flex items-center justify-between gap-3 flex-wrap hover:bg-zinc-50 transition-colors cursor-pointer"
                                    >
                                      <div className="flex items-center gap-2 text-sm flex-wrap">
                                        <span className="font-bold text-gold-dark bg-gold/15 px-2 py-0.5 rounded-full">
                                          #{a.attemptNumber}
                                        </span>
                                        <span className="font-semibold text-zinc-700">{gameName(a.game)}</span>
                                        <span className={p >= 50 ? "font-bold text-correct" : "font-bold text-incorrect"}>
                                          {a.score}/{a.total} ({p}%)
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-3 text-xs text-zinc-500 shrink-0">
                                        <span className="font-mono">⏱ {formatDuration(a.durationSec)}</span>
                                        <span>{shortDate(a.finishedAt)}</span>
                                        <span className="text-zinc-300">{aOpen ? "▲" : "▼"}</span>
                                      </div>
                                    </button>

                                    {aOpen && (
                                      <div className="border-t border-zinc-100 bg-zinc-50/60 p-3">
                                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide mb-2">
                                          Item review — {a.details.filter((d) => d.isCorrect).length} correct ·{" "}
                                          {a.details.filter((d) => !d.isCorrect).length} wrong
                                        </p>
                                        {a.details.length === 0 ? (
                                          <p className="text-sm text-zinc-500">
                                            Item details for this attempt weren&rsquo;t saved (attempt recorded before
                                            details were tracked, or saved offline).
                                          </p>
                                        ) : (
                                          <ol className="space-y-1.5">
                                            {a.details.map((d, i) => (
                                              <li key={i} className="flex items-start gap-2 text-sm">
                                                <span
                                                  className={[
                                                    "shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black text-white mt-0.5",
                                                    d.isCorrect ? "bg-correct" : "bg-incorrect",
                                                  ].join(" ")}
                                                  aria-label={d.isCorrect ? "Correct" : "Wrong"}
                                                >
                                                  {d.isCorrect ? "✓" : "✕"}
                                                </span>
                                                <div className="min-w-0">
                                                  <p className="font-medium text-zinc-800 leading-snug">
                                                    <span className="text-zinc-400 font-bold text-xs mr-1">{d.label}</span>
                                                    {d.prompt}
                                                  </p>
                                                  <p className="text-xs mt-0.5">
                                                    <span className="text-zinc-500">Their answer: </span>
                                                    <span
                                                      className={
                                                        d.isCorrect ? "font-bold text-correct" : "font-bold text-incorrect"
                                                      }
                                                    >
                                                      {d.yourAnswer}
                                                    </span>
                                                    {!d.isCorrect && (
                                                      <>
                                                        <span className="text-zinc-500"> · Correct: </span>
                                                        <span className="font-bold text-correct">{d.correctAnswer}</span>
                                                      </>
                                                    )}
                                                  </p>
                                                </div>
                                              </li>
                                            ))}
                                          </ol>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {isOpen && students.length === 0 && (
                <div className="border-t border-zinc-100 bg-zinc-50/60 p-5 text-center">
                  <p className="text-sm text-zinc-500">
                    No attempts on this quiz yet. Send students the share link — when they finish a game, their results
                    appear here automatically.
                  </p>
                </div>
              )}
            </div>
          );
        })}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <main className="max-w-3xl mx-auto py-12 px-6">
        <Link href="/" className="text-sm text-brand hover:text-brand-dark font-medium transition-colors">
          ← Back to home
        </Link>
        {children}
      </main>
    </div>
  );
}
