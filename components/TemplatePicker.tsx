"use client";

import { QuestionBank } from "@/lib/schema";
import { TEMPLATES, isTemplateAvailable } from "./templateRegistry";
import ShareLinkModal from "./ShareLinkModal";
import ReportProblemLink from "./ReportProblemLink";

export default function TemplatePicker({
  bank,
  onChoose,
  onBack,
  backLabel = "Back to import",
  allowSharing = false,
  onCreateCustom,
}: {
  bank: QuestionBank;
  onChoose: (templateId: string) => void;
  onBack?: () => void;
  backLabel?: string;
  /** Show a "Share this game" action per card — only relevant for the
   * teacher's own flow, never on a student's shared-link view. */
  allowSharing?: boolean;
  /** When provided, shown as a link from the compatibility summary so a
   * teacher can jump straight to writing custom content for the games
   * that need it (Rank Order, Crossword, Complete the Sentence, Group Sort). */
  onCreateCustom?: () => void;
}) {
  const availability = TEMPLATES.map((t) => ({ template: t, available: isTemplateAvailable(bank, t) }));
  const availableCount = availability.filter((a) => a.available).length;
  const unavailableCount = TEMPLATES.length - availableCount;

  return (
    <div className="max-w-3xl mx-auto">
      {onBack && (
        <button onClick={onBack} className="text-sm text-brand hover:text-brand-dark font-medium cursor-pointer transition-colors">
          ← {backLabel}
        </button>
      )}
      <h2 className="text-3xl font-extrabold text-[var(--foreground)] mt-1 tracking-tight">
        Choose a game for &ldquo;{bank.title}&rdquo;
      </h2>
      <p className="text-base text-zinc-500 mt-1">{bank.questions.length} questions imported</p>

      <div className="mt-4 bg-brand-light border border-brand/20 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm font-bold text-brand-dark">
          {availableCount} of {TEMPLATES.length} games available
          {unavailableCount > 0 && (
            <span className="font-medium"> · {unavailableCount} need different answer formats</span>
          )}
        </p>
        {unavailableCount > 0 && onCreateCustom && (
          <button
            onClick={onCreateCustom}
            className="text-xs font-bold text-brand hover:text-brand-dark underline underline-offset-2 cursor-pointer"
          >
            Write custom content for those instead →
          </button>
        )}
      </div>

      <div className="mt-6 grid sm:grid-cols-2 gap-4">
        {TEMPLATES.map((t) => {
          const available = isTemplateAvailable(bank, t);
          return (
            <div
              key={t.id}
              className={[
                "text-left p-5 rounded-2xl border-2 transition-all",
                available ? "bg-white border-zinc-200 hover:border-brand hover:shadow-md" : "bg-zinc-50 border-zinc-100 opacity-50",
              ].join(" ")}
            >
              <button
                onClick={() => available && onChoose(t.id)}
                disabled={!available}
                className={["w-full text-left", available ? "cursor-pointer" : "cursor-not-allowed"].join(" ")}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl leading-none">{t.icon}</span>
                  <div>
                    <p className="font-bold text-lg text-[var(--foreground)]">{t.name}</p>
                    <p className="text-sm text-zinc-500 mt-0.5">{t.description}</p>
                    {!available && (
                      <p className="text-xs text-gold-dark font-medium mt-2">Not available for this bank — {t.teacherTip.charAt(0).toLowerCase() + t.teacherTip.slice(1)}</p>
                    )}
                  </div>
                </div>
              </button>

              {available && allowSharing && (
                <div className="mt-3 pt-3 border-t border-zinc-100">
                  <ShareLinkModal
                    bank={bank}
                    templateId={t.id}
                    triggerLabel={`Share ${t.name} only`}
                    triggerClassName="text-xs font-bold text-brand hover:text-brand-dark underline underline-offset-2 cursor-pointer"
                    helpText={`Every student who opens this link goes straight into ${t.name} — they won't see the other game options.`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 text-center">
        <ReportProblemLink quizTitle={bank.title} />
      </div>
    </div>
  );
}
