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
