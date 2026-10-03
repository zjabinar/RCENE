// @vitest-environment node
/// <reference types="node" />
/**
 * The hazard colors exist twice: LEVEL_HEX / STATUS_HEX in @rcene/data (map
 * paint) and the --level-* / --status-* CSS tokens here (UI). They must match,
 * and every foreground must be readable on its fill (WCAG AA, 4.5:1).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LEVEL_HEX, LEVELS, STATUS_HEX } from "@rcene/data";

const css = readFileSync(new URL("./styles/globals.css", import.meta.url), "utf8");
const rootBlock = /:root\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";

function token(name: string): string | undefined {
  const match = new RegExp(`--${name}:\\s*([^;]+);`).exec(rootBlock);
  return match?.[1]?.trim().toLowerCase();
}

function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  const [r, g, b] = [16, 8, 0].map((shift) => {
    const c = ((n >> shift) & 255) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

const STATUS_TOKENS = { notInZone: "status-not-in-zone", outsideCoverage: "status-outside" } as const;

describe("hazard color tokens", () => {
  it.each(LEVELS)("--level-%s equals LEVEL_HEX", (level) => {
    expect(token(`level-${level}`)).toBe(LEVEL_HEX[level].toLowerCase());
  });

  it.each(Object.entries(STATUS_TOKENS))("--%s token equals STATUS_HEX", (status, name) => {
    expect(token(name)).toBe(STATUS_HEX[status as keyof typeof STATUS_HEX].toLowerCase());
  });

  it("is never redefined for dark mode (the map paint does not change)", () => {
    const dark = /\.dark\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(dark).not.toMatch(/--(level|status)-/);
  });

  const pairs = [...LEVELS.map((l) => `level-${l}`), ...Object.values(STATUS_TOKENS)];
  it.each(pairs)("--%s-foreground meets WCAG AA on its fill", (name) => {
    const fill = token(name);
    const fg = token(`${name}-foreground`);
    expect(fill).toMatch(/^#[0-9a-f]{6}$/);
    expect(fg).toMatch(/^#[0-9a-f]{6}$/);
    expect(contrast(fill!, fg!)).toBeGreaterThanOrEqual(4.5);
  });

  it("maps every hazard token to a Tailwind color", () => {
    for (const name of pairs) {
      expect(css).toContain(`--color-${name}: var(--${name});`);
      expect(css).toContain(`--color-${name}-foreground: var(--${name}-foreground);`);
    }
  });
});
