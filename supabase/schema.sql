-- supabase/schema.sql
-- Run this once in your Supabase project's SQL editor (Project → SQL Editor
-- → New query → paste → Run). This is the only backend setup needed —
-- everything else in the app is free-tier static hosting.
--
-- If you already ran the earlier version of this file (before teacher
-- accounts existed), running this whole file again is safe — the ALTER/
-- DROP/CREATE statements below are written to upgrade an existing table in
-- place rather than assuming a fresh database.

create table if not exists question_banks (
  code text primary key,
  title text not null,
  source text not null,
  bank_json jsonb not null,
  created_at timestamptz not null default now()
);

-- Teacher accounts (added alongside "My Activities"). Nullable on purpose —
-- a teacher can still save-and-share without ever creating an account,
-- same as before; only logged-in saves get an owner and show up in
-- "My Activities". Accounts are additive, never required.
alter table question_banks add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- Optional: lets a teacher lock a share link to one specific game instead
-- of sending students to the full template picker. Null means "let the
-- student pick from whatever's available" (the original behavior).
alter table question_banks add column if not exists template_id text;

-- get_shared_quiz() (further down) needs updating for this new column on
-- an existing database — see the CREATE OR REPLACE below, which handles
-- that automatically since function definitions are just replaced.

alter table question_banks enable row level security;

-- SECURITY NOTE — this replaces an earlier version of this file. The old
-- "anyone can read a quiz by its code" policy used `using (true)`, which
-- sounds like it only allows lookups BY code, but Postgres RLS restricts
-- which ROWS a query can see, not which WHERE clause the client used —
-- `using (true)` actually means "any row, any query", including a bare
-- `select *` that would dump every teacher's every saved quiz to anyone
-- holding the public anon key. Fixing that now while adding accounts,
-- since both changes touch the same policies anyway.
drop policy if exists "anyone can read a quiz by its code" on question_banks;
drop policy if exists "anyone can insert a quiz" on question_banks;

-- Anonymous saves are still allowed (user_id left null), and a signed-in
-- teacher can only insert rows owned by themselves — never spoofing
-- someone else's user_id.
create policy "insert own or anonymous quiz"
  on question_banks for insert
  to public
  with check (user_id is null or user_id = auth.uid());

-- Only a signed-in teacher can list/browse their OWN saved quizzes (this is
-- what powers "My Activities"). There is deliberately no anon/public SELECT
-- policy on this table anymore — see get_shared_quiz() below for how
-- students reach a quiz via a share link without that broader access.
create policy "owner can list their own quizzes"
  on question_banks for select
  to authenticated
  using (user_id = auth.uid());

-- A teacher can delete only their own saved quizzes.
create policy "owner can delete their own quizzes"
  on question_banks for delete
  to authenticated
  using (user_id = auth.uid());

-- Students opening a share link don't have an account and shouldn't get
-- table-wide SELECT access either. This function does the by-code lookup
-- server-side with elevated privilege (SECURITY DEFINER), scoped to
-- exactly one row matching the code the caller already knows — it cannot
-- be used to enumerate or browse other quizzes.
create or replace function get_shared_quiz(p_code text)
returns setof question_banks
language sql
security definer
set search_path = public
as $$
  select * from question_banks where code = p_code;
$$;

grant execute on function get_shared_quiz(text) to anon, authenticated;

-- Optional: if this table grows large over time, periodically prune old
-- anonymous rows (e.g. delete where user_id is null and created_at < now()
-- - interval '1 year') — there's no automatic expiry built into the app.
-- Rows owned by a teacher (user_id set) are left for them to manage via
-- "My Activities".

-- ============================================================================
-- STUDENT ATTEMPTS (teacher dashboard)
-- ============================================================================
-- Every completed run of an attempt-tracked game (Quiz, True or False, and
-- the arcade games: Whack-a-Mole, Flying Fruit, Airplane, Maze Chase) on a
-- signed-in shared link is recorded here, so the teacher can see ALL
-- students' attempts from the /dashboard page — not just the ones that
-- happened to happen on the same device (that device-local copy still
-- exists in the student's localStorage as an offline fallback).
--
-- Safe to run again on an existing database: everything below is
-- CREATE IF NOT EXISTS / CREATE OR REPLACE.

create table if not exists quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  -- The quiz this attempt belongs to. Deleting the quiz (question_banks
  -- row) automatically deletes all of its attempts.
  share_code text not null references question_banks(code) on delete cascade,
  -- Denormalized copy of the owning teacher's id so RLS never needs a join.
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Exactly as the student typed it at sign-in (display form).
  student_name text not null,
  -- Normalized identity for grouping/counting ("Juan Dela Cruz" and
  -- "juan dela cruz" are the same student) — see record_attempt().
  student_key text not null,
  -- Optional section/class from the sign-in form ("" when not given).
  student_section text not null default '',
  -- Template id of the game the attempt was taken in ("quiz", "true-false",
  -- "whack-a-mole", "flying-fruit", "airplane", "maze-chase").
  game text not null,
  -- 1-based number of this attempt, per (quiz, student).
  attempt_number integer not null,
  score integer not null,
  total integer not null,
  -- Seconds from the moment the run started to finishing.
  duration_sec integer not null,
  -- Per-item review rows: [{label, prompt, yourAnswer, correctAnswer,
  -- isCorrect}, ...] — the same item review the student saw on their
  -- results screen.
  details jsonb not null default '[]'::jsonb,
  finished_at timestamptz not null default now()
);

create index if not exists quiz_attempts_owner_idx on quiz_attempts (user_id, finished_at desc);
create index if not exists quiz_attempts_quiz_idx on quiz_attempts (share_code, student_key, attempt_number);

alter table quiz_attempts enable row level security;

-- Supabase's default privileges grant DML on new tables to the anon and
-- authenticated roles, but with RLS enabled and NO policies created for
-- insert/update/delete, every direct write is denied — attempts can only
-- ever be written through record_attempt() below. The one explicit policy
-- lets the owning teacher read their own rows (this is what /dashboard
-- queries); students and strangers get nothing.
-- (Postgres has no "create policy if not exists", so drop-then-create keeps
-- this script safe to run again.)
drop policy if exists "owner can read their quizzes' attempts" on quiz_attempts;
create policy "owner can read their quizzes' attempts"
  on quiz_attempts for select
  to authenticated
  using (user_id = auth.uid());

-- Records one completed attempt. Called by the student's browser (anon) —
-- SECURITY DEFINER is what lets it write despite the deny-by-default
-- policies above. The client NEVER supplies the owner: it's looked up from
-- question_banks by share code, so an anon caller can only attach an
-- attempt to a quiz whose share code it already knows, and can never
-- spoof rows into another teacher's dashboard. The attempt number is also
-- assigned here (max existing + 1 per quiz+student), so it stays correct
-- even when the same student plays from several devices.
create or replace function record_attempt(
  p_code text,
  p_student_name text,
  p_section text,
  p_game text,
  p_score integer,
  p_total integer,
  p_duration_sec integer,
  p_details jsonb
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_key text;
  v_number integer;
begin
  select user_id into v_owner from question_banks where code = p_code;
  if v_owner is null then
    -- Covers both a mistyped code and a quiz that was saved WITHOUT signing
    -- in (no owner to attribute attempts to — nothing to show on a
    -- dashboard). The client treats any failure as "record locally only".
    raise exception 'Quiz not found, or it was saved without signing in';
  end if;

  -- Keep this EXACTLY in sync with studentKey() in lib/studentAuth.ts:
  -- trim, collapse internal whitespace, lowercase.
  v_key := lower(regexp_replace(trim(p_student_name), '\s+', ' ', 'g'));

  select coalesce(max(attempt_number), 0) + 1 into v_number
  from quiz_attempts
  where share_code = p_code and student_key = v_key;

  insert into quiz_attempts
    (share_code, user_id, student_name, student_key, student_section,
     game, attempt_number, score, total, duration_sec, details)
  values
    (p_code, v_owner, trim(p_student_name), v_key, coalesce(trim(p_section), ''),
     p_game, v_number, p_score, p_total, p_duration_sec,
     coalesce(p_details, '[]'::jsonb));

  return v_number;
end;
$$;

grant execute on function record_attempt(text, text, text, text, integer, integer, integer, jsonb)
  to anon, authenticated;

-- How many attempts a given student has already completed on a quiz — the
-- "Attempt #N" number shown on the intro screen BEFORE the run starts
-- (after the run, record_attempt() returns the authoritative number).
-- Returns only a count: no other student's answers can be read through it.
create or replace function count_student_attempts(
  p_code text,
  p_student_name text
) returns integer
language sql
security definer
set search_path = public
as $$
  select count(*)::int from quiz_attempts
  where share_code = p_code
    and student_key = lower(regexp_replace(trim(p_student_name), '\s+', ' ', 'g'));
$$;

grant execute on function count_student_attempts(text, text) to anon, authenticated;
