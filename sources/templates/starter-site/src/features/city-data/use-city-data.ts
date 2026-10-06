/**
 * The four layers every page of the site reads, as one load state, plus the
 * numbers computed from them. Layers are fetched once per page load (the
 * loaders cache them), so every page can call these hooks.
 *
 *   const city = useCityStats();
 *   <LoadGate state={city}>{({ layers, stats }) => …}</LoadGate>
 */
import { useMemo } from "react";
import { HAZARDS, useLayer, useZones, type LayerName, type LoadState } from "@rcene/data";
import { cityStats, type CityLayers, type CityStats } from "@/domain/city-stats.ts";
import { allLoaded, mapLoaded } from "@/domain/load-state.ts";

/** The files the site reads (for SampleDataBadge `layers`). */
export const CITY_LAYERS: readonly LayerName[] = [
  "boundary",
  "barangays",
  "facilities",
  ...HAZARDS.map((h) => `hazard-${h}` as const),
];

/** Boundary, barangays, facilities and every hazard layer that exists (missing hazards listed, never guessed). */
export function useCityLayers(): LoadState<CityLayers> {
  const boundary = useLayer("boundary");
  const barangays = useLayer("barangays");
  const facilities = useLayer("facilities");
  const zones = useZones(HAZARDS);
  return useMemo(
    () =>
      mapLoaded(allLoaded({ boundary, barangays, facilities, zones }), (d) => ({
        boundary: d.boundary,
        barangays: d.barangays,
        facilities: d.facilities,
        zones: d.zones.zones,
        missing: d.zones.missing,
      })),
    [boundary, barangays, facilities, zones],
  );
}

export interface CityData {
  layers: CityLayers;
  stats: CityStats;
}

/** The layers and the numbers computed from them (once per page, when the layers are ready). */
export function useCityStats(): LoadState<CityData> {
  const layers = useCityLayers();
  return useMemo(() => mapLoaded(layers, (l) => ({ layers: l, stats: cityStats(l) })), [layers]);
}
