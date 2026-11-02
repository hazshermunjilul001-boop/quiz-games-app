// lib/studentAuth.ts
// Student sign-in for shared quiz links (/play/[code]).
//
// Students sign in with their OWN Google account through Supabase Auth
// (Supabase dashboard → Authentication → Providers → Google). The name and
// email on every attempt come from that verified Google profile — they can
// no longer be typed freely, so a student can't peek at the answers under a
// dummy name before taking the quiz under their real one.
//
// The session is a real Supabase session (http-only cookie + refresh token
// in the browser) — the same one a teacher account uses — so "Sign out" on
// a shared classroom device genuinely ends it for the next student.
//
// The optional Section / Grade field is the only thing still typed by the
// student. It's saved BEFORE the redirect to Google (the page reloads on
// the way back), then bound to the signed-in user's id after the redirect —
// see consumePendingSection().

import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseClient, isSupabaseConfigured } from "./supabaseClient";

export interface StudentSession {
  /** Supabase auth user id — the stable identity attempts are keyed by. */
  id: string;
  /** Display name from the verified Google profile (email prefix fallback). */
  name: string;
  /** The Google account's email — lets students spot the wrong account. */
  email: string;
  /** Optional section/grade typed at the gate before the Google hand-off. */
  section: string;
  /** Google profile photo, when available. */
  avatarUrl?: string;
}

const sectionKey = (userId: string) => `quizcade:student-section:${userId}`;
const pendingKey = (shareCode: string) => `quizcade:pending-section:${shareCode}`;

function readSection(userId: string): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(sectionKey(userId)) ?? "";
  } catch {
    return "";
  }
}

/** Remembered at the gate, before the OAuth redirect wipes the page. */
export function savePendingSection(shareCode: string, section: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      pendingKey(shareCode),
      JSON.stringify({ section: section.trim(), at: Date.now() })
    );
  } catch {
    // Private browsing / storage full — the section is optional, carry on.
  }
}

/** Called right after the Google redirect: binds the section the student
 * typed at the gate to their now-known user id (so it sticks for their
 * future attempts on this device) and returns the section to display. */
export function consumePendingSection(shareCode: string, userId: string): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(sectionKey(userId)) ?? "";
    const raw = window.localStorage.getItem(pendingKey(shareCode));
    if (raw == null) return existing;
    window.localStorage.removeItem(pendingKey(shareCode));
    let section = existing;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.section === "string") section = parsed.section.trim();
    } catch {
      // Malformed pending value — fall back to whatever was saved before.
    }
    window.localStorage.setItem(sectionKey(userId), section);
    return section;
  } catch {
    return "";
  }
}

/** Builds the student session from the Supabase user — name and email come
 * from the verified Google identity, never from typed input. */
export function studentFromUser(user: User): StudentSession {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const pick = (...keys: string[]): string => {
    for (const k of keys) {
      const v = meta[k];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    return "";
  };
  const email = (user.email ?? pick("email")).trim();
  const name = pick("full_name", "name") || email.split("@")[0] || "Google user";
  const avatarUrl = pick("avatar_url", "picture") || undefined;
  return { id: user.id, name, email, section: readSection(user.id), avatarUrl };
}

/** Starts the Google OAuth flow. The browser is redirected to Google's
 * consent screen and comes back to `redirectTo` (the same /play/[code]
 * link, so the student lands exactly where they started). */
export async function signInWithGoogle(redirectTo: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  if (error) throw new Error(friendlyAuthError(error.message));
}

export async function signOutStudent(): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase.auth.signOut();
}

/** Turns raw Supabase auth errors into messages that tell the TEACHER what
 * to fix — a student can't toggle provider settings. */
export function friendlyAuthError(message: string): string {
  if (/unsupported provider|provider is not enabled|validation failed/i.test(message)) {
    return "Google sign-in isn't enabled on this app's backend yet. Teacher: open Supabase → Authentication → Sign In / Providers → Google, turn it on, and add your Google OAuth Client ID and Secret — the step-by-step walkthrough is in UPDATE-NOTES.md.";
  }
  if (/redirect/i.test(message) && /not allowed|allow ?list/i.test(message)) {
    return "This site's address isn't on the sign-in allowlist yet. Teacher: in Supabase → Authentication → URL Configuration → Redirect URLs, add this site's URL (see UPDATE-NOTES.md).";
  }
  return message;
}

/** Reactive signed-in student. `loading` is true while the session is being
 * restored (including right after coming back from Google) — the play page
 * waits for it so a signed-in student never sees the gate flash.
 *
 * Pass the share code to bind the optional section typed at the gate: right
 * after the Google redirect the pending section is attached to the now-known
 * account (and re-read from storage for returning students). */
export function useStudent(shareCode?: string): { student: StudentSession | null; loading: boolean } {
  const [state, setState] = useState<{ loaded: boolean; user: User | null }>({
    loaded: !isSupabaseConfigured,
    user: null,
  });

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = getSupabaseClient();
    let mounted = true;

    const apply = (user: User | null) => {
      if (!mounted) return;
      setState({ loaded: true, user });
    };

    supabase.auth.getUser().then(({ data }) => apply(data.user ?? null));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      apply(session?.user ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const student = useMemo(() => {
    if (!state.user) return null;
    const s = studentFromUser(state.user);
    if (shareCode) {
      // Consumes (and clears) the section typed at the gate. Idempotent:
      // once bound, it reads the stored value for this account.
      s.section = consumePendingSection(shareCode, state.user.id);
    }
    return s;
  }, [state.user, shareCode]);

  return { student, loading: !state.loaded };
}
