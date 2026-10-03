import { afterEach, describe, expect, it, vi } from "vitest";
import { LEVEL_HEX, LEVELS } from "@rcene/data";
import { levelColorExpression, levelsAtOrAbove, minLevelFilter, OFFLINE_STYLE, SLOT } from "./style.ts";

describe("levelsAtOrAbove", () => {
  it("keeps the given level and everything more severe", () => {
    expect(levelsAtOrAbove("low")).toEqual([...LEVELS]);
    expect(levelsAtOrAbove("high")).toEqual(["high", "veryHigh"]);
    expect(levelsAtOrAbove("veryHigh")).toEqual(["veryHigh"]);
  });
});

describe("expressions", () => {
  it("colors every level from LEVEL_HEX with expression syntax", () => {
    const expr = levelColorExpression() as unknown[];
    expect(expr.slice(0, 2)).toEqual(["match", ["get", "level"]]);
    for (const level of LEVELS) expect(expr[expr.indexOf(level) + 1]).toBe(LEVEL_HEX[level]);
    expect(expr).toHaveLength(2 + LEVELS.length * 2 + 1);
  });

  it("filters by level with an `in` expression, not legacy filter syntax", () => {
    expect(minLevelFilter("moderate")).toEqual(["in", ["get", "level"], ["literal", ["moderate", "high", "veryHigh"]]]);
  });
});

describe("OFFLINE_STYLE", () => {
  it("has no glyphs or sprite, so it never fetches from the network", () => {
    expect(OFFLINE_STYLE).not.toHaveProperty("glyphs");
    expect(OFFLINE_STYLE).not.toHaveProperty("sprite");
    expect(OFFLINE_STYLE.sources).toEqual({});
    expect(OFFLINE_STYLE.layers.some((layer) => layer.type === "symbol")).toBe(false);
  });

  it("starts with the sea and lists the slot anchors bottom to top, hidden", () => {
    const [sea, ...anchors] = OFFLINE_STYLE.layers;
    expect(sea).toMatchObject({ id: "background", type: "background" });
    expect(anchors.map((layer) => layer.id)).toEqual(Object.values(SLOT));
    for (const anchor of anchors) expect(anchor).toMatchObject({ layout: { visibility: "none" } });
  });
});

describe("hasWebGL2", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("returns false instead of throwing when no context can be created", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const { hasWebGL2 } = await import("./webgl.ts");
    expect(hasWebGL2()).toBe(false);
  });

  it("returns true when a webgl2 context exists", async () => {
    const loseContext = vi.fn();
    const fakeGl = { getExtension: () => ({ loseContext }) } as unknown as WebGL2RenderingContext;
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(fakeGl);
    const { hasWebGL2 } = await import("./webgl.ts");
    expect(hasWebGL2()).toBe(true);
    expect(loseContext).toHaveBeenCalled();
  });
});
