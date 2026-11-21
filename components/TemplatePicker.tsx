"use client";

import { QuestionBank } from "@/lib/schema";
import {
  TEMPLATE_CATEGORY_LABELS,
  TEMPLATES,
  TemplateCategory,
  isTemplateAvailable,
} from "./templateRegistry";
import { getNativeFormatForTemplate } from "@/lib/customFormats";
import ShareLinkModal from "./ShareLinkModal";
import ReportProblemLink from "./ReportProblemLink";

const CATEGORY_ORDER: TemplateCategory[] = ["review", "word", "action"];
const BEST_INPUT_HINTS: Record<string, string> = {
  quiz: "Multiple-choice questions with clear answer choices.",
  "true-false": "Factual statements with one definitively true or false answer.",
  "open-the-box": "Any question type; short prompts work best.",
  "spin-the-wheel": "Any question type; use short prompts for quick turns.",
  "whack-a-mole": "Multiple-choice questions with short answer choices.",
  "flying-fruit": "Multiple-choice questions with short answer choices.",
  airplane: "Multiple-choice questions with short answer choices.",
  "maze-chase": "Multiple-choice questions with concise answer choices.",
};

function getBestInputHint(templateId: string): string {
  return getNativeFormatForTemplate(templateId)?.label
    ?? BEST_INPUT_HINTS[templateId]
    ?? "Short, clear questions and answers.";
}

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
  /** Opens the game-first editor, optionally prefilled from this bank. */
  onCreateCustom?: (templateId?: string, sourceBank?: QuestionBank) => void;
}) {
  const availability = TEMPLATES.map((template) => ({
    template,
    available: isTemplateAvailable(bank, template),
  }));
  const availableCount = availability.filter((item) => item.available).length;
  const unavailableCount = TEMPLATES.length - availableCount;

  return (
    <div className="mx-auto max-w-3xl">
      {onBack && (
        <button onClick={onBack} className="text-sm font-medium text-brand transition-colors hover:text-brand-dark cursor-pointer">
          ← {backLabel}
        </button>
      )}
      <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-[var(--foreground)]">
        Choose a game for &ldquo;{bank.title}&rdquo;
      </h2>
      <p className="mt-1 text-base text-zinc-500">{bank.questions.length} questions imported</p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-brand/20 bg-brand-light px-4 py-3">
        <div>
          <p className="text-sm font-bold text-brand-dark">
            {availableCount} of {TEMPLATES.length} games available
            {unavailableCount > 0 && (
              <span className="font-medium"> · {unavailableCount} need a different answer format</span>
            )}
          </p>
          {unavailableCount > 0 && (
            <p className="mt-1 text-xs text-brand-dark/80">Write game-specific content instead of forcing an incompatible source format.</p>
          )}
        </div>
        {onCreateCustom && (
          <button
            onClick={() => onCreateCustom(undefined, bank)}
            className="rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-dark active:scale-95 cursor-pointer"
          >
            Write custom content instead →
          </button>
        )}
      </div>

      <div className="mt-6 space-y-8">
        {CATEGORY_ORDER.map((category) => {
          const games = availability.filter((item) => item.template.category === category);
          if (!games.length) return null;
          return (
            <section key={category}>
              <h3 className="text-lg font-extrabold text-[var(--foreground)]">
                {TEMPLATE_CATEGORY_LABELS[category]}
              </h3>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                {games.map(({ template, available }) => (
                  <article
                    key={template.id}
                    className={[
                      "rounded-2xl border-2 p-5 transition-all",
                      available
                        ? "border-zinc-200 bg-white hover:border-brand hover:shadow-md"
                        : "border-zinc-100 bg-zinc-50",
                    ].join(" ")}
                  >
                    <button
                      type="button"
                      onClick={() => available && onChoose(template.id)}
                      disabled={!available}
                      className={["w-full text-left", available ? "cursor-pointer" : "cursor-not-allowed"].join(" ")}
                    >
                      <span className="flex items-start gap-3">
                        <span className="text-2xl leading-none" aria-hidden="true">{template.icon}</span>
                        <span className="min-w-0">
                          <span className="block text-lg font-bold text-[var(--foreground)]">{template.name}</span>
                          <span className="mt-0.5 block text-sm text-zinc-500">{template.description}</span>
                          <span className="mt-2 block text-xs font-medium leading-relaxed text-brand-dark/90">
                            Best input: {getBestInputHint(template.id)}
                          </span>
                          {!available && (
                            <span className="mt-2 inline-flex rounded-full bg-gold/15 px-2.5 py-1 text-xs font-bold text-gold-dark">
                              Not available for this bank
                            </span>
                          )}
                        </span>
                      </span>
                    </button>

                    {available && allowSharing && (
                      <div className="mt-3 border-t border-zinc-100 pt-3">
                        <ShareLinkModal
                          bank={bank}
                          templateId={template.id}
                          triggerLabel={`Share ${template.name} only`}
                          triggerClassName="text-xs font-bold text-brand hover:text-brand-dark underline underline-offset-2 cursor-pointer"
                          helpText={`Every student who opens this link goes straight into ${template.name} — they won't see the other game options.`}
                        />
                      </div>
                    )}
                    {!available && onCreateCustom && getNativeFormatForTemplate(template.id) && (
                      <button
                        type="button"
                        onClick={() => onCreateCustom(template.id, bank)}
                        className="mt-3 w-full rounded-xl border border-brand/30 bg-white px-3 py-2.5 text-left text-sm font-bold text-brand transition-colors hover:border-brand hover:bg-brand-light"
                      >
                        Write custom content for {template.name} →
                      </button>
                    )}
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-6 text-center">
        <ReportProblemLink quizTitle={bank.title} />
      </div>
    </div>
  );
}
