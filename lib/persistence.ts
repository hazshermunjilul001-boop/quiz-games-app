// lib/persistence.ts
// Save a QuestionBank to Supabase and get back a short shareable code, load
// one back by that code, or (if signed in) list/delete your own saved
// quizzes for "My Activities". This is the ONLY part of the app that talks
// to a network backend — everything else (import, all 22 game templates)
// works fully offline/client-side. Persistence and accounts are both
// opt-in: importing and playing locally never requires Supabase, and
// saving-and-sharing never requires signing in — an account only unlocks
// being able to find your own quizzes again later.

import { nanoid } from "nanoid";
import { getSupabaseClient, isSupabaseConfigured } from "./supabaseClient";
import { QuestionBank } from "./schema";

const TABLE = "question_banks";
const CODE_LENGTH = 8; // short enough to read aloud/type on a shared link

export interface SaveResult {
  code: string;
}

export interface LoadedActivity {
  bank: QuestionBank;
  /** If set, students should skip the template picker and go straight
   * into this specific game — the teacher locked the share link to it. */
  templateId: string | null;
}

export interface SavedActivity {
  code: string;
  title: string;
  source: string;
  questionCount: number;
  createdAt: string;
  templateId: string | null;
}

export async function saveBank(bank: QuestionBank, templateId: string | null = null): Promise<SaveResult> {
  if (!isSupabaseConfigured) {
    throw new Error("Saving requires Supabase to be configured (see supabase/schema.sql).");
  }
  const supabase = getSupabaseClient();
  const code = nanoid(CODE_LENGTH);
  const { data: userData } = await supabase.auth.getUser();

  const { error } = await supabase.from(TABLE).insert({
    code,
    title: bank.title,
    source: bank.source,
    bank_json: bank,
    user_id: userData.user?.id ?? null,
    template_id: templateId,
  });

  if (error) {
    throw new Error(`Couldn't save this quiz: ${error.message}`);
  }
  return { code };
}

/** Loads a quiz by its share code via a server-side function rather than a
 * direct table SELECT — see supabase/schema.sql's get_shared_quiz() for
 * why: a direct SELECT policy permissive enough for anonymous students to
 * use would also let anyone with the public anon key list every saved
 * quiz, not just the one they have the code for. */
export async function loadBank(code: string): Promise<LoadedActivity | null> {
  if (!isSupabaseConfigured) {
    throw new Error("Loading a shared quiz requires Supabase to be configured (see supabase/schema.sql).");
  }
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("get_shared_quiz", { p_code: code });

  if (error) {
    throw new Error(`Couldn't load this quiz: ${error.message}`);
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return { bank: row.bank_json as QuestionBank, templateId: row.template_id ?? null };
}

/** Lists the signed-in teacher's own saved quizzes, newest first. Requires
 * being signed in — RLS only grants SELECT to the row's owner. */
export async function listMyBanks(): Promise<SavedActivity[]> {
  if (!isSupabaseConfigured) {
    throw new Error("This requires Supabase to be configured (see supabase/schema.sql).");
  }
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("code, title, source, bank_json, created_at, template_id")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Couldn't load your activities: ${error.message}`);
  }
  return (data ?? []).map((row) => ({
    code: row.code,
    title: row.title,
    source: row.source,
    questionCount: (row.bank_json as QuestionBank)?.questions?.length ?? 0,
    createdAt: row.created_at,
    templateId: row.template_id ?? null,
  }));
}

export async function deleteBank(code: string): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error("This requires Supabase to be configured (see supabase/schema.sql).");
  }
  const supabase = getSupabaseClient();
  const { error } = await supabase.from(TABLE).delete().eq("code", code);
  if (error) {
    throw new Error(`Couldn't delete this quiz: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Student attempts (teacher dashboard)
// ---------------------------------------------------------------------------

/** One recorded attempt, as stored in Supabase. `details` carries the
 * per-item review the student saw on their results screen. */
export interface AttemptRow {
  id: string;
  shareCode: string;
  studentName: string;
  studentKey: string;
  studentSection: string;
  game: string;
  attemptNumber: number;
  score: number;
  total: number;
  durationSec: number;
  details: Array<{
    label: string;
    prompt: string;
    yourAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
  }>;
  finishedAt: string;
}

/** Every attempt recorded on the signed-in teacher's quizzes, newest
 * first. RLS scopes this to rows owned by the caller — see the "owner can
 * read their quizzes' attempts" policy in supabase/schema.sql. */
export async function listAttemptsForMyQuizzes(): Promise<AttemptRow[]> {
  if (!isSupabaseConfigured) {
    throw new Error("This requires Supabase to be configured (see supabase/schema.sql).");
  }
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("quiz_attempts")
    .select(
      "id, share_code, student_name, student_key, student_section, game, attempt_number, score, total, duration_sec, details, finished_at"
    )
    .order("finished_at", { ascending: false });

  if (error) {
    throw new Error(`Couldn't load student attempts: ${error.message}`);
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    shareCode: row.share_code,
    studentName: row.student_name,
    studentKey: row.student_key,
    studentSection: row.student_section ?? "",
    game: row.game,
    attemptNumber: row.attempt_number,
    score: row.score,
    total: row.total,
    durationSec: row.duration_sec,
    details: Array.isArray(row.details) ? row.details : [],
    finishedAt: row.finished_at,
  }));
}
