/**
 * @rcene/kit: RCENE blocks built on @rcene/ui. Import each family from its own
 * path so a page only loads what it uses:
 *   @rcene/kit/app     app system (page header, console, board, tables, charts, forms, wizard…)
 *   @rcene/kit/site    website and storytelling (hero, sections, scrollytelling…)
 *   @rcene/kit/poster  poster and live-demo kit (A3/A2 poster, presenter mode…)
 *   @rcene/kit/brand   wordmark, app mark, weave patterns, spot illustrations
 * This root holds what every family shares. See rcene/kit/README.md and the
 * rcene-design skill.
 */
export { kitStrings, useKitStrings, type KitStrings } from "./i18n.ts";
export { Surface, type SurfaceProps } from "./surface.tsx";
