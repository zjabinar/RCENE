import { LEVELS, type Level } from "./types.ts";

export const levelRank = (level: Level): number => LEVELS.indexOf(level);

/** True when `level` is at or above `min`. */
export const atLeast = (level: Level, min: Level): boolean => levelRank(level) >= levelRank(min);

/** The more severe of the given levels, or null for an empty list. */
export function maxLevel(levels: Iterable<Level>): Level | null {
  let best: Level | null = null;
  for (const level of levels) if (best === null || levelRank(level) > levelRank(best)) best = level;
  return best;
}

/**
 * Single source of truth for level colors in map paint expressions.
 * The CSS tokens --level-* in @rcene/ui/globals.css must match (a test checks).
 * Color is never the only signal: pair it with an icon and a text label.
 */
export const LEVEL_HEX: Record<Level, string> = {
  low: "#facc15",
  moderate: "#f97316",
  high: "#dc2626",
  veryHigh: "#7f1d1d",
};

/** Neutral colors for the non-zone states. "Not in zone" is deliberately not green. */
export const STATUS_HEX = {
  notInZone: "#64748b",
  outsideCoverage: "#9ca3af",
} as const;
