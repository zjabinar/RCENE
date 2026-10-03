/**
 * Zustand stores that persist to localStorage and stay in sync across every
 * open window of the same app (same origin), with no server.
 *
 * How the sync works: when window A writes, the browser fires a `storage`
 * event in every OTHER same-origin window; they call `persist.rehydrate()`.
 * Rehydrating does not write back, so there is no ping-pong.
 *
 * Caveat: each write stores the whole persisted state (last write wins). If
 * two windows change the same field at the same moment, one change is lost.
 * Keep one writer per entity (e.g. only /center/:id changes that center).
 *
 *   export const useApp = createSyncedStore("01-ligtas:app", (set) => ({
 *     scenarioId: null as string | null,
 *     raise: (id: string) => set({ scenarioId: id }),
 *   }));
 */
import { useEffect, useState } from "react";
import { create, type StateCreator } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const STORAGE_PREFIX = "rcene:";
const RESET_KEY = `${STORAGE_PREFIX}__reset`;

export interface SyncedStoreOptions<T> {
  /** Bump when the persisted shape changes; pair with `migrate`. */
  version?: number;
  /** Persist only part of the state (e.g. leave out derived or UI-only fields). */
  partialize?: (state: T) => Partial<T>;
  migrate?: (persisted: unknown, version: number) => T | Promise<T>;
}

let resetListenerInstalled = false;

function installResetListener() {
  if (resetListenerInstalled || typeof window === "undefined") return;
  resetListenerInstalled = true;
  window.addEventListener("storage", (event) => {
    if (event.key === RESET_KEY) window.location.reload();
  });
}

/**
 * Creates a persisted store under the localStorage key `rcene:<name>`.
 * Name it `<app-slug>:<store>` (e.g. "03-likas:centers") so platforms that
 * combine several apps on one origin never collide.
 */
export function createSyncedStore<T>(
  name: string,
  initializer: StateCreator<T, [["zustand/persist", unknown]], []>,
  options: SyncedStoreOptions<T> = {},
) {
  const key = `${STORAGE_PREFIX}${name}`;
  const useStore = create<T>()(
    persist(initializer, {
      name: key,
      storage: createJSONStorage(() => localStorage),
      version: options.version ?? 0,
      // Spread only the options that are set: an explicit `undefined` would replace zustand's defaults.
      ...(options.partialize && { partialize: options.partialize as (state: T) => T }),
      ...(options.migrate && { migrate: options.migrate }),
    }),
  );

  if (typeof window !== "undefined") {
    installResetListener();
    window.addEventListener("storage", (event) => {
      if (event.key === key && event.storageArea === window.localStorage) void useStore.persist.rehydrate();
    });
  }
  return useStore;
}

/** True once the store has loaded its persisted state (immediately, with localStorage). */
export function useHydrated(store: {
  persist: { hasHydrated: () => boolean; onFinishHydration: (fn: () => void) => () => void };
}): boolean {
  const [hydrated, setHydrated] = useState(() => store.persist.hasHydrated());
  useEffect(() => {
    const unsubscribe = store.persist.onFinishHydration(() => setHydrated(true));
    setHydrated(store.persist.hasHydrated());
    return unsubscribe;
  }, [store]);
  return hydrated;
}

/**
 * Clears every persisted RCENE store and reloads all open windows of this app.
 * Wire it to a "Reset demo" button for rehearsals.
 */
export function resetDemo(options: { keep?: string[] } = {}): void {
  const keep = new Set((options.keep ?? []).map((k) => `${STORAGE_PREFIX}${k}`));
  const doomed: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX) && !keep.has(key)) doomed.push(key);
  }
  doomed.forEach((key) => localStorage.removeItem(key));
  localStorage.setItem(RESET_KEY, String(Date.now()));
  window.location.reload();
}
