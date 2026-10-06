/**
 * Loads maplibre-gl with its web worker wired up for Vite.
 *
 * MapLibre 6 finds its worker with `new URL("./maplibre-gl-worker.mjs", import.meta.url)`.
 * Vite pre-bundles maplibre-gl in dev and inlines it in builds, so that URL
 * 404s and GeoJSON sources never load (the map shows only the sea). The
 * `?worker&url` import makes Vite bundle the worker and hand us its URL.
 */
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";

type MapLibreModule = typeof import("maplibre-gl");

let pending: Promise<MapLibreModule> | undefined;

/**
 * The maplibre-gl module (ESM namespace, there is no default export), loaded
 * lazily once with the worker URL set. BaseMap passes it to react-map-gl as
 * `mapLib`; use it too if you ever construct `new Map(...)` yourself.
 */
export function loadMapLib(): Promise<MapLibreModule> {
  pending ??= import("maplibre-gl").then((maplibre) => {
    if (!maplibre.getWorkerUrl()) maplibre.setWorkerUrl(workerUrl);
    return maplibre;
  });
  return pending;
}
