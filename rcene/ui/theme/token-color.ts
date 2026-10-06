/**
 * A theme token's current value, for places that cannot take a CSS variable:
 * MapLibre paint properties, canvas drawing, a QR or chart library option.
 *
 *   const primary = useTokenColor("--primary");          // "#0f6b66" in habi light
 *   <PointLayer id="sites" data={sites} color={primary} />
 *
 * It re-reads when <html> changes palette, mode or surface. In CSS and Tailwind
 * classes use the token itself (`bg-primary`, `var(--primary)`), never this.
 */
import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void): () => void {
  if (typeof MutationObserver === "undefined" || typeof document === "undefined") return () => {};
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-palette", "data-mode", "data-surface", "class"] });
  return () => observer.disconnect();
}

/** The computed value of `token` on <html> (e.g. "--primary"), or `fallback` where it is not set (tests, SSR). */
export function readTokenColor(token: `--${string}`, fallback = ""): string {
  if (typeof document === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(token).trim() || fallback;
}

/** `readTokenColor` that follows the theme: re-renders when the palette, mode or surface changes. */
export function useTokenColor(token: `--${string}`, fallback = ""): string {
  return useSyncExternalStore(
    subscribe,
    () => readTokenColor(token, fallback),
    () => fallback,
  );
}
