/**
 * The live demo (golden path, under two minutes) as presenter steps: one per
 * beat, with the route it starts on, a caption for the audience, speaker
 * notes and a time budget. PresenterMode (every route) and PresenterNotes
 * (/presenter, a second window) read the same list.
 */
import { useMemo } from "react";
import { translate, useLang } from "@rcene/i18n";
import type { PresenterStep } from "@rcene/kit/poster";
import { strings } from "@/i18n/strings.ts";

const DEMO = [
  { id: "open", route: "/", seconds: 20 },
  { id: "story", route: "/story", seconds: 40 },
  { id: "about", route: "/about", seconds: 20 },
  { id: "poster", route: "/poster", seconds: 20 },
  { id: "sources", route: "/sources", seconds: 15 },
] as const;

/** The demo steps in the active language (a stable list until the language changes). */
export function useDemoSteps(): PresenterStep[] {
  const [lang] = useLang();
  return useMemo(
    () =>
      DEMO.map((step) => ({
        ...step,
        caption: translate(strings, lang, `demo.${step.id}.caption`),
        notes: translate(strings, lang, `demo.${step.id}.notes`),
      })),
    [lang],
  );
}
