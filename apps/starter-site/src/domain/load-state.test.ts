import { describe, expect, it } from "vitest";
import { LayerMissingError, type LoadState } from "@rcene/data";
import { allLoaded, mapLoaded } from "./load-state.ts";

const ready = <T>(data: T): LoadState<T> => ({ status: "ready", data });
const loading: LoadState<never> = { status: "loading" };
const missing: LoadState<never> = { status: "missing", error: new LayerMissingError("hazard-flood.geojson") };
const failed: LoadState<never> = { status: "error", error: new Error("offline") };

describe("allLoaded", () => {
  it("is ready with every value under its name when all are ready", () => {
    const state = allLoaded({ a: ready(1), b: ready("two") });
    expect(state).toEqual({ status: "ready", data: { a: 1, b: "two" } });
  });

  it("is loading while any state is loading", () => {
    expect(allLoaded({ a: ready(1), b: loading }).status).toBe("loading");
  });

  it("reports a missing layer before a pending one, and an error before both", () => {
    expect(allLoaded({ a: loading, b: missing })).toBe(missing);
    expect(allLoaded({ a: missing, b: failed, c: loading })).toBe(failed);
  });
});

describe("mapLoaded", () => {
  it("maps a ready value and passes other states through", () => {
    expect(mapLoaded(ready(2), (n) => n * 10)).toEqual({ status: "ready", data: 20 });
    expect(mapLoaded(missing, () => 1)).toBe(missing);
    expect(mapLoaded(loading, () => 1)).toBe(loading);
  });
});
