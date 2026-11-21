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

export default function Welcome({
  onGetStarted,
  onCreateNative,
}: {
  onGetStarted: () => void;
  onCreateNative: () => void;
}) {
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
              Import a multiple-choice test or start with content made for one game. Play in under a minute and share a link.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <button
                onClick={onGetStarted}
                className="group flex min-h-40 w-full flex-col items-start rounded-2xl border-2 border-gold/50 bg-white p-5 text-left shadow-sm transition-all hover:border-gold hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                <span className="text-xs font-bold uppercase tracking-wide text-gold-dark">I have a multiple-choice test</span>
                <span className="mt-1 text-lg font-extrabold text-[var(--foreground)]">Import a multiple-choice test</span>
                <span className="mt-2 text-sm leading-relaxed text-zinc-600">
                  Paste or upload a .txt / .docx / .pdf / .json. Best for Quiz, True/False, and the action games.
                </span>
                <span className="mt-auto pt-3 text-sm font-bold text-gold-dark">Continue to import →</span>
              </button>
              <button
                onClick={onCreateNative}
                className="group flex min-h-40 w-full flex-col items-start rounded-2xl border-2 border-brand/40 bg-brand-light p-5 text-left shadow-sm transition-all hover:border-brand hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <span className="text-xs font-bold uppercase tracking-wide text-brand-dark">I want a specific game</span>
                <span className="mt-1 text-lg font-extrabold text-[var(--foreground)]">Create content for a specific game</span>
                <span className="mt-2 text-sm leading-relaxed text-zinc-700">
                  Choose the game first. Get its ideal format, an editable example, and a quick parser.
                </span>
                <span className="mt-auto pt-3 text-sm font-bold text-brand-dark">Choose a game →</span>
              </button>
            </div>
            <a
              href="#games"
              className="mt-4 inline-flex text-sm font-bold text-brand underline underline-offset-4 hover:text-brand-dark"
            >
              Browse all 22 games ↓
            </a>

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
                Import once or start with a game. Share the link.
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
                  <h3 className="mt-2 text-lg font-bold text-[var(--foreground)]">Choose your path</h3>
                  <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
                    Paste or upload an MCQ test, or start by choosing a game and writing content in its native format.
                  </p>
                </div>
                <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
                  <p className="text-xs font-black text-brand tracking-widest">02</p>
                  <h3 className="mt-2 text-lg font-bold text-[var(--foreground)]">Choose or shape content</h3>
                  <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
                    Pick from 22 interactive formats. MCQ imports stay compatible across games; native templates help activities like Crossword, Matching, and Rank Order shine.
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
                    The MCQ route still turns one imported test into the compatible games automatically. For example, the app can split a one-word correct answer into letters for Anagram or pair a question with its answer for Matching Pairs.
                  </p>
                  <p>
                    You can also skip MCQ import and choose a game first. Matching accepts term-and-definition pairs; word games accept words and clues; sentence games accept a blank plus its answer; Rank Order and Word Magnets accept numbered sequences; Group Sort accepts category-tagged items. Each editor includes clear rules, an example, and a parser.
                  </p>
                  <p>
                    Games that need a particular kind of source answer remain clearly marked when an MCQ bank is loaded. If converted content is only a rough fit, you can open that game’s native editor and start with whatever can be derived from the imported answers.
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
                22 games, two ways to create
              </h2>
              <p className="text-center text-zinc-500 mt-1 text-sm max-w-xl mx-auto">
                Import one MCQ bank for compatible games, or choose a game first and author content for the activity.
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
                  Import an MCQ test, or create native content for a specific game.
                </p>
                <button
                  onClick={onGetStarted}
                  className="mt-4 w-full bg-gold hover:bg-gold-dark text-[var(--foreground)] font-bold px-4 py-3 rounded-2xl shadow-sm active:scale-[0.98] transition-all cursor-pointer"
                >
                  Import a test →
                </button>
                <button
                  onClick={onCreateNative}
                  className="mt-2 w-full rounded-2xl border-2 border-brand/30 bg-brand-light px-4 py-3 font-bold text-brand-dark transition-all hover:border-brand/50 active:scale-[0.98] cursor-pointer"
                >
                  Create for a game
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
          <p className="mt-3 text-white/80">Import an MCQ test or start with a game-specific template.</p>
          <button
            onClick={onGetStarted}
            className="mt-8 bg-gold hover:bg-gold-dark text-[var(--foreground)] text-lg font-bold px-8 py-4 rounded-2xl shadow-md active:scale-[0.98] transition-all cursor-pointer"
          >
            Import a multiple-choice test →
          </button>
          <button
            onClick={onCreateNative}
            className="mt-3 ml-0 sm:ml-3 bg-white/10 hover:bg-white/20 text-white text-lg font-bold px-8 py-4 rounded-2xl border border-white/30 active:scale-[0.98] transition-all cursor-pointer"
          >
            Create content for a game
          </button>
          <p className="mt-8 text-sm text-white/60">
            Built with ❤️ by Hazsher B. Munjilul · Sta. Ana NHS · DepEd Region XI, Division of Davao City
          </p>
        </div>
      </section>
    </div>
  );
}
