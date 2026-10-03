// @vitest-environment node
/**
 * Unit tests for the smoke script's helpers (the full run is `npm run smoke`).
 * RCENE_SMOKE_NO_MAIN=1 makes the import side-effect free.
 */
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { deflateSync } from "node:zlib";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

let smoke;
let tmp;

beforeAll(async () => {
  process.env.RCENE_SMOKE_NO_MAIN = "1";
  smoke = await import("./smoke.mjs");
  tmp = mkdtempSync(path.join(os.tmpdir(), "rcene-smoke-"));
});

afterAll(() => {
  if (tmp) rmSync(tmp, { recursive: true, force: true });
});

/** A width x height RGB PNG (filter 0) from a pixel function. */
function png(width, height, pixel) {
  const raw = Buffer.alloc(height * (width * 3 + 1));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) raw.set(pixel(x, y), y * (width * 3 + 1) + 1 + x * 3);
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    return Buffer.concat([len, Buffer.from(type, "latin1"), data, Buffer.alloc(4)]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

describe("smoke helpers", () => {
  it("parses routes and flags", () => {
    expect(smoke.parseArgs(["--route", "map", "--route=/sources", "--no-build", "--keep-open"])).toMatchObject({
      routes: ["/map", "/sources"],
      build: false,
      keepOpen: true,
    });
    expect(() => smoke.parseArgs(["--route"])).toThrow(/needs a value/);
    expect(() => smoke.parseArgs(["--bogus"])).toThrow(/Unknown argument/);
  });

  it("names screenshots after routes", () => {
    expect(smoke.routeName("/")).toBe("home");
    expect(smoke.routeName("/sources")).toBe("sources");
    expect(smoke.routeName("/a/b?x=1")).toBe("a-b-x-1");
  });

  it("reads project.json: preview port and smoke routes", () => {
    const project = smoke.readProject();
    expect(project.previewPort).toBe(project.port + 1000);
    expect(project.routes.length).toBeGreaterThan(0);
    writeFileSync(path.join(tmp, "project.json"), JSON.stringify({ slug: "01-x", id: "01", port: 5101 }));
    const other = smoke.readProject(tmp);
    expect(other).toMatchObject({ previewPort: 6101, routes: ["/", "/sources"] });
    expect(smoke.isThisApp("01", other)).toBe(true);
    expect(smoke.isThisApp("01-x", other)).toBe(true);
    expect(smoke.isThisApp("02-y", other)).toBe(false);
  });

  it("finds the local tsc, vite and axe-core in this app's node_modules", () => {
    for (const script of [smoke.binScript("typescript", "tsc"), smoke.binScript("vite"), smoke.axePath()]) {
      expect(existsSync(script), script).toBe(true);
    }
    expect(() => smoke.binScript("not-a-real-package-xyz")).toThrow(/not installed/);
  });

  it("tells local from remote requests", () => {
    expect(smoke.isLocalUrl("http://127.0.0.1:6100/data/x.geojson")).toBe(true);
    expect(smoke.isLocalUrl("data:image/png;base64,AAAA")).toBe(true);
    expect(smoke.isLocalUrl("https://cdn.jsdelivr.net/x.wasm")).toBe(false);
    expect(smoke.isOsmTile("https://a.tile.openstreetmap.org/1/1/1.png")).toBe(true);
  });

  it("detects a blank (single-colour) canvas", () => {
    expect(smoke.isSingleColorPng(png(4, 3, () => [10, 20, 30]))).toBe(true);
    expect(smoke.isSingleColorPng(png(4, 3, (x, y) => (x === 2 && y === 1 ? [0, 0, 0] : [10, 20, 30])))).toBe(false);
  });
});
