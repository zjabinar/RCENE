// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  createRng,
  HAZARDS,
  type BarangayCollection,
  type BoundaryCollection,
  type FacilityCollection,
  type ZonesByHazard,
} from "@rcene/data";
import {
  barangayAt,
  classifyPoints,
  featureBounds,
  lookupHazards,
  nearest,
  pointInArea,
  randomPointsIn,
  zoneLevelAt,
  type LngLat,
} from "./index.ts";

const fixture = <T>(file: string): T =>
  JSON.parse(readFileSync(fileURLToPath(new URL(`../../data/fixtures/${file}`, import.meta.url)), "utf8")) as T;

const boundary = fixture<BoundaryCollection>("boundary.geojson");
const barangays = fixture<BarangayCollection>("barangays.geojson");
const facilities = fixture<FacilityCollection>("facilities.geojson");
const zones: ZonesByHazard = Object.fromEntries(HAZARDS.map((h) => [h, fixture(`hazard-${h}.geojson`)]));

// Points chosen against scripts/data/make-fixtures.mjs geometry.
const IN_SURGE_HIGH: LngLat = [124.875, 11.78];
const IN_FLOOD_HOLE: LngLat = [124.925, 11.78];
const IN_FLOOD_OVERLAP: LngLat = [124.945, 11.78];
const IN_FLOOD_MODERATE_ONLY: LngLat = [124.91, 11.77];
const OUTSIDE_CITY: LngLat = [124.7, 11.6];

describe("lookupHazards", () => {
  it("returns inZone with the zone's level", () => {
    expect(lookupHazards(IN_SURGE_HIGH, zones, boundary).stormSurge).toEqual({ kind: "inZone", level: "high" });
  });

  it("takes the most severe level where zones overlap", () => {
    expect(lookupHazards(IN_FLOOD_OVERLAP, zones, boundary).flood).toEqual({ kind: "inZone", level: "high" });
    expect(lookupHazards(IN_FLOOD_MODERATE_ONLY, zones, boundary).flood).toEqual({ kind: "inZone", level: "moderate" });
  });

  it("treats a point inside a hole as not in the zone", () => {
    expect(lookupHazards(IN_FLOOD_HOLE, zones, boundary).flood).toEqual({ kind: "notInZone" });
  });

  it("says outsideCoverage for every hazard outside the boundary, never notInZone", () => {
    const result = lookupHazards(OUTSIDE_CITY, zones, boundary);
    expect(Object.keys(result).sort()).toEqual([...HAZARDS].sort());
    for (const status of Object.values(result)) expect(status).toEqual({ kind: "outsideCoverage" });
  });

  it("omits hazards whose layer was not provided instead of guessing", () => {
    const result = lookupHazards(IN_SURGE_HIGH, { stormSurge: zones.stormSurge }, boundary);
    expect(Object.keys(result)).toEqual(["stormSurge"]);
  });

  it("only ever answers with the three states", () => {
    const rng = createRng(7);
    for (let i = 0; i < 200; i++) {
      const pt: LngLat = [rng.float(124.8, 125.0), rng.float(11.7, 11.86)];
      for (const status of Object.values(lookupHazards(pt, zones, boundary))) {
        expect(["inZone", "notInZone", "outsideCoverage"]).toContain(status.kind);
      }
    }
  });
});

describe("helpers", () => {
  it("pointInArea and zoneLevelAt agree with the fixtures", () => {
    expect(pointInArea(IN_SURGE_HIGH, boundary)).toBe(true);
    expect(pointInArea(OUTSIDE_CITY, boundary)).toBe(false);
    expect(zoneLevelAt(IN_FLOOD_HOLE, zones.flood!)).toBeNull();
  });

  it("finds the barangay at a point", () => {
    expect(barangayAt(IN_SURGE_HIGH, barangays)?.properties.name).toBe("Sample Barangay 2");
    expect(barangayAt(OUTSIDE_CITY, barangays)).toBeNull();
  });

  it("sorts facilities by straight-line distance and applies filter and limit", () => {
    const result = nearest(IN_SURGE_HIGH, facilities, { limit: 3, filter: (f) => f.properties.kind === "school" });
    expect(result).toHaveLength(3);
    expect(result.every((r) => r.feature.properties.kind === "school")).toBe(true);
    expect(result[0]!.feature.properties.id).toBe("F-001");
    expect(result[0]!.km).toBeLessThan(result[1]!.km);
    expect(result[1]!.km).toBeLessThanOrEqual(result[2]!.km);
  });

  it("classifies points and flags the surge-zone schools", () => {
    const rows = classifyPoints(facilities, { stormSurge: zones.stormSurge }, boundary);
    const inSurge = rows.filter((r) => r.status.stormSurge?.kind === "inZone").map((r) => r.feature.properties.id);
    expect(inSurge).toEqual(expect.arrayContaining(["F-001", "F-005"]));
  });

  it("makes deterministic random points inside an area", () => {
    const a = randomPointsIn(boundary, 25, createRng(1));
    const b = randomPointsIn(boundary, 25, createRng(1));
    expect(a).toEqual(b);
    expect(a).toHaveLength(25);
    expect(a.every((pt) => pointInArea(pt, boundary))).toBe(true);
  });

  it("returns [[w,s],[e,n]] bounds", () => {
    const [[w, s], [e, n]] = featureBounds(boundary);
    expect(w).toBeLessThan(e);
    expect(s).toBeLessThan(n);
  });
});
