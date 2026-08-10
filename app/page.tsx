"use client";

import { useRef, useState } from "react";
import { extractTextFromFile } from "@/lib/fileParse";
import { importFromText, ImportResult } from "@/lib/importPipeline";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import { useCurrentUser } from "@/lib/auth";
import PlaySession from "@/components/PlaySession";
import Welcome from "@/components/Welcome";
import CustomImport from "@/components/CustomImport";
import ShareLinkModal from "@/components/ShareLinkModal";

type Screen = "welcome" | "import" | "custom" | "play";

export default function Home() {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [rawText, setRawText] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function runImport(text: string, title: string) {
    setError(null);
    try {
      const res = importFromText(text, title);
      setResult(res);
    } catch (e: any) {
      setResult(null);
      setError(e.message ?? "Couldn't parse this input.");
    }
  }

  async function handleFile(file: File) {
    setFileName(file.name);
    try {
      const text = await extractTextFromFile(file);
      setRawText(text);
      runImport(text, file.name.replace(/\.[^.]+$/, ""));
    } catch (e: any) {
      setError(e.message ?? "Couldn't read this file.");
    }
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
    return <PlaySession bank={result.bank} onBack={() => setScreen("import")} allowSharing />;
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
        <h1 className="text-3xl font-extrabold text-[var(--foreground)] tracking-tight mt-2">Quiz Games</h1>
        <p className="text-zinc-600 mt-2 text-base">
          Paste a test, or upload a .txt / .docx / .pdf / .json file — including
          output from TOS AI Generator — then pick a game to play it.
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
            {fileName && <span className="text-xs text-zinc-500">{fileName}</span>}
          </div>
        </div>

        <div className="mt-3 bg-brand-light border border-brand/20 rounded-xl p-4 flex items-center justify-between gap-3">
          <p className="text-sm text-brand-dark">
            Want <strong>Rank Order</strong>, a natural <strong>Complete the Sentence</strong>, a clean{" "}
            <strong>Crossword</strong> clue, or your own <strong>Group Sort</strong> categories? Write content for
            that game directly instead.
          </p>
          <button
            onClick={() => setScreen("custom")}
            className="shrink-0 border-2 border-brand text-brand text-sm font-bold px-4 py-2 rounded-xl hover:bg-white active:scale-95 transition-all cursor-pointer whitespace-nowrap"
          >
            Create custom →
          </button>
        </div>

        {error && (
          <div className="mt-4 bg-incorrect-bg border-2 border-incorrect/30 text-incorrect text-sm font-medium rounded-xl p-4 whitespace-pre-line">
            {error}
          </div>
        )}

        {result && <ImportPreview result={result} onPlay={() => setScreen("play")} />}
      </main>
    </div>
  );
}

function ImportPreview({ result, onPlay }: { result: ImportResult; onPlay: () => void }) {
  const { user } = useCurrentUser();
  const { bank, warnings } = result;

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
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg text-[var(--foreground)]">
            {bank.title} <span className="text-zinc-400 font-normal text-base">· {bank.questions.length} questions</span>
          </h2>
          <span className="text-xs font-bold bg-brand-light text-brand-dark px-2.5 py-1 rounded-full">
            {bank.source}
          </span>
        </div>

        <ol className="mt-3 space-y-3 max-h-80 overflow-y-auto">
          {bank.questions.map((q, i) => (
            <li key={q.id} className="text-sm border-t border-zinc-100 pt-3 first:border-t-0 first:pt-0">
              {q.type === "mcq" && (
                <>
                  <p className="font-semibold text-[var(--foreground)]">{i + 1}. {q.prompt}</p>
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
                </>
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
            Not set up yet — add Supabase credentials to enable this (see <code className="bg-zinc-100 px-1.5 py-0.5 rounded text-xs">supabase/schema.sql</code>). Import-and-play above still works fully offline without it.
          </p>
        )}

        {isSupabaseConfigured && (
          <>
            <p className="text-sm text-zinc-500 mt-1 mb-3">
              Lets students play without logging in.{" "}
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
              helpText="Anyone with this link can play it without logging in — they'll pick which game to play themselves."
            />
          </>
        )}
      </div>
    </div>
  );
}
