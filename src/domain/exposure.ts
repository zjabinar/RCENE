/**
 * Barangay exposure from the precomputed derived/barangay-hazard.json rows. Pure
 * functions: the poster and the AI briefing read them, the labels are translated by
 * the caller. "none" means no mapped zone of that hazard in the barangay (never "safe").
 */
import { LEVELS, maxLevel, type BarangayHazardRow, type Hazard, type Level } from "@rcene/data";

export type TopLevel = Level | "none";

/** The highest mapped level of `hazard` inside the barangay, or "none". */
export function topLevel(row: BarangayHazardRow, hazard: Hazard): TopLevel {
  const shares = row.hazards[hazard] ?? {};
  return maxLevel(LEVELS.filter((level) => (shares[level] ?? 0) > 0)) ?? "none";
}

/** How many barangays have each highest level, from very high down to none (every key present). */
export function barangaysByTopLevel(rows: readonly BarangayHazardRow[], hazard: Hazard): { key: TopLevel; count: number }[] {
  const order: TopLevel[] = [...[...LEVELS].reverse(), "none"];
  const counts = new Map<TopLevel, number>(order.map((k) => [k, 0]));
  for (const row of rows) {
    const key = topLevel(row, hazard);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return order.map((key) => ({ key, count: counts.get(key) ?? 0 }));
}
