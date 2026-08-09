"use client";

import { QuestionBank } from "@/lib/schema";
import { TEMPLATES, isTemplateAvailable } from "./templateRegistry";

export default function TemplatePicker({
  bank,
  onChoose,
  onBack,
  backLabel = "Back to import",
}: {
  bank: QuestionBank;
  onChoose: (templateId: string) => void;
  onBack?: () => void;
  backLabel?: string;
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
            <button
              key={t.id}
              disabled={!available}
              onClick={() => onChoose(t.id)}
              className={[
                "text-left p-5 rounded-2xl border-2 transition-all",
                available
                  ? "bg-white border-zinc-200 hover:border-brand hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                  : "bg-zinc-50 border-zinc-100 opacity-50 cursor-not-allowed",
              ].join(" ")}
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
          );
        })}
      </div>
    </div>
  );
}
