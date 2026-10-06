/**
 * The theme boot script: a tiny inline <script> that runs before first paint
 * and sets data-palette, data-mode and the .dark class on <html> from the
 * stored choice (localStorage "rcene:theme"), else the app's defaults, else
 * habi + the device setting. Without it a dark-mode user would see a white
 * flash. rceneApp() (rcene/config/vite.ts) injects it into index.html with the
 * defaults from project.json "theme".
 *
 * No DOM code runs when this module loads: it only builds a string.
 */
import { DEFAULT_MODE, DEFAULT_PALETTE, isModeSetting, isPalette, PALETTES, THEME_STORAGE_KEY, type ThemeDefaults } from "./palettes.ts";

/** Normalised defaults (unknown values fall back to habi / system). */
export function resolveDefaults(defaults: ThemeDefaults | undefined): Required<ThemeDefaults> {
  return {
    palette: isPalette(defaults?.palette) ? defaults.palette : DEFAULT_PALETTE,
    mode: isModeSetting(defaults?.mode) ? defaults.mode : DEFAULT_MODE,
  };
}

/**
 * The script body (no <script> tag). It also records the defaults as
 * data-default-palette / data-default-mode, which useTheme() reads at runtime.
 * Any error leaves the page on the CSS default (habi light).
 */
export function themeBootScript(defaults?: ThemeDefaults): string {
  const d = resolveDefaults(defaults);
  const config = JSON.stringify({ key: THEME_STORAGE_KEY, palettes: PALETTES, palette: d.palette, mode: d.mode });
  return (
    `(function(c){try{var r=document.documentElement,s={};` +
    `try{var j=JSON.parse(localStorage.getItem(c.key)||"null");if(j&&j.state)s=j.state}catch(e){}` +
    `var p=c.palettes.indexOf(s.palette)>=0?s.palette:c.palette;` +
    `var m=s.mode==="light"||s.mode==="dark"||s.mode==="system"?s.mode:c.mode;` +
    `if(m==="system")m=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";` +
    `r.setAttribute("data-default-palette",c.palette);r.setAttribute("data-default-mode",c.mode);` +
    `r.setAttribute("data-palette",p);r.setAttribute("data-mode",m);r.classList.toggle("dark",m==="dark")` +
    `}catch(e){}})(${config});`
  );
}
