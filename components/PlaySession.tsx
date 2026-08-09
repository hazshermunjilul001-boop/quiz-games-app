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
}: {
  bank: QuestionBank;
  /** Omit for a shared/student link — hides the back button entirely. */
  onBack?: () => void;
  backLabel?: string;
}) {
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  if (templateId) {
    const template = TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      const Game = template.component;
      const bankForTemplate = getBankForTemplate(bank, template);

      function exitToTemplates() {
        setTemplateId(null);
        setStarted(false);
      }

      return (
        <div className={`min-h-screen bg-gradient-to-br ${getGameTheme(templateId!)}`}>
          <div className="max-w-3xl mx-auto px-6 py-10">
            {started ? (
              <Game bank={bankForTemplate} onExit={exitToTemplates} />
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
        <TemplatePicker bank={bank} onBack={onBack} backLabel={backLabel} onChoose={(id) => setTemplateId(id)} />
      </div>
    </div>
  );
}
