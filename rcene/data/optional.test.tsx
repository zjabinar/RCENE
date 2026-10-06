import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { zonesSchema } from "./schemas.ts";
import { useOptionalLayer } from "./optional.ts";

const zones = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [[[124.88, 11.77], [124.89, 11.77], [124.89, 11.78], [124.88, 11.77]]] },
      properties: { hazard: "flood", level: "high" },
    },
  ],
};

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });

/** A tiny /data/ server. landcover.geojson is not shipped, so the manifest does not list it. */
const routes: Record<string, () => Response> = {
  "/data/manifest.json": () =>
    json({
      files: {
        "present.json": "real",
        "derived/zones.geojson": "fixture",
        "bad.json": "real",
        "broken.json": "real",
        "gone.json": "real",
      },
    }),
  "/data/present.json": () => json({ hello: "world" }),
  "/data/derived/zones.geojson": () => json(zones),
  "/data/bad.json": () => json({ type: "Nope" }),
  "/data/broken.json": () => new Response("{not json", { status: 200, headers: { "content-type": "application/json" } }),
};

const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
  const url = String(input);
  return routes[url]?.() ?? new Response("", { status: 404 });
});

const requested = () => fetchMock.mock.calls.map(([input]) => String(input));

beforeEach(() => {
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** A fresh module graph per test, so the per-page-load cache (manifest included) starts empty. */
async function freshLoader() {
  vi.resetModules();
  return (await import("./optional.ts")).loadOptionalLayer;
}

describe("loadOptionalLayer", () => {
  it("reports a file the manifest does not list as absent, without requesting it", async () => {
    const load = await freshLoader();
    await expect(load("landcover.geojson")).resolves.toEqual({ status: "absent" });
    expect(requested()).toEqual(["/data/manifest.json"]);
  });

  it("is absent when there is no manifest at all", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 404 })));
    const load = await freshLoader();
    await expect(load("present.json")).resolves.toEqual({ status: "absent" });
  });

  it("fetches a listed file (with or without a /data/ prefix)", async () => {
    const load = await freshLoader();
    await expect(load("present.json")).resolves.toEqual({ status: "ready", data: { hello: "world" } });
    await expect(load("/data/present.json")).resolves.toEqual({ status: "ready", data: { hello: "world" } });
    // The manifest and the file are each fetched once per page load.
    expect(requested()).toEqual(["/data/manifest.json", "/data/present.json"]);
  });

  it("validates with a schema and explains the first problem", async () => {
    const load = await freshLoader();
    const result = await load("bad.json", zonesSchema);
    expect(result.status).toBe("invalid");
    expect(result.status === "invalid" && result.error).toMatch(/^type: /);
  });

  it("reports unreadable JSON as invalid and a listed-but-missing file as absent", async () => {
    const load = await freshLoader();
    expect((await load("broken.json")).status).toBe("invalid");
    await expect(load("gone.json")).resolves.toEqual({ status: "absent" });
  });
});

describe("useOptionalLayer", () => {
  it("goes loading → ready with typed, validated data", async () => {
    const { result } = renderHook(() => useOptionalLayer("derived/zones.geojson", zonesSchema));
    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("ready"));
    const state = result.current;
    // Typed from the schema: no cast needed.
    expect(state.status === "ready" && state.data.features[0]!.properties.level).toBe("high");
  });

  it("goes loading → absent for a layer that was never shipped, with no request for it", async () => {
    const { result } = renderHook(() => useOptionalLayer("landcover.geojson"));
    await waitFor(() => expect(result.current.status).toBe("absent"));
    expect(requested()).not.toContain("/data/landcover.geojson");
  });

  it("returns loading again (never the old data) when the file changes", async () => {
    const { result, rerender } = renderHook(({ file }) => useOptionalLayer<unknown>(file), {
      initialProps: { file: "present.json" },
    });
    await waitFor(() => expect(result.current.status).toBe("ready"));
    rerender({ file: "landcover.geojson" });
    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("absent"));
  });
});
