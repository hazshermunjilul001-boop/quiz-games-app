"use client";

// components/PlaySession.tsx
// Routes a loaded question bank into a game template (or the picker).
//
// Student-link extras: when shareCode + studentName are provided (only
// /play/[code] does this, after the student signed in), the session
//  - shows the signed-in StudentBar with a "Switch user" action,
//  - prompts "Attempt #N" on the intro of every attempt-tracked format
//    (Quiz, True or False, and the arcade games: Whack-a-Mole, Flying
//    Fruit, Airplane, Maze Chase), and
//  - hands each game an attemptContext so completed runs are recorded
//    (device-local + Supabase) and the results screen can show time
//    taken + attempt numbering + the item review.

import { ReactNode, useMemo, useState } from "react";
import { QuestionBank } from "@/lib/schema";
import TemplatePicker from "@/components/TemplatePicker";
import { TEMPLATES, getBankForTemplate } from "@/components/templateRegistry";
import { getGameTheme } from "@/lib/gameThemes";
import GameIntro from "@/components/games/GameIntro";
import StudentBar from "@/components/StudentBar";
import { StudentSession } from "@/lib/studentAuth";
import { ATTEMPT_TRACKED_TEMPLATES, AttemptContext, getNextAttemptNumber } from "@/lib/attempts";

export default function PlaySession({
  bank,
  onBack,
  backLabel = "Back to import",
  lockedTemplateId,
  allowSharing = false,
  onCreateCustom,
  student,
  onSwitchUser,
  shareCode,
}: {
  bank: QuestionBank;
  /** Omit for a shared/student link — hides the back button entirely. */
  onBack?: () => void;
  backLabel?: string;
  /** When set, the picker is skipped entirely and the player goes straight
   * into this one game — used for share links a teacher locked to a
   * specific game so every student plays the same format. Exiting the
   * game replays its intro rather than returning to a picker, since
   * there's nothing to pick from on a locked link. */
  lockedTemplateId?: string | null;
  /** Show "Share this game" per template — only for the teacher's own
   * session, never for a student on a shared link. */
  allowSharing?: boolean;
  /** Jump to the custom-content flow — only meaningful for the teacher's
   * own session, never for a student on a shared link. */
  onCreateCustom?: () => void;
  /** Signed-in student on a shared link — shows the StudentBar and enables
   * attempt tracking. Omit for the teacher's own session. */
  student?: StudentSession | null;
  onSwitchUser?: () => void;
  /** The /play/[code] share code — attempt history is keyed by it. */
  shareCode?: string;
}) {
  const [templateId, setTemplateId] = useState<string | null>(lockedTemplateId ?? null);
  const [started, setStarted] = useState(false);
  const isLocked = Boolean(lockedTemplateId);

  // Memoized so the games can safely put attemptContext in effect deps —
  // it stays referentially stable across re-renders of this session.
  const attemptContext: AttemptContext | undefined = useMemo(
    () => (shareCode && student ? { shareCode, studentName: student.name, studentSection: student.section } : undefined),
    [shareCode, student]
  );

  const studentBar: ReactNode =
    student && onSwitchUser ? <StudentBar student={student} onSwitchUser={onSwitchUser} /> : null;

  if (templateId) {
    const template = TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      const Game = template.component;
      const bankForTemplate = getBankForTemplate(bank, template);

      // Attempt prompt: for every game that records attempts (the quiz
      // formats AND the exam-mode arcade games).
      let attemptBadge: ReactNode;
      if (attemptContext && ATTEMPT_TRACKED_TEMPLATES.has(template.id)) {
        const n = getNextAttemptNumber(attemptContext);
        attemptBadge = (
          <div className="inline-flex flex-col items-center gap-1 bg-gold/15 border border-gold/40 rounded-2xl px-5 py-3">
            <span className="text-base font-black text-gold-dark">🔁 Attempt #{n}</span>
            <span className="text-xs font-medium text-zinc-500">
              {n === 1 ? "First take — good luck! Answers stay hidden until the end." : `You've taken this quiz ${n - 1} time${n - 1 === 1 ? "" : "s"} before.`}
            </span>
          </div>
        );
      }

      function exitGame() {
        if (isLocked) {
          setStarted(false); // replay the same locked game's intro
        } else {
          setTemplateId(null);
          setStarted(false);
        }
      }

      return (
        <div className={`min-h-screen bg-gradient-to-br ${getGameTheme(templateId!)}`}>
          {studentBar}
          <div className="max-w-3xl mx-auto px-6 py-10">
            {started ? (
              <Game bank={bankForTemplate} onExit={exitGame} attemptContext={attemptContext} />
            ) : (
              <GameIntro
                title={template.name}
                description={template.description}
                icon={template.icon}
                attemptBadge={attemptBadge}
                onStart={() => setStarted(true)}
              />
            )}
          </div>
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {studentBar}
      <div className="max-w-3xl mx-auto px-6 py-10">
        <TemplatePicker
          bank={bank}
          onBack={onBack}
          backLabel={backLabel}
          onChoose={(id) => setTemplateId(id)}
          allowSharing={allowSharing}
          onCreateCustom={onCreateCustom}
        />
      </div>
    </div>
  );
}
