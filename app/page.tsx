"use client";

import { useRef, useState } from "react";
import { extractFromFile } from "@/lib/fileParse";
import { importFromText, ImportResult } from "@/lib/importPipeline";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import { useCurrentUser } from "@/lib/auth";
import PlaySession from "@/components/PlaySession";
import Welcome from "@/components/Welcome";
import CustomImport from "@/components/CustomImport";
import ShareLinkModal from "@/components/ShareLinkModal";
import { McqQuestion, Question, QuestionBank } from "@/lib/schema";

type Screen = "welcome" | "import" | "custom" | "play";

export default function Home() {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [rawText, setRawText] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function runImport(
    text: string,
    title: string,
    images: import("@/lib/fileParse").ExtractedImage[] = [],
    source: QuestionBank["source"] = "paste"
  ) {
    setError(null);
    try {
      const res = importFromText(text, title, images, source);
      setResult(res);
    } catch (e: any) {
      setResult(null);
      setError(e.message ?? "Couldn't parse this input.");
    }
  }

  async function handleFile(file: File) {
    setFileName(file.name);
    try {
      const extracted = await extractFromFile(file);
      setRawText(extracted.text);
      const extension = file.name.split(".").pop()?.toLowerCase();
      const source: QuestionBank["source"] = extension === "docx" ? "docx" : extension === "pdf" ? "pdf" : "paste";
      runImport(extracted.text, file.name.replace(/\.[^.]+$/, ""), extracted.images, source);
    } catch (e: any) {
      setError(e.message ?? "Couldn't read this file.");
    }
  }

  function updateBank(nextBank: QuestionBank) {
    setResult((prev) => (prev ? { ...prev, bank: nextBank } : prev));
  }

  if (screen === "welcome") {
    return <Welcome onGetStarted={() => setScreen("import")} />;
  }

  if (screen === "custom") {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <main className="max-w-3xl mx-auto py-12 px-6">
          <CustomImport
            onBack={() => setScreen("import")}
            onParsed={(customResult) => {
              setResult(customResult);
              setScreen("play");
            }}
          />
        </main>
      </div>
    );
  }

  if (screen === "play" && result) {
    return (
      <PlaySession
        bank={result.bank}
        onBack={() => setScreen("import")}
        allowSharing
        onCreateCustom={() => setScreen("custom")}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <main className="max-w-3xl mx-auto py-12 px-6">
        <button
          onClick={() => setScreen("welcome")}
          className="text-sm text-brand hover:text-brand-dark font-medium cursor-pointer transition-colors"
        >
          ← Back to welcome
        </button>
        <h1 className="text-3xl font-extrabold text-[var(--foreground)] tracking-tight mt-2">Import your test</h1>
        <p className="text-zinc-600 mt-2 text-base">
          Paste a test, or upload a .txt / .docx / .pdf / .json file — including
          output from TOS AI Generator — then pick a game to play it.
        </p>
        <p className="text-sm text-zinc-500 mt-1">
          Best results with clean .txt, .docx, or a TOS AI Generator export — scanned or image-heavy PDFs
          can extract messily, so double-check the preview below before playing.
        </p>

        <div className="mt-6 bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
          <label className="block text-sm font-bold text-[var(--foreground)] mb-2">
            Paste test text or JSON
          </label>
          <textarea
            className="w-full h-56 border-2 border-zinc-200 rounded-xl p-3 text-sm font-mono bg-white text-zinc-900 placeholder:text-zinc-400 focus:border-brand focus:outline-none transition-colors"
            placeholder={`1. What is the capital of the Philippines?\nA. Cebu City\nB. Manila\nC. Davao City\nD. Baguio City\n\nANSWER KEY\n1. B`}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
          />
          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={() => runImport(rawText, fileName ?? "Pasted Quiz")}
              className="bg-brand text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-brand-dark active:scale-95 transition-all cursor-pointer shadow-sm"
            >
              Parse
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-zinc-200 bg-white text-[var(--foreground)] text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-zinc-50 active:scale-95 transition-all cursor-pointer"
            >
              Upload file instead
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.docx,.pdf,.json"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            {fileName && <span className="text-xs text-zinc-500 truncate max-w-[12rem]">{fileName}</span>}
          </div>
          {error && (
            <p className="mt-3 text-sm text-incorrect font-medium bg-incorrect-bg border border-incorrect/20 rounded-xl px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {result && (
          <ImportPreview
            result={result}
            onPlay={() => setScreen("play")}
            onUpdateBank={updateBank}
          />
        )}
      </main>
    </div>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Couldn't read image file."));
    reader.readAsDataURL(file);
  });
}

function ImportPreview({
  result,
  onPlay,
  onUpdateBank,
}: {
  result: ImportResult;
  onPlay: () => void;
  onUpdateBank: (bank: QuestionBank) => void;
}) {
  const { user } = useCurrentUser();
  const { bank, warnings } = result;
  const diagramInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  async function attachDiagram(questionId: string, file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please choose an image file (PNG, JPG, etc.).");
      return;
    }
    // Keep data URLs reasonable for share-link JSON size
    if (file.size > 1.5 * 1024 * 1024) {
      alert("Image is too large. Please use a file under ~1.5 MB.");
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      const nextQuestions: Question[] = bank.questions.map((q) => {
        if (q.id !== questionId || q.type !== "mcq") return q;
        const mcq = q as McqQuestion;
        return {
          ...mcq,
          imageUrl: dataUrl,
          imageAlt: mcq.imageAlt ?? `Diagram for: ${mcq.prompt.slice(0, 80)}`,
        };
      });
      onUpdateBank({ ...bank, questions: nextQuestions });
    } catch (e: any) {
      alert(e.message ?? "Couldn't attach image.");
    }
  }

  function removeDiagram(questionId: string) {
    const nextQuestions: Question[] = bank.questions.map((q) => {
      if (q.id !== questionId || q.type !== "mcq") return q;
      const { imageUrl: _u, imageAlt: _a, ...rest } = q as McqQuestion;
      return rest as McqQuestion;
    });
    onUpdateBank({ ...bank, questions: nextQuestions });
  }

  return (
    <div className="mt-6 space-y-4">
      {warnings.length > 0 && (
        <div className="bg-gold/10 border-2 border-gold/40 text-gold-dark text-sm rounded-xl p-4">
          <p className="font-bold mb-1">Heads up:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="font-bold text-lg text-[var(--foreground)]">
            {bank.title}{" "}
            <span className="text-zinc-400 font-normal text-base">· {bank.questions.length} questions</span>
          </h2>
          <span className="text-xs font-bold bg-brand-light text-brand-dark px-2.5 py-1 rounded-full">
            {bank.source}
          </span>
        </div>
        <p className="text-xs text-zinc-500 mt-1">
          Need a diagram on a question? Use <strong>Add diagram</strong> on any MCQ below — images travel with the shared link.
        </p>

        <ol className="mt-3 space-y-3 max-h-[28rem] overflow-y-auto">
          {bank.questions.map((q, i) => (
            <li key={q.id} className="text-sm border-t border-zinc-100 pt-3 first:border-t-0 first:pt-0">
              {q.type === "mcq" && (
                <>
                  <p className="font-semibold text-[var(--foreground)]">
                    {i + 1}. {q.prompt}
                  </p>
                  <ul className="mt-1 pl-4 space-y-0.5">
                    {q.choices.map((c, ci) => (
                      <li
                        key={ci}
                        className={ci === q.correctIndex ? "text-correct font-semibold" : "text-zinc-600"}
                      >
                        {String.fromCharCode(65 + ci)}. {c} {ci === q.correctIndex && "✓"}
                      </li>
                    ))}
                  </ul>

                  {q.imageUrl ? (
                    <div className="mt-2 flex flex-wrap items-start gap-3">
                      <img
                        src={q.imageUrl}
                        alt={q.imageAlt ?? "Question diagram"}
                        className="max-h-28 rounded-lg border border-zinc-200 object-contain bg-white"
                      />
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-brand-dark">Diagram attached</span>
                        <input
                          ref={(el) => {
                            diagramInputRefs.current[q.id] = el;
                          }}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0] ?? null;
                            e.target.value = "";
                            void attachDiagram(q.id, file);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => diagramInputRefs.current[q.id]?.click()}
                          className="text-xs font-bold text-brand hover:text-brand-dark underline underline-offset-2 cursor-pointer text-left"
                        >
                          Replace diagram
                        </button>
                        <button
                          type="button"
                          onClick={() => removeDiagram(q.id)}
                          className="text-xs font-bold text-incorrect hover:underline cursor-pointer text-left"
                        >
                          Remove diagram
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <input
                        ref={(el) => {
                          diagramInputRefs.current[q.id] = el;
                        }}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null;
                          e.target.value = "";
                          void attachDiagram(q.id, file);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => diagramInputRefs.current[q.id]?.click()}
                        className="text-xs font-bold text-brand hover:text-brand-dark underline underline-offset-2 cursor-pointer"
                      >
                        + Add diagram
                      </button>
                    </div>
                  )}
                </>
              )}
              {q.type !== "mcq" && (
                <p className="font-semibold text-[var(--foreground)]">
                  {i + 1}. [{q.type}]{" "}
                  {"prompt" in q
                    ? (q as { prompt?: string }).prompt
                    : "term" in q
                      ? (q as { term: string }).term
                      : "text" in q
                        ? (q as { text: string }).text
                        : ""}
                </p>
              )}
            </li>
          ))}
        </ol>
      </div>

      <button
        onClick={onPlay}
        className="w-full bg-brand text-white text-base font-bold px-4 py-4 rounded-2xl hover:bg-brand-dark active:scale-[0.99] transition-all cursor-pointer shadow-sm"
      >
        Choose a game →
      </button>

      <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
        <h3 className="font-bold text-[var(--foreground)]">Save & get a link for students</h3>

        {!isSupabaseConfigured && (
          <p className="text-sm text-zinc-500 mt-1">
            Not set up yet — add Supabase credentials to enable this (see{" "}
            <code className="bg-zinc-100 px-1.5 py-0.5 rounded text-xs">supabase/schema.sql</code>). Import-and-play
            above still works fully offline without it.
          </p>
        )}

        {isSupabaseConfigured && (
          <>
            <p className="text-sm text-zinc-500 mt-1 mb-3">
              Students sign in with their name before taking it — answers stay hidden until the end, and each attempt
              is timed, numbered, and reviewed item by item.{" "}
              {user
                ? "You're signed in, so this will also show up in My Activities."
                : "Sign in from the banner above first if you want to find this quiz again later in My Activities."}{" "}
              Prefer everyone playing the same specific game? Pick a game first (below), then use its own{" "}
              <strong>Share this game only</strong> link instead.
            </p>
            <ShareLinkModal
              bank={bank}
              templateId={null}
              triggerLabel="Save & Get Share Link"
              triggerClassName="bg-brand text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-brand-dark active:scale-95 transition-all cursor-pointer"
              helpText="Anyone opening this link signs in with their name first — then they'll pick which game to play themselves."
            />
          </>
        )}
      </div>
    </div>
  );
}
