"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updatePassword, useCurrentUser } from "@/lib/auth";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { user, loading } = useCurrentUser();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      await updatePassword(password);
      setDone(true);
      setTimeout(() => router.push("/"), 2000);
    } catch (e: any) {
      setError(e.message ?? "Couldn't update your password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <main className="max-w-md mx-auto py-16 px-6">
        <div className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-sm">
          <h1 className="text-2xl font-extrabold text-[var(--foreground)]">Set a new password</h1>

          {loading && <p className="text-zinc-500 mt-3">Loading...</p>}

          {!loading && !user && !done && (
            <p className="text-sm text-incorrect mt-3">
              This reset link is invalid or has expired. Request a new one from the Sign In button.
            </p>
          )}

          {!loading && user && !done && (
            <>
              <p className="text-sm text-zinc-500 mt-2 mb-4">Choose a new password for {user.email}.</p>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password (min 6 characters)"
                className="w-full border-2 border-zinc-200 rounded-xl p-3 text-sm bg-white text-zinc-900 focus:border-brand focus:outline-none"
              />
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm new password"
                className="w-full border-2 border-zinc-200 rounded-xl p-3 text-sm bg-white text-zinc-900 focus:border-brand focus:outline-none mt-2"
              />
              {error && <p className="text-sm text-incorrect mt-2">{error}</p>}
              <button
                onClick={handleSubmit}
                disabled={busy}
                className="w-full mt-4 bg-brand text-white rounded-xl px-4 py-3 font-bold hover:bg-brand-dark disabled:opacity-50 active:scale-[0.98] transition-all cursor-pointer"
              >
                {busy ? "Updating..." : "Update password"}
              </button>
            </>
          )}

          {done && (
            <div className="mt-4 bg-brand-light border-2 border-brand/20 rounded-2xl p-4 text-center">
              <p className="text-sm font-medium text-brand-dark">Password updated — taking you back to the app...</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
