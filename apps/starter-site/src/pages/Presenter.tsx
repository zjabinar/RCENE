/**
 * /presenter: the speaker-notes window (opened from About, or by hand in a
 * second window). It sits outside the SiteShell, so it keeps the theme in
 * step and provides the app's strings itself. The step and the timer are
 * shared with the presenter bar in the app window through a synced store.
 */
import { useEffect } from "react";
import { StringsProvider, useT } from "@rcene/i18n";
import { PresenterNotes } from "@rcene/kit/poster";
import { useThemeSync } from "@rcene/ui/theme";
import { useDemoSteps } from "@/features/demo/demo-steps.ts";
import { strings } from "@/i18n/strings.ts";

export function Presenter() {
  useThemeSync();
  const t = useT(strings);
  const steps = useDemoSteps();
  const title = t("demo.notesTitle");

  useEffect(() => {
    document.title = title;
  }, [title]);

  return (
    <StringsProvider value={strings}>
      <main id="main" tabIndex={-1} className="min-h-dvh bg-background text-foreground focus:outline-none">
        <PresenterNotes steps={steps} />
      </main>
    </StringsProvider>
  );
}
