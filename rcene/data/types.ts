/**
 * Shared data contracts. The data session writes files that match these
 * shapes into the app's data/files/. The committed fixtures in
 * data/fixtures/ match them too, so apps work before the
 * real data lands.
 */
import type { Feature, FeatureCollection, MultiPolygon, Point, Polygon } from "geojson";

export const HAZARDS = ["flood", "landslide", "stormSurge", "groundShaking", "liquefaction"] as const;
export type Hazard = (typeof HAZARDS)[number];

/** Ordered from least to most severe. Mapped from each source layer's own categories during data prep. */
export const LEVELS = ["low", "moderate", "high", "veryHigh"] as const;
export type Level = (typeof LEVELS)[number];

/**
 * The only three answers a hazard lookup may give. There is no "safe" state:
 * "notInZone" means the point is inside the data coverage but outside every
 * mapped risk zone for that hazard, which is not a safety guarantee.
 */
export type HazardStatus =
  | { kind: "inZone"; level: Level }
  | { kind: "notInZone" }
  | { kind: "outsideCoverage" };

export type Area = Polygon | MultiPolygon;

export interface BoundaryProps {
  name: string;
  fixture?: boolean;
}

export interface BarangayProps {
  /** Barangay name as written by the source (HDX/OCHA). */
  name: string;
  /** PSGC code when the source has one. */
  psgc?: string;
  /** True for coastal barangays when known. */
  coastal?: boolean;
  fixture?: boolean;
}

export interface ZoneProps {
  hazard: Hazard;
  level: Level;
  /** Name of the canonical source layer, recorded during data prep. */
  sourceLayer?: string;
  fixture?: boolean;
}

export const FACILITY_KINDS = ["school", "hospital", "health", "police", "fire", "townhall", "other"] as const;
export type FacilityKind = (typeof FACILITY_KINDS)[number];

export interface FacilityProps {
  id: string;
  name: string;
  kind: FacilityKind;
  barangay?: string;
  /** OSM id when the facility came from OpenStreetMap. */
  osmId?: string;
  fixture?: boolean;
}

export interface HeritageProps {
  id: string;
  name: string;
  category: "heritage" | "eco-tourism" | "scenic" | "other";
  description?: string;
  barangay?: string;
  fixture?: boolean;
}

export type BoundaryCollection = FeatureCollection<Area, BoundaryProps>;
export type BarangayCollection = FeatureCollection<Area, BarangayProps>;
export type ZoneCollection = FeatureCollection<Area, ZoneProps>;
export type FacilityCollection = FeatureCollection<Point, FacilityProps>;
export type HeritageCollection = FeatureCollection<Point, HeritageProps>;
export type BarangayFeature = Feature<Area, BarangayProps>;
export type FacilityFeature = Feature<Point, FacilityProps>;

/** Hazard layers keyed by hazard. A hazard is absent when its layer is not loaded. */
export type ZonesByHazard = Partial<Record<Hazard, ZoneCollection>>;

/**
 * derived/barangay-hazard.json — precomputed by the data session so apps don't
 * run heavy overlays in the browser. Shares are 0..1 of the barangay's area.
 */
export interface BarangayHazardRow {
  barangay: string;
  psgc?: string;
  hazards: Partial<Record<Hazard, Partial<Record<Level, number>>>>;
  /** Count of facilities inside any zone of each hazard, by level. */
  exposedFacilities?: Partial<Record<Hazard, Partial<Record<Level, number>>>>;
}

/** derived/facility-hazard.json — hazard status of every facility. */
export interface FacilityHazardRow {
  id: string;
  status: Partial<Record<Hazard, HazardStatus>>;
}

/** sources.json — one entry per shipped file, rendered by the /sources page and the poster. */
export interface SourceEntry {
  file: string;
  title: string;
  /** e.g. "Catbalogan City CDRRMO / CPDCO, used with permission" */
  attribution: string;
  tier: "open" | "permission" | "synthetic" | "fixture";
  license?: string;
  url?: string;
  notes?: string;
}

export interface DataManifest {
  files: Record<string, "real" | "fixture">;
}
