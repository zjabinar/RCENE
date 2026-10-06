/**
 * The live demo (golden path, about three minutes) as presenter steps: one per beat, with
 * the route it starts on, a caption for the audience, speaker notes and a time budget.
 * PresenterMode (the ?present bar on every route), PresenterNotes (/presenter) and /demo
 * read the same list. Re-skin: change the captions and notes in src/i18n/strings.ts
 * (demo.<id>.caption / .notes) and the routes here.
 */
import { useMemo } from "react";
import { translate, useLang } from "@rcene/i18n";
import type { PresenterStep } from "@rcene/kit/poster";
import { strings } from "@/i18n/strings.ts";

export const DEMO_STEPS = [
  { id: "open", route: "/", seconds: 25 },
  { id: "intake", route: "/console/new", seconds: 45 },
  { id: "decide", seconds: 25 },
  { id: "board", route: "/board", seconds: 20 },
  { id: "brief", route: "/console", seconds: 30 },
  { id: "admin", route: "/admin/ai", seconds: 20 },
  { id: "impact", route: "/poster", seconds: 15 },
] as const;

export type DemoStepId = (typeof DEMO_STEPS)[number]["id"];

/** The demo steps in the active language (a stable list until the language changes). */
export function useDemoSteps(): PresenterStep[] {
  const [lang] = useLang();
  return useMemo(
    () =>
      DEMO_STEPS.map((step) => ({
        ...step,
        caption: translate(strings, lang, `demo.${step.id}.caption`),
        notes: translate(strings, lang, `demo.${step.id}.notes`),
      })),
    [lang],
  );
}

/** The total time budget, in seconds. */
export const DEMO_SECONDS = DEMO_STEPS.reduce((sum, s) => sum + s.seconds, 0);
