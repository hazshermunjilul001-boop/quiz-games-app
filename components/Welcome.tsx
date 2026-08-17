"use client";

import { useState } from "react";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";
import { TEMPLATES, TEMPLATE_CATEGORY_LABELS, TemplateCategory } from "@/components/templateRegistry";

const CATEGORY_ORDER: TemplateCategory[] = ["review", "word", "action"];
const CATEGORY_BLURB: Record<TemplateCategory, string> = {
  review: "Quiz-style and matching formats — the safest bet for any multiple-choice test.",
  word: "Spelling, unscrambling, and word-grid formats — best when an answer is a single word or short phrase.",
  action: "Fast-paced, arcade-style formats — tap or move to the correct answer under time pressure.",
};

export default function Welcome({ onGetStarted }: { onGetStarted: () => void }) {
  const [openCategory, setOpenCategory] = useState<TemplateCategory | null>("review");

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="text-center">
          <span className="text-5xl">🎮</span>
          <h1 className="text-4xl font-extrabold text-[var(--foreground)] mt-3 tracking-tight">{BRAND_NAME}</h1>
          <p className="text-lg text-zinc-600 mt-2 max-w-xl mx-auto">{BRAND_TAGLINE}</p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs font-bold bg-brand-light text-brand-dark px-3 py-1.5 rounded-full">
              For DepEd teachers
            </span>
            <span className="text-xs font-bold bg-brand-light text-brand-dark px-3 py-1.5 rounded-full">
              Free
            </span>
            <span className="text-xs font-bold bg-brand-light text-brand-dark px-3 py-1.5 rounded-full">
              No student accounts needed
            </span>
          </div>
        </div>

        <div className="mt-8 bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-[var(--foreground)]">How it works</h2>
          <ol className="mt-3 space-y-2 text-base text-zinc-700 list-decimal list-inside">
            <li>Paste or upload a multiple-choice test — plain text, .docx, .pdf, or a TOS AI Generator export.</li>
            <li>The app reads your questions and correct answers automatically.</li>
            <li>
              Pick from 22 interactive game formats — every format is generated automatically from that
              same multiple-choice import. You don&rsquo;t prepare different question types for different
              games; the app reshapes your MCQ answers as needed (e.g. splitting a one-word answer into
              letters for Anagram, or pairing a question with its answer for Matching Pairs).
            </li>
            <li>
              A few formats need a specific kind of correct answer to make sense — Crossword needs a
              single word, Unjumble needs a short phrase, and so on. Those are shown greyed out with an
              explanation if your test doesn&rsquo;t have a fit; every format&rsquo;s requirement is listed
              below. For Rank Order, Complete the Sentence, Crossword, and Group Sort, you can also skip
              the MCQ import entirely and write content made specifically for that game — the import
              screen has a &ldquo;Create custom&rdquo; option for that.
            </li>
            <li>Play it yourself, or save it and share a link with your students — no login needed on their end.</li>
          </ol>
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-bold text-[var(--foreground)] text-center">22 ways to play one test</h2>
          <p className="text-sm text-zinc-500 text-center mt-1">
            Every game works differently, so some need a particular kind of question to make sense — that's noted under each one.
          </p>

          <div className="mt-5 space-y-3">
            {CATEGORY_ORDER.map((cat) => {
              const templates = TEMPLATES.filter((t) => t.category === cat);
              const isOpen = openCategory === cat;
              return (
                <div key={cat} className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setOpenCategory(isOpen ? null : cat)}
                    className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left cursor-pointer hover:bg-zinc-50 transition-colors"
                  >
                    <div>
                      <p className="font-bold text-[var(--foreground)]">
                        {TEMPLATE_CATEGORY_LABELS[cat]}{" "}
                        <span className="text-zinc-400 font-normal text-sm">· {templates.length} games</span>
                      </p>
                      <p className="text-sm text-zinc-500 mt-0.5">{CATEGORY_BLURB[cat]}</p>
                    </div>
                    <span
                      className={`shrink-0 text-zinc-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                      aria-hidden
                    >
                      ▾
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 grid sm:grid-cols-2 gap-3">
                      {templates.map((t) => (
                        <div key={t.id} className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4">
                          <div className="flex items-start gap-3">
                            <span className="text-xl leading-none">{t.icon}</span>
                            <div>
                              <p className="font-bold text-[var(--foreground)]">{t.name}</p>
                              <p className="text-sm text-zinc-500 mt-0.5">{t.description}</p>
                              <p className="text-xs text-brand-dark font-medium mt-1.5">For teachers: {t.teacherTip}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-10 text-center">
          <button
            onClick={onGetStarted}
            className="bg-brand text-white text-lg font-bold px-8 py-4 rounded-2xl hover:bg-brand-dark active:scale-[0.98] transition-all cursor-pointer shadow-lg"
          >
            Import your test →
          </button>
          <p className="text-sm text-zinc-500 mt-3">Built with ❤️ by Hazsher B. Munjilul · Sta. Ana NHS · DepEd Region XI, Division of Davao City — made by a teacher, for DepEd teachers.</p>
        </div>
      </div>
    </div>
  );
}
