import { useRef, useState } from "react";
import { Monitor, Play, Square } from "lucide-react";
import { useT } from "@rcene/i18n";
import { PresenterMode, PresenterNotes, usePresenterStore, type PresenterStep } from "@rcene/kit/poster";
import { Button } from "@rcene/ui/components/button";
import type { ExampleMeta } from "../../gallery/registry.ts";

export const meta: ExampleMeta = {
  title: "PresenterMode",
  summary: {
    en: "The live demo: a bar at the bottom of the screen with the step, its caption and a timer, and a notes window for the presenter. Arrow keys drive it while it runs; Esc ends it.",
    war: "An live demo: usa nga bar ha ubos han screen upod an lakang, caption ngan timer, ngan bintana han nota para han presenter. An arrow keys an nagpapadalagan; Esc an tapos.",
    fil: "Ang live demo: isang bar sa ibaba ng screen na may hakbang, caption at timer, at bintana ng tala para sa presenter. Arrow keys ang nagpapatakbo; Esc para tapusin.",
  },
  blocks: ["PresenterMode", "PresenterNotes"],
  order: 30,
  frameHeight: 900,
};

const strings = {
  en: {
    intro:
      "The demo script from DEMO.md, as steps. Start puts the presenter bar at the bottom of this window. While it runs, → Space PageDown go forward and ← PageUp go back anywhere on the page, and T starts the timer. Esc or Stop ends it and gives the keys back to the page.",
    start: "Start the demo",
    stop: "Stop the demo",
    screen: "App window",
    nowShowing: "Opened by the step:",
    notesNote: "In an app this is a /presenter route opened in a second window; here it sits beside the bar.",
    step1: "A resident looks up BRGY-05",
    notes1: "Say what was built before today and how to check it (DISCLOSURE.md).\nThen search BRGY-05.",
    step2: "The CDRRMO raises a flood warning",
    notes2: "Point at the board window while it updates.",
    step3: "The barangay board updates live",
    notes3: "No server: the windows share one synced store.",
    step4: "The answer stays truthful",
    notes4: "Tap a point beyond the map coverage: the app says it is outside the data.",
    seconds: "{n} s",
  },
  war: {
    start: "Sugdi an demo",
    stop: "Ihunong an demo",
    screen: "Bintana han app",
    step1: "Ginbibiling han residente an BRGY-05",
    step2: "Ginpapataas han CDRRMO an warning han baha",
    step3: "Live nga nababag-o an board han barangay",
    step4: "Matinuod pirme an baton",
  },
  fil: {
    start: "Simulan ang demo",
    stop: "Itigil ang demo",
    screen: "Bintana ng app",
    step1: "Hinahanap ng residente ang BRGY-05",
    step2: "Itinataas ng CDRRMO ang babala ng baha",
    step3: "Live na nag-a-update ang board ng barangay",
    step4: "Laging tapat ang sagot",
  },
};

export function Example() {
  const t = useT(strings);
  const [running, setRunning] = useState(false);
  const [route, setRoute] = useState<string | null>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const steps: PresenterStep[] = [
    { id: "lookup", caption: t("step1"), route: "/resident", notes: t("notes1"), seconds: 20 },
    { id: "warn", caption: t("step2"), route: "/console", notes: t("notes2"), seconds: 30 },
    { id: "board", caption: t("step3"), route: "/board", notes: t("notes3"), seconds: 25 },
    { id: "truthful", caption: t("step4"), route: "/resident", notes: t("notes4"), seconds: 25 },
  ];

  const start = () => {
    // Every run starts at step 1 with the timer at 0:00.
    usePresenterStore.setState({ index: 0, running: false, startedAt: null, banked: 0, stepMark: 0 });
    setRoute(steps[0]!.route ?? null);
    setRunning(true);
  };
  const stop = () => {
    setRunning(false);
    toggleRef.current?.focus();
  };

  return (
    <div className="flex flex-col gap-5">
      <p className="max-w-prose text-sm text-muted-foreground">{t("intro")}</p>

      <div className="flex flex-wrap items-center gap-3">
        <Button ref={toggleRef} variant={running ? "outline" : "default"} onClick={running ? stop : start}>
          {running ? <Square aria-hidden="true" /> : <Play aria-hidden="true" />}
          {running ? t("stop") : t("start")}
        </Button>
        {running && (
          <p className="flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-sm text-card-foreground">
            <Monitor aria-hidden="true" className="size-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {t("screen")} · {t("nowShowing")}
            </span>
            <code className="font-mono font-semibold">{route}</code>
          </p>
        )}
      </div>

      {running ? (
        <>
          {/* Mounted only while the demo runs, so the page keeps its keys otherwise. */}
          <PresenterMode steps={steps} open onOpenChange={(open) => !open && stop()} onNavigate={setRoute} />
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">{t("notesNote")}</p>
            <div className="overflow-hidden rounded-xl border bg-background">
              <PresenterNotes steps={steps} className="min-h-0 max-w-none sm:p-6" />
            </div>
          </div>
        </>
      ) : (
        <ol className="flex flex-col gap-2">
          {steps.map((step, i) => (
            <li key={step.id} className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2 text-card-foreground">
              <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 font-medium">{step.caption}</span>
              <code className="hidden font-mono text-xs text-muted-foreground sm:inline">{step.route}</code>
              <span className="text-xs text-muted-foreground tabular-nums">{t("seconds", { n: step.seconds ?? 0 })}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
