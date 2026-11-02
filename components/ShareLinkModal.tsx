"use client";

import { useState } from "react";
import Link from "next/link";
import { QuestionBank } from "@/lib/schema";
import { saveBank } from "@/lib/persistence";

export default function ShareLinkModal({
  bank,
  templateId,
  triggerLabel,
  triggerClassName,
  helpText,
}: {
  bank: QuestionBank;
  /** null = students choose the game themselves; a template id = the link
   * skips the picker and goes straight into that one game. */
  templateId: string | null;
  triggerLabel: string;
  triggerClassName: string;
  helpText: string;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function reset() {
    setOpen(false);
    setSaving(false);
    setShareUrl(null);
    setShareCode(null);
    setError(null);
    setCopied(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const { code } = await saveBank(bank, templateId);
      setShareUrl(`${window.location.origin}/play/${code}`);
      setShareCode(code);
    } catch (e: any) {
      setError(e.message ?? "Couldn't save this quiz.");
    } finally {
      setSaving(false);
    }
  }

  async function copyLink() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className={triggerClassName}>
        {triggerLabel}
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={reset}>
          <div className="bg-white rounded-3xl shadow-xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-extrabold text-[var(--foreground)]">{triggerLabel}</h3>
            <p className="text-sm text-zinc-500 mt-1 mb-4">{helpText}</p>

            {!shareUrl && (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full bg-brand text-white rounded-xl px-4 py-3 font-bold hover:bg-brand-dark disabled:opacity-50 active:scale-[0.98] transition-all cursor-pointer"
                >
                  {saving ? "Saving..." : "Save & Get Link"}
                </button>
                {error && <p className="text-sm text-incorrect mt-2">{error}</p>}
              </>
            )}

            {shareUrl && (
              <div>
                <div className="flex items-center gap-2">
                  <input readOnly value={shareUrl} className="flex-1 border-2 border-zinc-200 rounded-xl p-2.5 text-sm bg-zinc-50 text-zinc-900" />
                  <button
                    onClick={copyLink}
                    className="border-2 border-zinc-200 bg-white text-[var(--foreground)] text-sm font-bold px-3 py-2.5 rounded-xl hover:bg-zinc-50 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <p className="text-sm text-zinc-500 mt-2">Share this with students — they&rsquo;ll sign in with their name to take it.</p>
                <p className="text-sm mt-1">
                  <Link href={`/dashboard?quiz=${shareCode}`} className="text-brand hover:text-brand-dark font-bold underline underline-offset-2">
                    Track their results here →
                  </Link>
                  <span className="text-zinc-500"> every attempt, score, time, and item review lands in your dashboard.</span>
                </p>
              </div>
            )}

            <button onClick={reset} className="w-full mt-3 text-sm text-zinc-500 hover:text-zinc-800 cursor-pointer">
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
