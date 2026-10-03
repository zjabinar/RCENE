# 02 · Tubig

| | |
|---|---|
| **App** | `apps/02-tubig` · dev port 5102 · preview 6102 |
| **Batch** | 4 |
| **Proposal** | `docs/proposal.md` (#2 in the monorepo's `docs/PROPOSALS.md`) |
| **Reused by platforms** | P9 Luntian Catbalogan (the 2D "sea-level-rise exposure view", route `/map`) |
| **Data** | boundary, land, barangays, facilities, `hazard-stormSurge`, `derived/barangay-hazard` · optional heightmap (data pass 2) · 🟢 HDX + OSM, 🟡 CDRRMO storm-surge risk map (permission); heightmap 🟢 public DEM or 🟡 NAMRIA · synthetic: stylised terrain (seed 102) when no heightmap exists |
| **AI in the app** | none |
| **Skills to use** | `r3f-scenes` (read it first: time-box, terrain, water, camera presets, performance budget), `gsap-motion` (water tween, count-ups), `maplibre-gis` (2D view), Design plugin `accessibility-review` |

Extra libraries already installed: `three`, `@react-three/fiber` (v9), `@react-three/drei`, `@types/three`.

> Raise the water over a 3D Catbalogan and watch the number of schools, health facilities and barangays in the mapped storm-surge zones climb. The 3D makes the scale felt; the CDRRMO map does the counting.

## Problem

Inundation and surge polygons are abstract to non-specialists, so councils plan without feeling the scale (`docs/proposal.md`). A flat map of colored zones doesn't say "this much water, this far inland". Tubig pairs a 3D visual with numbers that come from the mapped storm-surge zones, and it says plainly which parts are real data and which are illustration.

**Data reality.**
- Real elevation in the archive exists only for Calbayog. A Catbalogan heightmap is a pass-2 task of the data session (brief `00-data` in the monorepo) and may never arrive.
- The app must build, run and demo fully **without** it, using a clearly labelled stylised terrain generated from the city outline.
- The counts never depend on the terrain.

## Users and routes

| Role | Route | Device in the demo | Needs |
|---|---|---|---|
| Planner / council member | `/` | laptop, 1280 px (full width) | 3D scene, water-level controls, live tallies |
| Planner (P9) | `/map` | laptop or phone | The 2D map the counts come from |
| Anyone | `/sources` | — | Attribution and disclaimer |

Use `AppShell width="full"` for `/` and `width="wide"` for `/map`. Nav: 3D view (`/`), Map view (`/map`), Data sources.

Smoke visits the `smokeRoutes` in `project.json` (only `/` and `/sources` by default), so also add these routes there or run `npm run smoke -- --route /map`.

## MVP requirements

Build in this order. R2.1 alone is a complete entry. It is the 2D version the `r3f-scenes` time-box falls back to, and the view P9 reuses. Until R2.2 exists, `/` redirects to `/map`.

| ID | Requirement | Acceptance criteria (testable) |
|---|---|---|
| R2.1 | **2D exposure view** at `/map`: water-level slider, presets and honest tallies | **Controls.** A slider from 0.5 to 4.5 m in 0.5 m steps, labelled "Sea-level rise / water height", plus SSA1, SSA2, SSA3 and SSA4 preset buttons that set the slider. `levelThreshold(waterM)` decides which surge levels count.<br>**Map.** Storm-surge zones at or above the threshold (`ZoneLayer hazard="stormSurge" minLevel={…}` + `Legend`). Facilities as two `PointLayer`s, exposed and not exposed. Barangays with ≥ 1% of their area in counted zones are outlined.<br>**Tallies.** `StatTile`s with count-up: exposed facilities in total and by kind (schools; health = `health` + `hospital`; other), and "barangays touched".<br>**Caption.** Always visible under the tallies: "Counted: facilities inside mapped storm-surge risk zones at {level} or above. Water height → zone level is an illustrative mapping." An expandable "How it's counted" shows the threshold table.<br>**Missing layer.** If the surge layer is missing, show `DataMissing` and "—" in every tally, never 0.<br>A list of exposed facilities (name, kind, level) sits under the map, so the map is not the only way in. |
| R2.2 | **3D scene** at `/` | **Loading.** `FloodScene` is loaded with `React.lazy`, so three.js is not in the `/map` chunk.<br>**Terrain source.** Use the real heightmap when `useOptionalLayer("heightmap-catbalogan.json")` from `@rcene/data` finds it; otherwise generate stylised terrain (seed 102). A badge is always visible: "Elevation: {source} · vertical exaggeration ×3" or "Stylised terrain — generated from the city outline, not real elevation".<br>**Water and controls.** The water plane tweens to the slider height (GSAP with `invalidate` on update). The controls and tallies panel is the same component and store as R2.1.<br>**Camera.** Three presets (Overview, Coastline, Uplands) via drei `CameraControls.setLookAt(…, true)`. SSA presets also move the camera to Coastline.<br>**Budget.** The `r3f-scenes` performance budget: `dpr={[1, 1.5]}`, ≤ 256 × 256 segments, one hemisphere + one directional light, no shadows, `frameloop="demand"`. Terrain generation shows `LoadingState` and finishes in < 2 s on the demo laptop. |
| R2.3 | **Facility markers in 3D** | One `instancedMesh` for all facilities, placed at the terrain height sampled at each point. Exposed facilities are colored and larger. Exposure is R2.1's surge-zone result, **not** the water plane, and the legend says so: "Marker color = mapped storm-surge zone, not the 3D water". |
| R2.4 | **WebGL fallback** | Check for WebGL2 **before** mounting the `<Canvas>`. Without it, show a card: "3D needs WebGL. The counts and the map view still work", with a link to `/map`. Wrap the Canvas in `ErrorBoundary` for runtime failures. The controls and tallies still render. The capability check path logs no console errors. |
| R2.5 | Language toggle EN / Waray / Filipino | Every UI string, preset label and caption comes from `src/i18n/strings.ts`. The choice persists. No hard-coded UI text. |
| R2.6 | `/sources` and disclaimer footer on every view | `SourcesPage`, plus an app section "Synthetic data in this app" (passed as `extra` entries or `children`): stylised terrain (seed 102), when used, and the water-height → zone-level table, credited as an app assumption. The heightmap's own attribution comes from its metadata when present. The footer comes with `AppShell`. |

## Domain functions (test-first in `src/domain/`)

**Presets and exposure**

- `SSA_PRESETS = [{ id: "ssa1", waterM: 1 }, { id: "ssa2", waterM: 2 }, { id: "ssa3", waterM: 3 }, { id: "ssa4", waterM: 4 }]`, in `src/content/presets.ts`. These are **illustrative visual heights**, not official NOAH advisory heights; a code comment and the "How it's counted" panel say so.
- `levelThreshold(waterM: number): Level` returns `veryHigh` below 1.5, `high` below 2.5, `moderate` below 3.5, and `low` otherwise. It clamps the input to [0.5, 4.5]. Cases:
  - 0.5, 1.0 and 1.49 → `veryHigh`
  - 1.5 and 2.0 → `high`
  - 2.5 and 3.0 → `moderate`
  - 3.5, 4.0 and 4.5 → `low`
  - SSA1…SSA4 map to `veryHigh` … `low` in order
  - 0 and 9 clamp
- `facilityExposure(classified: { feature: FacilityFeature; status: Partial<Record<Hazard, HazardStatus>> }[], threshold: Level): { total: number; byKind: { school: number; health: number; other: number }; exposed: FacilityFeature[] } | null` returns `null` when no item has a `stormSurge` status (layer missing). Cases:
  - `inZone` below the threshold is not exposed
  - `notInZone` and `outsideCoverage` are not exposed
  - `hospital` counts as `health`
  - raising the threshold never increases the total
- `barangaysTouched(rows: BarangayHazardRow[], threshold: Level, minShare = 0.01): string[] | null` sums the `stormSurge` shares at levels ≥ the threshold and returns `null` when no row has a `stormSurge` key. Cases: a 0.5% share is not touched; the result for `low` is a superset of the result for `high`.

**Terrain**

- `terrainFrame(meta: TerrainMeta, size = 10, exaggeration = 3)` copies the `r3f-scenes` "Geography → scene coordinates" helper. Cases: the west-south corner maps to x = −size/2 and z = +depth/2; north-east maps to +size/2 and −depth/2; `elevToY(minElev) === 0`.
- `landMask(area: BoundaryCollection, bounds: [number, number, number, number], w: number, h: number): Uint8Array` gives 1 for land, testing each cell center with `pointInArea`. Case: a square covering the west half of the bounds gives 1s in the west columns only.
- `distanceToSea(mask: Uint8Array, w: number, h: number): Float32Array` is a two-pass chamfer distance, in cells, from each land cell to the nearest sea cell. Cells beyond the grid edge count as sea, and sea cells are 0. Cases: the 1 × 5 strip `[0, 1, 1, 1, 0]` → `[0, 1, 2, 1, 0]`; on a 3 × 3 all-land grid the center is farther than the edges.
- `stylisedHeights(mask: Uint8Array, w: number, h: number, cellKm: number, seed = 102): Float32Array`. Sea cells are −10 m. Land cells are `min(450, 6 + distKm × 110) × (0.8 + 0.4 × smoothNoise)`, with value noise from `createRng(seed)`. Cases:
  - every sea cell is −10
  - the same seed gives an identical array, and another seed a different one
  - mean height of land cells ≥ 3 cells from sea > mean height at 1 cell
- `decodeHeightmap(rgba: Uint8ClampedArray, w: number, h: number, meta: TerrainMeta): Float32Array` reads the red channel, mapping 0 to `minElev` and 255 to `maxElev`. Case: a 2-pixel image of [0, 255] → [minElev, maxElev].
- `sampleGrid(grid: Float32Array, w: number, h: number, bounds, lngLat: LngLat): number | null` interpolates bilinearly. Cases: the four corners return their exact values; the center of a 2 × 2 grid returns the mean; outside the bounds returns `null`.

## Data

- `useLayer("boundary")`, `useLayer("land")`, `useLayer("barangays")`, `useLayer("facilities")`, `useLayer("derived/barangay-hazard")`, `useZones(["stormSurge"])`. Pass them to `AppShell layers` for the "Sample data" badge.
- Facility statuses come from `classifyPoints(facilities, { stormSurge }, boundary)` from `@rcene/geo`, computed once and memoized. The counts are then pure filters by threshold.
- **Heightmap contract.** It comes from data pass 2 and is not in `LAYER_FILES`; load it with `useOptionalLayer` (the `r3f-scenes` skill follows the same contract):
  - `/data/heightmap-catbalogan.png`: 8-bit grayscale, ≤ 1024 px on the long edge, EPSG:4326, black = `minElev`.
  - `/data/heightmap-catbalogan.json`: `{ "image": "heightmap-catbalogan.png", "bounds": [w, s, e, n], "minElev": number, "maxElev": number, "source": string, "tier": "open" | "permission" }`.
  - `useOptionalLayer("heightmap-catbalogan.json", schema)` checks `/data/manifest.json` first and returns `absent` without requesting the file, so there are never 404 requests. Request the PNG (`createImageBitmap`) only after the JSON is ready. If the data session ships other names, change the one constant `HEIGHTMAP` in `src/three/terrain-source.ts` and say so in `NOTES.md`.
- **One terrain pipeline.** Both sources produce the same `{ kind: "real" | "stylised", grid: Float32Array, w, h, bounds, minElev, maxElev, source }`, and one `Terrain` component displaces plane vertices from the grid and calls `computeVertexNormals`. Use vertex colors by height, with no `displacementMap` branch.
  - **Real:** `createImageBitmap` → canvas → `getImageData`, downsampled to ≤ 256 × 256.
  - **Stylised:** bounds are the boundary bbox padded by 15%; the grid is 128 × 128; the mask comes from `land`, falling back to `boundary`.
- Store: `createSyncedStore("02-tubig:app", …, { version: 1 })` with `{ waterM: number; presetId: "ssa1" | "ssa2" | "ssa3" | "ssa4" | null }`, defaulting to `0.5` and `null`, so the slider position survives a reload and both views agree. The camera preset is UI-only.
- There are no symbol or text layers on the 2D map (the offline basemap has no glyphs), and no 3D text. Names appear in the DOM list.

## Experience

- **Layout:** a dark scene card with the controls and tallies docked on the right on a laptop and below on a phone. Tallies are DOM, not 3D text.
- **Wow moment:** click **SSA3**.
  - The camera glides to the coastline.
  - The water rises in an eased 0.8 s tween.
  - Exposed markers turn red with a short stagger, and the tallies count up.
  - Recipes: `r3f-scenes` **Water level** and **Camera presets**; `gsap-motion` **Count-up numbers** (or `StatTile countUp`).
- **Honesty is part of the design.** The terrain badge and the "Counted: …" caption are always on screen, never hidden in a tooltip.
- **Accessibility:**
  - The slider has `aria-valuetext="2.5 metres"`, and preset buttons use `aria-pressed`.
  - The canvas wrapper has `role="img"` and an `aria-label` describing the scene and the current counts.
  - Every number is also text.
  - The keyboard alone can drive everything; no drag is required.
  - Under `prefers-reduced-motion`, the water and camera jump instead of tweening.

## Golden-path demo (≤ 2 minutes)

1. `/` at 1280 px. Point at the terrain badge ("Stylised terrain — not real elevation", or the real source). Overview camera, water at 0.5 m, the first counts.
2. Click **SSA2**. The camera moves to the coastline, the water rises and the counts climb. Read the caption aloud: "Counted from the mapped storm-surge zones, High or above."
3. Drag the slider to 4.5 m. The counts step up at 2.5 m and 3.5 m.
4. Press the **Uplands** camera preset. The markers there stay grey: they are not in mapped surge zones.
5. Open **Map view** (`/map`): the same numbers on the 2D surge map. "The 3D is the picture; the map is the evidence."
6. Switch to Waray, then open `/sources`.

## Definition of done

- [ ] R2.1–R2.6 meet their acceptance criteria
- [ ] Domain tests pass: `npm run test`
- [ ] `npm run typecheck` and `npm run build` pass
- [ ] `npm run smoke` passes (offline, no console errors, axe clean, screenshots at 390 and 1280)
- [ ] Every string comes from `src/i18n/strings.ts` (en + war + fil drafts); AI-drafted Waray/Filipino strings listed in `NOTES.md` under "Translations to review"
- [ ] `/sources` lists every dataset used; disclaimer footer on every view
- [ ] `STATUS.md`, `AI-LOG.md` (one row per commit) and `DEMO.md` are current

## Out of scope

- Hydrodynamic modelling and real inundation depth.
- Rain-flood scenarios (the flood layer).
- Per-building exposure and population counts.
- Online DEM or terrain tiles: they need the internet at demo time.
- Satellite imagery.
- Any claim that the 3D water line is where the sea would reach.

## Stretch (only after the definition of done is met)

- A "bathtub" count mode, available **only when the heightmap is real**: a facility is exposed if its sampled elevation ≤ the water level. Label it "bathtub approximation: ignores defences and connectivity" and show it beside the surge-based count, never in place of it.
- NAMRIA sea-level-rise inundation polygons (🟡) replacing the threshold table, if the data session adds them.
- Barangay outlines draped on the terrain.
- A subtle animated water surface (a normal map), within the performance budget.

## Platform hooks

- Export `routes`.
- Export the 2D `ExposureMap`, `WaterControls` and `ExposureTallies` components and the pure `levelThreshold`, `facilityExposure` and `barangaysTouched`.
- Keep three.js only inside the lazily loaded `FloodScene` chunk, so P9 can mount `/map` as its sea-level-rise exposure view without pulling in three.js.
