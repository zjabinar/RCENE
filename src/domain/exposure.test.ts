import { describe, expect, it } from "vitest";
import type { BarangayHazardRow } from "@rcene/data";
import { barangaysByTopLevel, topLevel } from "./exposure.ts";

const rows: BarangayHazardRow[] = [
  { barangay: "BRGY-01", hazards: { flood: { low: 0.2, high: 0.1 } } },
  { barangay: "BRGY-02", hazards: { flood: { moderate: 0.3 } } },
  { barangay: "BRGY-03", hazards: { flood: {}, landslide: { veryHigh: 0.5 } } },
  { barangay: "BRGY-04", hazards: {} },
];

describe("exposure", () => {
  it("takes the highest level with a share above zero", () => {
    expect(topLevel(rows[0]!, "flood")).toBe("high");
    expect(topLevel(rows[2]!, "landslide")).toBe("veryHigh");
  });

  it("answers none when the barangay has no mapped zone of that hazard", () => {
    expect(topLevel(rows[2]!, "flood")).toBe("none");
    expect(topLevel(rows[3]!, "flood")).toBe("none");
    expect(topLevel({ barangay: "x", hazards: { flood: { low: 0 } } }, "flood")).toBe("none");
  });

  it("counts barangays per highest level, every level listed from very high to none", () => {
    expect(barangaysByTopLevel(rows, "flood")).toEqual([
      { key: "veryHigh", count: 0 },
      { key: "high", count: 1 },
      { key: "moderate", count: 1 },
      { key: "low", count: 0 },
      { key: "none", count: 2 },
    ]);
  });
});
