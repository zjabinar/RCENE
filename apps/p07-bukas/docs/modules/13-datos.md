> **Module brief** (reference). This is the spec of app #13 Bukas Datos, copied from the monorepo's `docs/projects/13-datos.md`. Its paths and ports are that app's. In P7 Bukas Catbalogan, `docs/brief.md` says which parts to lift or build, and wins where they differ.

# 13 · Bukas Datos

| | |
|---|---|
| **App** | `apps/13-datos` · dev port 5113 · preview 6113 |
| **Batch** | 2 |
| **Proposal** | `docs/proposal.md` (#13 Bukas Datos — scrollytelling open-data story, in the monorepo's `docs/PROPOSALS.md`) |
| **Reused by platforms** | P7 Bukas Catbalogan (core "scroll story", step 1 of its workflow; the story also doubles as the poster) |
| **Data** | boundary, barangays (🟢 OCHA/HDX) · all five `hazard-*` (🟡 CDRRMO/CPDCO risk maps, used with permission; 🟢 UP NOAH fallback) · facilities (🟢 OSM) · `derived/barangay-hazard`, `derived/facility-hazard` (computed from those) · optional `landcover-2010`, `landcover-2020` (🟡 NAMRIA; **not in `LAYER_FILES`**, loaded with `useOptionalLayer`, may never arrive → "Data pending permission" card) · **no synthetic data** |
| **AI in the app** | none |
| **Skills to use** | `gsap-motion` ("Scrollytelling with a pinned map", "Smooth scroll wired to ScrollTrigger", SplitText, count-ups), `maplibre-gis` (zones, choropleths, fit-bounds camera), built-in `dataviz` (every chart, Recharts), Design plugin `ux-copy` (chapter copy and caveats) |

> "Catbalogan in Data": scroll, and the map flies from the coast to the uplands while every number on the page is computed live from the city's own layers, then the same story prints as the poster.

## Problem

Catbalogan's hazard, boundary and facility data exist, but as shapefiles and printed maps: PROPOSALS lists "hazard data locked in technical formats" among the documented needs. Residents, students and council members can't see the patterns: which barangays have most of their land in mapped flood or storm-surge zones, which schools sit inside them, how far some barangays are from a clinic. A scroll story makes those patterns readable in two minutes, with honest caveats on every chart (land area is not people; straight-line is not travel time), and gives the entry its poster.

## Users and routes

| Role | Route | Device in the demo | Needs |
|---|---|---|---|
| Public, judges, students | `/` | laptop window at 1280 px (must also read well at 390 px) | Read the story; the map follows the chapter |
| Organizer printing the poster | `/poster` | laptop, then print preview / Save as PDF | One-page export with static maps, charts, method and sources |
| Anyone | `/sources` | — | Attribution, tiers, disclaimer |

Use `AppShell width="full"` on all routes. Pass `layers={["boundary", "barangays", "hazard-flood", "hazard-landslide", "hazard-stormSurge", "hazard-groundShaking", "hazard-liquefaction", "facilities", "derived/barangay-hazard", "derived/facility-hazard"]}`. Wrap only `/` in `SmoothScroll` from `@rcene/ui/motion`; `/poster` and `/sources` scroll natively.

## MVP requirements

Build in this order. R13.1 alone is a complete entry.

| ID | Requirement | Acceptance criteria (testable) |
|---|---|---|
| R13.1 | Story with a sticky map: `intro`, `coast`, `flood`, `slopes`, `about` | Layout ≥ 1024 px: two columns, the map column is `position: sticky; top: 0; height: 100vh` (CSS, not ScrollTrigger `pin`); below 1024 px: the map is sticky at the top at 45 vh with chapters scrolling under it. Each chapter element has `data-chapter`. A ScrollTrigger per chapter (`start: "top center"`, `end: "bottom center"`) sets the active chapter in `onToggle` when `isActive`, and the map fits that chapter's camera (`useFlyTo` or `fitBounds`, about 1.2 s). Only the active chapter's layers are visible (opacity transition, not remount). `intro`: SplitText headline reveal and three `StatTile`s with `countUp` (barangays, facilities, hazard layers loaded). Each hazard chapter (generic `HazardChapter`): `ZoneLayer` + `Legend` for its hazard, a Recharts horizontal bar chart of up to 10 barangays by `shareAtLeast(row, hazard, "moderate")` labelled in %, the camera fitted to the top 5 barangays (`chapterCamera`), and the caveat "Share of land area inside a mapped risk zone, not share of people." A missing hazard layer shows `DataMissing` in place of the chart; the chapter still renders. `ScrollTrigger.refresh()` runs after the map loads and after data arrives. A chapter list (table of contents) links to every chapter. |
| R13.2 | Facilities chapters `facilities` and `care` | `facilities`: facilities as a `PointLayer` colored by `facilityExposure` (in a mapped zone at moderate or above for at least one hazard, or not; the "not" color is the neutral `STATUS_HEX.notInZone`, never green), a stacked bar chart by facility kind (the two categories are exclusive, so stacking is valid), and the sentence "X of Y schools sit inside a mapped risk zone of moderate or above for at least one hazard." `care`: barangays as a 4-class choropleth of straight-line km from a point inside each barangay to the nearest hospital or health facility (`distanceToNearest`), a chart of the 10 farthest, and the caveat "Straight-line distance from a point inside each barangay; it may cross water. OpenStreetMap may be missing facilities." |
| R13.3 | `ranking` chapter | Barangays as a 5-class choropleth of `exposureIndex` (quantile breaks), a top-10 bar chart, and a method box in plain words: "The average, across the hazards loaded, of each barangay's share of land area in mapped zones of moderate or above. It describes mapped area only: no population, no vulnerability, no weighting. It is not a risk score." If `hasLevelOverlap` is true for any hazard used, a footnote says shares may be overstated because mapped levels overlap in the source. |
| R13.4 | `landcover` chapter, only when the data exists | `useOptionalLayer` from `@rcene/data` (see Data) checks `/data/manifest.json`. If both `landcover-2010.geojson` and `landcover-2020.geojson` are listed and pass the zod schema: the map shows 2010, then 2020 at the chapter's second step (a nested trigger), and a grouped bar chart shows hectares per group (`landCoverGroup`, `areaByGroup`) for both years. Otherwise the chapter renders a "Data pending permission" card (NAMRIA land cover 2010 and 2020, permission tier) and **no request is made for the missing files**, so the console stays clean. |
| R13.5 | `/poster` print and export view | One A3-portrait page (`@page { size: A3 portrait; margin: 10mm }`): title, 4 key numbers, 4 SVG maps drawn with `geoToSvgPath` (storm-surge zones over barangays, facility exposure, distance to care, exposure ranking; no WebGL), 3 static charts (Recharts with `isAnimationActive={false}` and fixed width/height), method and caveats, the source attributions from `sources.json`, the disclaimer. "Print / Save as PDF" calls `window.print()`; print CSS hides navigation and buttons and keeps the disclaimer. Each figure has "Download SVG" (serialize the `<svg>` with `XMLSerializer` and save it with `downloadText` from `@rcene/ui`). Renders correctly with no map canvas on the page. |
| R13.6 | Open data, language, sources | Every data chapter has "Download this chapter's data (CSV)" built by the shared `toCsv` from `@rcene/data` and saved with `downloadCsv` from `@rcene/ui` (column names are stable English identifiers; numbers use "." decimals). EN / Waray / Filipino via `useLang`; chapter copy lives in `src/i18n/strings.ts` (long paragraphs are fine as strings). `/sources` uses `SourcesPage`; disclaimer footer on every view. |

Chapters (copy is drafted with `ux-copy`; titles below are working English):

| Chapter | Working title | Map | Visual | Missing data |
|---|---|---|---|---|
| `intro` | Catbalogan in Data | boundary and barangay outlines, fit boundary | headline + 3 stat tiles | tiles count only what loaded |
| `coast` | Where the mapped zones fall: the coast | storm-surge zones | top-10 area share | `DataMissing` |
| `flood` | … along the rivers | flood zones | top-10 area share | `DataMissing` |
| `slopes` | … on the slopes | landslide zones | top-10 area share | `DataMissing` |
| `facilities` | Schools and clinics inside mapped zones | facilities by exposure | stacked bars by kind | `DataMissing` |
| `care` | How far is care? | distance choropleth | 10 farthest | `DataMissing` |
| `ranking` | The exposure ranking | exposure-index choropleth | top 10 + method box | `DataMissing` |
| `landcover` | Land cover, 2010 to 2020 | 2010 then 2020 | hectares by group, both years | "Data pending permission" card |
| `about` | About this data | boundary | sources summary, links to `/poster`, `/sources`, all CSVs | — |

The `coast`/`flood`/`slopes` intro paragraph answers "who lives near which hazards?" honestly: these layers measure land area, and the CDRRMO layers map risk to people and assets (they are not full hazard extents), so a barangay with 60% of its land in a zone may still have most homes outside it, or inside it.

## Domain functions (test-first in `src/domain/`)

- `shareAtLeast(row: BarangayHazardRow, hazard: Hazard, min: Level = "moderate"): number` — sum of the shares of levels at or above `min`, capped at 1; a missing hazard → 0. Cases: fixture row with overlapping levels → 1; `min: "high"` excludes moderate; empty → 0.
- `hasLevelOverlap(rows: BarangayHazardRow[], hazard: Hazard): boolean` — true when any row's shares across all levels sum above 1.001. Cases: fixture groundShaking → true; a clean row set → false.
- `topBarangays<T>(rows: T[], name: (r: T) => string, value: (r: T) => number, n = 10): { barangay: string; value: number }[]` — descending, ties by name, zeros dropped. Cases: fewer than n rows (fixtures have 6); all zero → `[]`.
- `exposureIndex(row, hazards: Hazard[], min: Level = "moderate"): number` — mean of `shareAtLeast` over `hazards` (the caller passes only loaded hazards and lists them in the method box). Cases: shares 0.5 and 0 → 0.25; empty list → 0.
- `quantileBreaks(values: number[], k: number): number[]` and `classOf(value, breaks): number`. Cases: all equal → one class; fewer values than classes; the max value lands in the top class.
- `facilityExposure(rows: FacilityHazardRow[], min: Level = "moderate"): Map<string, boolean>` and `exposureByKind(facilities, exposure): { kind; inZone; notInZone; notAssessed }[]`. Cases: `inZone` at low only → false; facility absent from rows → `notAssessed`; `outsideCoverage` → false.
- `distanceToNearest(barangays, facilities, kinds: FacilityKind[]): { barangay: string; km: number | null }[]` — from `turf.pointOnFeature` (always inside the polygon, unlike a centroid) using `nearest` from `@rcene/geo`. Cases: no facility of those kinds → `null`; a facility inside the barangay → small km.
- `chapterCamera(barangays, names: string[], boundary): [[number, number], [number, number]]` — `featureBounds` of the named barangays; falls back to the boundary when `names` is empty.
- `chapterAvailability(chapter, ctx: { manifestFiles: string[]; missingHazards: Hazard[] }): "ready" | "missing" | "pending"` — `pending` only for `landcover` when either file is not in the manifest. Cases: each state.
- `landCoverGroup(label: string): "forest" | "mangrove" | "cropland" | "grassShrub" | "builtUp" | "waterWetland" | "other"` — case- and spacing-insensitive. Cases: "Closed Forest", "open forest" → forest; "Mangrove Forest" → mangrove; "Annual Crop", "Perennial Crop" → cropland; "Brush/Shrubs", "Grassland" → grassShrub; "Built-up" → builtUp; "Inland Water", "Fishpond", "Marshland/Swamp" → waterWetland; "" or unknown → other.
- `areaByGroup(fc, group: (label: string) => Group): Record<Group, number>` — hectares via `turf.area`. Case: a 1 km × 1 km square ≈ 100 ha (± 0.5).
- `geoToSvgPath(geometry: Polygon | MultiPolygon, bounds, width, height): string` and `projectPoint(lngLat, bounds, width, height): [x, y]` — equirectangular with x scaled by cos(mid-latitude), y flipped. Cases: bounds corners map to (0, height) and (width, 0); a hole becomes its own subpath; MultiPolygon → several `M…Z` subpaths.
- CSV text comes from the shared `toCsv(rows, columns)` in `@rcene/data` (RFC 4180 quoting is tested there; don't re-implement it). Test the per-chapter row builders you pass it: stable English column names, `null` → empty cell, 0.125 stays "0.125" in any language.

## Data

- `useLayer` for `boundary`, `barangays`, `facilities`, `derived/barangay-hazard` and `derived/facility-hazard`, and `useZones()` for all five hazards. Works on fixtures (6 sample barangays) until the real data lands; the Sample data badge shows meanwhile, and the stat tiles must read "6 barangays" on fixtures, never a hard-coded 57.
- **Optional land cover** (not in `LAYER_FILES`, so `useLayer` can't load it): use `useOptionalLayer(file, schema)` from `@rcene/data` (states `loading`, `absent`, `invalid`, `ready`) with an app-local zod schema (`FeatureCollection` of Polygon/MultiPolygon with a string `class` property). It reads the manifest first and reports a file that isn't listed as missing **without fetching it**, otherwise fetches `/data/<file>` and validates it.
- `NOTES.md` → "Requests for the data session":
  1. `landcover-2010.geojson` and `landcover-2020.geojson` (properties `{ class: string; fixture?: boolean }`, NAMRIA labels kept verbatim) with `sources.json` entries (NAMRIA, `tier: "permission"`), when permission arrives (data pass 2 of the `00-data` brief in the monorepo).
  2. Add exact "at or above level" shares to `derived/barangay-hazard` (levels can overlap, so summing per-level shares overstates), then switch `shareAtLeast` to them.
- Synthetic data: none. Every figure in the story comes from a shipped layer or fixture.
- Store `createSyncedStore("13-datos:app")` → `{ lastChapter: string | null }`, written when a chapter becomes active; the intro offers "Continue from {chapter}" when set.

## Experience

- Editorial and calm: generous type, one accent color for rankings, level colors (`LEVEL_HEX`) only on hazard zones, a sequential palette for choropleths and a categorical one for land cover, all per the `dataviz` skill. Chapters are cards with a solid background so text stays readable over the map on phones.
- **Wow moment:** the headline splits in (SplitText), the tiles count up, then each scroll step flies the map to a new part of the city while the zones cross-fade and the chart for that chapter animates in. Built with the `gsap-motion` "Scrollytelling with a pinned map" recipe (sticky CSS + ScrollTrigger `onToggle` → camera) inside `SmoothScroll` (Lenis on this page only). Mount each chart when its chapter first becomes active so its entrance animation is seen.
- The story map is an illustration driven by scrolling: turn off scroll zoom and drag pan so the wheel and touch always scroll the story (do not add `data-lenis-prevent`). Labels are HTML, never symbol text layers (the offline basemap has no glyphs). Choropleths are `Source` + `Layer` (fill) from `@rcene/map`, with the class precomputed into each feature's properties (memoized) and a `match` expression on it; mount every chapter's layers once and toggle opacity.
- Import `gsap`, `ScrollTrigger`, `SplitText`, `useGSAP` and `SmoothScroll` from `@rcene/ui/motion` (plugins already registered); don't create a second registration file.
- Use shadcn primitives from `@rcene/ui/components/<name>` (card, button, badge, alert). If one is missing, use a plain element styled with the shared tokens and note it in `NOTES.md`.
- Accessibility: the story reads completely with the map hidden; every chart has a `<figcaption>` summary and a "Show as table" toggle; the chapter list gives keyboard users direct jumps; headings follow chapter order; with `useReducedMotion()` there is no Lenis, no SplitText animation, and camera moves are instant (`duration: 0`); text contrast meets WCAG AA over every chapter background.

## Golden-path demo (≤ 2 minutes)

1. `/` at 1280 px: the title splits in; the tiles count up (barangays, facilities, 5 hazard layers).
2. Scroll to `coast`: the map flies to the shoreline, storm-surge zones fade in, the top-10 bars grow. Read the caveat aloud: land area, not people.
3. Scroll to `slopes`: the map flies inland to the landslide zones.
4. `facilities`: "X of Y schools sit inside a mapped risk zone…"; `care`: the distance choropleth and the 10 farthest barangays.
5. `ranking`: the choropleth and the method box ("not a risk score"). `landcover`: the "Data pending permission" card (or the real 2010 → 2020 change if NAMRIA data arrived).
6. Open `/poster` → Print preview at A3: "this page is our poster". Then `/sources`.

## Definition of done

- [ ] R13.1–R13.6 meet their acceptance criteria
- [ ] Domain tests pass: `npm run test`
- [ ] `npm run typecheck` and `npm run build` pass
- [ ] `npm run smoke` passes (offline, no console errors, axe clean, screenshots at 390 and 1280)
- [ ] Every string comes from `src/i18n/strings.ts` (en + war + fil drafts); AI-drafted Waray/Filipino strings listed in `NOTES.md` under "Translations to review"
- [ ] `/sources` lists every dataset used; disclaimer footer on every view
- [ ] `STATUS.md`, `AI-LOG.md` (one row per commit) and `DEMO.md` are current

## Out of scope

Population or household counts (no CBMS data); any risk score or weighting (that is #4); travel-time or road routing; editing data; online basemaps or tiles; converting land cover in the browser from raw NAMRIA files.

## Stretch (only after the definition of done is met)

- A `shaking` chapter: ground shaking and liquefaction with the same `HazardChapter`.
- Poster size switch (A3 / A2 / A1) that scales type and figures.
- Share link `/#chapter-id` that opens the story at that chapter.

## Platform hooks

Export `routes` (already), plus `Story`, `HazardChapter`, `RankedBars`, `SvgMap` and `Poster`. Keep the chapter list as data (`src/content/chapters.ts`: id, title key, camera, layers, visual, required layers) so P7 Bukas Catbalogan can append its own chapters, for example a "projects being built" chapter fed by #12, without touching the story engine.
