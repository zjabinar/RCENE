/**
 * Runtime theme: what is chosen, what is applied, and keeping <html> in step.
 *
 *   useThemeSync()          once, in AppShell: applies the effective theme to <html>
 *   useTheme()              the choice and setters (ThemeMenu, a settings page)
 *   useThemeOverride(v)     a view forces a palette/mode/showcase while mounted (not persisted)
 *
 * Effective theme = the view's override, else the user's choice (store), else
 * the app's defaults (project.json "theme", recorded on <html> by the boot
 * script), else habi + the device setting. A showcase surface means gabi dark.
 */
import { createContext, createElement, useContext, useId, useLayoutEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";

import { resolveDefaults } from "./boot.ts";
import type { Mode, ModeSetting, Palette, ThemeDefaults } from "./palettes.ts";
import { mergeOverrides, useOverrideStore, useThemeStore, type ThemeChoice, type ThemeOverride } from "./store.ts";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function subscribeSystem(onChange: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mql = window.matchMedia(DARK_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function systemIsDark(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia && window.matchMedia(DARK_QUERY).matches;
}

/** True when the device prefers dark; re-renders when that changes. */
export function useSystemDark(): boolean {
  return useSyncExternalStore(subscribeSystem, systemIsDark, () => false);
}

/** The app's defaults as recorded on <html> by the boot script (habi / system when absent). */
export function readThemeDefaults(root: HTMLElement | null = typeof document === "undefined" ? null : document.documentElement): Required<ThemeDefaults> {
  const palette = root?.getAttribute("data-default-palette") ?? undefined;
  const mode = root?.getAttribute("data-default-mode") ?? undefined;
  return resolveDefaults({ palette: palette as Palette | undefined, mode: mode as ModeSetting | undefined });
}

export interface EffectiveTheme {
  palette: Palette;
  mode: Mode;
  surface: "showcase" | null;
}

/** Pure: override > choice > defaults; "system" resolves with `systemDark`; showcase = gabi dark. */
export function resolveTheme(
  choice: ThemeChoice,
  override: ThemeOverride | null,
  defaults: Required<ThemeDefaults>,
  systemDark: boolean,
): EffectiveTheme {
  if (override?.surface === "showcase") return { palette: "gabi", mode: "dark", surface: "showcase" };
  const palette = override?.palette ?? choice.palette ?? defaults.palette;
  const setting = override?.mode ?? choice.mode ?? defaults.mode;
  const mode: Mode = setting === "system" ? (systemDark ? "dark" : "light") : setting;
  return { palette, mode, surface: null };
}

/** Writes a theme onto an element (normally <html>) and updates <meta name="theme-color">. */
export function applyTheme(el: HTMLElement, theme: EffectiveTheme): void {
  el.setAttribute("data-palette", theme.palette);
  el.setAttribute("data-mode", theme.mode);
  el.classList.toggle("dark", theme.mode === "dark");
  if (theme.surface) el.setAttribute("data-surface", theme.surface);
  else el.removeAttribute("data-surface");
  if (el === document.documentElement) {
    const meta = document.querySelector('meta[name="theme-color"]');
    const background = getComputedStyle(el).getPropertyValue("--background").trim();
    if (meta && background) meta.setAttribute("content", background);
  }
}

function useMergedOverride(): ThemeOverride | null {
  const stack = useOverrideStore((s) => s.stack);
  return useMemo(() => mergeOverrides(stack), [stack]);
}

/** How deep the calling component sits under theme-overriding shells. */
const OverrideDepth = createContext(0);

/**
 * Marks its children as one level deeper for useThemeOverride, so a page's
 * override beats its shell's (AppShell wraps its content in one).
 */
export function ThemeOverrideScope({ children }: { children?: ReactNode }) {
  const depth = useContext(OverrideDepth);
  return createElement(OverrideDepth.Provider, { value: depth + 1 }, children);
}

export interface UseTheme {
  /** What is on screen now (overrides included). */
  effective: EffectiveTheme;
  /** The user's choice; null = the app's default. */
  choice: ThemeChoice;
  defaults: Required<ThemeDefaults>;
  /** True while the current view forces the theme (the menu shows it as locked). */
  overridden: boolean;
  setPalette: (palette: Palette | null) => void;
  setMode: (mode: ModeSetting | null) => void;
}

export function useTheme(): UseTheme {
  const palette = useThemeStore((s) => s.palette);
  const mode = useThemeStore((s) => s.mode);
  const setPalette = useThemeStore((s) => s.setPalette);
  const setMode = useThemeStore((s) => s.setMode);
  const override = useMergedOverride();
  const systemDark = useSystemDark();
  const defaults = readThemeDefaults();
  const choice = { palette, mode };
  return {
    effective: resolveTheme(choice, override, defaults, systemDark),
    choice,
    defaults,
    overridden: override !== null,
    setPalette,
    setMode,
  };
}

/** Keeps <html> in step with the effective theme. Call once, near the root (AppShell does). */
export function useThemeSync(): EffectiveTheme {
  const { effective } = useTheme();
  const { palette, mode, surface } = effective;
  // A layout effect, so a view that forces its theme never paints a frame in the wrong one.
  useLayoutEffect(() => {
    applyTheme(document.documentElement, { palette, mode, surface });
  }, [palette, mode, surface]);
  return effective;
}

/**
 * Forces a palette, mode or the showcase surface while the calling view is
 * mounted, without touching the user's choice. Pass null/undefined for none.
 * Overrides merge field by field; one set deeper in the tree (a page inside
 * AppShell) wins over a shallower one (AppShell's own props).
 *   useThemeOverride({ palette: "malinaw", mode: "dark" })   // a public board
 *   useThemeOverride({ surface: "showcase" })                 // a landing page
 */
export function useThemeOverride(value: ThemeOverride | null | undefined): void {
  const id = useId();
  const depth = useContext(OverrideDepth);
  const push = useOverrideStore((s) => s.push);
  const remove = useOverrideStore((s) => s.remove);
  const palette = value?.palette;
  const mode = value?.mode;
  const surface = value?.surface;
  useLayoutEffect(() => {
    if (!palette && !mode && !surface) {
      remove(id);
      return;
    }
    push(id, depth, { palette, mode, surface });
    return () => remove(id);
  }, [id, depth, palette, mode, surface, push, remove]);
}
