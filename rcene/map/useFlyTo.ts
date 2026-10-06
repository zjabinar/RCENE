import { useCallback } from "react";
import { useMap } from "react-map-gl/maplibre";
import type { LngLat } from "@rcene/geo";

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

/**
 * Returns `flyTo(lngLat, zoom?)` for the current map. Works inside <BaseMap>,
 * or anywhere under a <MapProvider> that also wraps the BaseMap (e.g. a side
 * list). Jumps instead of flying when the user prefers reduced motion. Zoom
 * defaults to the current zoom, but at least 14.
 */
export function useFlyTo(): (lngLat: LngLat, zoom?: number) => void {
  const maps = useMap();
  const map = maps.current ?? maps.default;
  return useCallback(
    (lngLat: LngLat, zoom?: number) => {
      if (!map) return;
      const camera = { center: lngLat, zoom: zoom ?? Math.max(map.getZoom(), 14) };
      if (prefersReducedMotion()) map.jumpTo(camera);
      else map.flyTo({ ...camera, duration: 1200 });
    },
    [map],
  );
}
