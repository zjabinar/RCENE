/**
 * Generic, pure geometry helpers shared by every map app. No React, no DOM.
 * Domain rules (evacuation eligibility, scenario effects) stay in the apps.
 *
 * Coordinates are [longitude, latitude] (GeoJSON order).
 */
import { bbox as turfBbox, booleanPointInPolygon, distance, point as turfPoint } from "@turf/turf";
import type { BBox, Feature, FeatureCollection, Point, Position } from "geojson";
import {
  levelRank,
  LEVELS,
  type Area,
  type Hazard,
  type HazardStatus,
  type Level,
  type Rng,
  type ZoneCollection,
  type ZonesByHazard,
} from "@rcene/data";

export type LngLat = [number, number];
type AreaInput = Feature<Area> | FeatureCollection<Area>;

const bboxCache = new WeakMap<object, BBox>();

function cachedBbox(feature: Feature): BBox {
  let box = bboxCache.get(feature);
  if (!box) {
    box = turfBbox(feature);
    bboxCache.set(feature, box);
  }
  return box;
}

const inBox = ([x, y]: Position, [w, s, e, n]: BBox) => x! >= w && x! <= e && y! >= s && y! <= n;

const featuresOf = (input: AreaInput): Feature<Area>[] =>
  input.type === "FeatureCollection" ? input.features : [input];

/** True when the point lies inside the area (holes excluded, edges included). */
export function pointInArea(pt: LngLat, area: AreaInput): boolean {
  return featuresOf(area).some((f) => inBox(pt, cachedBbox(f)) && booleanPointInPolygon(pt, f));
}

/** Most severe level among the zones containing the point, or null when none contains it. */
export function zoneLevelAt(pt: LngLat, zones: ZoneCollection): Level | null {
  let best = -1;
  for (const f of zones.features) {
    if (!inBox(pt, cachedBbox(f)) || !booleanPointInPolygon(pt, f)) continue;
    best = Math.max(best, levelRank(f.properties.level));
  }
  return best < 0 ? null : LEVELS[best]!;
}

/**
 * The truthful hazard answer for a point. For every hazard layer provided:
 *   - outsideCoverage when the point is outside the boundary (no data there)
 *   - inZone with the most severe level of all containing zones
 *   - notInZone otherwise — inside coverage, outside every mapped zone
 * Hazards whose layer was not provided are absent from the result, never guessed.
 */
export function lookupHazards(
  pt: LngLat,
  zonesByHazard: ZonesByHazard,
  boundary: AreaInput,
): Partial<Record<Hazard, HazardStatus>> {
  const covered = pointInArea(pt, boundary);
  const result: Partial<Record<Hazard, HazardStatus>> = {};
  for (const [hazard, zones] of Object.entries(zonesByHazard) as [Hazard, ZoneCollection | undefined][]) {
    if (!zones) continue;
    if (!covered) {
      result[hazard] = { kind: "outsideCoverage" };
      continue;
    }
    const level = zoneLevelAt(pt, zones);
    result[hazard] = level ? { kind: "inZone", level } : { kind: "notInZone" };
  }
  return result;
}

/** The first area feature containing the point (e.g. the barangay at a tap), or null. */
export function featureAt<P>(pt: LngLat, areas: FeatureCollection<Area, P>): Feature<Area, P> | null {
  for (const f of areas.features) if (inBox(pt, cachedBbox(f as Feature)) && booleanPointInPolygon(pt, f.geometry)) return f;
  return null;
}

/** Alias of featureAt for readability: barangayAt(pt, barangays). */
export const barangayAt = featureAt;

export interface NearestResult<P> {
  feature: Feature<Point, P>;
  /** Straight-line (great-circle) distance in kilometres. Label it "straight-line" in the UI. */
  km: number;
}

/** Point features sorted by straight-line distance from `pt`, nearest first. */
export function nearest<P>(
  pt: LngLat,
  points: FeatureCollection<Point, P> | Feature<Point, P>[],
  options: { limit?: number; filter?: (feature: Feature<Point, P>) => boolean } = {},
): NearestResult<P>[] {
  const list = Array.isArray(points) ? points : points.features;
  const from = turfPoint(pt);
  return list
    .filter((f) => (options.filter ? options.filter(f) : true))
    .map((feature) => ({ feature, km: distance(from, feature.geometry.coordinates, { units: "kilometers" }) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, options.limit ?? Infinity);
}

/** Hazard status of every point feature, e.g. exposed facilities for a dashboard. */
export function classifyPoints<P>(
  points: FeatureCollection<Point, P>,
  zonesByHazard: ZonesByHazard,
  boundary: AreaInput,
): { feature: Feature<Point, P>; status: Partial<Record<Hazard, HazardStatus>> }[] {
  return points.features.map((feature) => ({
    feature,
    status: lookupHazards(feature.geometry.coordinates as LngLat, zonesByHazard, boundary),
  }));
}

/** `n` random points inside the area, for synthetic data (e.g. households). Deterministic per rng seed. */
export function randomPointsIn(area: AreaInput, n: number, rng: Rng, maxTries = n * 200): LngLat[] {
  const features = featuresOf(area);
  const [w, s, e, nn] = turfBbox({ type: "FeatureCollection", features });
  const out: LngLat[] = [];
  for (let tries = 0; out.length < n && tries < maxTries; tries++) {
    const pt: LngLat = [rng.float(w, e), rng.float(s, nn)];
    if (pointInArea(pt, area)) out.push(pt);
  }
  return out;
}

/** [[west, south], [east, north]] for MapLibre fitBounds / maxBounds. */
export function featureBounds(input: Feature | FeatureCollection): [[number, number], [number, number]] {
  const [w, s, e, n] = turfBbox(input);
  return [
    [w, s],
    [e, n],
  ];
}
