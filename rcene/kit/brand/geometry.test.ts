import { describe, expect, it } from "vitest";
import { markParts, markSvg, patternSvg, patternTile, TOKEN_COLORS, WEAVE_NAMES } from "./geometry.ts";

const HEX = { weave1: "#111111", weave2: "#222222", weave3: "#333333", tile: "#444444", edge: "#555555" };

describe("brand geometry", () => {
  it("weaves 4 x 4 strips (full) and 3 x 3 (small), over-under on a checker", () => {
    const full = markParts("full");
    const small = markParts("small");
    // A strip runs the whole side (36 or 42 units); crossings and shading are short.
    const long = (s: (typeof full.weave)[number]) => Math.max(Number(s.attrs.width), Number(s.attrs.height)) > 30;
    const strips = (p: typeof full, slot: string) => p.weave.filter((s) => s.tag === "rect" && s.fill === slot && long(s)).length;
    expect(strips(full, "weave1")).toBe(4);
    expect(strips(full, "weave2")).toBe(4);
    expect(strips(small, "weave1")).toBe(3);
    expect(full.waves.length).toBe(1);
    expect(small.waves.length).toBe(0);
  });

  it("puts the pin inside the tile", () => {
    for (const detail of ["full", "small"] as const) {
      const [x, y, w, h] = markParts(detail).pinBox;
      expect(x).toBeGreaterThan(0);
      expect(y).toBeGreaterThan(0);
      expect(x + w).toBeLessThan(64);
      expect(y + h).toBeLessThan(64);
    }
  });

  it("serialises the mark with the given colours only", () => {
    const svg = markSvg(HEX, { id: "t" });
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">')).toBe(true);
    expect(svg).toContain('clip-path="url(#t)"');
    expect(svg).toContain('clip-rule="evenodd"');
    expect(svg).not.toContain("var(--");
    const colours = new Set(svg.match(/#[0-9a-f]{6}/g));
    expect([...colours].every((c) => Object.values(HEX).includes(c))).toBe(true);
    const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
    expect(doc.querySelector("parsererror")).toBeNull();
  });

  it("draws the pin alone in a tight box", () => {
    const svg = markSvg(TOKEN_COLORS, { tile: false });
    expect(svg).toContain(`viewBox="${markParts("full").pinBox.join(" ")}"`);
    expect(svg).not.toContain("<rect x=\"0.75\"");
  });

  it.each(WEAVE_NAMES)("has a %s pattern tile", (name) => {
    const tile = patternTile(name);
    expect(tile.width).toBeGreaterThan(0);
    expect(tile.shapes.length).toBeGreaterThan(3);
    expect(patternSvg(name, HEX, "p")).toMatch(/^<pattern id="p" /);
  });
});
