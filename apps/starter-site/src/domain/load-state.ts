/**
 * Several layers, one load state. `useLayer` and `useZones` each return a
 * LoadState; a page that needs four layers shows one LoadGate, not four.
 */
import type { LoadState } from "@rcene/data";

type Failed = Extract<LoadState<unknown>, { status: "error" }>;
type Missing = Extract<LoadState<unknown>, { status: "missing" }>;

/** The value of a ready state. */
export type LoadedValue<S> = S extends { status: "ready"; data: infer T } ? T : never;

/**
 * Combines named load states: ready when all are ready (each value under its
 * name); otherwise the first error, then the first missing layer, then
 * loading. A missing layer is reported, never replaced by a guess.
 */
export function allLoaded<M extends Record<string, LoadState<unknown>>>(
  states: M,
): LoadState<{ [K in keyof M]: LoadedValue<M[K]> }> {
  const list = Object.values(states);
  const failed = list.find((s): s is Failed => s.status === "error");
  if (failed) return failed;
  const missing = list.find((s): s is Missing => s.status === "missing");
  if (missing) return missing;
  if (list.some((s) => s.status !== "ready")) return { status: "loading" };
  const data = Object.fromEntries(Object.entries(states).map(([key, s]) => [key, s.data]));
  return { status: "ready", data: data as { [K in keyof M]: LoadedValue<M[K]> } };
}

/** Applies `fn` to a ready value and passes the other states through unchanged. */
export function mapLoaded<T, U>(state: LoadState<T>, fn: (data: T) => U): LoadState<U> {
  return state.status === "ready" ? { status: "ready", data: fn(state.data) } : state;
}
