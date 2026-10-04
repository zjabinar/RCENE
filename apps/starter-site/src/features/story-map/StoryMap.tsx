/**
 * The sticky map of the data story. One offline BaseMap stays mounted while
 * the reader scrolls; each step swaps the layers on it and moves the camera.
 * It is a figure, not a tool: not interactive (so touch and wheel scroll the
 * page), with every colour explained in the legend beside it.
 */
import { useEffect, useMemo, useRef } from "react";
import type { Hazard } from "@rcene/data";
import { featureBounds } from "@rcene/geo";
import { useT } from "@rcene/i18n";
import { BaseMap, Legend, PointLayer, ZoneLayer, useMap, useMapTone } from "@rcene/map";
import { cn } from "@rcene/ui/lib/utils";
import { DURATION, useReducedMotion } from "@rcene/ui/motion";
import type { CityLayers, CityStats } from "@/domain/city-stats.ts";
import type { Bounds } from "@/domain/projection.ts";
import { MapKey } from "@/features/city-map-svg/MapKey.tsx";
import { strings } from "@/i18n/strings.ts";
import { useTokenColor } from "./use-token-color.ts";

/** What the map shows for one step of the story. */
export type StoryView = "city" | "facilities" | "flood" | "exposed" | "surge";

const VIEW_HAZARD: Partial<Record<StoryView, Hazard>> = { flood: "flood", exposed: "flood", surge: "stormSurge" };

/** Fits the camera to `bounds` whenever they change; the first fit is instant. */
function StepCamera({ bounds }: { bounds: Bounds }) {
  const { current: map } = useMap();
  const reduced = useReducedMotion();
  const first = useRef(true);
  useEffect(() => {
    if (!map) return;
    // Leave room for the legend: beside the city on a wide panel, below it on a phone.
    const wide = map.getContainer().clientWidth >= 640;
    const padding = wide ? { top: 40, bottom: 40, left: 40, right: 260 } : { top: 72, bottom: 220, left: 24, right: 24 };
    map.fitBounds(bounds, { padding, duration: first.current || reduced ? 0 : DURATION.story * 1000 });
    first.current = false;
  }, [map, bounds, reduced]);
  return null;
}

export interface StoryMapProps {
  layers: CityLayers;
  stats: CityStats;
  view: StoryView;
  className?: string;
}

export function StoryMap({ layers, stats, view, className }: StoryMapProps) {
  const t = useT(strings);
  const dark = useMapTone("auto") === "dark";
  const primary = useTokenColor("--primary");
  const brand = useTokenColor("--brand");
  const ring = useTokenColor("--card", "#ffffff");
  const hazard = VIEW_HAZARD[view];

  const split = view === "surge" ? stats.stormSurge?.facilities : stats.flood?.facilities;
  const points = useMemo(() => {
    const inZone = new Set(split?.inZone ?? []);
    const pick = (keep: boolean) => ({ ...layers.facilities, features: layers.facilities.features.filter((f) => inZone.has(f) === keep) });
    return { inZone: pick(true), other: pick(false) };
  }, [layers.facilities, split]);

  const bounds = useMemo((): Bounds => {
    const surge = layers.zones.stormSurge;
    // The coast step frames the storm-surge zones; every other step frames the city.
    if (view === "surge" && surge && surge.features.length > 0) return featureBounds(surge);
    return featureBounds(layers.boundary);
  }, [view, layers]);

  const showSplit = view === "exposed" || view === "surge";

  return (
    // The zoom buttons are hidden: this map is a figure that the steps drive, not a tool.
    <div className={cn("relative size-full [&_.maplibregl-ctrl-top-right]:hidden", className)}>
      <BaseMap tone="auto" interactive={false} allowOnlineBasemap={false}>
        {hazard && <ZoneLayer key={hazard} hazard={hazard} zones={layers.zones[hazard]} casing={dark} />}
        {view === "facilities" && <PointLayer id="story-facilities" data={layers.facilities} color={primary} strokeColor={ring} />}
        {showSplit && (
          <>
            <PointLayer id="story-facilities-other" data={points.other} color={primary} strokeColor={ring} radius={5} />
            <PointLayer id="story-facilities-in-zone" data={points.inZone} color={brand} strokeColor={ring} radius={8} />
          </>
        )}
        <StepCamera bounds={bounds} />
      </BaseMap>

      <div className="pointer-events-none absolute right-3 bottom-3 z-10 flex max-w-[16rem] flex-col items-end gap-2">
        {hazard && <Legend hazard={hazard} tone="auto" />}
        {(view === "facilities" || showSplit) && (
          <MapKey
            facilities={showSplit ? "split" : "all"}
            inZoneLabel={view === "surge" ? t("key.inSurgeZone") : undefined}
            className="rounded-lg border bg-card/90 px-3 py-2 text-xs text-card-foreground shadow-sm backdrop-blur-sm"
          />
        )}
      </div>
    </div>
  );
}
