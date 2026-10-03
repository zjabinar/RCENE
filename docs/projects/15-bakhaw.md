# 15 · Bakhaw Watch

| | |
|---|---|
| **App** | `apps/15-bakhaw` · dev port 5115 · preview 6115 |
| **Batch** | 4 |
| **Proposal** | `docs/PROPOSALS.md` #15 (Bakhaw Watch — mangrove and coastal change explorer) |
| **Reused by platforms** | P9 Luntian Catbalogan (stretch "mangrove change"; the storm-surge explainer also feeds its planner view) |
| **Data** | boundary, barangays (🟢 OCHA/HDX) · `hazard-stormSurge` (🟡 CDRRMO/CPDCO risk map, used with permission; 🟢 UP NOAH fallback) · `derived/barangay-hazard` (computed) · optional `coastal-2015`, `coastal-2020` (🟡 NAMRIA coastal resources; **not in `LAYER_FILES`**, may never arrive) · fallback: **synthetic mangrove illustration** (seed 1501), labelled on every view |
| **AI in the app** | none |
| **Skills to use** | `maplibre-gis` (two synced maps, fills, fit-bounds), `gsap-motion` (divider reveal, scrubbable timeline for the cross-section), Design plugin `ux-copy` (the illustration banner and the explainer's careful wording) |

> Drag a line across the coast and watch 2015 turn into 2020: where mangroves were lost and where they came back, barangay by barangay, and why that green belt matters when a storm surge arrives.

## Problem

Mangroves are a coastal city's living buffer, but the only record of how Catbalogan's have changed sits in NAMRIA coastal-resource maps: permission-tier technical layers that planners and residents can't open (PROPOSALS #15; "hazard data locked in technical formats" is a documented need). This app makes change visible per barangay and ties it to the storm-surge zones the city already maps. Those NAMRIA layers may not be cleared in time, so the app must also work, honestly and visibly labelled, as an illustration on synthetic patches.

## Users and routes

| Role | Route | Device in the demo | Needs |
|---|---|---|---|
| Planner, public | `/` | laptop window at 1280 px (stacked layout at 390 px) | Swipe-compare 2015 and 2020, per-barangay gain and loss |
| Public, students | `/surge` | same | Why mangroves matter against storm surge, on the real surge layer |
| Anyone | `/sources` | — | Attribution, data mode (real or illustrative), disclaimer |

Use `AppShell width="full"` on `/` and `width="wide"` on `/surge`. Pass `layers={["boundary", "barangays", "hazard-stormSurge", "derived/barangay-hazard"]}` (the optional coastal layers are not `LayerName`s, so their state is shown by the app's own banner).

## MVP requirements

Build in this order. R15.1 alone is a complete entry.

| ID | Requirement | Acceptance criteria (testable) |
|---|---|---|
| R15.1 | Swipe-compare map, 2015 against 2020 | `coastalDataMode` decides **real** (both `coastal-2015.geojson` and `coastal-2020.geojson` are in `/data/manifest.json` and pass the zod schema) or **illustrative** (otherwise; files absent from the manifest are never requested). Two `BaseMap`s are stacked: 2015 underneath, 2020 on top clipped with CSS `clip-path: inset(0 0 0 X%)`. Both are interactive and share one controlled view state (if `BaseMap` does not pass `viewState`/`onMove` through, sync with `onMove` + `jumpTo` and note the gap in `NOTES.md`), so panning either keeps them aligned. Each map shows barangay outlines and that year's mangrove fill; year labels sit on each side of the divider. The divider handle follows the pointer and is a keyboard slider (`role="slider"`, ←/→ 5%, Home/End, `aria-valuetext` "Divider at 50%: 2015 on the left, 2020 on the right"). A segmented control "2015 · Swipe · 2020" is the non-drag alternative ("2015" sets the divider to 100%, "2020" to 0%). On load the divider sweeps from 100% to 50% with GSAP (reduced motion: starts at 50%). In illustrative mode: a non-dismissible banner above the map reads "Illustration only. These mangrove patches are generated, not mapped. NAMRIA coastal resource maps for 2015 and 2020 are pending permission.", each half carries an "Illustration" tag, and patch outlines are dashed. In real mode a one-line source note above the map names the NAMRIA layers instead. |
| R15.2 | Per-barangay gain and loss table | Rows from `changeByBarangay` for every barangay with mangrove area in either year: Barangay · 2015 (ha) · 2020 (ha) · Gained · Lost · Net · Net % ("new" when 2015 is 0). Sortable by net, lost and name (plain `<table>` with sort buttons and `aria-sort`); a totals row; an inline SVG diverging bar per row with +/− signs and a colorblind-friendly pair (not red/green). The caption states the data mode. Clicking a row (or Enter on it) highlights the barangay and fits both maps to it. "Download CSV" exports the rows. |
| R15.3 | Mangroves and storm surge explainer `/surge` | A map of the real `hazard-stormSurge` zones (`ZoneLayer` + `Legend`) with the 2020 mangrove fill on top (labelled illustrative when it is). If the surge layer is missing → `DataMissing` for that part, the rest still renders. A cross-section SVG (sea → surge wave → mangrove belt → houses) in two lanes, "Without a mangrove belt" and "With a mangrove belt", driven by a paused GSAP timeline that a range input scrubs and a Play button runs; in the mangrove lane the wave visibly loses height and speed. Qualitative only: **no percentages or wave-height numbers**. The copy says mangrove belts can slow water and reduce wave energy, wide and dense belts help most, they lower the hazard but do not remove it, and surge can still flood the land behind them. A real-data panel: the number of barangays with any mapped storm-surge zone and the top 5 by `shareAtLeast(row, "stormSurge", "high")`, with "Share of land area, not of people." |
| R15.4 | Language toggle, `/sources`, disclaimer | EN / Waray / Filipino via `useLang`; every string from `src/i18n/strings.ts`. A domain test asserts no string in any language contains any word from `FORBIDDEN_ANSWER_WORDS` (`@rcene/i18n`). `/sources` lists OCHA/HDX, the storm-surge source and either the NAMRIA layers (real mode) or a `tier: "synthetic"` entry for the illustration with the same wording as the banner. Disclaimer footer on every view. |

## Domain functions (test-first in `src/domain/`)

```ts
type CoastalClass = "mangrove" | "beach" | "fishpond" | "coral" | "seagrass" | "other";
interface CoastalProps { class: string; year?: number; illustrative?: boolean }
type CoastalCollection = FeatureCollection<Polygon | MultiPolygon, CoastalProps>;
interface ChangeRow { barangay: string; ha2015: number; ha2020: number; gained: number; lost: number; net: number; netPct: number | null }
```

- `coastalDataMode(manifestFiles: string[]): "real" | "illustrative"` — real only when both files are listed. Cases: both; one; none.
- `coastalClass(label: string): CoastalClass` — case- and spacing-insensitive. Cases: "Mangrove", "Mangrove Forest" → mangrove; "Beach/Sand" → beach; "Fishpond" → fishpond; "Coral Reef" → coral; "Seagrass" → seagrass; unknown or empty → other.
- `coastalBarangays(barangays, rows: BarangayHazardRow[]): string[]` — names with `coastal: true`; when no feature carries a `coastal` flag, the barangays with any storm-surge share above 0. Cases: fixture (flags present) → 3 names; flags stripped → derived from rows.
- `seedMangroves(barangays, coastalNames, boundary, surge: ZoneCollection | undefined, seed = 1501): { y2015: CoastalCollection; y2020: CoastalCollection }` — per coastal barangay 3–6 circular patches (`turf.circle`, radius 0.06–0.25 km, 24 steps) centered on seeded points inside the barangay within 0.8 km of the city boundary line (`turf.polygonToLine` + `pointToLineDistance`), preferring points inside a storm-surge zone and relaxing that preference if too few are found. 2020 fates per patch: 55% stable (radius ±10%), 20% shrink by 30–70%, 10% lost, 15% grow by 10–40%; plus one new patch in every third coastal barangay. Every feature has `{ class: "mangrove", year, illustrative: true }`. Cases: same seed → identical output; every patch center inside a coastal barangay; at least one barangay with net gain and one with net loss (the story is guaranteed); works on the 6-barangay fixture.
- `changeByBarangay(y2015, y2020, barangays): ChangeRow[]` — mangrove features only (`coastalClass`); per barangay, intersect each year's polygons with the barangay, union per year, then `gained = area(2020 minus 2015)`, `lost = area(2015 minus 2020)`, hectares rounded to 2 decimals. Turf 7 takes a FeatureCollection: `intersect(featureCollection([a, b]))`, `difference(featureCollection([a, b]))`, `union(featureCollection(list))` (handle 0 and 1 feature, and `null` results). Cases with hand-made squares: identical years → gained 0, lost 0; disjoint → gained = ha2020, lost = ha2015; two 1 km² squares overlapping by half → gained 50, lost 50, net 0; a patch spanning two barangays is split by area; barangays with nothing in either year are omitted; invariant `net === ha2020 − ha2015` within 0.01 ha.
- `totals(rows: ChangeRow[]): Omit<ChangeRow, "barangay" | "netPct"> & { netPct: number | null }` — sums. Case: empty → zeros.
- `shareAtLeast(row: BarangayHazardRow, hazard, min: Level): number` — sum of shares at or above `min`, capped at 1 (levels can overlap in the source). Cases: as in the derived fixture.
- `swipeFromKey(value: number, key: string): number` — ArrowLeft −5, ArrowRight +5, Home 0, End 100, clamped to 0–100; other keys unchanged.
- `toCsv(rows, columns): string` — RFC 4180 quoting. Cases: comma, quote, newline.

Compute `changeByBarangay` once per data load and memoize it; never recompute while swiping. If it takes over 1 s on real data, show `LoadingState` for the table and record the timing in `NOTES.md`.

## Data

- `useLayer("boundary")`, `useLayer("barangays")`, `useLayer("derived/barangay-hazard")`, `useZones(["stormSurge"])`. Works on fixtures until the real data lands; the Sample data badge shows meanwhile.
- **Optional coastal layers** (not in `LAYER_FILES`, and shared packages are frozen): write `src/data/optionalLayer.ts` → `useOptionalLayer(file: string, schema: ZodType)`, returning `loading`, `absent`, `invalid` or `ready`. It reads `useDataManifest()`, returns `absent` **without fetching** when the file is not listed (a 404 would print a console error and fail the smoke test), otherwise fetches `/data/<file>` and validates with an app-local zod schema (Polygon/MultiPolygon features with a string `class`). `invalid` falls back to illustrative mode with the banner plus "The coastal files were found but not recognised."
- `NOTES.md` → "Requests for shared packages": add `coastal-2015` and `coastal-2020` to `LayerTypes`/`LAYER_FILES` (properties `{ class: string; fixture?: boolean }`, NAMRIA class labels verbatim, simplified, clipped to the boundary) and to `sources.json` (NAMRIA, `tier: "permission"`), when permission arrives (`docs/projects/00-data.md` pass 2).
- Synthetic fallback: `seedMangroves(…, 1501)` on the loaded barangays and boundary (the fixture coastline until real data lands). Never mixed with real coastal data: real mode uses only the NAMRIA files.
- Store `createSyncedStore("15-bakhaw:app")` → `{ mode: "swipe" | "2015" | "2020"; swipe: number; selected: string | null }`, `version: 1`.

## Experience

- Coastal and quiet on the shared offline basemap: one deep mangrove green for patches (both years the same color, so the swipe compares extent, not color), amber and red only for surge levels. The illustration banner uses the warning style and an icon, not just color.
- **Wow moment:** the divider sweeps across on load, revealing 2020 over 2015 (`gsap-motion` "core pattern"; sweeps triggered later by the segmented control are wrapped as in its "Animations started by events" section); then on `/surge` scrubbing the cross-section shows the wave flatten in the mangrove lane (`gsap-motion` "Scrubbable timeline" recipe). Map camera moves use MapLibre's own `fitBounds`, never GSAP.
- Mangrove patches and the selected-barangay highlight are `Source` + `Layer` (fill and line) from `@rcene/map`. Labels (year tags, barangay names on selection) are HTML overlays or `Marker`s; the offline basemap has no glyphs, so no symbol text layers.
- Import `gsap`, `useGSAP` and plugins from `@rcene/ui/motion` (already registered); don't create a second registration file.
- Use shadcn primitives from `@rcene/ui/components/<name>` (alert, button, card, toggle-group). If one is missing, use a plain element styled with the shared tokens and note it in `NOTES.md`.
- Accessibility: the divider is a labelled keyboard slider and the segmented control does the same job without dragging; the table is the non-map path to every number; the cross-section has a text description and its range input is labelled; gained and lost use signs and words as well as color; reduced motion: no sweep, the timeline jumps to the scrubbed position.

## Golden-path demo (≤ 2 minutes)

1. `/` at 1280 px: the banner states the data mode (illustrative unless NAMRIA arrived); the divider sweeps to the middle. Drag it across a coastal barangay: 2015 patches on the left, 2020 on the right.
2. Focus the divider and use the arrow keys; switch the segmented control to "2020", then back to "Swipe".
3. Table: sort by "Lost"; click the top row → both maps fit that barangay; read its gained, lost and net hectares.
4. `/surge`: the real storm-surge zones with the mangrove fill on top; press Play, then scrub: the wave loses height in the mangrove lane. Read the line "they lower the hazard but do not remove it".
5. Switch to Waray. `/sources`: OCHA/HDX, the storm-surge source, and the illustration entry (or NAMRIA, if real).

## Definition of done

- [ ] R15.1–R15.4 meet their acceptance criteria
- [ ] Domain tests pass: `pnpm test` (in `apps/15-bakhaw`)
- [ ] `pnpm typecheck` and `pnpm build` pass
- [ ] `node ../../scripts/smoke.mjs --app 15-bakhaw` passes (offline, no console errors, axe clean, screenshots at 390 and 1280)
- [ ] Every string comes from `src/i18n/strings.ts` (en + war + fil drafts); AI-drafted Waray/Filipino strings listed in `NOTES.md` under "Translations to review"
- [ ] `/sources` lists every dataset used; disclaimer footer on every view
- [ ] `STATUS.md`, `AI-LOG.md` (one row per commit) and `DEMO.md` are current

## Out of scope

Satellite imagery or NDVI; carbon or biomass estimates; numeric wave-attenuation claims; sea-level-rise modelling (that is #2 Tubig); planting-site recommendations; editing or drawing patches; classes other than mangrove in the change table; charts from a chart library (none in this app).

## Stretch (only after the definition of done is met)

- Real mode only: mangrove hectares inside mapped storm-surge zones per barangay (intersect 2020 mangroves with the surge layer).
- Fishpond and beach change as extra table tabs (real mode).
- A print view of the map pair and the table for the poster.

## Platform hooks

Export `routes` (already), plus `SwipeCompare` (generic: takes two layer sets, labels and a view state, so P9 can reuse it for any before/after pair such as sea-level-rise scenarios), `ChangeTable`, `SurgeCrossSection` and the domain functions, all free of app-specific globals. P9 Luntian Catbalogan mounts `/` as its "mangrove change" view and `/surge` beside its sea-level-rise exposure view, and swaps the illustration for NAMRIA data simply by the files appearing in `packages/data/files/`.
