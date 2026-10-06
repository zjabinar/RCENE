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

export interface OverrideEntry {
  id: string;
  /** Nesting depth in the React tree (AppShell 0, a page inside it 1, …). */
  depth: number;
  /** Registration order, kept when the value changes; breaks ties between equal depths. */
  seq: number;
  value: ThemeOverride;
}

interface OverrideState {
  stack: OverrideEntry[];
  push: (id: string, depth: number, value: ThemeOverride) => void;
  remove: (id: string) => void;
}

let nextSeq = 0;

/**
 * Overrides from the current view (AppShell palette/mode/surface props,
 * useThemeOverride): not persisted, removed on unmount. They are merged field
 * by field, the deeper one winning (see mergeOverrides), so the result does not
 * depend on which effect happened to run first.
 */
export const useOverrideStore = create<OverrideState>()((set) => ({
  stack: [],
  push: (id, depth, value) =>
    set((s) => {
      const existing = s.stack.find((o) => o.id === id);
      const entry = { id, depth, seq: existing?.seq ?? nextSeq++, value };
      return { stack: existing ? s.stack.map((o) => (o.id === id ? entry : o)) : [...s.stack, entry] };
    }),
  remove: (id) => set((s) => ({ stack: s.stack.filter((o) => o.id !== id) })),
}));

/** One override from many: shallower first, then deeper ones replace the fields they set. */
export function mergeOverrides(stack: readonly OverrideEntry[]): ThemeOverride | null {
  if (stack.length === 0) return null;
  const merged: ThemeOverride = {};
  for (const { value } of [...stack].sort((a, b) => a.depth - b.depth || a.seq - b.seq)) {
    if (value.palette) merged.palette = value.palette;
    if (value.mode) merged.mode = value.mode;
    if (value.surface) merged.surface = value.surface;
  }
  return merged;
}
