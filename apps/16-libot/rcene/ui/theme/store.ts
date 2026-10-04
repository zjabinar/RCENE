/**
 * The user's theme choice, persisted under "rcene:theme" and synced across this
 * app's windows (pick dark in one role window and the others follow).
 * null = use the app's default (project.json "theme", read from <html>).
 * "Reset demo" keeps it, like the language.
 */
import { create } from "zustand";
import { createSyncedStore } from "@rcene/store";

import type { ModeSetting, Palette } from "./palettes.ts";

export interface ThemeChoice {
  palette: Palette | null;
  mode: ModeSetting | null;
}

interface ThemeState extends ThemeChoice {
  setPalette: (palette: Palette | null) => void;
  setMode: (mode: ModeSetting | null) => void;
}

export const useThemeStore = createSyncedStore<ThemeState>(
  "theme",
  (set) => ({
    palette: null,
    mode: null,
    setPalette: (palette) => set({ palette }),
    setMode: (mode) => set({ mode }),
  }),
  { version: 1 },
);

export interface ThemeOverride {
  palette?: Palette;
  mode?: ModeSetting;
  surface?: "showcase";
}

interface OverrideState {
  stack: { id: string; value: ThemeOverride }[];
  push: (id: string, value: ThemeOverride) => void;
  remove: (id: string) => void;
}

/**
 * Overrides from the current view (AppShell palette/surface props,
 * useThemeOverride): not persisted, last one mounted wins, removed on unmount.
 */
export const useOverrideStore = create<OverrideState>()((set) => ({
  stack: [],
  push: (id, value) => set((s) => ({ stack: [...s.stack.filter((o) => o.id !== id), { id, value }] })),
  remove: (id) => set((s) => ({ stack: s.stack.filter((o) => o.id !== id) })),
}));
