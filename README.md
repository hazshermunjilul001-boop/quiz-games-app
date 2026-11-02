# Quiz Games App

Turn any test into an interactive quiz game. Teachers import a test
(.txt / .docx / .pdf / .json), save it, and share a link — students sign
in with their Google account and play (Quiz, True or False, Whack-a-Mole,
Flying Fruit, Airplane, Maze Chase, and more practice formats). Answers
stay hidden while playing; every completed attempt ends with time taken,
the attempt number, and an item-by-item review. Teachers see everything
on the **Student Results** dashboard (`/dashboard`), tied to each
student's verified Google identity.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## One-time backend setup (Supabase + Google)

The app needs Supabase (database + auth) and Google sign-in. The full
step-by-step walkthrough is in **[UPDATE-NOTES.md](./UPDATE-NOTES.md)** —
short version:

1. Run `supabase/schema.sql` in your Supabase project's SQL Editor
   (safe to re-run).
2. Create Google OAuth credentials (Google Cloud Console) and enable the
   Google provider in Supabase → Authentication → Providers.
3. Put `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in
   `.env.local` (Project Settings → API in Supabase).

Until then the app still works fully offline: import a test and play
locally — only saving/sharing links, attempt recording, and the dashboard
need Supabase.

## Where things live

- `app/` — pages: home/import, `/play/[code]` (share links), `/dashboard`
  (Student Results), `/activities` (My Activities).
- `components/games/` — the game templates.
- `lib/` — import pipeline, attempt tracking (`attempts.ts`), Google
  student sign-in (`studentAuth.ts`), teacher auth (`auth.ts`), Supabase
  persistence (`persistence.ts`).
- `supabase/schema.sql` — the entire backend: tables, security policies,
  and the server-side functions that record attempts.
