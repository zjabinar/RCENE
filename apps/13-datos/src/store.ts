/**
 * App state, persisted and synced across this app's open windows.
 * Key: rcene:13-datos:app. Keep static data (layers) out of here — only state.
 */
import { createSyncedStore } from "@rcene/store";
import type { LngLat } from "@rcene/geo";

interface AppState {
  selected: LngLat | null;
  select: (point: LngLat | null) => void;
}

export const useAppStore = createSyncedStore<AppState>("13-datos:app", (set) => ({
  selected: null,
  select: (selected) => set({ selected }),
}));
