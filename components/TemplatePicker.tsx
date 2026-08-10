"use client";

import { QuestionBank } from "@/lib/schema";
import { TEMPLATES, isTemplateAvailable } from "./templateRegistry";
import ShareLinkModal from "./ShareLinkModal";

export default function TemplatePicker({
  bank,
  onChoose,
  onBack,
  backLabel = "Back to import",
  allowSharing = false,
}: {
  bank: QuestionBank;
  onChoose: (templateId: string) => void;
  onBack?: () => void;
  backLabel?: string;
  /** Show a "Share this game" action per card — only relevant for the
   * teacher's own flow, never on a student's shared-link view. */
  allowSharing?: boolean;
}) {
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
    </div>
  );
}
