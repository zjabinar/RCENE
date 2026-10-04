/**
 * @rcene/ui/theme: palettes x light/dark, the user's choice, per-view overrides
 * and the theme menu. See styles/themes.css for the values and the "Theme"
 * section of rcene/ui/README.md for how to use them.
 */
export {
  DEFAULT_MODE,
  DEFAULT_PALETTE,
  isModeSetting,
  isPalette,
  MODE_SETTINGS,
  PALETTE_NOTES,
  PALETTE_SWATCHES,
  PALETTES,
  THEME_STORAGE_KEY,
  type Mode,
  type ModeSetting,
  type Palette,
  type ThemeDefaults,
} from "./palettes.ts";
export { resolveDefaults, themeBootScript } from "./boot.ts";
export { useOverrideStore, useThemeStore, type ThemeChoice, type ThemeOverride } from "./store.ts";
export {
  applyTheme,
  readThemeDefaults,
  resolveTheme,
  useSystemDark,
  useTheme,
  useThemeOverride,
  useThemeSync,
  type EffectiveTheme,
  type UseTheme,
} from "./sync.ts";
export { PaletteSwatch, ThemeMenu, type ThemeMenuProps } from "./theme-menu.tsx";
