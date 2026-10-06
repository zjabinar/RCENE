import { Link, useNavigate } from "react-router";
import { AppWindowIcon, FileImageIcon, NotebookTextIcon, PlayIcon, RotateCcwIcon } from "lucide-react";
import { AiProviderChip } from "@rcene/ai";
import { useFormat, useT } from "@rcene/i18n";
import { PageHeader } from "@rcene/kit/app";
import { resetDemo } from "@rcene/store";
import { openRoleWindow } from "@rcene/ui";
import { Button } from "@rcene/ui/components/button";
import { DEMO_SECONDS, useDemoSteps } from "@/features/demo/demo-steps.ts";
import { strings } from "@/i18n/strings.ts";
import { ROLES } from "@/roles.ts";

/** The windows the demo shows side by side (the admin page stays in the main window). */
const DEMO_ROLES = ROLES.filter((r) => r.id !== "admin");

/**
 * /demo: the presenter's control page. Reset the data, open the role windows, start the
 * presenter bar and the speaker notes, and read the golden path with its time budget.
 */
export function Demo() {
  const t = useT(strings);
  const fmt = useFormat();
  const navigate = useNavigate();
  const steps = useDemoSteps();
  const minutes = Math.floor(DEMO_SECONDS / 60);
  const seconds = DEMO_SECONDS % 60;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow={t("demo.eyebrow")} title={t("demo.title")} description={t("demo.lead")} actions={<AiProviderChip to="/admin/ai" />} />

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="demo-prepare" className="rounded-xl border bg-card p-5 text-card-foreground shadow-raised sm:p-6">
          <h2 id="demo-prepare" className="mb-3 font-display text-lg font-semibold">
            {t("demo.prepare")}
          </h2>
          <ol className="flex list-decimal flex-col gap-2 ps-5 text-sm">
            <li>{t("demo.check.1")}</li>
            <li>{t("demo.check.2")}</li>
            <li>{t("demo.check.3")}</li>
            <li>{t("demo.check.4")}</li>
          </ol>
        </section>

        <section aria-labelledby="demo-controls" className="rounded-xl border bg-card p-5 text-card-foreground shadow-raised sm:p-6">
          <h2 id="demo-controls" className="mb-3 font-display text-lg font-semibold">
            {t("demo.controls")}
          </h2>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => resetDemo({ keep: ["lang", "theme"] })}>
              <RotateCcwIcon aria-hidden="true" />
              {t("demo.reset")}
            </Button>
            <Button variant="outline" onClick={() => DEMO_ROLES.forEach((r) => openRoleWindow(r.path, `rscene-entry-${r.id}`, r.width))}>
              <AppWindowIcon aria-hidden="true" />
              {t("demo.windows")}
            </Button>
            <Button onClick={() => navigate("/?present")}>
              <PlayIcon aria-hidden="true" />
              {t("demo.present")}
            </Button>
            <Button variant="outline" onClick={() => window.open("/presenter", "presenter-notes", "popup,width=960,height=720")}>
              <NotebookTextIcon aria-hidden="true" />
              {t("demo.notes")}
            </Button>
            <Button asChild variant="outline">
              <Link to="/poster">
                <FileImageIcon aria-hidden="true" />
                {t("demo.poster")}
              </Link>
            </Button>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{t("demo.keys")}</p>
        </section>
      </div>

      <section aria-labelledby="demo-path" className="rounded-xl border bg-card p-5 text-card-foreground shadow-raised sm:p-6">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="demo-path" className="font-display text-lg font-semibold">
            {t("demo.path")}
          </h2>
          <p className="text-sm text-muted-foreground tabular-nums">{t("demo.total", { m: fmt.number(minutes), s: fmt.number(seconds) })}</p>
        </div>
        <ol className="flex flex-col gap-4">
          {steps.map((step, i) => (
            <li key={step.id} className="flex gap-4">
              <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground tabular-nums">
                {fmt.number(i + 1)}
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <p className="font-semibold">
                  {step.caption}{" "}
                  <span className="font-normal text-muted-foreground tabular-nums">· {t("demo.seconds", { s: fmt.number(step.seconds ?? 0) })}</span>
                </p>
                {step.route && (
                  <Link to={step.route} className="w-fit text-sm text-primary underline-offset-4 hover:underline">
                    {step.route}
                  </Link>
                )}
                <p className="text-sm text-muted-foreground">{step.notes}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
