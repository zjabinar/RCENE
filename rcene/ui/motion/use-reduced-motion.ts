import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function getMediaQuery(): MediaQueryList | null {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return null;
  return window.matchMedia(QUERY);
}

function subscribe(onChange: () => void): () => void {
  const mq = getMediaQuery();
  if (!mq) return () => {};
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/** Non-hook check, for code that runs outside components. */
export function prefersReducedMotion(): boolean {
  return getMediaQuery()?.matches ?? false;
}

/**
 * True when the user asked the OS for reduced motion. Updates live when the
 * setting changes. False where matchMedia is unavailable (SSR, old jsdom).
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, prefersReducedMotion, () => false);
}
