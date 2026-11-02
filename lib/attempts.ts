// lib/attempts.ts
// Per-student, per-quiz attempt tracking for shared student links.
//
// Attempts are recorded BOTH places:
//  1. Supabase (authoritative) — via the record_attempt() RPC, which assigns
//     the attempt number server-side and files the attempt under the quiz's
//     owning teacher, so /dashboard can show every student's attempts.
//  2. The student's device (localStorage, keyed by the share code + the
//     signed-in student's name — see lib/studentAuth.ts) — a fallback that
//     keeps attempt numbering working when the network hiccups right at
//     the end of a run.
//
// Every COMPLETED run of an attempt-tracked game records one attempt;
// abandoned runs don't count.
//
// This powers: the "Attempt #N" prompt before starting, "Time taken" and
// "how many attempts" on the results screen, the item-by-item review, and
// the teacher dashboard.

import { getSupabaseClient, isSupabaseConfigured } from "./supabaseClient";

const MAX_RECORDS = 50; // per student+quiz in the device-local fallback; oldest drop off
/** How long to wait on the server before giving up and keeping the local
 * record only — finishing a quiz should never feel blocked on the network. */
const SERVER_TIMEOUT_MS = 8000;

/** Games that behave as a "quiz" — answers stay hidden while playing, no
 * correct/wrong reveal after any question, one recorded attempt per
 * completed run, and a full end-of-run review. Includes the exam-style
 * review formats AND the arcade games that were converted to the same
 * treatment (the arcade twist — targets moving, timers, moles — is kept;
 * only the answer reveals are gone). Practice-oriented formats (Flash
 * Cards, Hangman, Word Search, ...) keep their instant-feedback mechanics
 * and don't record attempts. */
export const ATTEMPT_TRACKED_TEMPLATES = new Set([
  "quiz",
  "true-false",
  "whack-a-mole",
  "flying-fruit",
  "airplane",
  "maze-chase",
]);

export interface AttemptContext {
  /** The shared quiz's code from /play/[code]. */
  shareCode: string;
  /** The signed-in student's display name. */
  studentName: string;
  /** The section they optionally entered at sign-in — shown on the
   * teacher dashboard to tell classes apart. */
  studentSection?: string;
}

/** What the results screen shows about attempt numbering: which attempt
 * this run was, and how many completed attempts the student has overall. */
export interface AttemptSummary {
  attemptNumber: number;
  totalAttempts: number;
}

export interface AttemptRecord {
  /** 1-based number of this attempt, across all attempt-tracked games of
   * the same quiz for this student. */
  attemptNumber: number;
  /** Seconds from the moment the student started this run to finishing. */
  durationSec: number;
  score: number;
  total: number;
  /** Template id of the game the attempt was taken in ("quiz", ...). */
  game: string;
  finishedAt: string; // ISO timestamp
}

/** One item of the per-question review saved with each attempt — the same
 * shape the results screen renders (QuizResults.ReviewItem). Stored as the
 * attempt's `details` on the server so the teacher can see exactly which
 * items each student got right and wrong. */
export interface AttemptDetailItem {
  label: string;
  prompt: string;
  yourAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}

/** One localStorage key per quiz; the value is a map of student key →
 * attempt list, so switching users on a shared device cleanly separates
 * each student's history. */
function attemptsKey(shareCode: string): string {
  return `quizcade:attempts:${shareCode}`;
}

/** Server-known attempt counts, cached per quiz so the intro screen's
 * "Attempt #N" is right even before this device has heard otherwise
 * (e.g. the student played on their phone earlier). */
function syncKey(shareCode: string): string {
  return `quizcade:attempt-sync:${shareCode}`;
}

interface AttemptsBlob {
  [studentKey: string]: AttemptRecord[];
}

function readBlob(key: string): Record<string, number | AttemptRecord[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function studentKeyOf(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

/** All recorded (device-local) attempts for this student on this quiz,
 * oldest first. Used for numbering fallback only — the dashboard reads
 * from Supabase, not from here. */
export function getAttempts(shareCode: string, studentName: string): AttemptRecord[] {
  const blob = readBlob(attemptsKey(shareCode));
  return (blob[studentKeyOf(studentName)] as AttemptRecord[]) ?? [];
}

function getLocalCount(shareCode: string, studentName: string): number {
  return getAttempts(shareCode, studentName).length;
}

function getSyncedCount(shareCode: string, studentName: string): number {
  const blob = readBlob(syncKey(shareCode));
  const n = blob[studentKeyOf(studentName)];
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

function setSyncedCount(shareCode: string, studentName: string, count: number): void {
  const key = syncKey(shareCode);
  const blob = readBlob(key);
  blob[studentKeyOf(studentName)] = Math.max(0, Math.floor(count));
  window.localStorage.setItem(key, JSON.stringify(blob));
}

/** The number the NEXT run will be, from the best information on this
 * device right now (its own records + the last known server count). */
export function getNextAttemptNumber(ctx: AttemptContext): number {
  return Math.max(getLocalCount(ctx.shareCode, ctx.studentName), getSyncedCount(ctx.shareCode, ctx.studentName)) + 1;
}

/** Refreshes the attempt number from the server — call once when the
 * intro/game mounts. Returns the refreshed number, or the local one when
 * the server can't be reached. Never throws. */
export async function refreshAttemptNumber(ctx: AttemptContext): Promise<number> {
  const serverCount = await rpc<number>("count_student_attempts", {
    p_code: ctx.shareCode,
    p_student_name: ctx.studentName,
  });
  if (typeof serverCount === "number" && Number.isFinite(serverCount)) {
    setSyncedCount(ctx.shareCode, ctx.studentName, serverCount);
  }
  return getNextAttemptNumber(ctx);
}

/** Records a completed attempt — device-local first (instant, offline
 * fallback), then Supabase, which assigns the authoritative attempt
 * number and files the attempt under the quiz's owner for the dashboard.
 * Returns the attempt summary the results screen should show, or null
 * when there's no valid context (e.g. teacher's own local session —
 * nothing is tracked there). Never throws. */
export async function saveCompletedAttempt(
  ctx: AttemptContext,
  data: { durationSec: number; score: number; total: number; game: string; details: AttemptDetailItem[] }
): Promise<AttemptSummary | null> {
  if (typeof window === "undefined") return null;
  if (!studentKeyOf(ctx.studentName)) return null;

  // 1) Local record (also seeds the fallback numbering for next time).
  const local = recordAttempt(ctx, data);

  // 2) Server record — its attempt number wins when it arrives.
  const serverNumber = await rpc<number>("record_attempt", {
    p_code: ctx.shareCode,
    p_student_name: ctx.studentName,
    p_section: ctx.studentSection ?? "",
    p_game: data.game,
    p_score: data.score,
    p_total: data.total,
    p_duration_sec: data.durationSec,
    p_details: data.details,
  });

  const attemptNumber =
    typeof serverNumber === "number" && Number.isFinite(serverNumber) && serverNumber > 0
      ? serverNumber
      : local?.attemptNumber;

  if (attemptNumber == null) return null;

  // Remember the authoritative count so the next intro badge continues
  // from it even before the server is asked again.
  setSyncedCount(ctx.shareCode, ctx.studentName, attemptNumber);

  return { attemptNumber, totalAttempts: attemptNumber };
}

/** Records a completed attempt in the device-local fallback only. The
 * attempt number is derived from stored history. Called by
 * saveCompletedAttempt; kept exported for direct local-only use. */
export function recordAttempt(
  ctx: AttemptContext,
  data: { durationSec: number; score: number; total: number; game: string }
): AttemptRecord | null {
  if (typeof window === "undefined") return null;
  const key = studentKeyOf(ctx.studentName);
  if (!key) return null;
  const blob = readBlob(attemptsKey(ctx.shareCode)) as AttemptsBlob;
  const list = blob[key] ?? [];
  const record: AttemptRecord = {
    attemptNumber: list.length + 1,
    finishedAt: new Date().toISOString(),
    ...data,
  };
  list.push(record);
  blob[key] = list.slice(-MAX_RECORDS);
  window.localStorage.setItem(attemptsKey(ctx.shareCode), JSON.stringify(blob));
  return record;
}

/** "2:07" style duration for display. */
export function formatDuration(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec));
  const mins = Math.floor(sec / 60);
  const rest = sec % 60;
  return `${mins}:${rest.toString().padStart(2, "0")}`;
}

/** Supabase RPC wrapper that fails soft: any error, timeout, or
 * unconfigured backend resolves to null and callers fall back to the
 * device-local copy. */
async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T | null> {
  if (typeof window === "undefined" || !isSupabaseConfigured) return null;
  try {
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), SERVER_TIMEOUT_MS));
    const call = getSupabaseClient()
      .rpc(fn, args)
      .then(({ data, error }) => (error ? null : ((data as T) ?? null)));
    return await Promise.race([call, timeout]);
  } catch {
    return null;
  }
}
