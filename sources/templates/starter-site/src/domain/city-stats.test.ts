import { describe, expect, it } from "vitest";
import type {
  BarangayCollection,
  BoundaryCollection,
  FacilityCollection,
  Level,
  ZoneCollection,
} from "@rcene/data";
import { areaKm2, cityStats, dissolve, sharePercent, sharesByHazard, splitFacilities, zoneShare } from "./city-stats.ts";

// A 0.1° square city. Strips split by longitude have exactly proportional areas on the sphere.
const W = 124.8;
const S = 11.7;
const SIZE = 0.1;

function rect(w: number, e: number): [number, number][][] {
  return [
    [
      [W + w * SIZE, S],
      [W + e * SIZE, S],
      [W + e * SIZE, S + SIZE],
      [W + w * SIZE, S + SIZE],
      [W + w * SIZE, S],
    ],
  ];
}

const boundary: BoundaryCollection = {
  type: "FeatureCollection",
  features: [{ type: "Feature", properties: { name: "City" }, geometry: { type: "Polygon", coordinates: rect(0, 1) } }],
};

const barangays: BarangayCollection = {
  type: "FeatureCollection",
  features: [
    { type: "Feature", properties: { name: "BRGY-01" }, geometry: { type: "Polygon", coordinates: rect(0, 0.5) } },
    { type: "Feature", properties: { name: "BRGY-02" }, geometry: { type: "Polygon", coordinates: rect(0.5, 1) } },
  ],
};

function zones(hazard: "flood" | "stormSurge", parts: [number, number, Level][]): ZoneCollection {
  return {
    type: "FeatureCollection",
    features: parts.map(([w, e, level]) => ({
      type: "Feature",
      properties: { hazard, level },
      geometry: { type: "Polygon", coordinates: rect(w, e) },
    })),
  };
}

const at = (x: number, y: number): [number, number] => [W + x * SIZE, S + y * SIZE];

const facilities: FacilityCollection = {
  type: "FeatureCollection",
  features: [
    { type: "Feature", properties: { id: "F-001", name: "School 1", kind: "school" }, geometry: { type: "Point", coordinates: at(0.1, 0.5) } },
    { type: "Feature", properties: { id: "F-002", name: "Clinic 2", kind: "health" }, geometry: { type: "Point", coordinates: at(0.9, 0.5) } },
    { type: "Feature", properties: { id: "F-003", name: "Port 3", kind: "other" }, geometry: { type: "Point", coordinates: at(1.5, 0.5) } },
  ],
};

describe("zoneShare", () => {
  it("measures the part of the city inside the zones", () => {
    expect(zoneShare(boundary, zones("flood", [[0, 0.5, "low"]]))).toBeCloseTo(0.5, 6);
  });

  it("counts overlapping levels once", () => {
    const overlapping = zones("flood", [
      [0, 0.5, "low"],
      [0.25, 0.5, "high"],
    ]);
    expect(zoneShare(boundary, overlapping)).toBeCloseTo(0.5, 6);
  });

  it("can keep only the levels at or above a minimum", () => {
    const layered = zones("flood", [
      [0, 0.5, "low"],
      [0.75, 1, "high"],
    ]);
    expect(zoneShare(boundary, layered, "high")).toBeCloseTo(0.25, 6);
  });

  it("ignores the part of a zone outside the city, and is 0 with no zones", () => {
    expect(zoneShare(boundary, zones("flood", [[0.5, 2, "moderate"]]))).toBeCloseTo(0.5, 6);
    expect(zoneShare(boundary, zones("flood", []))).toBe(0);
  });
});

describe("dissolve and areaKm2", () => {
  it("merges the parts into one area", () => {
    expect(dissolve({ type: "FeatureCollection", features: [] })).toBeNull();
    expect(areaKm2(barangays)).toBeCloseTo(areaKm2(boundary), 3);
    // A 0.1° square at 11.75° N is about 11.1 km × 10.9 km.
    expect(areaKm2(boundary)).toBeGreaterThan(115);
    expect(areaKm2(boundary)).toBeLessThan(125);
  });
});

describe("sharesByHazard", () => {
  it("lists loaded hazards in order and leaves missing ones out", () => {
    const shares = sharesByHazard(boundary, {
      stormSurge: zones("stormSurge", [[0, 0.25, "high"]]),
      flood: zones("flood", [[0, 0.5, "low"]]),
    });
    expect(shares.map((s) => s.hazard)).toEqual(["flood", "stormSurge"]);
    expect(shares[1]!.share).toBeCloseTo(0.25, 6);
  });
});

describe("splitFacilities", () => {
  it("gives every facility one of the three answers", () => {
    const split = splitFacilities(facilities, "flood", zones("flood", [[0, 0.5, "moderate"]]), boundary);
    expect(split.inZone.map((f) => f.properties.id)).toEqual(["F-001"]);
    expect(split.notInZone.map((f) => f.properties.id)).toEqual(["F-002"]);
    expect(split.outsideCoverage.map((f) => f.properties.id)).toEqual(["F-003"]);
  });
});

describe("cityStats", () => {
  it("counts the layers and computes flood and storm surge", () => {
    const stats = cityStats({
      boundary,
      barangays,
      facilities,
      zones: { flood: zones("flood", [[0, 0.5, "low"]]) },
      missing: ["stormSurge"],
    });
    expect(stats.barangays).toBe(2);
    expect(stats.facilities).toBe(3);
    expect(stats.flood?.share).toBeCloseTo(0.5, 6);
    expect(stats.flood?.facilities.inZone).toHaveLength(1);
    expect(stats.stormSurge).toBeNull();
    expect(stats.byHazard.map((s) => s.hazard)).toEqual(["flood"]);
    expect(stats.missing).toEqual(["stormSurge"]);
  });
});

describe("sharePercent", () => {
  it("keeps one decimal for small shares and rounds the rest", () => {
    expect(sharePercent(0.0437)).toBe(4.4);
    expect(sharePercent(0.236)).toBe(24);
    expect(sharePercent(0)).toBe(0);
    expect(sharePercent(1)).toBe(100);
  });
});
