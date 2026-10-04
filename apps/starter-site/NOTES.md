# Notes — S2 Website starter

## What to copy from here

A public website built only from the kit, the shared map and the data layers. Read a file, copy it into your app's `src/`, then replace the words (in `src/i18n/strings.ts`) and the numbers with your app's. Keep one showcase surface per page.

| File | What it shows |
|---|---|
| `src/SiteLayout.tsx` | `SiteShell` instead of `AppShell` for a website: nav, `AppMark` brand, custom `SiteFooter` columns, Lenis (`smooth`), `ScrollRestoration` (a new page starts at the top), and `PresenterMode` mounted once for every route (hidden until **P**, open with `?present`) |
| `src/routes.tsx` · `src/main.tsx` | The exported route table (site pages under the layout, `/presenter` bare); `StringsProvider` around the router so `RouteError` sees the app's strings |
| `src/pages/Home.tsx` | Landing: `Hero variant="showcase"` with an SVG map as media, `StatBand` fed by computed numbers with a same-shape skeleton (`LoadGate loading`), honest caveats + `SampleDataBadge`, `WeaveDivider`, `FeatureGrid` of links, `CallToAction` (brand tone) |
| `src/pages/Story.tsx` | Data story: calm `Hero`, `ScrollyChapter` whose steps are built from the data (a missing layer drops its steps), `BeforeAfter` of two SVG maps + key, `ChartCard`, `StoryTimeline` with icons, `CallToAction` |
| `src/pages/About.tsx` | "How AI built it" as the page's one showcase `Section`, `AiBuiltPanel` with the DISCLOSURE line, `QrToApp` that follows the address bar, presenter how-to + speaker-notes window button, credits cards |
| `src/pages/Poster.tsx` | `PosterPage size="A3" fit="contain"` + `SixPanelPoster`: `PosterFigure`s drawn as SVG (map + chart, Download SVG), `AiBuiltPanel`, `QrToApp`, footer with `Wordmark`; adapts to landscape with `usePosterSheet()`. Prints to one A3 page (checked with Playwright `page.pdf({ preferCSSPageSize: true })`, portrait and landscape fit with no overflow notice) |
| `src/pages/Sources.tsx` | `SourcesPage` inside the site container, with a "how the numbers are made" section as `children` |
| `src/pages/Presenter.tsx` | `/presenter`: `PresenterNotes` outside the shell (`useThemeSync`, `StringsProvider`, `<main>`, document title) |
| `src/features/demo/demo-steps.ts` | The demo script as `PresenterStep[]` (route, caption, notes, seconds; under two minutes), memoised per language with `translate` |
| `src/features/city-data/use-city-data.ts` | Four layers as one `LoadState` (`useCityLayers`), plus stats computed once (`useCityStats`); `CITY_LAYERS` for `SampleDataBadge` |
| `src/features/city-data/DataNote.tsx` · `use-share-format.ts` | The honesty line under any computed number (source, Sample data badge, caveats); "4.4%" / "24%" share formatting per language |
| `src/features/story-map/StoryMap.tsx` | A scrollytelling map: one `BaseMap tone="auto"` stays mounted, each step swaps `ZoneLayer` (`casing` when dark) / `PointLayer`s and fits the camera (`useMap().fitBounds`, instant under reduced motion, padded around the legend); non-interactive so touch scrolls the page; `Legend tone="auto"` + a facility key |
| `src/features/story-map/StoryMap.tsx` (`useTokenColor` from `@rcene/ui/theme`) | Theme tokens for MapLibre paint, so map points follow the palette and mode |
| `src/features/city-map-svg/CityMapSvg.tsx` · `MapKey.tsx` | The city as a token-coloured SVG (barangays, boundary, zones by level with a casing, facilities): print-safe poster figures, hero art (`variant="tapestry"`, banig pattern, GSAP DrawSVG reveal), before/after panes; the matching key (swatch + icon + word) |
| `src/features/hazard-chart/HazardShareChart.tsx` · `HazardShareSvg.tsx` | `ChartCard` + Recharts horizontal bars (`var(--color-share)`, labels, tooltip, table view) for screens; the same numbers as a plain SVG bar chart for print |
| `src/domain/city-stats.ts` | Pure, tested numbers from layers: counts, area shares with Turf (zones merged first, so overlapping levels count once), facilities split into the three answers via `lookupHazards`; a missing layer is `null`, never 0 |
| `src/domain/projection.ts` · `load-state.ts` | GeoJSON → SVG paths (fit projection, holes with evenodd); `allLoaded` / `mapLoaded` to combine `LoadState`s |
| `src/pages/pages.test.tsx` | Every route rendered from `data/fixtures` through a stubbed `fetch`, numbers checked, axe on every page |
| `src/i18n/strings.test.ts` | No "safe" anywhere on the site in any language, placeholders kept in every translation, a draft for every key |

## Shared-code changes (for the template)

This app owns its copy of the shared code in `rcene/`. Prefer using it as-is.
If you change it, keep the change minimal and list each one here (file, what
changed, why), so it can be carried back to `apps/_template/rcene/` and synced
to the other apps.

- No file in `rcene/` was changed. Suggestions found while building, each worked around in `src/`:
  - **Fixed in the template (2026-10-04):** StatBand prints its final numbers and smoke screenshots run with reduced motion; BaseMap `controls={false}`; `useTokenColor` is now in `@rcene/ui/theme`; SiteShell moves the language picker into the menu below `sm`. The notes below are kept for the record.
  - **`kit/site/stat-band.tsx`**: the numbers show **0** until the band scrolls into view, so a full-page screenshot (the smoke test's `docs/screenshots/home-*.png`) or a print taken before scrolling shows zeros. Suggest showing the final value when the band is already in view on mount, under `print`, or when IntersectionObserver never fires; count up only when it enters later.
  - **`map/BaseMap.tsx`**: no way to turn off `NavigationControl` (and the empty compact attribution button) for a non-interactive figure map. Suggest `controls={false}`. Worked around with `[&_.maplibregl-ctrl-top-right]:hidden` in `StoryMap`.
  - **`map/PointLayer.tsx`** (and any paint colour): MapLibre can't read CSS variables, so points can't follow the theme. `src/features/story-map/use-token-color.ts` (`useTokenColor("--primary")`) is a candidate for `@rcene/map`.
  - **`data/load.ts`**: no combinator for several `LoadState`s; `src/domain/load-state.ts` (`allLoaded`, `mapLoaded`, tested) is a candidate for `@rcene/data`.
  - **`kit/site/site-shell.tsx`**: at 390 px `LangToggle` stays in the bar and a 20-character title truncates ("Catbalogan Op…"); suggest moving the language select into the menu sheet below `sm`, like `ThemeMenu`.
  - **`ui/components/sources-page.tsx`**: its `h1` is `text-2xl`, not the display face/scale the site pages use; a `title` / heading-style option would let a site match.
  - **`kit/poster/six-panel-poster.tsx`** changed during this build (portrait: AI now spans rows 4–5, impact moved under data). The poster here fits both; if the layout changes again, re-check `/poster` (the overflow notice) and the PDF.

## Requests for the data session

- None. The site reads `boundary`, `barangays`, `facilities` and the five hazard layers; with only fixtures present it shows the "Sample data" badge and the fixture numbers (6 barangays, 12 facilities).

## Dependencies added

- None.

## Decisions and open questions

- **Name and content.** The site is "Catbalogan Open Data", a generic showcase of the shared layers (no lookup or eligibility logic). Every number is computed in `src/domain/city-stats.ts`; a missing flood or storm-surge layer removes its numbers and story steps.
- **Shares of land** merge each hazard's zones before measuring (levels overlap in the source maps, see `scripts/data/derive.mjs`), so they are "any level" shares. Copy always says land area is not people and "not in a mapped zone" is not a promise.
- **SVG for figures, WebGL only for the story map.** The hero picture, the before/after panes and the poster map are `CityMapSvg` (prints, no extra WebGL contexts). The story map is `interactive={false}`: a scrollytelling figure must not capture touch or wheel scrolling.
- **QR codes** use `window.location.origin`, so opening the site from the laptop's LAN address (`npm run preview -- --host`) makes the poster and About codes work for phones.
- **Presenter bar** is mounted on every route but hidden until **P** (or `?present`); `/presenter` (speaker notes) is in `project.json` `smokeRoutes`.
- **Poster** is designed for A3 portrait; in landscape it drops the process steps and a caption (`usePosterSheet().orientation`) so it still fits one sheet.

## Translations to review

AI-drafted Waray and Filipino strings that a person should check (key, English,
draft).

- Every app key in `src/i18n/strings.ts` has an AI-drafted `war` and `fil` version (about 190 keys each): `app.*`, `nav.*`, `footer.*`, `data.*`, `map.*`, `key.*`, `home.*`, `story.*`, `about.*`, `poster.*`, `sources.method.*`, `demo.*`. Most worth a fluent check first: the hazard wording (`data.notInZoneMeans`, `story.step.flood.*`, `story.step.exposed.*`, `key.*`, `map.floodLabel`) and the disclosure line (`about.ai.disclosure`).
