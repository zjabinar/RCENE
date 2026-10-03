// @vitest-environment node
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildManifest, listFiles, resolveMount } from "./static.ts";
import { readProject, rceneAliases } from "./vite.ts";

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
  writeFileSync(path.join(fixtures, "model.onnx.part"), "interrupted download");
  return { real, fixtures };
}

describe("rceneStatic mounts", () => {
  it("lists files recursively, skipping .gitkeep, READMEs and .part downloads", () => {
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

describe("readProject", () => {
  it("reads the port and flags from the app's own project.json", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "rcene-project-"));
    writeFileSync(path.join(dir, "project.json"), JSON.stringify({ id: "01", slug: "01-x", title: "X", port: 5101, ai: true }));
    expect(readProject(dir)).toMatchObject({ slug: "01-x", port: 5101, ai: true });
  });

  it("rejects a project.json without a numeric port", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "rcene-project-"));
    writeFileSync(path.join(dir, "project.json"), JSON.stringify({ id: "01", slug: "01-x", title: "X" }));
    expect(() => readProject(dir)).toThrow(/port/);
  });
});

describe("rceneAliases", () => {
  const resolve = (spec: string) => {
    for (const alias of rceneAliases("/app")) {
      const find = alias.find as RegExp;
      if (find.test(spec)) return spec.replace(find, alias.replacement);
    }
    return null;
  };

  it("maps every @rcene specifier into the app's own rcene/ folder", () => {
    expect(resolve("@rcene/ui")).toBe("/app/rcene/ui/index.ts");
    expect(resolve("@rcene/ui/components/card")).toBe("/app/rcene/ui/components/ui/card.tsx");
    expect(resolve("@rcene/ui/components/alert-dialog")).toBe("/app/rcene/ui/components/ui/alert-dialog.tsx");
    expect(resolve("@rcene/ui/motion")).toBe("/app/rcene/ui/motion/index.ts");
    expect(resolve("@rcene/ui/lib/utils")).toBe("/app/rcene/ui/lib/utils.ts");
    expect(resolve("@rcene/ui/globals.css")).toBe("/app/rcene/ui/styles/globals.css");
    expect(resolve("@rcene/data/schemas")).toBe("/app/rcene/data/schemas.ts");
    expect(resolve("@rcene/map")).toBe("/app/rcene/map/index.ts");
    expect(resolve("@/pages/Home.tsx")).toBe("/app/src/pages/Home.tsx");
  });

  it("does not touch unrelated packages", () => {
    expect(resolve("react")).toBeNull();
    expect(resolve("@rcene/unknown")).toBeNull();
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
