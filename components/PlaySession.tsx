"use client";

import { useState } from "react";
import { QuestionBank } from "@/lib/schema";
import TemplatePicker from "@/components/TemplatePicker";
import { TEMPLATES, getBankForTemplate } from "@/components/templateRegistry";
import { getGameTheme } from "@/lib/gameThemes";
import GameIntro from "@/components/games/GameIntro";

export default function PlaySession({
  bank,
  onBack,
  backLabel = "Back to import",
  lockedTemplateId,
  allowSharing = false,
  onCreateCustom,
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
}) {
  const [templateId, setTemplateId] = useState<string | null>(lockedTemplateId ?? null);
  const [started, setStarted] = useState(false);
  const isLocked = Boolean(lockedTemplateId);

  if (templateId) {
    const template = TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      const Game = template.component;
      const bankForTemplate = getBankForTemplate(bank, template);

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
          <div className="max-w-3xl mx-auto px-6 py-10">
            {started ? (
              <Game bank={bankForTemplate} onExit={exitGame} />
            ) : (
              <GameIntro
                title={template.name}
                description={template.description}
                icon={template.icon}
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
