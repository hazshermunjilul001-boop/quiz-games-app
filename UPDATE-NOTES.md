# Update — Hidden answers in arcade games + Teacher dashboard

This build adds two things on top of the previous version (students signing
in from your share link, answers hidden in Quiz/True-or-False, and the
end-of-quiz summary):

## 1. Arcade games now hide answers too

Whack-a-Mole, Flying Fruit, Airplane, and Maze Chase now behave like the
Quiz: while playing, nothing tells the student whether they were right.

- No "Correct hit!" / "Missed — it was …" / "Wrong zone — the answer was …"
  messages anymore — the round just moves on.
- The live score chip is gone from the header (it quietly revealed
  correctness after every round). Only the question counter and timer show.
- Rounds the student leaves untouched (time runs out) count as "No answer".
- Maze Chase keeps its "Caught by an enemy — back to start!" bump — that's
  the arcade challenge, not answer feedback.
- Everything is revealed at once at the end on the results screen: score,
  time taken, which attempt this was, and the item-by-item review with the
  correct answer for every missed item.

Practice-oriented formats (Flash Cards, Hangman, Word Search, Matching
Pairs, …) are unchanged — showing the answer is what makes them practice
tools, and they don't record attempts.

## 2. Teacher dashboard — /dashboard

Sign in as a teacher and open **Student Results** (top banner, next to "My
Activities"), or click **Results** on any quiz in My Activities. For every
saved quiz you'll see:

- How many students played, how many attempts were completed, the class
  average, and when it was last played.
- A row per student: their section, number of attempts, best score, latest
  score, and when they last played. Sort A–Z or lowest-score-first.
- Expand a student → every attempt listed (attempt #, game played, score,
  time taken, date).
- Expand an attempt → the same item-by-item review the student saw: which
  items they got right and wrong, their answers, and the correct answers.

Attempts are recorded server-side now, so results from every student's
device land in one place (and the attempt number is correct even if a
student plays on several devices). The student's device still keeps a
local copy as a fallback when the network drops mid-save.

## REQUIRED: run the SQL once

The dashboard needs one new table and two functions in Supabase:

1. Open your Supabase project → **SQL Editor** → New query.
2. Open `supabase/schema.sql` from this zip, copy its FULL contents, paste,
   and Run. It's safe to run again on the existing database (it only adds
   the `quiz_attempts` table + functions; nothing existing is dropped).

That's the only backend step. After that, attempts flow in automatically
whenever a student finishes Quiz, True or False, Whack-a-Mole, Flying
Fruit, Airplane, or Maze Chase through a share link.

Note: attempts are attributed to the teacher who was signed in when the
quiz was saved (same rule as My Activities). Quizzes saved without signing
in have no owner, so their attempts aren't recorded — re-share those from
a signed-in save if you want them tracked.

## Everything else

Unchanged: the 22 game templates, the import pipeline (.txt / .docx /
.pdf / .json, TOS AI Generator exports), student sign-in with name +
section, share links, and teacher accounts.
