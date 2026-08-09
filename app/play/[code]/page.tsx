"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { loadBank } from "@/lib/persistence";
import { QuestionBank } from "@/lib/schema";
import PlaySession from "@/components/PlaySession";

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "not-found" } | { status: "ready"; bank: QuestionBank };

export default function SharedPlayPage() {
  const params = useParams<{ code: string }>();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    loadBank(params.code)
      .then((bank) => {
        if (cancelled) return;
        setState(bank ? { status: "ready", bank } : { status: "not-found" });
      })
      .catch((e: any) => {
        if (cancelled) return;
        setState({ status: "error", message: e.message ?? "Couldn't load this quiz." });
      });
    return () => {
      cancelled = true;
    };
  }, [params.code]);

  if (state.status === "ready") {
    return <PlaySession bank={state.bank} />;
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <main className="max-w-3xl mx-auto py-12 px-6">
        {state.status === "loading" && <p className="text-zinc-500 text-base text-center">Loading quiz...</p>}

        {state.status === "not-found" && (
          <div className="max-w-xl mx-auto text-center bg-white border border-zinc-200 rounded-3xl p-10 shadow-sm">
            <p className="text-[var(--foreground)] font-bold text-lg">Quiz not found</p>
            <p className="text-zinc-500 text-sm mt-1">This link may be mistyped, or the quiz may have been removed.</p>
          </div>
        )}

        {state.status === "error" && (
          <div className="max-w-xl mx-auto text-center bg-white border-2 border-incorrect/30 rounded-3xl p-10 shadow-sm">
            <p className="text-incorrect font-bold text-lg">Couldn&rsquo;t load this quiz</p>
            <p className="text-incorrect text-sm mt-1">{state.message}</p>
          </div>
        )}
      </main>
    </div>
  );
}
