// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { atLeast, createRng, HAZARDS, LAYER_FILES, LEVELS, maxLevel } from "./index.ts";
import {
  barangaysSchema,
  boundarySchema,
  facilitiesSchema,
  heritageSchema,
  sourcesSchema,
  zonesSchema,
} from "./schemas.ts";

const dir = fileURLToPath(new URL("../fixtures/", import.meta.url));
const read = (file: string): unknown => JSON.parse(readFileSync(dir + file, "utf8"));

describe("fixtures", () => {
  it("exist for every layer", () => {
    for (const file of Object.values(LAYER_FILES)) expect(() => read(file), file).not.toThrow();
  });

  it("match the schemas", () => {
    expect(boundarySchema.safeParse(read("boundary.geojson")).success).toBe(true);
    expect(boundarySchema.safeParse(read("land.geojson")).success).toBe(true);
    expect(barangaysSchema.safeParse(read("barangays.geojson")).success).toBe(true);
    expect(facilitiesSchema.safeParse(read("facilities.geojson")).success).toBe(true);
    expect(heritageSchema.safeParse(read("heritage.geojson")).success).toBe(true);
    expect(sourcesSchema.safeParse(read("sources.json")).success).toBe(true);
    for (const h of HAZARDS) {
      const parsed = zonesSchema.safeParse(read(`hazard-${h}.geojson`));
      expect(parsed.success, h).toBe(true);
      expect(parsed.data?.features.every((f) => f.properties.hazard === h)).toBe(true);
    }
  });

  it("cover every level somewhere, so UI states can be exercised", () => {
    const seen = new Set<string>();
    for (const h of HAZARDS) {
      const layer = read(`hazard-${h}.geojson`) as { features: { properties: { level: string } }[] };
      layer.features.forEach((f) => seen.add(f.properties.level));
    }
    expect([...seen].sort()).toEqual([...LEVELS].sort());
  });

  it("are all marked as fixtures", () => {
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".geojson"))) {
      const layer = read(file) as { features: { properties: { fixture?: boolean } }[] };
      expect(layer.features.every((f) => f.properties.fixture === true), file).toBe(true);
    }
  });
});

describe("levels", () => {
  it("orders and compares levels", () => {
    expect(atLeast("high", "moderate")).toBe(true);
    expect(atLeast("low", "moderate")).toBe(false);
    expect(maxLevel(["low", "veryHigh", "moderate"])).toBe("veryHigh");
    expect(maxLevel([])).toBeNull();
  });
});

describe("createRng", () => {
  it("is deterministic per seed", () => {
    const a = createRng(42);
    const b = createRng(42);
    expect([a.next(), a.int(1, 6), a.pick(["x", "y", "z"])]).toEqual([b.next(), b.int(1, 6), b.pick(["x", "y", "z"])]);
  });

  it("keeps int() within bounds", () => {
    const rng = createRng(3);
    for (let i = 0; i < 500; i++) {
      const n = rng.int(2, 4);
      expect(n).toBeGreaterThanOrEqual(2);
      expect(n).toBeLessThanOrEqual(4);
    }
  });
});
