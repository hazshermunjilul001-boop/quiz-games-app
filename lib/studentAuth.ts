// lib/studentAuth.ts
// Lightweight student sign-in for shared quiz links (/play/[code]).
//
// This is deliberately NOT the teacher Supabase account system — students
// never need an email or password. They sign in with their name (and an
// optional section), which is stored on their device in localStorage.
// Everything that needs to be per-student (attempt counts, etc., see
// lib/attempts.ts) is keyed by that name, so on a shared device each
// student can "Switch user" and keep their own history.

import { useCallback, useMemo, useSyncExternalStore } from "react";

const STORAGE_KEY = "quizcade:student-session";
/** Fired on the writing tab after signIn/switchUser (the browser's own
 * "storage" event only reaches OTHER tabs, not the one that wrote). */
const CHANGE_EVENT = "quizcade:student-session-changed";

export interface StudentSession {
  name: string;
  section: string;
  signedInAt: string; // ISO timestamp
}

/** Canonical key for a student name: trimmed, lowercased, collapsed
 * whitespace — so "Juan Dela Cruz" and "juan   dela cruz" share history. */
export function studentKey(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function parseSession(raw: string | null): StudentSession | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.name !== "string" || !parsed.name.trim()) return null;
    return {
      name: parsed.name,
      section: typeof parsed.section === "string" ? parsed.section : "",
      signedInAt: typeof parsed.signedInAt === "string" ? parsed.signedInAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function saveStudentSession(name: string, section: string): void {
  const session: StudentSession = {
    name: name.trim().replace(/\s+/g, " "),
    section: section.trim(),
    signedInAt: new Date().toISOString(),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function clearStudentSession(): void {
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

/** Reactive hook for the signed-in student, backed by localStorage via
 * useSyncExternalStore — no hydration-time effects, and it even stays in
 * sync across tabs. Returns null when signed out (or while server
 * rendering; the shared-link page only renders the gate after the quiz
 * has loaded client-side, so there's never a server-rendered gate). */
export function useStudent(): {
  student: StudentSession | null;
  signIn: (name: string, section: string) => void;
  switchUser: () => void;
} {
  const raw = useSyncExternalStore(
    subscribe,
    () => window.localStorage.getItem(STORAGE_KEY),
    () => null
  );
  const student = useMemo(() => parseSession(raw), [raw]);

  const signIn = useCallback((name: string, section: string) => {
    saveStudentSession(name, section);
  }, []);

  const switchUser = useCallback(() => {
    clearStudentSession();
  }, []);

  return { student, signIn, switchUser };
}
