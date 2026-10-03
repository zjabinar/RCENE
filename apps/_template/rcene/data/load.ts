import { useEffect, useState } from "react";
import { hazardLayer, layerUrl, type LayerName, type LayerTypes } from "./layers.ts";
import { HAZARDS, type DataManifest, type Hazard, type ZonesByHazard } from "./types.ts";

/** Thrown when a layer file is not present in files/ or fixtures/. */
export class LayerMissingError extends Error {
  readonly layer: string;
  constructor(layer: string) {
    super(`Data layer "${layer}" is not available`);
    this.layer = layer;
  }
}

const cache = new Map<string, Promise<unknown>>();

async function fetchJson<T>(url: string, layer: string): Promise<T> {
  const res = await fetch(url);
  // `vite preview` answers unknown paths with index.html (HTTP 200), so HTML means "missing" too.
  if (res.status === 404 || res.headers.get("content-type")?.includes("text/html")) throw new LayerMissingError(layer);
  if (!res.ok) throw new Error(`Failed to load ${url}: HTTP ${res.status}`);
  return (await res.json()) as T;
}

/** Fetches a layer once per page load; later calls share the same promise. */
export function fetchLayer<N extends LayerName>(name: N): Promise<LayerTypes[N]> {
  const url = layerUrl(name);
  let pending = cache.get(url);
  if (!pending) {
    pending = fetchJson<LayerTypes[N]>(url, name);
    pending.catch(() => cache.delete(url));
    cache.set(url, pending);
  }
  return pending as Promise<LayerTypes[N]>;
}

export function fetchManifest(): Promise<DataManifest> {
  const url = "/data/manifest.json";
  let pending = cache.get(url) as Promise<DataManifest> | undefined;
  if (!pending) {
    // A failure is not cached, so a later call can still find out about fixtures.
    pending = fetchJson<DataManifest>(url, "manifest").catch(() => {
      cache.delete(url);
      return { files: {} };
    });
    cache.set(url, pending);
  }
  return pending;
}

export type LoadState<T> =
  | { status: "loading"; data?: undefined; error?: undefined }
  | { status: "ready"; data: T; error?: undefined }
  | { status: "missing"; data?: undefined; error: LayerMissingError }
  | { status: "error"; data?: undefined; error: Error };

function usePromise<T>(key: string, load: () => Promise<T>): LoadState<T> {
  // The state remembers which request it belongs to, so after `key` changes the
  // previous layer's data is never returned under the new name (not even for one render).
  const [state, setState] = useState<{ key: string; value: LoadState<T> }>({ key, value: { status: "loading" } });
  useEffect(() => {
    let alive = true;
    load().then(
      (data) => alive && setState({ key, value: { status: "ready", data } }),
      (error: unknown) => {
        if (!alive) return;
        if (error instanceof LayerMissingError) setState({ key, value: { status: "missing", error } });
        else setState({ key, value: { status: "error", error: error instanceof Error ? error : new Error(String(error)) } });
      },
    );
    return () => {
      alive = false;
    };
    // `key` identifies the request; `load` is a new closure every render.
  }, [key]);
  return state.key === key ? state.value : { status: "loading" };
}

/** Loads one layer. Render <LoadingState/>, <DataMissing/> or the data based on `status`. */
export function useLayer<N extends LayerName>(name: N): LoadState<LayerTypes[N]> {
  return usePromise(name, () => fetchLayer(name));
}

/**
 * Loads the hazard layers for the given hazards. Hazards whose file is missing
 * are left out of the result (and listed in `missing`), so a lookup never
 * invents an answer for a layer that isn't there.
 */
export function useZones(hazards: readonly Hazard[] = HAZARDS): LoadState<{
  zones: ZonesByHazard;
  missing: Hazard[];
}> {
  return usePromise(hazards.join(","), async () => {
    const zones: ZonesByHazard = {};
    const missing: Hazard[] = [];
    await Promise.all(
      hazards.map(async (hazard) => {
        try {
          zones[hazard] = await fetchLayer(hazardLayer(hazard));
        } catch (error) {
          if (error instanceof LayerMissingError) missing.push(hazard);
          else throw error;
        }
      }),
    );
    return { zones, missing };
  });
}

/** Which files are real and which are fixtures. Drives the "Sample data" badge. */
export function useDataManifest(): DataManifest | null {
  const [manifest, setManifest] = useState<DataManifest | null>(null);
  useEffect(() => {
    let alive = true;
    void fetchManifest().then((m) => alive && setManifest(m));
    return () => {
      alive = false;
    };
  }, []);
  return manifest;
}

/** True when any of the given layers is served from fixtures. False until the manifest has loaded. */
export function usesFixtures(manifest: DataManifest | null, layers: readonly LayerName[]): boolean {
  if (!manifest) return false;
  return layers.some((name) => {
    const file = layerUrl(name).replace(/^\/data\//, "");
    return manifest.files[file] === "fixture";
  });
}
