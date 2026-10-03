// @vitest-environment node
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildManifest, listFiles, resolveMount } from "./static.ts";
import { projectFor } from "./vite.ts";

function tempDirs() {
  const root = mkdtempSync(path.join(tmpdir(), "rcene-static-"));
  const real = path.join(root, "files");
  const fixtures = path.join(root, "fixtures");
  mkdirSync(path.join(real, "derived"), { recursive: true });
  mkdirSync(path.join(fixtures, "derived"), { recursive: true });
  writeFileSync(path.join(real, "boundary.geojson"), "real");
  writeFileSync(path.join(real, ".gitkeep"), "");
  writeFileSync(path.join(fixtures, "boundary.geojson"), "fixture");
  writeFileSync(path.join(fixtures, "barangays.geojson"), "fixture");
  writeFileSync(path.join(fixtures, "derived", "barangay-hazard.json"), "fixture");
  writeFileSync(path.join(fixtures, "README.md"), "ignored");
  return { real, fixtures };
}

describe("rceneStatic mounts", () => {
  it("lists files recursively, skipping .gitkeep and READMEs", () => {
    const { fixtures } = tempDirs();
    expect(listFiles(fixtures)).toEqual(["barangays.geojson", "boundary.geojson", "derived/barangay-hazard.json"]);
  });

  it("prefers real files over fixtures, file by file", () => {
    const { real, fixtures } = tempDirs();
    const files = resolveMount({ url: "/data/", dirs: [real, fixtures] });
    expect(files.get("boundary.geojson")?.abs).toBe(path.join(real, "boundary.geojson"));
    expect(files.get("barangays.geojson")?.abs).toBe(path.join(fixtures, "barangays.geojson"));
  });

  it("reports the origin of every file in the manifest", () => {
    const { real, fixtures } = tempDirs();
    expect(buildManifest({ url: "/data/", dirs: [real, fixtures], manifest: true })).toEqual({
      files: {
        "boundary.geojson": "real",
        "barangays.geojson": "fixture",
        "derived/barangay-hazard.json": "fixture",
      },
    });
  });

  it("skips directories that do not exist", () => {
    const { fixtures } = tempDirs();
    expect(resolveMount({ url: "/data/", dirs: ["/nope/missing", fixtures] }).size).toBe(3);
  });
});

describe("projectFor", () => {
  const repo = path.resolve(import.meta.dirname, "..", "..", "..");

  it("reads the port from projects.json by folder name", () => {
    expect(projectFor(path.join(repo, "apps/01-ligtas"))).toEqual({ slug: "01-ligtas", port: 5101, ai: false });
    expect(projectFor(path.join(repo, "apps/20-sumat")).ai).toBe(true);
  });

  it("gives the template port 5100 and rejects unknown apps", () => {
    expect(projectFor(path.join(repo, "apps/_template")).port).toBe(5100);
    expect(() => projectFor(path.join(repo, "apps/99-nope"))).toThrow(/No port/);
  });
});

describe("rceneStatic dev middleware", () => {
  it("refuses paths that would escape the mount on Windows, and malformed escapes", async () => {
    const { real, fixtures } = tempDirs();
    const { rceneStatic } = await import("./static.ts");
    const plugin = rceneStatic([{ url: "/data/", dirs: [real, fixtures], manifest: true }]);
    let handler: ((req: { url: string }, res: unknown, next: () => void) => void) | undefined;
    const server = { middlewares: { use: (fn: typeof handler) => (handler = fn) } };
    (plugin.configureServer as (s: unknown) => void)(server);
    for (const url of ["/data/a%5C..%5C..%5Csecret.txt", "/data/C:%5Cwindows", "/data/%E0%A4%A", "/data/../x"]) {
      let passed = false;
      handler!({ url }, {}, () => (passed = true));
      expect(passed, url).toBe(true);
    }
  });
});
