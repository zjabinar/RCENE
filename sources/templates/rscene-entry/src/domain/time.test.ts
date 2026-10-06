import { describe, expect, it } from "vitest";
import { DEMO_DAY, dayNumber, dayOfDate, daysBetween, demoNow, isoAt, weekStart } from "./time.ts";

describe("Philippine-time dates", () => {
  it("counts days in Philippine time, not UTC", () => {
    // 23:30 UTC on 6 Oct is 07:30 on 7 Oct in Catbalogan.
    expect(dayNumber("2026-10-06T23:30:00Z")).toBe(dayOfDate("2026-10-07"));
    expect(dayNumber("2026-10-07T00:10:00+08:00")).toBe(dayOfDate("2026-10-07"));
  });

  it("writes ISO strings with the +08:00 offset and reads them back", () => {
    const day = dayOfDate("2026-10-07");
    expect(isoAt(day, 9, 5)).toBe("2026-10-07T09:05:00+08:00");
    expect(dayNumber(isoAt(day, 23, 59))).toBe(day);
  });

  it("starts weeks on Monday", () => {
    // Wednesday 7 Oct 2026 → Monday 5 Oct; Monday stays; Sunday 11 Oct → Monday 5 Oct.
    expect(weekStart(dayOfDate("2026-10-07"))).toBe(dayOfDate("2026-10-05"));
    expect(weekStart(dayOfDate("2026-10-05"))).toBe(dayOfDate("2026-10-05"));
    expect(weekStart(dayOfDate("2026-10-11"))).toBe(dayOfDate("2026-10-05"));
    expect(weekStart(dayOfDate("2026-10-12"))).toBe(dayOfDate("2026-10-12"));
  });

  it("measures days with fractions", () => {
    expect(daysBetween("2026-10-01T08:00:00+08:00", "2026-10-03T20:00:00+08:00")).toBe(2.5);
  });

  it("pins 'now' to the demo day at the real Philippine wall-clock time", () => {
    expect(demoNow(new Date("2026-01-15T01:30:00Z"))).toBe(`${DEMO_DAY}T09:30:00+08:00`);
    expect(demoNow(new Date("2025-12-31T20:00:00Z"))).toBe(`${DEMO_DAY}T04:00:00+08:00`);
  });
});
