import type {
  BarangayCollection,
  BarangayHazardRow,
  BoundaryCollection,
  FacilityCollection,
  FacilityHazardRow,
  Hazard,
  HeritageCollection,
  SourceEntry,
  ZoneCollection,
} from "./types.ts";

/**
 * Every layer an app can request, mapped to its file under /data/ and its type.
 * A new shipped layer is added here (and listed in NOTES.md under "Shared-code
 * changes (for the template)"). A file that may not exist is read with
 * useOptionalLayer instead.
 */
export interface LayerTypes {
  boundary: BoundaryCollection;
  barangays: BarangayCollection;
  /** Simplified land outline of Samar around the city, so the offline basemap shows a coastline. */
  land: BoundaryCollection;
  "hazard-flood": ZoneCollection;
  "hazard-landslide": ZoneCollection;
  "hazard-stormSurge": ZoneCollection;
  "hazard-groundShaking": ZoneCollection;
  "hazard-liquefaction": ZoneCollection;
  facilities: FacilityCollection;
  heritage: HeritageCollection;
  "derived/barangay-hazard": BarangayHazardRow[];
  "derived/facility-hazard": FacilityHazardRow[];
  sources: SourceEntry[];
}

export type LayerName = keyof LayerTypes;

export const LAYER_FILES: Record<LayerName, string> = {
  boundary: "boundary.geojson",
  barangays: "barangays.geojson",
  land: "land.geojson",
  "hazard-flood": "hazard-flood.geojson",
  "hazard-landslide": "hazard-landslide.geojson",
  "hazard-stormSurge": "hazard-stormSurge.geojson",
  "hazard-groundShaking": "hazard-groundShaking.geojson",
  "hazard-liquefaction": "hazard-liquefaction.geojson",
  facilities: "facilities.geojson",
  heritage: "heritage.geojson",
  "derived/barangay-hazard": "derived/barangay-hazard.json",
  "derived/facility-hazard": "derived/facility-hazard.json",
  sources: "sources.json",
};

export const hazardLayer = (hazard: Hazard) => `hazard-${hazard}` as const satisfies LayerName;

/** URL of a layer, served by this app's static plugin (rcene/config/static.ts) in dev and emitted into dist on build. */
export const layerUrl = (name: LayerName): string => `/data/${LAYER_FILES[name]}`;
