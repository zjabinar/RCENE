import { CheckIcon, PlusIcon } from "lucide-react";
import { useT } from "@rcene/i18n";
import { PageHeader } from "@rcene/kit/app";
import { Surface } from "@rcene/kit";
import { Badge } from "@rcene/ui/components/badge";
import { Button } from "@rcene/ui/components/button";
import { PALETTES, useTheme, type Mode, type Palette } from "@rcene/ui/theme";
import { strings } from "../i18n/strings.ts";

const MODES: Mode[] = ["light", "dark"];
const BARS = [72, 48, 90, 36, 60];

/** One palette x mode, painted with the same mini screen. */
function Sample({ palette, mode }: { palette: Palette; mode: Mode }) {
  const t = useT(strings);
  const { effective, setPalette, setMode } = useTheme();
  const name = t(`ui.palette.${palette}` as never);
  const modeName = t(`ui.mode.${mode}` as never);
  const inUse = effective.palette === palette && effective.mode === mode && !effective.surface;

  return (
    <Surface palette={palette} mode={mode} className="flex flex-col overflow-hidden rounded-2xl border shadow-raised">
      <div aria-hidden="true" className="weave-band" />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              {name} · {modeName}
            </p>
            <h3 className="font-display text-lg font-semibold">{t("themes.sample.title")}</h3>
          </div>
          <Badge className="bg-brand text-brand-foreground">{t("themes.sample.badge")}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{t("themes.sample.body")}</p>
        <div aria-hidden="true" className="flex h-16 items-end gap-1.5 rounded-lg bg-card p-2">
          {BARS.map((h, i) => (
            <span key={i} className="flex-1 rounded-sm" style={{ height: `${h}%`, background: `var(--chart-${i + 1})` }} />
          ))}
        </div>
        <div aria-hidden="true" className="flex h-2 overflow-hidden rounded-full">
          {[1, 2, 3, 4, 5].map((i) => (
            <span key={i} className="flex-1" style={{ background: `var(--seq-${i})` }} />
          ))}
        </div>
        <div className="mt-auto flex flex-wrap items-center gap-2">
          <Button size="sm" tabIndex={-1} aria-hidden="true">
            <PlusIcon aria-hidden="true" />
            {t("themes.sample.action")}
          </Button>
          <span aria-hidden="true" className="rounded-md bg-highlight px-2 py-1 text-xs font-semibold text-highlight-foreground">
            REC-0042
          </span>
          <Button
            size="sm"
            variant="outline"
            className="ml-auto"
            disabled={inUse}
            onClick={() => {
              setPalette(palette);
              setMode(mode);
            }}
          >
            {inUse ? (
              <>
                <CheckIcon aria-hidden="true" />
                {t("themes.inUse")}
              </>
            ) : (
              t("themes.use", { palette: name, mode: modeName })
            )}
          </Button>
        </div>
      </div>
    </Surface>
  );
}

/** "/themes": the five palettes in light and dark, side by side, plus the showcase surface. */
export function Themes() {
  const t = useT(strings);
  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow={t("app.title")} title={t("themes.title")} description={t("themes.lead")} />
      {PALETTES.map((palette) => (
        <section key={palette} aria-labelledby={`palette-${palette}`} className="flex flex-col gap-3">
          <div>
            <h2 id={`palette-${palette}`} className="font-display text-2xl font-semibold tracking-tight">
              {t(`ui.palette.${palette}` as never)}
            </h2>
            <p className="text-sm text-muted-foreground">{t(`ui.palette.${palette}.note` as never)}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {MODES.map((mode) => (
              <Sample key={mode} palette={palette} mode={mode} />
            ))}
          </div>
        </section>
      ))}
      <section aria-labelledby="showcase-heading">
        <Surface variant="showcase" className="flex flex-col gap-3 overflow-hidden rounded-2xl p-6 shadow-glow sm:p-10">
          <h2 id="showcase-heading" className="font-showcase text-display-3 font-bold italic glow-text">
            {t("themes.showcase")}
          </h2>
          <p className="max-w-prose text-muted-foreground">{t("themes.showcase.body")}</p>
        </Surface>
      </section>
    </div>
  );
}
