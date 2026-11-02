# Update — Students sign in with Google + fixed "results table" error

This build fixes the two problems you found while testing:

1. **The sign-in was just a name** — a student could enter a dummy name, see
   all the answers on the results screen, then retake it under their real
   name. Now students sign in with their **own Google account** through
   Supabase Auth. The name and email on every attempt come from the
   verified Google profile — they cannot be typed or faked. One Google
   account = one student identity, on every device.
2. **The dashboard showed "Could not find the table 'public.quiz_attempts'
   in the schema cache"** — that table doesn't exist in your Supabase
   project until you run `supabase/schema.sql` there (step 3 below). The
   dashboard now also detects this exact situation and shows a friendly
   setup checklist instead of the raw error.

Everything else is unchanged: hidden answers while playing, the
end-of-quiz summary (time taken, attempt number, item-by-item review),
all 22 game templates, share links, and teacher accounts.

---

## SETUP — about 10 minutes, once

### Step 1: Run the SQL (fixes the dashboard error)

1. Open `supabase/schema.sql` from this project, copy its FULL contents.
2. Supabase dashboard → your project → **SQL Editor** → New query → paste
   → **Run**.
3. Safe to run again any time (it only adds/updates things; nothing is
   dropped except replaced versions of its own functions/policies).

This creates the `quiz_attempts` table the dashboard reads, plus the
`record_attempt()` and `count_student_attempts()` functions students'
browsers call. Open **Student Results** afterwards and click Refresh —
the error is gone.

> Old test attempts (typed dummy names from before) stay visible as
> separate rows. To clear them: SQL Editor → `delete from quiz_attempts;`
> → Run.

### Step 2: Create the Google OAuth credentials (Google Cloud Console)

1. Go to <https://console.cloud.google.com> and sign in with any Google
   account. Create a project (name it anything, e.g. "Quiz Games").
2. Left menu → **APIs & Services** → **OAuth consent screen**:
   - User type **External** → Create.
   - Fill in App name, your email as User support email, and Developer
     contact email. You can leave everything else default → Save.
   - **Audience/Publishing**: click **Publish app** → In production.
     (Publishing is required so your students can sign in — Google only
     allows accounts listed as "test users" while an app is in testing.
     No Google verification review is needed for this app: it only asks
     for basic profile and email.)
3. **APIs & Services** → **Credentials** → **+ Create credentials** →
   **OAuth client ID**:
   - Application type: **Web application**.
   - Name: anything (e.g. "Quiz Games web").
   - **Authorized JavaScript origins** — add EVERY address your app runs
     on, e.g.:
     - `http://localhost:3000` (for testing on your laptop)
     - `https://your-app.vercel.app` (your deployed address — exact
       spelling, no trailing slash)
   - **Authorized redirect URIs** — add the one Supabase shows you in
     Step 3 below (it looks like
     `https://xxxxxxxx.supabase.co/auth/v1/callback`).
   - Create → **copy the Client ID** and **Client secret**.

### Step 3: Turn on Google in Supabase

1. Supabase dashboard → your project → **Authentication** → **Sign In /
   Providers** (called "Providers" in older layouts).
2. Click **Google** → toggle **Enable**.
3. Paste the **Client ID** and **Client secret** from Step 2. The page
   also shows the **Redirect URL** — that's the value to put into Google's
   "Authorized redirect URIs" in Step 2 (do it now if you haven't).
4. Save.
5. Still under **Authentication** → **URL Configuration** → **Redirect
   URLs**: add your app's addresses so sign-in can return to them
   (`http://localhost:3000/**` and `https://your-app.vercel.app/**`).

### Step 4: Redeploy / restart the app

Restart `npm run dev` locally, or redeploy. Students now see a
**Continue with Google** button on every share link — with an optional
Section/Grade box that's remembered per account on that device.

---

## What changed for students

- The sign-in gate now shows "Continue with Google" instead of a name
  box. Students pick their Google account on Google's own page, then land
  right back on the quiz.
- "Attempt #N" still appears before each take, answers stay hidden while
  playing, and the results screen still shows time, attempt number, and
  the item-by-item review — now labeled with their Google name.
- The bar above the quiz shows their Google name + email and a
  **Sign out** button — the next student on a shared computer signs in
  with their own account.
- If sign-in is cancelled or fails, a plain-language notice appears on
  the gate.

## What changed for teachers

- **Student Results** shows each student's Google email under their name,
  so you can verify exactly who took what.
- Attempts are attributed server-side from the signed-in session — the
  browser never sends a name — so attempts can no longer be recorded
  under someone else's identity.
- If the results table is missing, the dashboard shows the SQL-setup
  checklist instead of a cryptic error.

## Notes & FAQ

- **One session per browser**: the student session and your teacher
  session are the same browser session. If you're signed in as a teacher
  and open a share link, you'll be "signed in" as yourself — sign out
  (banner) or from the StudentBar to preview the full student flow.
- **School-managed Google accounts**: some schools restrict which
  third-party apps students can sign in to. If a student's school account
  is refused, have them use a personal Gmail, or ask your IT admin to
  allow your app's client ID.
- **"Access blocked" during Google sign-in** usually means Step 2.2 was
  skipped (app still in Testing mode) — publish the app or add the
  student's email under Test users.
- **Privacy**: the app only receives each student's name, email, and
  profile picture — that's what the OAuth consent screen tells them, and
  it's all the teacher dashboard shows.
