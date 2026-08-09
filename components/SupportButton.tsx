"use client";

import { useState } from "react";
import { GCASH_NAME, GCASH_NUMBER } from "@/lib/brand";

export default function SupportButton({ variant = "solid" }: { variant?: "solid" | "ghost" }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  function copyNumber() {
    navigator.clipboard?.writeText(GCASH_NUMBER.replace(/\s/g, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={
          variant === "solid"
            ? "bg-gold text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-gold-dark active:scale-95 transition-all cursor-pointer shadow-sm"
            : "text-sm font-bold text-white/90 hover:text-white underline underline-offset-2 cursor-pointer"
        }
      >
        💛 Support this tool
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div
            className="bg-white rounded-3xl shadow-xl max-w-sm w-full p-6 text-center stamp-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-extrabold text-[var(--foreground)]">Support this tool</h3>
            <p className="text-sm text-zinc-500 mt-1 mb-4">
              This app is free for every DepEd teacher. Every bit helps keep it that way.
            </p>
            <div className="bg-brand-light border-2 border-brand/20 rounded-2xl p-4 mb-4">
              <p className="text-xs font-bold text-brand-dark uppercase tracking-wide">GCash</p>
              <p className="text-2xl font-black tracking-wide text-[var(--foreground)] mt-1">{GCASH_NUMBER}</p>
              <p className="text-sm text-zinc-600">{GCASH_NAME}</p>
            </div>
            <button
              onClick={copyNumber}
              className="text-sm font-bold text-brand hover:text-brand-dark underline underline-offset-2 mb-4 cursor-pointer"
            >
              {copied ? "Copied!" : "Copy number"}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="w-full bg-brand text-white rounded-xl px-4 py-3 font-bold hover:bg-brand-dark active:scale-[0.98] transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
