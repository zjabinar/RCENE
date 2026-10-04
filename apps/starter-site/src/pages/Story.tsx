/**
 * The data story: a scrollytelling chapter over the offline map (each step
 * changes its layers), a before/after slider, a chart with its table, and
 * how the data got here. Every number comes from the layers; a missing layer
 * removes its steps instead of showing a guess.
 */
import { Link } from "react-router";
import { ArrowDownIcon, BookOpenTextIcon, CalculatorIcon, DatabaseIcon, FolderInputIcon, ListChecksIcon, ShuffleIcon } from "lucide-react";
import { useFormat, useT } from "@rcene/i18n";
import { SpotIllustration } from "@rcene/kit/brand";
import { BeforeAfter, CallToAction, Hero, ScrollyChapter, Section, StoryTimeline, type ScrollyStep } from "@rcene/kit/site";
import { LoadGate } from "@rcene/ui";
import { Button } from "@rcene/ui/components/button";
import { Skeleton } from "@rcene/ui/components/skeleton";
import type { CityStats } from "@/domain/city-stats.ts";
import { CityMapSvg } from "@/features/city-map-svg/CityMapSvg.tsx";
import { MapKey } from "@/features/city-map-svg/MapKey.tsx";
import { DataNote } from "@/features/city-data/DataNote.tsx";
import { useCityStats, type CityData } from "@/features/city-data/use-city-data.ts";
import { useShareFormat } from "@/features/city-data/use-share-format.ts";
import { HazardShareChart } from "@/features/hazard-chart/HazardShareChart.tsx";
import { StoryMap, type StoryView } from "@/features/story-map/StoryMap.tsx";
import { strings } from "@/i18n/strings.ts";

type Chapter = ScrollyStep & { view: StoryView };

/** The story's steps, built from the numbers. Steps whose layer is missing are left out. */
function useChapters(stats: CityStats | null): Chapter[] {
  const t = useT(strings);
  const fmt = useFormat();
  const share = useShareFormat();
  const n = fmt.number;

  // While the layers load: one placeholder step, so the map can already draw beside it.
  if (!stats) {
    return [
      {
        id: "loading",
        view: "city",
        title: t("data.loadingNumbers"),
        body: (
          <span className="flex flex-col gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </span>
        ),
      },
    ];
  }

  const chapters: Chapter[] = [
    {
      id: "city",
      view: "city",
      title: t("story.step.city.title", { n: n(stats.barangays) }),
      body: <p>{t("story.step.city.body", { n: n(stats.barangays), area: n(stats.areaKm2) })}</p>,
    },
    {
      id: "facilities",
      view: "facilities",
      title: t("story.step.facilities.title", { n: n(stats.facilities) }),
      body: <p>{t("story.step.facilities.body")}</p>,
    },
  ];
  if (stats.flood) {
    chapters.push(
      {
        id: "flood",
        view: "flood",
        title: t("story.step.flood.title", { share: share(stats.flood.share) }),
        body: <p>{t("story.step.flood.body")}</p>,
      },
      {
        id: "exposed",
        view: "exposed",
        title: t("story.step.exposed.title", { n: n(stats.flood.facilities.inZone.length), total: n(stats.facilities) }),
        body: <p>{t("story.step.exposed.body")}</p>,
      },
    );
  }
  if (stats.stormSurge) {
    chapters.push({
      id: "surge",
      view: "surge",
      title: t("story.step.surge.title"),
      body: (
        <p>
          {t("story.step.surge.body", { share: share(stats.stormSurge.share), n: n(stats.stormSurge.facilities.inZone.length) })}
        </p>
      ),
    });
  }
  return chapters;
}

/** Rendered while loading (data null) and when ready: the same element, so the map stays mounted. */
function Chapters({ data }: { data: CityData | null }) {
  const chapters = useChapters(data?.stats ?? null);
  return <ScrollyChapter steps={chapters} visual={(i) => <StoryMap data={data} view={chapters[i]?.view ?? "city"} />} />;
}

const TIMELINE = [
  { id: "source", icon: <FolderInputIcon /> },
  { id: "convert", icon: <ShuffleIcon /> },
  { id: "check", icon: <ListChecksIcon /> },
  { id: "compute", icon: <CalculatorIcon /> },
  { id: "tell", icon: <BookOpenTextIcon /> },
] as const;

export function Story() {
  const t = useT(strings);
  const city = useCityStats();

  return (
    <>
      <Hero
        eyebrow={t("story.hero.eyebrow")}
        title={t("story.hero.title")}
        lead={t("story.hero.lead")}
        actions={
          <Button size="lg" asChild>
            <a href="#chapter">
              <ArrowDownIcon aria-hidden="true" />
              {t("story.hero.start")}
            </a>
          </Button>
        }
        media={
          <div className="grid place-items-center bg-card p-6 sm:p-10">
            <SpotIllustration name="map" size={360} className="h-auto w-full max-w-sm" />
          </div>
        }
      />

      <Section id="chapter" eyebrow={t("story.chapter.eyebrow")} title={t("story.chapter.title")} lead={t("story.chapter.lead")}>
        <LoadGate state={city} loading={<Chapters data={null} />}>
          {(data) => <Chapters data={data} />}
        </LoadGate>
      </Section>

      <LoadGate state={city} loading={null}>
        {({ layers, stats }) => (
          <>
            {stats.flood && (
              <Section id="compare" tone="weave" eyebrow={t("story.compare.eyebrow")} title={t("story.compare.title")} lead={t("story.compare.lead")}>
                <div className="mx-auto flex max-w-4xl flex-col gap-4">
                  <BeforeAfter
                    beforeLabel={t("story.compare.before")}
                    afterLabel={t("story.compare.after")}
                    className="aspect-[4/3] bg-card"
                    before={
                      <CityMapSvg
                        layers={layers}
                        facilities="all"
                        label={t("map.cityLabel", { n: stats.barangays, f: stats.facilities })}
                        className="size-full bg-card"
                      />
                    }
                    after={
                      <CityMapSvg
                        layers={layers}
                        hazard="flood"
                        facilities="all"
                        label={t("map.floodLabel", { inZone: stats.flood.facilities.inZone.length, f: stats.facilities })}
                        className="size-full bg-card"
                      />
                    }
                  />
                  <MapKey hazard="flood" facilities="all" className="rounded-xl border bg-card p-4 text-sm text-card-foreground" />
                </div>
              </Section>
            )}

            <Section id="chart" eyebrow={t("story.chart.eyebrow")} title={t("story.chart.section")}>
              <div className="mx-auto flex max-w-4xl flex-col gap-4">
                <HazardShareChart stats={stats} />
                <DataNote caveats={[t("data.notInZoneMeans")]} />
              </div>
            </Section>
          </>
        )}
      </LoadGate>

      <Section id="how" tone="muted" eyebrow={t("story.timeline.eyebrow")} title={t("story.timeline.title")}>
        <StoryTimeline
          label={t("story.timeline.label")}
          className="mx-auto max-w-4xl"
          items={TIMELINE.map((item, i) => ({
            id: item.id,
            icon: item.icon,
            date: t("story.timeline.step", { n: i + 1 }),
            title: t(`story.timeline.${item.id}.title`),
            body: <p>{t(`story.timeline.${item.id}.body`)}</p>,
          }))}
        />
      </Section>

      <CallToAction
        title={t("story.cta.title")}
        body={t("story.cta.body")}
        actions={
          <>
            <Button size="lg" variant="secondary" asChild>
              <Link to="/sources">
                <DatabaseIcon aria-hidden="true" />
                {t("app.sources")}
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
