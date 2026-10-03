import { afterEach, describe, expect, it, vi } from "vitest";
import { createSyncedStore } from "./index.ts";

interface Counter {
  count: number;
  bump: () => void;
}

const counter = (name: string) =>
  createSyncedStore<Counter>(name, (set) => ({
    count: 0,
    bump: () => set((s) => ({ count: s.count + 1 })),
  }));

/** What another window does: write the key, then this window receives a storage event. */
function writeFromAnotherWindow(key: string, state: unknown, version = 0) {
  const newValue = JSON.stringify({ state, version });
  localStorage.setItem(key, newValue);
  window.dispatchEvent(new StorageEvent("storage", { key, newValue, storageArea: localStorage }));
}

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("createSyncedStore", () => {
  it("persists under rcene:<name>", () => {
    const useStore = counter("test:persist");
    useStore.getState().bump();
    expect(JSON.parse(localStorage.getItem("rcene:test:persist")!).state.count).toBe(1);
  });

  it("picks up changes made in another window", async () => {
    const useStore = counter("test:sync");
    writeFromAnotherWindow("rcene:test:sync", { count: 41 });
    await vi.waitFor(() => expect(useStore.getState().count).toBe(41));
    useStore.getState().bump();
    expect(useStore.getState().count).toBe(42);
  });

  it("does not write back when rehydrating (no ping-pong between windows)", async () => {
    const useStore = counter("test:pingpong");
    // Seed storage as the other window would have, then count only the writes that follow.
    localStorage.setItem("rcene:test:pingpong", JSON.stringify({ state: { count: 5 }, version: 0 }));
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    window.dispatchEvent(new StorageEvent("storage", { key: "rcene:test:pingpong", storageArea: localStorage }));
    await vi.waitFor(() => expect(useStore.getState().count).toBe(5));
    expect(setItem.mock.calls.filter(([key]) => key === "rcene:test:pingpong")).toHaveLength(0);
  });

  it("ignores storage events for other keys", async () => {
    const useStore = counter("test:other");
    writeFromAnotherWindow("rcene:something-else", { count: 99 });
    await new Promise((r) => setTimeout(r, 10));
    expect(useStore.getState().count).toBe(0);
  });

  it("only persists the partialized fields", () => {
    const useStore = createSyncedStore<{ keep: number; drop: number; setBoth: (n: number) => void }>(
      "test:partial",
      (set) => ({ keep: 0, drop: 0, setBoth: (n) => set({ keep: n, drop: n }) }),
      { partialize: (s) => ({ keep: s.keep }) },
    );
    useStore.getState().setBoth(3);
    const stored = JSON.parse(localStorage.getItem("rcene:test:partial")!).state;
    expect(stored).toEqual({ keep: 3 });
  });
});
