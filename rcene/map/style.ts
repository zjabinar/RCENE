/**
 * Map constants and paint helpers: the offline style, colors, layer slots and
 * expressions. Pure data, no React, so apps and tests can import it cheaply.
 *
 * Every expression here uses expression syntax (`["get", "level"]`), never
 * the deprecated filter syntax (`["==", "level", "high"]`).
 */
import type { ExpressionSpecification, FilterSpecification, StyleSpecification } from "maplibre-gl";
import { atLeast, LEVEL_HEX, LEVELS, STATUS_HEX, type Level } from "@rcene/data";

/** Default camera: Catbalogan poblacion. BaseMap then fits to the city boundary once it loads. */
export const CATBALOGAN_VIEW = { longitude: 124.885, latitude: 11.775, zoom: 12.5 } as const;

export const SEA_COLOR = "#c9dde8";
/** Land outside the city boundary (outside data coverage). */
export const LAND_COLOR = "#e6e3da";
/** Land inside the city boundary (inside data coverage). */
export const COVERAGE_COLOR = "#f8f6f1";
export const BOUNDARY_COLOR = "#475569";
export const BARANGAY_LINE_COLOR = "#a8a29e";
/** Selected-point pin. Near-black reads on every level color and on the land. */
export const PIN_COLOR = "#111827";
/** Default PointLayer color; deliberately outside the yellow→red level palette. */
export const POINT_COLOR = "#0f766e";

/**
 * Basemap tone. "light" (default) is what the hazard fills were tuned on; "dark"
 * is for dark or showcase screens (very-high zones then get a light casing line
 * from ZoneLayer `casing`). The hazard colours themselves never change.
 */
export type MapTone = "light" | "dark";

export interface BasemapColors {
  sea: string;
  /** Land outside the city boundary (outside data coverage). */
  land: string;
  /** Land inside the city boundary (inside data coverage). */
  coverage: string;
  boundary: string;
  barangayLine: string;
  /** Barangay labels and text drawn straight on the map (loading, no-WebGL notice). */
  label: string;
  labelHalo: string;
}

export const BASEMAP: Record<MapTone, BasemapColors> = {
  light: {
    sea: SEA_COLOR,
    land: LAND_COLOR,
    coverage: COVERAGE_COLOR,
    boundary: BOUNDARY_COLOR,
    barangayLine: BARANGAY_LINE_COLOR,
    label: "#334155",
    labelHalo: "#ffffff",
  },
  dark: {
    sea: "#0b1a2a",
    land: "#1b2130",
    coverage: "#273042",
    boundary: "#cbd5e1",
    barangayLine: "#7c8799",
    label: "#e2e8f0",
    labelHalo: "#0b1220",
  },
};

/**
 * Layer slots, bottom to top. Each slot is a hidden layer in the offline style;
 * a layer added with `beforeId={SLOT.x}` renders just below that slot, so the
 * order is stable no matter which GeoJSON file finishes loading first.
 *
 *   background (sea)
 *   land fill                         → SLOT.land
 *   city coverage fill                → SLOT.coverage
 *   OSM raster (optional toggle)      → SLOT.basemap
 *   ZoneLayer, choropleths, heatmaps  → SLOT.data      (ZoneLayer default)
 *   barangay outlines                 → SLOT.outlines
 *   city boundary line                → SLOT.boundary
 *   routes, lines, PointLayer circles → SLOT.points    (PointLayer default)
 *   no beforeId: on top of everything (hover highlights, selection rings)
 *
 * Layers sharing a slot stack in mount order (later on top).
 */
export const SLOT = {
  land: "rcene-slot-land",
  coverage: "rcene-slot-coverage",
  basemap: "rcene-slot-basemap",
  data: "rcene-slot-data",
  outlines: "rcene-slot-outlines",
  boundary: "rcene-slot-boundary",
  points: "rcene-slot-points",
} as const;
export type Slot = (typeof SLOT)[keyof typeof SLOT];

/**
 * The basemap style: sea background plus the slot anchors. No `glyphs` and no
 * `sprite` — there are no font or icon servers offline — so symbol layers with
 * `text-field` cannot be used. Land, boundary and barangays are added as
 * GeoJSON sources by BaseMap. Module-level constant: never rebuild it per render,
 * or react-map-gl calls setStyle() and wipes every layer.
 */
export const OFFLINE_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [
    { id: "background", type: "background", paint: { "background-color": SEA_COLOR } },
    ...Object.values(SLOT).map((id) => ({
      id,
      type: "background" as const,
      layout: { visibility: "none" as const },
    })),
  ],
};

export const OSM_SOURCE_ID = "rcene-osm";
export const OSM_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const OSM_ATTRIBUTION = "© OpenStreetMap contributors";

/** Levels at or above `min`, least severe first: levelsAtOrAbove("high") → ["high", "veryHigh"]. */
export function levelsAtOrAbove(min: Level): Level[] {
  return LEVELS.filter((level) => atLeast(level, min));
}

/** `["match", ["get", "level"], "low", "#…", …, fallback]` — paint color by the feature's `level`. */
export function levelColorExpression(property = "level"): ExpressionSpecification {
  return [
    "match",
    ["get", property],
    ...LEVELS.flatMap((level) => [level, LEVEL_HEX[level]]),
    STATUS_HEX.notInZone,
  ] as unknown as ExpressionSpecification;
}

/** Filter keeping features whose `level` is at or above `min`. */
export function minLevelFilter(min: Level, property = "level"): FilterSpecification {
  return ["in", ["get", property], ["literal", levelsAtOrAbove(min)]];
}
