/**
 * The A3 poster (portrait): the six panels of the competition poster, with
 * SVG figures drawn from the same layers as the site (a WebGL map does not
 * print). Print from Chrome or Edge with the toolbar's Print button: Save as
 * PDF, margins None, background graphics on. Only the sheet prints.
 */
import { useT } from "@rcene/i18n";
import { Wordmark } from "@rcene/kit/brand";
import { AiBuiltPanel, PosterFigure, PosterPage, QrToApp, SixPanelPoster, usePosterSheet } from "@rcene/kit/poster";
import { SITE_CONTAINER } from "@rcene/kit/site";
import { LoadGate } from "@rcene/ui";
import { cn } from "@rcene/ui/lib/utils";
import { CityMapSvg } from "@/features/city-map-svg/CityMapSvg.tsx";
import { MapKey } from "@/features/city-map-svg/MapKey.tsx";
import { useCityStats, type CityData } from "@/features/city-data/use-city-data.ts";
import { useShareFormat } from "@/features/city-data/use-share-format.ts";
import { HazardShareSvg } from "@/features/hazard-chart/HazardShareSvg.tsx";
import { strings } from "@/i18n/strings.ts";

function SixPanels({ data, siteUrl }: { data: CityData; siteUrl: string }) {
  const t = useT(strings);
  const share = useShareFormat();
  const { layers, stats } = data;
  const flood = stats.flood;
  // Landscape panels are shorter: keep the process to three steps there.
  const portrait = usePosterSheet().orientation === "portrait";
  const steps = (portrait ? (["brief", "domain", "kit", "check", "review"] as const) : (["brief", "check", "review"] as const)).map((s) =>
    t(`about.ai.step.${s}`),
  );

  return (
    <SixPanelPoster
      title={t("app.title")}
      subtitle={t("poster.subtitle")}
      qr={<QrToApp url={siteUrl} label={t("about.qr.label")} size="28mm" />}
      footer={
        <>
          <span>{t("poster.footer.event")}</span>
          <span className="flex items-center gap-3">
            {t("poster.footer.kit")}
            <Wordmark variant="compact" className="text-lg text-foreground" />
          </span>
        </>
      }
      panels={{
        problem: (
          <>
            <p>{t("poster.problem.1")}</p>
            <p>{t("poster.problem.2")}</p>
          </>
        ),
        picture: (
          <PosterFigure
            title={t("poster.picture.title")}
            caption={
              flood
                ? t("poster.picture.caption", { share: share(flood.share), n: flood.facilities.inZone.length, total: stats.facilities })
                : t("data.layerMissing", { hazard: t("hazard.flood") })
            }
            downloadSvg="catbalogan-flood-zones"
          >
            {/* A fixed height in mm: the sheet has a fixed size, so the map always fits its panel. */}
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-[4mm]">
              <CityMapSvg
                layers={layers}
                hazard={flood ? "flood" : undefined}
                facilities={flood ? "split" : "all"}
                split={flood?.facilities}
                label={
                  flood
                    ? t("map.floodLabel", { inZone: flood.facilities.inZone.length, f: stats.facilities })
                    : t("map.cityLabel", { n: stats.barangays, f: stats.facilities })
                }
                width={720}
                className="h-[68mm] w-full"
              />
              <MapKey hazard={flood ? "flood" : undefined} facilities={flood ? "split" : "all"} stacked />
            </div>
          </PosterFigure>
        ),
        different: (
          <ul className="flex list-disc flex-col gap-2 ps-6">
            <li>{t("poster.different.1")}</li>
            <li>{t("poster.different.2")}</li>
            <li>{t("poster.different.3")}</li>
          </ul>
        ),
        ai: (
          <AiBuiltPanel
            tools={[
              { name: "Claude Code", role: t("about.ai.tool.claude") },
              { name: "Playwright", role: t("about.ai.tool.playwright") },
            ]}
            steps={steps}
            disclosure={t("about.ai.disclosure")}
          />
        ),
        data: (
          <PosterFigure title={t("poster.data.chart")} caption={t("poster.data.chartCaption")} source={t("poster.data.source")}>
            <HazardShareSvg shares={stats.byHazard} className="h-auto max-h-[44mm] w-full" />
          </PosterFigure>
        ),
        impact: (
          <ul className="flex list-disc flex-col gap-1.5 ps-6">
            <li>{t("poster.impact.1")}</li>
            <li>{t("poster.impact.2")}</li>
            <li>{t("poster.impact.3")}</li>
          </ul>
        ),
      }}
    />
  );
}

export function Poster() {
  const t = useT(strings);
  const city = useCityStats();
  // The QR code follows the address in the browser bar: open the poster from the laptop's LAN address before printing.
  const siteUrl = typeof window === "undefined" ? "/" : `${window.location.origin}/`;

  return (
    <div className={cn(SITE_CONTAINER, "py-6 sm:py-8")}>
      <PosterPage title={t("poster.sheet")} size="A3" fit="contain" className="h-[calc(100svh-5.5rem)] min-h-[40rem]">
        <LoadGate state={city}>{(data) => <SixPanels data={data} siteUrl={siteUrl} />}</LoadGate>
      </PosterPage>
    </div>
  );
}
