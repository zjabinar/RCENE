/**
 * The numbers the site shows, computed from the shipped layers (never typed
 * in). Pure functions: no React, no fetch. Areas use Turf on the sphere.
 *
 * Honesty rules baked in here:
 * - zones of one hazard are merged before measuring, so overlapping levels
 *   count once;
 * - facilities get the same three answers as a hazard lookup (in a mapped
 *   zone, not in a mapped zone, outside the data), via lookupHazards;
 * - a hazard whose layer is missing has no number at all (null), not a 0.
 */
import { area as turfArea, featureCollection, intersect, union } from "@turf/turf";
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import {
  HAZARDS,
  atLeast,
  type Area,
  type BarangayCollection,
  type BoundaryCollection,
  type FacilityCollection,
  type FacilityFeature,
  type Hazard,
  type Level,
  type ZoneCollection,
  type ZonesByHazard,
} from "@rcene/data";
import { lookupHazards, type LngLat } from "@rcene/geo";

type AreaFeature = Feature<Polygon | MultiPolygon>;

/** Every polygon of a collection merged into one geometry, or null when there is none. */
export function dissolve(collection: FeatureCollection<Area>): AreaFeature | null {
  const parts = collection.features.filter(
    (f): f is AreaFeature => f.geometry?.type === "Polygon" || f.geometry?.type === "MultiPolygon",
  );
  if (parts.length <= 1) return parts[0] ?? null;
  return union(featureCollection(parts));
}

/** Area in square kilometres. */
export function areaKm2(collection: FeatureCollection<Area>): number {
  const whole = dissolve(collection);
  return whole ? turfArea(whole) / 1e6 : 0;
}

/**
 * Share (0..1) of `area` inside the zones at `minLevel` or above (default:
 * any level). The zones are merged first, so overlapping levels count once.
 */
export function zoneShare(area: FeatureCollection<Area>, zones: ZoneCollection, minLevel: Level = "low"): number {
  const whole = dissolve(area);
  const covered = dissolve({ ...zones, features: zones.features.filter((f) => atLeast(f.properties.level, minLevel)) });
  if (!whole || !covered) return 0;
  const total = turfArea(whole);
  if (total <= 0) return 0;
  const overlap = intersect(featureCollection([whole, covered]));
  return overlap ? Math.min(1, turfArea(overlap) / total) : 0;
}

export interface HazardShare {
  hazard: Hazard;
  /** 0..1 of the city's area in a mapped zone of this hazard (any level). */
  share: number;
}

/** One share per loaded hazard, in HAZARDS order. Missing hazards are left out, never shown as 0. */
export function sharesByHazard(boundary: BoundaryCollection, zones: ZonesByHazard): HazardShare[] {
  return HAZARDS.flatMap((hazard) => {
    const layer = zones[hazard];
    return layer ? [{ hazard, share: zoneShare(boundary, layer) }] : [];
  });
}

/** Facilities sorted into the three answers for one hazard. */
export interface FacilitySplit {
  inZone: FacilityFeature[];
  notInZone: FacilityFeature[];
  outsideCoverage: FacilityFeature[];
}

/** Sorts each facility into the three answers for `hazard`, exactly as a hazard lookup would. */
export function splitFacilities(
  facilities: FacilityCollection,
  hazard: Hazard,
  zones: ZoneCollection,
  boundary: BoundaryCollection,
): FacilitySplit {
  const split: FacilitySplit = { inZone: [], notInZone: [], outsideCoverage: [] };
  for (const feature of facilities.features) {
    const status = lookupHazards(feature.geometry.coordinates as LngLat, { [hazard]: zones }, boundary)[hazard];
    if (status) split[status.kind].push(feature);
  }
  return split;
}

export interface CityLayers {
  boundary: BoundaryCollection;
  barangays: BarangayCollection;
  facilities: FacilityCollection;
  zones: ZonesByHazard;
  /** Hazards whose layer is not served (from useZones). */
  missing: readonly Hazard[];
}

export interface HazardStats {
  /** 0..1 of the city's area in a mapped zone of this hazard. */
  share: number;
  facilities: FacilitySplit;
}

export interface CityStats {
  barangays: number;
  facilities: number;
  /** City area in km² (the boundary polygon). */
  areaKm2: number;
  /** null when the flood layer is missing. */
  flood: HazardStats | null;
  /** null when the storm-surge layer is missing. */
  stormSurge: HazardStats | null;
  /** Every loaded hazard, for the chart. */
  byHazard: HazardShare[];
  missing: readonly Hazard[];
}

function hazardStats(layers: CityLayers, hazard: Hazard): HazardStats | null {
  const zones = layers.zones[hazard];
  if (!zones) return null;
  return {
    share: zoneShare(layers.boundary, zones),
    facilities: splitFacilities(layers.facilities, hazard, zones, layers.boundary),
  };
}

/** Everything the landing page, the story and the poster show. */
export function cityStats(layers: CityLayers): CityStats {
  return {
    barangays: layers.barangays.features.length,
    facilities: layers.facilities.features.length,
    areaKm2: areaKm2(layers.boundary),
    flood: hazardStats(layers, "flood"),
    stormSurge: hazardStats(layers, "stormSurge"),
    byHazard: sharesByHazard(layers.boundary, layers.zones),
    missing: layers.missing,
  };
}

/** A 0..1 share as a percentage for display: one decimal under 10 %, whole numbers above. */
export function sharePercent(share: number): number {
  const percent = share * 100;
  return percent < 10 ? Math.round(percent * 10) / 10 : Math.round(percent);
}
