/**
 * The landing page: one showcase hero (the page's only showcase surface),
 * numbers computed from the data layers, the pages to explore, and a
 * closing call to action. Copy it, then replace the words and the numbers
 * with your app's.
 */
import { Link } from "react-router";
import { BookOpenTextIcon, BotIcon, DatabaseIcon, MapIcon, PresentationIcon } from "lucide-react";
import type { LoadState } from "@rcene/data";
import { useT } from "@rcene/i18n";
import { CallToAction, FeatureGrid, Hero, Section, StatBand, WeaveDivider, type StatItem } from "@rcene/kit/site";
import { LoadGate, SampleDataBadge } from "@rcene/ui";
import { Button } from "@rcene/ui/components/button";
import { Skeleton } from "@rcene/ui/components/skeleton";
import { sharePercent, type CityStats } from "@/domain/city-stats.ts";
import { CityMapSvg } from "@/features/city-map-svg/CityMapSvg.tsx";
import { DataNote } from "@/features/city-data/DataNote.tsx";
import { CITY_LAYERS, useCityStats, type CityData } from "@/features/city-data/use-city-data.ts";
import { strings } from "@/i18n/strings.ts";

/** The hero picture: the city's barangays woven in the palette's colours, drawn from the layers. */
function HeroMap({ state }: { state: LoadState<CityData> }) {
  const t = useT(strings);
  return (
    <LoadGate state={state} loading={<Skeleton className="aspect-[4/3] w-full rounded-none" />}>
      {({ layers, stats }) => (
        <figure className="flex flex-col">
          <div className="p-4 sm:p-6">
            <CityMapSvg
              layers={layers}
              variant="tapestry"
              facilities="all"
              animate
              label={t("map.cityLabel", { n: stats.barangays, f: stats.facilities })}
              className="max-h-[26rem]"
            />
          </div>
          <figcaption className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 text-sm text-muted-foreground sm:px-6">
            <span className="flex items-center gap-2">
              <MapIcon aria-hidden="true" className="size-4 text-primary" />
              {t("home.hero.caption", { n: stats.barangays, f: stats.facilities })}
            </span>
            <SampleDataBadge layers={CITY_LAYERS} />
          </figcaption>
        </figure>
      )}
    </LoadGate>
  );
}

/** Same shape as the StatBand, so nothing jumps when the numbers arrive. */
function StatBandSkeleton() {
  const t = useT(strings);
  return (
    <div role="status" className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border bg-border shadow-raised sm:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex flex-col gap-3 bg-card p-6 sm:p-8">
          <Skeleton className="h-10 w-20 sm:h-12" />
          <Skeleton className="h-4 w-full max-w-36" />
        </div>
      ))}
      <span className="sr-only">{t("data.loadingNumbers")}</span>
    </div>
  );
}

function CityStatBand({ stats }: { stats: CityStats }) {
  const t = useT(strings);
  const items: StatItem[] = [
    { value: stats.barangays, label: t("home.stat.barangays") },
    { value: stats.facilities, label: t("home.stat.facilities") },
  ];
  // A missing flood layer leaves its numbers out; it never shows as 0 %.
  if (stats.flood) {
    items.push(
      { value: sharePercent(stats.flood.share), label: t("home.stat.floodShare"), suffix: "%" },
      { value: stats.flood.facilities.inZone.length, label: t("home.stat.floodFacilities") },
    );
  }
  return <StatBand items={items} />;
}

export function Home() {
  const t = useT(strings);
  const city = useCityStats();
  const floodMissing = city.status === "ready" && !city.data.stats.flood;

  return (
    <>
      <Hero
        variant="showcase"
        eyebrow={t("home.hero.eyebrow")}
        title={t("home.hero.title")}
        lead={t("home.hero.lead")}
        actions={
          <>
            <Button size="lg" asChild>
              <Link to="/story">
                <BookOpenTextIcon aria-hidden="true" />
                {t("home.hero.story")}
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/about">{t("home.hero.about")}</Link>
            </Button>
          </>
        }
        media={<HeroMap state={city} />}
      />

      <Section id="numbers" eyebrow={t("home.numbers.eyebrow")} title={t("home.numbers.title")} lead={t("home.numbers.lead")} align="center">
        <LoadGate state={city} loading={<StatBandSkeleton />}>
          {({ stats }) => <CityStatBand stats={stats} />}
        </LoadGate>
        <DataNote
          className="mx-auto mt-8 max-w-3xl items-center text-center"
          caveats={[
            floodMissing ? t("data.layerMissing", { hazard: t("hazard.flood") }) : t("data.landNotPeople"),
            t("data.notInZoneMeans"),
          ]}
        />
      </Section>

      <WeaveDivider variant="diamond" />

      <Section id="explore" tone="muted" eyebrow={t("home.explore.eyebrow")} title={t("home.explore.title")} lead={t("home.explore.lead")}>
        <FeatureGrid
          columns={4}
          items={[
            { icon: <BookOpenTextIcon />, title: t("home.feature.story.title"), description: t("home.feature.story.body"), href: "/story" },
            { icon: <BotIcon />, title: t("home.feature.about.title"), description: t("home.feature.about.body"), href: "/about" },
            { icon: <PresentationIcon />, title: t("home.feature.poster.title"), description: t("home.feature.poster.body"), href: "/poster" },
            { icon: <DatabaseIcon />, title: t("home.feature.sources.title"), description: t("home.feature.sources.body"), href: "/sources" },
          ]}
        />
      </Section>

      <CallToAction
        title={t("home.cta.title")}
        body={t("home.cta.body")}
        actions={
          <>
            <Button size="lg" variant="secondary" asChild>
              <Link to="/story">
                <BookOpenTextIcon aria-hidden="true" />
                {t("home.hero.story")}
              </Link>
            </Button>
            <Button size="lg" variant="ghost" asChild className="text-brand-foreground hover:bg-brand-foreground/10 hover:text-brand-foreground">
              <Link to="/poster">{t("home.cta.poster")}</Link>
            </Button>
          </>
        }
      />
    </>
  );
}
