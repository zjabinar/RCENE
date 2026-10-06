/**
 * The colour themes: 5 palettes x light/dark. The values live in
 * styles/themes.css; this file names them. No DOM code here: the Vite preset
 * (rcene/config/vite.ts) imports it to build the boot script.
 */

export const PALETTES = ["habi", "dagat", "fiesta", "gabi", "malinaw"] as const;
export type Palette = (typeof PALETTES)[number];

/** "system" follows the device's light/dark setting. */
export const MODE_SETTINGS = ["light", "dark", "system"] as const;
export type ModeSetting = (typeof MODE_SETTINGS)[number];
export type Mode = "light" | "dark";

export const DEFAULT_PALETTE: Palette = "habi";
export const DEFAULT_MODE: ModeSetting = "system";

/** An app's default theme (project.json "theme"); the user's choice in the theme menu wins. */
export interface ThemeDefaults {
  palette?: Palette;
  mode?: ModeSetting;
}

/** localStorage key of the theme store (createSyncedStore("theme")). */
export const THEME_STORAGE_KEY = "rcene:theme";

export function isPalette(value: unknown): value is Palette {
  return typeof value === "string" && (PALETTES as readonly string[]).includes(value);
}

export function isModeSetting(value: unknown): value is ModeSetting {
  return typeof value === "string" && (MODE_SETTINGS as readonly string[]).includes(value);
}

/**
 * What each palette is for (shown in the theme menu and the gallery). Strings
 * shown to users come from the i18n table (ui.palette.<id>); these are notes
 * for developers.
 */
export const PALETTE_NOTES: Record<Palette, string> = {
  habi: "Living Tapestry (default): abaca cream, Samar sea teal, banig violet. Every app view.",
  dagat: "Sea: sea-foam and navy. Coastal and storm-surge apps.",
  fiesta: "Fiesta: banig magenta and tikog green. Heritage, tourism and participation.",
  gabi: "Night showcase: neon cyan and magenta on deep navy. Heroes, boards, the demo. Its light mode prints.",
  malinaw: "Clear: black and white at 7:1 or more. Public boards, kiosks and low vision.",
};

/**
 * Swatches for the theme menu, [background, primary, brand] per mode. They copy
 * styles/themes.css (rcene/ui/themes.test.ts keeps them equal).
 */
export const PALETTE_SWATCHES: Record<Palette, Record<Mode, readonly [string, string, string]>> = {
  habi: { light: ["#f7f2e8", "#0f6b66", "#5b3a8c"], dark: ["#14121f", "#4fd1c5", "#b79cf2"] },
  dagat: { light: ["#f2f8fa", "#0b5c8a", "#0b3d5c"], dark: ["#0a1824", "#5ec4e8", "#8fd3f0"] },
  fiesta: { light: ["#fbf6f8", "#a3166a", "#2e7d32"], dark: ["#1a0f18", "#f472b6", "#7bd389"] },
  gabi: { light: ["#ffffff", "#0e7490", "#a21caf"], dark: ["#070a1a", "#22d3ee", "#e879f9"] },
  malinaw: { light: ["#ffffff", "#0b3d91", "#000000"], dark: ["#000000", "#8ab4ff", "#ffffff"] },
};
