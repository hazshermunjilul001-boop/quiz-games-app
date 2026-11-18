"use client";

import { useState } from "react";
import { TEMPLATES, TemplateCategory } from "@/components/templateRegistry";
import SupportButton from "@/components/SupportButton";

const FILTERS: { id: "all" | TemplateCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "review", label: "Review" },
  { id: "word", label: "Word" },
  { id: "action", label: "Action" },
];

export default function Welcome({ onGetStarted }: { onGetStarted: () => void }) {
  const [activeFilter, setActiveFilter] = useState<"all" | TemplateCategory>("all");
  const [showAll, setShowAll] = useState(false);

  const filtered =
    activeFilter === "all"
      ? TEMPLATES
      : TEMPLATES.filter((t) => t.category === activeFilter);

  const visible = showAll ? filtered : filtered.slice(0, 9);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-12 pb-10">
        <div className="flex flex-col md:flex-row gap-10 items-center">
          {/* Left */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-brand tracking-wide uppercase">
              Free for DepEd teachers
            </p>
            <h1 className="mt-3 text-3xl sm:text-4xl md:text-[2.75rem] font-extrabold text-[var(--foreground)] leading-tight tracking-tight">
              Turn any multiple-choice test into
              <br />
              <span className="text-brand">22 interactive games</span>
            </h1>
            <p className="mt-4 text-lg text-zinc-600 max-w-xl">
              Paste or upload once. Play in under a minute. Share a link — students sign in by name.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={onGetStarted}
                className="bg-gold hover:bg-gold-dark text-[var(--foreground)] font-bold px-6 py-3.5 rounded-2xl shadow-md active:scale-[0.98] transition-all cursor-pointer"
              >
                Create a game →
              </button>
              <a
                href="#games"
                className="inline-flex items-center justify-center border-2 border-zinc-300 hover:border-brand text-[var(--foreground)] font-bold px-6 py-3.5 rounded-2xl transition-all cursor-pointer"
              >
                See all 22 games
              </a>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold bg-brand-light text-brand-dark px-3 py-1.5 rounded-full">
                For DepEd teachers
              </span>
              <span className="text-xs font-bold bg-brand-light text-brand-dark px-3 py-1.5 rounded-full">
                Free
              </span>
              <span className="text-xs font-bold bg-brand-light text-brand-dark px-3 py-1.5 rounded-full">
                Students sign in by name
              </span>
            </div>
          </div>

          {/* Right visual — desktop only */}
          <div className="hidden md:flex shrink-0 w-72 lg:w-80">
            <div className="w-full rounded-3xl bg-gradient-to-br from-brand to-brand-dark text-white p-8 flex flex-col items-center justify-center text-center shadow-lg min-h-[280px]">
              <span className="text-6xl leading-none">🎮</span>
              <p className="mt-5 text-xl font-extrabold leading-snug">
                22 ways to play
                <br />
                one test
              </p>
              <p className="mt-3 text-sm text-white/80">
                Import once. Choose a format. Share the link.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main content + optional right panel */}
      <div className="max-w-5xl mx-auto px-6 pb-6">
        <div className="flex gap-10 items-start">
          {/* Primary column */}
          <div className="flex-1 min-w-0">
            {/* How it works — 3 cards */}
            <section className="py-10">
              <h2 className="text-2xl font-extrabold text-[var(--foreground)] text-center">
                How it works
              </h2>
              <p className="text-center text-zinc-500 mt-1 text-sm">
                Three steps from test to playable game
              </p>

              <div className="mt-8 grid sm:grid-cols-3 gap-4">
                <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
                  <p className="text-xs font-black text-brand tracking-widest">01</p>
                  <h3 className="mt-2 text-lg font-bold text-[var(--foreground)]">Upload</h3>
                  <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
                    Paste or upload a multiple-choice test — plain text, .docx, .pdf, or TOS AI Generator export. Questions and answers are read automatically.
                  </p>
                </div>
                <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
                  <p className="text-xs font-black text-brand tracking-widest">02</p>
                  <h3 className="mt-2 text-lg font-bold text-[var(--foreground)]">Choose game</h3>
                  <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
                    Pick from 22 interactive formats. Every format is generated from the same import. Formats that need a special answer type are greyed out with a clear reason.
                  </p>
                </div>
                <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
                  <p className="text-xs font-black text-brand tracking-widest">03</p>
                  <h3 className="mt-2 text-lg font-bold text-[var(--foreground)]">Share</h3>
                  <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
                    Play it yourself or save and share a link. Students sign in with their name. Attempts are timed and reviewed item by item.
                  </p>
                </div>
              </div>

              <details className="mt-6 bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm group">
                <summary className="font-bold text-[var(--foreground)] cursor-pointer list-none flex items-center justify-between">
                  Details for teachers
                  <span className="text-zinc-400 group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <div className="mt-4 text-sm text-zinc-600 space-y-3 leading-relaxed">
                  <p>
                    Every format is generated automatically from the same multiple-choice import. You don’t prepare different question types for different games; the app reshapes your MCQ answers as needed (e.g. splitting a one-word answer into letters for Anagram, or pairing a question with its answer for Matching Pairs).
                  </p>
                  <p>
                    A few formats need a specific kind of correct answer to make sense — Crossword needs a single word, Unjumble needs a short phrase, and so on. Those are shown greyed out with an explanation if your test doesn’t have a fit; every format’s requirement is listed with the game cards. For Rank Order, Complete the Sentence, Crossword, and Group Sort, you can also skip the MCQ import entirely and write content made specifically for that game — the import screen has a “Create custom” option for that.
                  </p>
                  <p>
                    Play it yourself, or save it and share a link with your students — they sign in with their name first, answers stay hidden while they work, and every attempt is timed, numbered, and reviewed item by item at the end.
                  </p>
                </div>
              </details>
            </section>

            {/* Games section */}
            <section id="games" className="py-10">
              <h2 className="text-2xl font-extrabold text-[var(--foreground)] text-center">
                22 ways to play one test
              </h2>
              <p className="text-center text-zinc-500 mt-1 text-sm max-w-xl mx-auto">
                Every game works differently, so some need a particular kind of question to make sense — that’s noted under each one.
              </p>

              {/* Filter chips */}
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {FILTERS.map((f) => {
                  const active = activeFilter === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => {
                        setActiveFilter(f.id);
                        setShowAll(false);
                      }}
                      className={`px-4 py-2 rounded-full text-sm font-bold transition-all cursor-pointer ${
                        active
                          ? "bg-brand text-white shadow-sm"
                          : "bg-white border border-zinc-200 text-zinc-600 hover:border-brand/40"
                      }`}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>

              {/* Card grid */}
              <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {visible.map((t) => (
                  <div
                    key={t.id}
                    className="bg-white border border-zinc-200 rounded-2xl p-5 hover:border-brand/40 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl leading-none shrink-0">{t.icon}</span>
                      <div className="min-w-0">
                        <p className="font-bold text-[var(--foreground)]">{t.name}</p>
                        <p className="text-sm text-zinc-500 mt-0.5 line-clamp-2">{t.description}</p>
                        <p className="text-xs text-brand-dark/80 font-medium mt-2 line-clamp-2">
                          {t.teacherTip}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filtered.length > 9 && (
                <div className="mt-6 text-center">
                  <button
                    onClick={() => setShowAll((v) => !v)}
                    className="text-brand font-bold hover:text-brand-dark underline underline-offset-2 cursor-pointer"
                  >
                    {showAll ? "Show fewer games" : `View all ${filtered.length} games →`}
                  </button>
                </div>
              )}
            </section>
          </div>

          {/* Right sticky panel — xl only */}
          <aside className="hidden xl:block w-72 shrink-0 pt-10">
            <div className="sticky top-24 space-y-4">
              <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-[var(--foreground)]">Quick start</h3>
                <p className="text-sm text-zinc-500 mt-1">
                  Import a test and pick a game in under a minute.
                </p>
                <button
                  onClick={onGetStarted}
                  className="mt-4 w-full bg-gold hover:bg-gold-dark text-[var(--foreground)] font-bold px-4 py-3 rounded-2xl shadow-sm active:scale-[0.98] transition-all cursor-pointer"
                >
                  Create a game →
                </button>
              </div>

              <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-[var(--foreground)]">Need a sample?</h3>
                <p className="text-sm text-zinc-500 mt-1">
                  Try a ready-made demo game first. (Coming soon.)
                </p>
              </div>

              <div className="bg-brand-light rounded-2xl p-5">
                <p className="text-sm font-medium text-brand-dark">Questions or feedback?</p>
                <div className="mt-3">
                  <SupportButton variant="solid" />
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Final CTA band */}
      <section className="bg-brand text-white">
        <div className="max-w-3xl mx-auto px-6 py-14 text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold">Ready in under a minute</h2>
          <p className="mt-3 text-white/80">Import once. Choose a game. Share the link.</p>
          <button
            onClick={onGetStarted}
            className="mt-8 bg-gold hover:bg-gold-dark text-[var(--foreground)] text-lg font-bold px-8 py-4 rounded-2xl shadow-md active:scale-[0.98] transition-all cursor-pointer"
          >
            Create a game →
          </button>
          <p className="mt-8 text-sm text-white/60">
            Built with ❤️ by Hazsher B. Munjilul · Sta. Ana NHS · DepEd Region XI, Division of Davao City
          </p>
        </div>
      </section>
    </div>
  );
}
