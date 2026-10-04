// @vitest-environment node
/// <reference types="node" />
/**
 * Every palette x mode in styles/themes.css (plus the showcase surface) must:
 * - leave the hazard tokens alone (they are the same in every theme);
 * - keep text readable: 4.5:1 for text pairs (7:1 in the malinaw board palette);
 * - keep controls and chart marks visible: 3:1 for ring, input borders, chart-*;
 * - keep primary, accent, brand, ring and chart-* out of the yellow-to-red hazard
 *   hue band, so no UI colour can be mistaken for a hazard level.
 * The theme menu's swatches must match the CSS.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PALETTE_SWATCHES, PALETTES } from "./theme/palettes.ts";

const css = readFileSync(new URL("./styles/themes.css", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

interface Block {
  selector: string;
  vars: Record<string, string>;
}

const blocks: Block[] = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)].map((m) => ({
  selector: m[1]!.trim().replace(/\s+/g, " "),
  vars: Object.fromEntries([...m[2]!.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((v) => [v[1]!, v[2]!.trim()])),
}));

function block(palette: string, mode: "light" | "dark"): Block {
  const want = mode === "light" ? `[data-palette="${palette}"]` : `[data-palette="${palette}"][data-mode="dark"]`;
  const found = blocks.find((b) => b.selector.split(",").map((s) => s.trim()).includes(want));
  if (!found) throw new Error(`no block for ${palette}/${mode}`);
  return found;
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

/** HSL hue (degrees), saturation and lightness of a hex colour. */
function hsl(hex: string): { h: number; s: number; l: number } {
  const n = Number.parseInt(hex.slice(1), 16);
  const [r, g, b] = [16, 8, 0].map((shift) => ((n >> shift) & 255) / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return { h, s, l };
}

const TEXT: [string, string][] = [
  ["foreground", "background"],
  ["foreground", "card"],
  ["card-foreground", "card"],
  ["popover-foreground", "popover"],
  ["primary-foreground", "primary"],
  ["secondary-foreground", "secondary"],
  ["muted-foreground", "muted"],
  ["muted-foreground", "background"],
  ["muted-foreground", "card"],
  ["accent-foreground", "accent"],
  ["destructive-foreground", "destructive"],
  ["warning-foreground", "warning"],
  ["brand-foreground", "brand"],
  ["highlight-foreground", "highlight"],
];
const UI: [string, string][] = [
  ["ring", "background"],
  ["input", "background"],
  ["input", "card"],
  ["primary", "background"],
  ...[1, 2, 3, 4, 5].flatMap((i): [string, string][] => [
    [`chart-${i}`, "background"],
    [`chart-${i}`, "card"],
  ]),
];
const HUE_CHECKED = ["primary", "accent", "brand", "ring", "chart-1", "chart-2", "chart-3", "chart-4", "chart-5"];
const REQUIRED = [...new Set([...TEXT.flat(), ...UI.flat(), "border", "highlight", "glow", "display-family"])];

const cases = PALETTES.flatMap((palette) => (["light", "dark"] as const).map((mode) => [palette, mode] as const));

describe.each(cases)("theme %s / %s", (palette, mode) => {
  const { vars } = block(palette, mode);
  const minText = palette === "malinaw" ? 7 : 4.5;

  it("defines every token", () => {
    for (const name of REQUIRED) expect(vars[name], name).toBeTruthy();
    for (let i = 1; i <= 5; i++) expect(vars[`seq-${i}`], `seq-${i}`).toMatch(/^#[0-9a-f]{6}$/i);
    for (let i = 1; i <= 3; i++) expect(vars[`weave-${i}`], `weave-${i}`).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("never redefines a hazard token", () => {
    expect(Object.keys(vars).filter((k) => /^(level|status)-/.test(k))).toEqual([]);
  });

  it.each(TEXT)(`%s on %s reaches ${minText}:1`, (fg, bg) => {
    expect(contrast(vars[fg]!, vars[bg]!)).toBeGreaterThanOrEqual(minText);
  });

  it.each(UI)("%s on %s reaches 3:1", (fg, bg) => {
    expect(contrast(vars[fg]!, vars[bg]!)).toBeGreaterThanOrEqual(3);
  });

  it.each(HUE_CHECKED)("%s stays out of the yellow-to-red hazard band", (name) => {
    const { h, s, l } = hsl(vars[name]!);
    const saturated = s > 0.35 && l > 0.12 && l < 0.92;
    expect(saturated && (h < 60 || h > 345), `${name} ${vars[name]} hue ${h.toFixed(0)}`).toBe(false);
  });

  it("matches the theme menu swatches", () => {
    const [background, primary, brand] = PALETTE_SWATCHES[palette][mode];
    expect([vars.background, vars.primary, vars.brand]).toEqual([background, primary, brand]);
  });
});

describe("theme selectors", () => {
  it("makes habi light the default (:root) and showcase the gabi dark look", () => {
    expect(blocks[0]!.selector).toBe(':root, [data-palette="habi"]');
    const showcase = blocks.find((b) => b.selector.includes('[data-surface="showcase"]'));
    expect(showcase?.selector).toContain('[data-palette="gabi"][data-mode="dark"]');
  });

  it("sets color-scheme in every block", () => {
    expect(css.match(/color-scheme:\s*(light|dark);/g)).toHaveLength(blocks.length);
  });
});
