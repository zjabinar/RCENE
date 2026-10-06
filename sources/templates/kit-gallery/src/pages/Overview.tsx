import { Link } from "react-router";
import { ArrowRightIcon, BookOpenIcon, LayoutDashboardIcon, PaletteIcon, PresentationIcon, StampIcon, type LucideIcon } from "lucide-react";
import { LANGS, useT } from "@rcene/i18n";
import { Hero, Section } from "@rcene/kit/site";
import { Button } from "@rcene/ui/components/button";
import { PALETTES } from "@rcene/ui/theme";
import { strings } from "../i18n/strings.ts";
import { ENTRIES, entriesOf, FAMILIES, type Family } from "../gallery/registry.ts";

const FAMILY_ICON: Record<Family, LucideIcon> = {
  app: LayoutDashboardIcon,
  site: BookOpenIcon,
  poster: PresentationIcon,
  brand: StampIcon,
};

/** "/": what the kit is, the numbers, and the four families. */
export function Overview() {
  const t = useT(strings);
  const blocks = new Set(ENTRIES.flatMap((e) => e.meta.blocks)).size;
  const stats = [
    { value: blocks, label: t("overview.stat.blocks") },
    { value: PALETTES.length, label: t("overview.stat.palettes") },
    { value: 2, label: t("overview.stat.modes") },
    { value: LANGS.length, label: t("overview.stat.langs") },
  ];

  return (
    <div className="flex flex-col">
      <Hero
        variant="showcase"
        eyebrow={t("overview.eyebrow")}
        title={t("overview.title")}
        lead={t("overview.lead")}
        actions={
          <>
            <Button size="lg" asChild>
              <Link to="/app">
                {t("overview.browse")}
                <ArrowRightIcon aria-hidden="true" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/themes">
                <PaletteIcon aria-hidden="true" />
                {t("overview.themes")}
              </Link>
            </Button>
          </>
        }
        media={
          <dl className="grid grid-cols-2 gap-3">
            {stats.map((s) => (
              <div key={s.label} className="rounded-xl border border-border/60 bg-card/60 p-4 backdrop-blur-sm">
                <dt className="text-sm text-muted-foreground">{s.label}</dt>
                <dd className="font-showcase text-4xl font-bold text-primary italic glow-text">{s.value}</dd>
              </div>
            ))}
          </dl>
        }
      />

      <Section title={t("overview.families")}>
        <ul className="grid gap-4 sm:grid-cols-2">
          {FAMILIES.map((family) => {
            const Icon = FAMILY_ICON[family];
            const count = entriesOf(family).length;
            return (
              <li key={family}>
                <Link
                  to={`/${family}`}
                  className="group flex h-full flex-col gap-3 rounded-2xl border bg-card p-5 text-card-foreground shadow-raised transition-[box-shadow,transform] duration-200 ease-weave outline-none hover:-translate-y-0.5 hover:shadow-overlay focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  <span className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-lg bg-brand text-brand-foreground">
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                    <span className="font-display text-xl font-semibold">{t(`family.${family}`)}</span>
                  </span>
                  <span className="text-sm text-muted-foreground">{t(`family.${family}.summary`)}</span>
                  <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary">
                    {t("overview.examples", { count })}
                    <ArrowRightIcon aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section tone="muted" title={t("overview.use.title")} lead={t("overview.use.body")}>
        <div className="flex flex-col gap-2 rounded-2xl border bg-card p-5 text-card-foreground">
          <h3 className="font-display text-lg font-semibold">{t("overview.starters.title")}</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>{t("overview.starters.app")}</li>
            <li>{t("overview.starters.site")}</li>
          </ul>
        </div>
      </Section>
    </div>
  );
}
