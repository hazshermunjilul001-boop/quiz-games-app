"use client";

import { useState } from "react";
import {
  CustomParseResult,
  getNativeFormatForTemplate,
  parseNativeContentForTemplate,
  prefillNativeContentForTemplate,
} from "@/lib/customFormats";
import { QuestionBank } from "@/lib/schema";
import {
  TEMPLATE_CATEGORY_LABELS,
  TEMPLATES,
  TemplateCategory,
  TemplateDef,
} from "@/components/templateRegistry";

const CATEGORY_ORDER: TemplateCategory[] = ["review", "word", "action"];
const NATIVE_TEMPLATES = TEMPLATES.filter((template) => Boolean(getNativeFormatForTemplate(template.id)));

export default function CustomImport({
  onParsed,
  onBack,
  backLabel = "Back",
  initialTemplateId,
  sourceBank,
}: {
  onParsed: (result: CustomParseResult, templateId: string) => void;
  onBack: () => void;
  backLabel?: string;
  initialTemplateId?: string | null;
  sourceBank?: QuestionBank | null;
}) {
  const initialTemplate = NATIVE_TEMPLATES.find((template) => template.id === initialTemplateId) ?? null;
  const initialFormat = initialTemplate ? getNativeFormatForTemplate(initialTemplate.id) : undefined;
  const initialPrefill = initialTemplate && sourceBank
    ? prefillNativeContentForTemplate(initialTemplate.id, sourceBank)
    : null;

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(initialTemplate?.id ?? null);
  const [text, setText] = useState(initialPrefill ?? initialFormat?.example ?? "");
  const [prefilledFromSource, setPrefilledFromSource] = useState(Boolean(initialPrefill));
  const [title, setTitle] = useState(
    initialTemplate
      ? sourceBank
        ? `${sourceBank.title} — ${initialTemplate.name}`
        : `${initialTemplate.name} activity`
      : ""
  );
  const [error, setError] = useState<string | null>(null);
  const [parsedResult, setParsedResult] = useState<CustomParseResult | null>(null);

  const selectedTemplate = NATIVE_TEMPLATES.find((template) => template.id === selectedTemplateId) ?? null;
  const selectedFormat = selectedTemplate ? getNativeFormatForTemplate(selectedTemplate.id) : undefined;
  const wasPrefilled = prefilledFromSource;

  function chooseTemplate(template: TemplateDef) {
    const format = getNativeFormatForTemplate(template.id);
    if (!format) return;
    const prefill = sourceBank ? prefillNativeContentForTemplate(template.id, sourceBank) : null;
    setSelectedTemplateId(template.id);
    setText(prefill ?? format.example);
    setPrefilledFromSource(Boolean(prefill));
    setTitle(sourceBank ? `${sourceBank.title} — ${template.name}` : `${template.name} activity`);
    setError(null);
    setParsedResult(null);
  }

  function changeGame() {
    setSelectedTemplateId(null);
    setText("");
    setPrefilledFromSource(false);
    setTitle("");
    setError(null);
    setParsedResult(null);
  }

  function updateText(value: string) {
    setText(value);
    setPrefilledFromSource(false);
    setError(null);
    setParsedResult(null);
  }

  function handleParse() {
    if (!selectedTemplate) return;
    setError(null);
    setParsedResult(null);
    try {
      const result = parseNativeContentForTemplate(
        selectedTemplate.id,
        text,
        title.trim() || selectedTemplate.name
      );
      setParsedResult(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Couldn't parse this input.");
    }
  }

  function downloadExample() {
    if (!selectedFormat || !selectedTemplate) return;
    const blob = new Blob([selectedFormat.example], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedTemplate.id}-example.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <button
        type="button"
        onClick={onBack}
        className="text-sm text-brand hover:text-brand-dark font-medium cursor-pointer transition-colors"
      >
        ← {backLabel}
      </button>

      {!selectedTemplate || !selectedFormat ? (
        <>
          <p className="mt-5 text-sm font-bold uppercase tracking-wide text-brand">Game-first creation</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-[var(--foreground)]">
            Choose the game you want to make
          </h1>
          <p className="mt-2 text-base text-zinc-600">
            Start with the activity, then enter content in the format that game uses best. Your content will open in the same player as an imported quiz.
          </p>

          {sourceBank && (
            <div className="mt-4 rounded-2xl border border-brand/20 bg-brand-light px-4 py-3 text-sm text-brand-dark">
              Based on <strong>{sourceBank.title}</strong>. Choose a game to see an editable native template; where possible, we will prefill it from your existing answers.
            </div>
          )}

          <div className="mt-6 space-y-7">
            {CATEGORY_ORDER.map((category) => {
              const games = NATIVE_TEMPLATES.filter((template) => template.category === category);
              if (!games.length) return null;
              return (
                <section key={category}>
                  <h2 className="text-lg font-extrabold text-[var(--foreground)]">
                    {TEMPLATE_CATEGORY_LABELS[category]}
                  </h2>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {games.map((template) => {
                      const format = getNativeFormatForTemplate(template.id)!;
                      return (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => chooseTemplate(template)}
                          className="rounded-2xl border-2 border-zinc-200 bg-white p-4 text-left shadow-sm transition-all hover:border-brand/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                        >
                          <span className="flex items-start gap-3">
                            <span className="text-2xl leading-none" aria-hidden="true">{template.icon}</span>
                            <span className="min-w-0">
                              <span className="block font-bold text-[var(--foreground)]">{template.name}</span>
                              <span className="mt-1 block text-sm leading-relaxed text-zinc-500">{template.description}</span>
                              <span className="mt-2 block text-xs font-semibold text-brand-dark">Best input: {format.label}</span>
                              <span className="mt-1 block text-xs leading-relaxed text-zinc-500">{template.teacherTip}</span>
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-bold uppercase tracking-wide text-brand">Game-first creation</p>
              <h1 className="mt-1 flex items-center gap-2 text-3xl font-extrabold tracking-tight text-[var(--foreground)]">
                <span aria-hidden="true">{selectedTemplate.icon}</span>
                {selectedTemplate.name}
              </h1>
              <p className="mt-2 max-w-2xl text-base text-zinc-600">{selectedTemplate.description}</p>
            </div>
            <button
              type="button"
              onClick={changeGame}
              className="shrink-0 rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-bold text-brand hover:border-brand/40 hover:bg-brand-light"
            >
              ← Change game
            </button>
          </div>

          <div className="mt-5 rounded-2xl border border-brand/20 bg-brand-light p-4">
            <p className="text-sm font-bold text-brand-dark">Best input for this game: {selectedFormat.label}</p>
            <p className="mt-1 text-sm leading-relaxed text-brand-dark">{selectedTemplate.teacherTip}</p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-700">{selectedFormat.instructions}</p>
          </div>

          {wasPrefilled && (
            <p className="mt-3 text-sm text-zinc-600">
              We started with content derived from <strong>{sourceBank?.title}</strong>. Review and edit every line before creating the game.
            </p>
          )}

          <div className="mt-5 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <label htmlFor="native-title" className="block text-sm font-bold text-[var(--foreground)]">
              Activity title
            </label>
            <input
              id="native-title"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                setParsedResult(null);
              }}
              className="mt-2 w-full rounded-xl border-2 border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:border-brand focus:outline-none"
            />

            <label htmlFor="native-content" className="mt-4 block text-sm font-bold text-[var(--foreground)]">
              Your game content
            </label>
            <textarea
              id="native-content"
              className="mt-2 h-72 w-full rounded-xl border-2 border-zinc-200 bg-white p-3 font-mono text-sm text-zinc-900 focus:border-brand focus:outline-none"
              value={text}
              onChange={(event) => updateText(event.target.value)}
              spellCheck={false}
            />

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => updateText(selectedFormat.example)}
                className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-bold text-[var(--foreground)] hover:bg-zinc-50"
              >
                Use this example
              </button>
              <button
                type="button"
                onClick={() => updateText("")}
                className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-bold text-[var(--foreground)] hover:bg-zinc-50"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={downloadExample}
                className="rounded-xl px-3 py-2 text-xs font-bold text-brand hover:bg-brand-light"
              >
                Download sample .txt
              </button>
            </div>

            {error && (
              <div className="mt-4 whitespace-pre-line rounded-xl border-2 border-incorrect/30 bg-incorrect-bg p-3 text-sm font-medium text-incorrect" role="alert">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleParse}
              disabled={!text.trim()}
              className="mt-5 rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-dark active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Parse content
            </button>
          </div>

          {parsedResult && (
            <div className="mt-4 rounded-2xl border border-correct/25 bg-correct-bg p-5">
              <h2 className="font-bold text-[var(--foreground)]">
                Ready: {parsedResult.bank.questions.length} {parsedResult.bank.questions.length === 1 ? "item" : "items"} parsed
              </h2>
              {parsedResult.warnings.length > 0 && (
                <div className="mt-3 rounded-xl border border-gold/40 bg-gold/10 p-3 text-sm text-gold-dark">
                  <p className="font-bold">A few lines need attention:</p>
                  <ul className="mt-1 list-inside list-disc space-y-0.5">
                    {parsedResult.warnings.map((warning, index) => <li key={index}>{warning}</li>)}
                  </ul>
                </div>
              )}
              <button
                type="button"
                onClick={() => onParsed(parsedResult, selectedTemplate.id)}
                className="mt-4 w-full rounded-xl bg-brand px-5 py-3 font-bold text-white shadow-sm transition-all hover:bg-brand-dark active:scale-[0.99]"
              >
                Create {selectedTemplate.name} game →
              </button>
            </div>
          )}

          <details className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4">
            <summary className="cursor-pointer font-bold text-[var(--foreground)]">View an example</summary>
            <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-zinc-50 p-3 font-mono text-xs text-zinc-700">{selectedFormat.example}</pre>
          </details>
        </>
      )}
    </div>
  );
}
