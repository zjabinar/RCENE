> **Module brief** (reference). This is the spec of app #04 Bantay Barangay, copied from the monorepo's `docs/projects/04-bantay.md`. Its paths and ports are that app's. In P1 Andam Catbalogan, `docs/brief.md` says which parts to lift or build, and wins where they differ.

# 04 · Bantay Barangay

| | |
|---|---|
| **App** | `apps/04-bantay` · dev port 5104 · preview 6104 |
| **Batch** | 1 |
| **Proposal** | `docs/proposal.md` (#4 in the monorepo's `docs/PROPOSALS.md`) |
| **Reused by platforms** | P1 Andam Catbalogan (stretch: the plain-language barangay explainer), P10 Barangay 360 (hazard-exposure panel for one barangay) |
| **Data** | boundary, barangays, facilities, all five `hazard-*` layers, `derived/barangay-hazard`, `derived/facility-hazard` · 🟢 HDX + OSM, 🟡 CDRRMO risk maps (permission) · no synthetic data |
| **AI in the app** | none |
| **Skills to use** | `dataviz` (choropleth ramp, breakdown bars, legend; read it before any chart), `maplibre-gis`, `gsap-motion` (count-up), Design plugin `ux-copy` (index wording) and `accessibility-review` |

Extra libraries already installed: `recharts` and `@tanstack/react-table` (v8 API).

> Every barangay ranked by a transparent exposure index you can take apart. Click one to see exactly which mapped zones and facilities put it there; move a weight slider and watch the ranking change.

## Problem

The LGU portal's own gap analyses record "risk scores with no explanation and no scenario simulation". Today's risk score is a hand-tuned average with invisible weights, so decision-makers can't see why a barangay ranks high or argue with the weighting. Bantay replaces it with an index where every point traces back to a mapped zone or an exposed facility, and the weights are on screen. It is presented as an adjustable index, **never** as a prediction or a risk score.

## Users and routes

| Role | Route | Device in the demo | Needs |
|---|---|---|---|
| CDRRMO / MDRRMO analyst | `/` | laptop, 1280 px or wider | Rank barangays, see why, adjust weights, export |
| Same | `/b/:barangay` | same | Deep link that opens one barangay's breakdown (URL-encoded name) |
| Anyone | `/method` | — | How the index is calculated, in plain language, with the current weights |
| Anyone | `/sources` | — | Attribution and disclaimer |

Use `AppShell width="full"` for `/` and `/b/:barangay` and `width="wide"` elsewhere. At 390 px, `/` stacks as map → weights → breakdown → table and must stay usable, because the smoke test takes a phone screenshot.

Smoke visits the `smokeRoutes` in `project.json` (only `/` and `/sources` by default), so also add these routes there or run `npm run smoke -- --route /method --route /b/<a barangay name>`.

## MVP requirements

Build in this order. R4.1 alone is a complete entry: a ranked, explainable map with default weights.

| ID | Requirement | Acceptance criteria (testable) |
|---|---|---|
| R4.1 | **Choropleth + ranked table** with default weights | Every barangay in `barangays` (57 real, 6 fixtures) is filled by its exposure index (0–100), using a 5-class sequential ramp with equal intervals (0–20 … 80–100). The legend shows the class ranges. The ramp must be distinct from the hazard-level colors (`dataviz` skill; readable with color-vision deficiency). The ranked table uses TanStack Table v8 (`useReactTable`, `getCoreRowModel`, `getSortedRowModel`, `flexRender`) and the `@rcene/ui/components/table` markup. Columns: rank, barangay, index (number + inline bar), top contributor, facilities exposed. Default sort is index descending; every column is sortable by click and keyboard, with `aria-sort`. Clicking a barangay on the map or a row selects it: an outline on the map, a highlighted row, and the URL `/b/:barangay`. Rows join to `derived/barangay-hazard` by `psgc` first, then by normalized name. A barangay with no derived row shows "No derived data" and is left out of the ranking, not ranked as 0. The index is labelled **Exposure index** with the sub-label "adjustable — not a prediction". The words "risk score" and "prediction" never appear except in that sub-label. |
| R4.2 | **Breakdown panel** for the selected barangay | Four parts:<br>(a) A plain-language summary built from `explain`, e.g. "54% of its area is in mapped storm-surge zones (High: 31%); 3 facilities sit in moderate-or-higher zones".<br>(b) One stacked horizontal bar per hazard showing the share of area by level (Recharts, `LEVEL_HEX` colors with level labels and % value labels). A hazard with no zones reads "No mapped zones in this barangay"; a missing layer reads "Layer not loaded".<br>(c) Exposed-facility counts per hazard × level (from the derived table), plus a named list of the barangay's facilities in a moderate-or-higher zone, each with kind icon and levels (from `derived/facility-hazard` + `facilities`).<br>(d) "Why this index" contribution bars that add up to the index (±0.1).<br>Opening `/b/:barangay` directly shows the same panel. |
| R4.3 | **Live weights** | Integer sliders from 0 to 5 for each of the five hazards plus "Exposed facilities". Moving a slider recomputes and re-ranks within one frame (< 50 ms for 57 barangays). The table re-orders with Motion `layout="position"`, the map recolors, and each row shows a rank-change chip against the default weights (▲2 / ▼1, with text for screen readers). **Reset to defaults** is available. With all weights at 0, the app shows "Set at least one weight above zero" and no ranking. Weights persist across reloads and sync across windows. |
| R4.4 | **Export the ranked list as CSV** | A button downloads `bantay-exposure-index-YYYY-MM-DD.csv` with `downloadCsv` from `@rcene/ui` (Blob + object URL; works offline). Content comes from `exportCsv` with a UTF-8 BOM, English headers whatever the UI language, and the weight columns included so the file describes itself. |
| R4.5 | **Method page** + language toggle EN / Waray / Filipino | `/method` explains, in plain language:<br>- the formula and the current weights<br>- the level-weight table<br>- the facility term, relative to the most exposed barangay<br>- the limits: "Based on mapped zones and facility locations only. It does not include population, building type or social vulnerability. Weights are a policy choice, not a finding."<br>The language choice persists. No hard-coded UI text. |
| R4.6 | `/sources` and disclaimer footer on every view | `SourcesPage` lists the boundaries, risk maps, facilities and both derived tables. The footer comes with `AppShell`. |

## Domain functions (test-first in `src/domain/`)

**Formula** (show it on `/method` exactly like this):

- `E_h = min(1, Σ_level share_h,level × LW_level)`, where share is the area share from the derived table and `LW = { low: 0.25, moderate: 0.5, high: 0.75, veryHigh: 1 }`.
- `N = Σ` over hazards with weight > 0 of the exposed facilities at level ≥ moderate. These are facility–hazard exposures, so one facility in two hazards counts twice; say so on `/method`.
- `F = N / max N over all barangays`, or 0 when that max is 0.
- `index = 100 × (Σ_h w_h·E_h + w_f·F) / (Σ_h w_h + w_f)`.

**Functions:**

- `LEVEL_WEIGHTS` and `DEFAULT_WEIGHTS: Weights = { flood: 3, landslide: 3, stormSurge: 3, groundShaking: 1, liquefaction: 1, facilities: 2 }`. Label the defaults in the UI as "a starting point, not an official weighting". Ground shaking defaults low because it covers most of the city and barely separates barangays.
- `hazardExposure(shares?: Partial<Record<Level, number>>): number`. Cases:
  - `undefined` or `{}` → 0
  - `{ high: 0.4 }` → 0.3
  - `{ low: 1, veryHigh: 1 }` → 1 (clamped; levels can overlap, see `scripts/data/derive.mjs` in the monorepo)
- `facilityCount(row: BarangayHazardRow, weights: Weights): number`. Cases:
  - low-level exposures ignored
  - a hazard with weight 0 contributes nothing
  - missing `exposedFacilities` → 0
- `scoreAll(rows: BarangayHazardRow[], weights: Weights): { allZero: boolean; scored: Scored[] }`, where `Scored = { barangay; psgc?; index; exposure: Record<Hazard, number>; facilities: number; facilityTerm: number; contributions: Record<Hazard | "facilities", number>; missing: Hazard[] }`. Cases:
  - a hand-computed two-row example, written out in the test
  - contributions sum to `index` (±1e-9)
  - all weights 0 → `allZero: true` and every index 0
  - multiplying every weight by 2 leaves every index unchanged
  - a hazard key absent from `row.hazards` → exposure 0 and the hazard listed in `missing`
- `rank(scored: Scored[]): Ranked[]` sorts by index descending, then by barangay name (`localeCompare(…, "en")`), and numbers ranks 1..n. Case: equal indexes order by name.
- `rankDelta(current: Ranked[], baseline: Ranked[]): Record<string, number>`: positive means the barangay moved up. Case: a swap of two barangays gives +1 / −1.
- `joinRows(barangays: BarangayCollection, rows: BarangayHazardRow[]): { byName: Map<string, BarangayHazardRow>; unmatched: string[] }` matches on `psgc` first, then on the normalized name (trim, lower-case, collapse whitespace). Cases: psgc match wins over a differing name; a case- or space-only difference still matches; extra rows are reported.
- `explain(s: Scored, r: Ranked, total: number): ExplainParts` returns structured data only (the top two contributors, each hazard's total share and highest level, facility count). The UI turns it into a sentence with `t()`. Case: a barangay with no zones → `{ kind: "noMappedZones" }`.
- `exportCsv(ranked: Ranked[], scored: Scored[], weights: Weights): string` builds one row per barangay and serialises it with the shared `toCsv(rows, columns, { bom: true })` from `@rcene/data` (RFC 4180 quoting and CRLF are built in; don't hand-write them), with columns `rank,barangay,psgc,index,flood,landslide,stormSurge,groundShaking,liquefaction,facilities_exposed,w_flood,w_landslide,w_stormSurge,w_groundShaking,w_liquefaction,w_facilities`. Cases:
  - the header is exact
  - a name containing a comma or a quote is quoted and escaped (RFC 4180)
  - index has 1 decimal and exposures 3
  - CRLF line endings
  - n + 1 lines
- `colorClass(index: number): 0 | 1 | 2 | 3 | 4`, with breaks at 20/40/60/80. Cases: 0 → 0, 20 → 1, 100 → 4.

## Data

- `useLayer("barangays")`, `useLayer("boundary")`, `useLayer("facilities")`, `useLayer("derived/barangay-hazard")`, `useLayer("derived/facility-hazard")`. Use `useZones()` only for an optional zone overlay: one hazard at a time via `ZoneLayer` + `Legend`, off by default. Pass all of these layers to `AppShell layers` for the "Sample data" badge.
- Facility → barangay comes from `properties.barangay` when present, else `barangayAt`, computed once and memoized.
- Synthetic data: none.
- Store: `createSyncedStore("04-bantay:weights", …, { version: 1 })` with `{ weights: Weights }`. The selected barangay lives in the URL (`/b/:barangay`), not in the store.
- Choropleth: build one FeatureCollection with `index` and `cls` properties joined in, and draw it with your own `Source` + fill `Layer` (`fill-color` as a `match` on `cls`) plus a line layer filtered to the selected name. Pass the layer id in `interactiveLayerIds` and use `onFeatureClick`; set `showBarangays={false}` to avoid double outlines. There are no symbol or text layers (the offline basemap has no glyphs), so names appear in the table and panel only.

## Experience

- **Layout:** an analyst dashboard. The map takes about 60% of the width; the right column holds the weights card above the breakdown, and the table spans the full width under the map. The palette is neutral: hazard-level colors appear only in the breakdown bars, and the choropleth uses its own sequential ramp.
- **Wow moment:** drag **Storm surge** from 3 to 5 and **Ground shaking** from 1 to 0.
  - Coastal barangays climb the table (Motion `layout`) and ▲ chips appear.
  - The map recolors.
  - The selected barangay's contribution bars re-balance (Recharts animation), and its index counts to the new value (`StatTile countUp`).
  - Motion owns the rows, Recharts the bars, GSAP the numbers: one library per element.
- **Accessibility:**
  - Sliders have value text ("Storm surge weight: 5 of 5").
  - Table headers are keyboard-sortable, with `aria-sort`.
  - The table selects barangays too, so the map is never the only way in.
  - Each chart has a visually hidden table with the same numbers.
  - A polite live region announces "{barangay}: rank 3 of 57, index 61" on selection.
  - Reduced motion turns off layout animation and count-ups.

## Golden-path demo (≤ 2 minutes)

1. `/` on a laptop: the choropleth and ranked table with default weights. Point at the sub-label "Exposure index — adjustable, not a prediction".
2. Click the top-ranked barangay. The breakdown appears: the summary sentence, a storm-surge bar by level, three named schools in moderate-or-higher zones, and contribution bars that add up to the index.
3. Move Storm surge to 5 and Ground shaking to 0. Coastal barangays climb with ▲ chips and the map recolors.
4. Open `/method`: the formula with the current weights, and the limits.
5. Press **Export CSV** and open the file. The weight columns show how it was ranked.
6. Switch to Waray, then open `/sources`.

## Definition of done

- [ ] R4.1–R4.6 meet their acceptance criteria
- [ ] Domain tests pass: `npm run test`
- [ ] `npm run typecheck` and `npm run build` pass
- [ ] `npm run smoke` passes (offline, no console errors, axe clean, screenshots at 390 and 1280)
- [ ] Every string comes from `src/i18n/strings.ts` (en + war + fil drafts); AI-drafted Waray/Filipino strings listed in `NOTES.md` under "Translations to review"
- [ ] `/sources` lists every dataset used; disclaimer footer on every view
- [ ] `STATUS.md`, `AI-LOG.md` (one row per commit) and `DEMO.md` are current

## Out of scope

- Any prediction, ML model or "risk score" presented as fact.
- Population and vulnerability (CBMS is a separate permission decision for P3/P10).
- Historical incidents.
- Editing hazard data.
- Scenario raising (that's #5).
- Server-side export.

## Stretch (only after the definition of done is met)

- Adjustable level weights (an advanced section on `/method`).
- Compare two weight sets side by side (rank A vs rank B).
- A share link `/?w=3,3,3,1,1,2` that restores the weights.
- A phone-sized `/why/:barangay` page with only the plain-language explainer: the P1 "why is my barangay exposed?" stretch.

## Platform hooks

- Export `routes`.
- Export the pure `scoreAll`, `rank`, `explain`, `exportCsv` and `DEFAULT_WEIGHTS`.
- Keep `BarangayBreakdown` (props: `row`, `scored`, `facilities`) and `WeightsPanel` (props: `weights`, `onChange`) free of app globals, so P10 can mount the breakdown for one barangay and P1 can reuse `explain` for its resident explainer.
