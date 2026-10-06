import { useId } from "react";
import { CircleCheckIcon, LaptopIcon, MoonIcon, SunIcon } from "lucide-react";
import { LANG_LABELS, LANGS, useLang, useT, type Lang } from "@rcene/i18n";
import { useKitStrings } from "@rcene/kit";
import { PageHeader } from "@rcene/kit/app";
import { Badge } from "@rcene/ui/components/badge";
import { Button } from "@rcene/ui/components/button";
import { Label } from "@rcene/ui/components/label";
import { RadioGroup, RadioGroupItem } from "@rcene/ui/components/radio-group";
import { cn } from "@rcene/ui/lib/utils";
import { MODE_SETTINGS, PALETTES, PaletteSwatch, isModeSetting, isPalette, useTheme } from "@rcene/ui/theme";
import { AdminFrame } from "@/features/admin/AdminFrame.tsx";
import { strings } from "@/i18n/strings.ts";

const MODE_ICONS = { light: SunIcon, dark: MoonIcon, system: LaptopIcon } as const;
const CARD = "flex cursor-pointer items-start gap-3 rounded-lg border bg-card p-4 font-normal has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5";

/** /admin/appearance: the palette, light/dark mode and language for every window (the same choice as the Theme menu). */
export function AdminAppearance() {
  const t = useT(strings);
  const k = useT(useKitStrings());
  const { choice, defaults, effective, setPalette, setMode } = useTheme();
  const [lang, setLang] = useLang();
  const palette = choice.palette ?? defaults.palette;
  const mode = choice.mode ?? defaults.mode;
  const paletteId = useId();
  const modeId = useId();
  const langId = useId();

  return (
    <AdminFrame>
      <PageHeader
        eyebrow={t("admin.title")}
        title={t("look.title")}
        description={t("look.lead")}
        breadcrumbs={[{ label: t("admin.title"), to: "/admin" }, { label: t("look.title") }]}
      />
      <div className="flex flex-col gap-6">
        <section aria-labelledby={paletteId} className="rounded-xl border bg-card p-5 text-card-foreground shadow-raised sm:p-6">
          <h2 id={paletteId} className="mb-4 font-display text-lg font-semibold">
            {t("look.palette")}
          </h2>
          <RadioGroup value={palette} onValueChange={(v) => isPalette(v) && setPalette(v)} aria-labelledby={paletteId} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {PALETTES.map((p) => (
              <Label key={p} htmlFor={`${paletteId}-${p}`} className={CARD}>
                <RadioGroupItem id={`${paletteId}-${p}`} value={p} className="mt-0.5" />
                <span className="flex min-w-0 flex-col gap-1.5">
                  <span className="flex items-center gap-2 font-semibold">
                    <PaletteSwatch palette={p} mode={effective.mode} />
                    {k(`ui.palette.${p}`)}
                  </span>
                  <span className="text-sm text-muted-foreground">{k(`ui.palette.${p}.note`)}</span>
                </span>
              </Label>
            ))}
          </RadioGroup>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section aria-labelledby={modeId} className="rounded-xl border bg-card p-5 text-card-foreground shadow-raised sm:p-6">
            <h2 id={modeId} className="mb-4 font-display text-lg font-semibold">
              {t("look.mode")}
            </h2>
            <RadioGroup value={mode} onValueChange={(v) => isModeSetting(v) && setMode(v)} aria-labelledby={modeId} className="grid gap-3">
              {MODE_SETTINGS.map((m) => {
                const Icon = MODE_ICONS[m];
                return (
                  <Label key={m} htmlFor={`${modeId}-${m}`} className={cn(CARD, "items-center")}>
                    <RadioGroupItem id={`${modeId}-${m}`} value={m} />
                    <Icon aria-hidden="true" className="size-4 text-primary" />
                    {k(`ui.mode.${m}`)}
                  </Label>
                );
              })}
            </RadioGroup>
          </section>

          <section aria-labelledby={langId} className="rounded-xl border bg-card p-5 text-card-foreground shadow-raised sm:p-6">
            <h2 id={langId} className="mb-4 font-display text-lg font-semibold">
              {t("look.language")}
            </h2>
            <RadioGroup value={lang} onValueChange={(v) => (LANGS as readonly string[]).includes(v) && setLang(v as Lang)} aria-labelledby={langId} className="grid gap-3">
              {LANGS.map((l) => (
                <Label key={l} htmlFor={`${langId}-${l}`} className={cn(CARD, "items-center")} lang={l === "war" ? "war" : l === "fil" ? "fil" : "en"}>
                  <RadioGroupItem id={`${langId}-${l}`} value={l} />
                  {LANG_LABELS[l]}
                </Label>
              ))}
            </RadioGroup>
          </section>
        </div>

        <section aria-labelledby="look-preview" className="rounded-xl border bg-card p-5 text-card-foreground shadow-raised sm:p-6">
          <h2 id="look-preview" className="mb-4 font-display text-lg font-semibold">
            {t("look.preview")}
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <Button>{t("look.sample.primary")}</Button>
            <Button variant="outline">{t("look.sample.secondary")}</Button>
            <Badge variant="secondary">
              <CircleCheckIcon aria-hidden="true" />
              {t("look.sample.badge")}
            </Badge>
            <span className="flex items-center gap-1" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className="size-6 rounded-md border" style={{ backgroundColor: `var(--chart-${n})` }} />
              ))}
            </span>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">{t("look.note")}</p>
        </section>
      </div>
    </AdminFrame>
  );
}
