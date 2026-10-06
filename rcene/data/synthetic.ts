/**
 * Seeded randomness for synthetic demo data (households, queues, reports).
 * Same seed, same data — so a rehearsed demo is identical every run.
 *
 * Rules: synthetic records never carry real or realistic personal names.
 * Use codes such as HH-0123 or T-042.
 */

export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [min, max], inclusive. */
  int(min: number, max: number): number;
  /** Float in [min, max). */
  float(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  /** Picks by weight; weights need not sum to 1. */
  weighted<T>(items: readonly (readonly [T, number])[]): T;
  bool(probability?: number): boolean;
  shuffle<T>(items: readonly T[]): T[];
}

/** mulberry32 — small, fast, good enough for demo data. */
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng: Rng = {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    float: (min, max) => min + next() * (max - min),
    pick: (items) => {
      if (items.length === 0) throw new Error("pick() from an empty list");
      return items[Math.floor(next() * items.length)]!;
    },
    weighted: (items) => {
      const total = items.reduce((sum, [, w]) => sum + w, 0);
      let r = next() * total;
      for (const [item, w] of items) {
        r -= w;
        if (r < 0) return item;
      }
      return items[items.length - 1]![0];
    },
    bool: (probability = 0.5) => next() < probability,
    shuffle: (items) => {
      const out = [...items];
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j]!, out[i]!];
      }
      return out;
    },
  };
  return rng;
}

/** Zero-padded record code, e.g. code("HH", 7) === "HH-0007". */
export const code = (prefix: string, n: number, width = 4): string => `${prefix}-${String(n).padStart(width, "0")}`;
