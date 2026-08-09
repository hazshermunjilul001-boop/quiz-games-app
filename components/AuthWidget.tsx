"use client";

import { useState } from "react";
import Link from "next/link";
import { useCurrentUser, signInWithPassword, signUpWithPassword, requestPasswordReset, signOut } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabaseClient";

type Mode = "signin" | "register" | "forgot";

export default function AuthWidget() {
  const { user, loading } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  if (!isSupabaseConfigured || loading) return null;

  function closeModal() {
    setOpen(false);
    setMode("signin");
    setEmail("");
    setPassword("");
    setError(null);
    setResetSent(false);
  }

  async function handleSubmit() {
    setError(null);
    setBusy(true);
    try {
      if (mode === "signin") {
        await signInWithPassword(email, password);
        closeModal();
      } else if (mode === "register") {
        await signUpWithPassword(email, password);
        closeModal();
      } else if (mode === "forgot") {
        await requestPasswordReset(email);
        setResetSent(true);
      }
    } catch (e: any) {
      setError(e.message ?? "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <Link href="/activities" className="text-sm font-bold text-white/90 hover:text-white underline underline-offset-2">
          My Activities
        </Link>
        <span className="text-xs text-white/60 hidden sm:inline">{user.email}</span>
        <button onClick={() => signOut()} className="text-sm font-bold text-white/90 hover:text-white underline underline-offset-2 cursor-pointer">
          Sign out
        </button>
      </div>
    );
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-sm font-bold text-white/90 hover:text-white underline underline-offset-2 cursor-pointer">
        Sign in
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-white rounded-3xl shadow-xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            {mode !== "forgot" && (
              <div className="flex border-2 border-zinc-200 rounded-xl p-1 mb-4">
                <button
                  onClick={() => { setMode("signin"); setError(null); }}
                  className={`flex-1 text-sm font-bold py-2 rounded-lg cursor-pointer transition-colors ${mode === "signin" ? "bg-brand text-white" : "text-zinc-600"}`}
                >
                  Sign in
                </button>
                <button
                  onClick={() => { setMode("register"); setError(null); }}
                  className={`flex-1 text-sm font-bold py-2 rounded-lg cursor-pointer transition-colors ${mode === "register" ? "bg-brand text-white" : "text-zinc-600"}`}
                >
                  Register
                </button>
              </div>
            )}

            {mode === "forgot" && <h3 className="text-xl font-extrabold text-[var(--foreground)] mb-1">Reset password</h3>}

            {mode === "forgot" ? (
              resetSent ? (
                <div className="bg-brand-light border-2 border-brand/20 rounded-2xl p-4 text-center">
                  <p className="text-sm font-medium text-brand-dark">Check your email for a password reset link.</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-zinc-500 mb-3">We&rsquo;ll email you a link to set a new password.</p>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full border-2 border-zinc-200 rounded-xl p-3 text-sm bg-white text-zinc-900 focus:border-brand focus:outline-none"
                  />
                </>
              )
            ) : (
              <>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full border-2 border-zinc-200 rounded-xl p-3 text-sm bg-white text-zinc-900 focus:border-brand focus:outline-none"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "register" ? "Choose a password (min 6 characters)" : "Password"}
                  className="w-full border-2 border-zinc-200 rounded-xl p-3 text-sm bg-white text-zinc-900 focus:border-brand focus:outline-none mt-2"
                />
              </>
            )}

            {error && <p className="text-sm text-incorrect mt-2">{error}</p>}

            {!resetSent && (
              <button
                onClick={handleSubmit}
                disabled={busy || !email || (mode !== "forgot" && !password)}
                className="w-full mt-3 bg-brand text-white rounded-xl px-4 py-3 font-bold hover:bg-brand-dark disabled:opacity-50 active:scale-[0.98] transition-all cursor-pointer"
              >
                {busy ? "Please wait..." : mode === "signin" ? "Sign in" : mode === "register" ? "Create account" : "Send reset link"}
              </button>
            )}

            {mode === "signin" && (
              <button
                onClick={() => { setMode("forgot"); setError(null); }}
                className="w-full mt-2 text-sm text-brand hover:text-brand-dark cursor-pointer"
              >
                Forgot password?
              </button>
            )}
            {mode === "forgot" && (
              <button
                onClick={() => { setMode("signin"); setError(null); setResetSent(false); }}
                className="w-full mt-2 text-sm text-brand hover:text-brand-dark cursor-pointer"
              >
                ← Back to sign in
              </button>
            )}

            <button onClick={closeModal} className="w-full mt-2 text-sm text-zinc-500 hover:text-zinc-800 cursor-pointer">
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
