# Quizcade Step-Up Implementation Plan

## Scope and constraints

Implement the user-supplied recommendations brief at `/home/ubuntu/upload/Quizcade-Step-Up-Recommendations(1).md`. Keep the MCQ upload, paste, parse, image/table association, conversion, and derivation behavior intact. Do not edit `lib/fileParse.ts` or the MCQ parsing/derivation logic in `lib/importPipeline.ts`. Add only route wiring needed to expose the native path; leave the existing importer controls and handlers unchanged.

## Product flow

- Preserve “Import a multiple-choice test” as its own entry, wired to the existing upload/paste/preview/TemplatePicker path.
- Add “Create content for a specific game” from Welcome, routing into the existing custom-bank handoff.
- Expand native custom formats and map each supported game to the canonical type it actually consumes: term-definition pairs; word/clue entries; ordered sequences; cloze sentences; spell-the-word terms; and category-tagged items. Anagram’s word/clue text is adapted to its ordered letter sequence type.
- Let creators choose a supported game first, use/edit examples, clear the editor, parse, review warnings, and then enter the same QuestionBank/PlaySession flow. When a pure-MCQ-derived game is chosen, show an unobtrusive notice and prefill its native editor from existing derivable content where practical.
- Group the TemplatePicker by its existing categories and show a concise best-input hint on each card.
- Widen only active gameplay and selected spatial/action game surfaces at desktop breakpoints; keep Welcome, import, picker, and text-heavy games constrained. Preserve mobile padding and touch targets.

## Design and structure

Reuse Quizcade’s current forest-green, gold, pale-background visual system, typography, cards, and button styles. Keep parsers in `lib/customFormats.ts`, game-specific game selection and editable examples in `components/CustomImport.tsx`, entry choices in `components/Welcome.tsx`, category/derived-content guidance in `components/TemplatePicker.tsx` and `components/PlaySession.tsx`, and the minimum additive navigation state in `app/page.tsx`. Do not change game engines or the existing MCQ importer.

## Project structure

- `app/page.tsx`: existing top-level screen state; add only native-creator route state/callbacks, leaving MCQ handlers and controls untouched.
- `components/Welcome.tsx`: dual creation entry.
- `components/CustomImport.tsx`: game-first native template selector and parse experience.
- `lib/customFormats.ts`: native format specs, parsers, per-game adapters, and optional derived-content prefill.
- `components/TemplatePicker.tsx`, `components/PlaySession.tsx`, `components/templateRegistry.tsx`: game discovery, quality notice, initial selected game.
- `components/games/*`: targeted responsive width improvements only.
- `lib/__tests__/customFormats.manual.ts`: regression coverage for native parser outputs and mapping.
