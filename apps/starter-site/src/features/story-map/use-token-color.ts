/**
 * A theme token's current value (e.g. "--primary" → "#0f6b66"), for places
 * that cannot take a CSS variable: MapLibre paint properties. It follows the
 * palette and light/dark mode, because it re-reads when <html> changes.
 */
import { useSyncExternalStore } from "react";
import { POINT_COLOR } from "@rcene/map";

function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-palette", "data-mode", "class"] });
  return () => observer.disconnect();
}

/** The computed value of `token` on <html>, or `fallback` when it is not set (tests, SSR). */
export function useTokenColor(token: `--${string}`, fallback: string = POINT_COLOR): string {
  return useSyncExternalStore(
    subscribe,
    () => getComputedStyle(document.documentElement).getPropertyValue(token).trim() || fallback,
    () => fallback,
  );
}
