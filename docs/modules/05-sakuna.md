> **Module brief** (reference). This is the spec of app #05 Sakuna Sim, copied from the monorepo's `docs/projects/05-sakuna.md`. Its paths and ports are that app's. In P1 Andam Catbalogan, `docs/brief.md` says which parts to lift or build, and wins where they differ.

# 05 · Sakuna Sim

| | |
|---|---|
| **App** | `apps/05-sakuna` · dev port 5105 · preview 6105 |
| **Batch** | 2 |
| **Proposal** | `docs/proposal.md` (#5 in the monorepo's `docs/PROPOSALS.md`) · this is **Core 2 of `docs/PRD.md`** (Andam Catbalogan scenario console, R2.1–R2.3) |
| **Reused by platforms** | P1 Andam Catbalogan (`/console` is the CDRRMO view; its `activeScenarioId` drives #1 and #3) |
| **Data** | boundary, barangays, facilities, all five `hazard-*` layers, `derived/barangay-hazard`, `derived/facility-hazard` · 🟢 HDX + OSM, 🟡 CDRRMO risk maps (permission) · synthetic: candidate capacities (seed 101), illustrative barangay populations (seed 105) |
| **AI in the app** | none |
| **Skills to use** | `gsap-motion` (read the **Scrubbable timeline** and **Count-up numbers** recipes first), `maplibre-gis`, `dataviz` (tallies), Design plugin `ux-copy` (warning and "illustrative" wording) |

> Raise a typhoon scenario and play it forward, from T-24h to landfall to recovery. Watch which barangays are affected, which schools and health facilities sit in the zones, and which evacuation centers would overflow.

## Problem

The LGU portal's gap list records "no scenario simulation", and drills run on paper. When a warning is raised, nobody can see which barangays and facilities it touches, or whether the candidate evacuation centers outside the zones could hold the people who need them (PRD §2, problem 4). Sakuna Sim turns the CDRRMO's own risk maps into a tabletop exercise: pick a preset, raise it, scrub the timeline.

## Users and routes

| Role | Route | Device in the demo | Needs |
|---|---|---|---|
| CDRRMO operator | `/console` | laptop window, 1280 px | Pick a preset, raise or lower it, see affected barangays, exposed facilities and overflow, run the timeline |
| Drill participants / public | `/` (overview) | second window (phone width or wide) | The active warning and its impact at a glance; updates live |
| Anyone | `/sources` | — | Attribution and disclaimer |

Use `AppShell width="full"` for `/console` and `width="wide"` for `/` (it must also work at 390 px). Turn `showReset` on. Nav: Overview (`/`), Console (`/console`), Data sources.

Smoke visits the `smokeRoutes` in `project.json` (only `/` and `/sources` by default), so also add these routes there or run `npm run smoke -- --route /console`.

## MVP requirements

Build in this order. R5.1 alone is a complete entry: a scenario console with honest tallies.

| ID | Requirement | Acceptance criteria (testable) |
|---|---|---|
| R5.1 | **Scenario console** (PRD R2.1 + R2.2) at `/console` | The five presets of PRD §8.3, exactly, as a radio group showing each preset's hazards and minimum level. Selecting a preset previews its effect; **Raise warning** makes it active (only one at a time, so raising another replaces it), and **Lower warning** clears it. Preview and raised look clearly different: raised adds the warning banner.<br>The map shows the scenario's zones (`ZoneLayer` with `minLevel`), affected barangays filled with opacity by share and outlined, and exposed facilities as points.<br>`StatTile`s with count-up: affected barangays ("n of N"), and exposed facilities in total and by kind (schools; health = `health` + `hospital`; other).<br>The affected list is sorted by share and shows "% of area".<br>Rules: a barangay is **affected** when, for some scenario hazard, the sum of its shares at levels ≥ `minLevel` is ≥ 1% (the UI says "≥ 1% of its area"). A facility is **exposed** when any scenario hazard's status is `inZone` at ≥ `minLevel`; each facility counts once.<br>A missing hazard layer shows "Not counted: {hazard} layer not loaded" and is never counted as zero. |
| R5.2 | **Live sync** (PRD R2.3) to the overview `/` | With no warning: "No active warning" (`EmptyState`). With a warning: a banner with the scenario label and raised time, the same tallies, and the affected-barangay list. Raising or lowering in `/console` updates `/` in another window in < 1 s; a reload of either window restores the state. The persisted field is named `activeScenarioId` (PRD §7). |
| R5.3 | **Which centers would overflow** (illustrative) | Candidate centers are OSM schools with seeded capacity (seed 101, range 150–600) and the badge **Candidate — not verified by CDRRMO**. Centers inside a scenario zone at ≥ `minLevel` are listed as "Excluded — inside {hazard} zone".<br>Evacuees per affected barangay = `round(population × share × rate)`. Each barangay's evacuees go to the nearest **non-excluded** center from the barangay's anchor point (straight-line, labelled). Centers whose load exceeds capacity are listed as "Would overflow by N", largest first. Barangays with no eligible center are listed as "No eligible center".<br>A rate slider runs from 10% to 60% in 5% steps (default 25%).<br>The whole panel carries the badge "Illustrative — synthetic population; candidate centers not verified by CDRRMO". Map markers distinguish eligible, excluded and would-overflow by shape + color, and the list repeats that information as text. |
| R5.4 | **Timeline stepper**, one paused GSAP timeline | Phases T-24h, T-12h, Landfall, Recovery (T+48h). Controls: a scrub slider (`input type="range"`, keyboard-operable, `aria-valuetext="T minus 12 hours"`), step buttons (`tweenTo(label)`), and Play/Pause.<br>As time moves:<br>- a clock readout updates<br>- the phase card shows that phase's actions checklist from `src/content/phases.ts` (en + war + fil)<br>- each center's load bar fills to `load × evacuatedFraction(hours) / capacity` (bars use `scaleX`, capped visually at 120%)<br>- "Would overflow" badges appear only while a bar is above 100%<br>- an "Evacuees in centers" counter follows the curve<br>Scrubbing backwards reverses everything exactly. Disabled with a message until a warning is raised. The timeline position is per window, not synced or persisted. Under reduced motion, step buttons `seek` (no tween) and Play advances one phase every 2 s with no interpolation. |
| R5.5 | Language toggle EN / Waray / Filipino | Scenario labels (`scenario.<id>`), phase content and every UI string come from the string table. The choice persists across reloads. No hard-coded UI text. |
| R5.6 | `/sources` and disclaimer footer on every view | `SourcesPage`, plus an app section "Synthetic data in this app" (passed as `extra` entries or `children`): candidate capacities (seed 101), illustrative population (seed 105, "not PSA census data"), and the evacuation curve (an authored assumption). The footer comes with `AppShell`. |

## Domain functions (test-first in `src/domain/`)

**Scenarios and impact**

- `SCENARIOS: Scenario[]`, with `Scenario = { id: string; hazards: Hazard[]; minLevel: Level }`, holds the PRD §8.3 table verbatim (`surge`, `flood`, `landslide`, `typhoon`, `quake`). Test that ids are unique and each row matches the table.
- `affectedShare(row: BarangayHazardRow, s: Scenario): number | null` is the max over the scenario's hazards of `min(1, Σ shares at levels ≥ minLevel)`. It returns `null` when every scenario hazard is missing from `row.hazards`. Cases:
  - `surge` with `{ moderate: 0.2, high: 0.1 }` → 0.3
  - `surge` with `{ low: 0.9 }` → 0
  - `quake` (min `high`) with groundShaking `{ moderate: 0.9 }` → 0; with `{ high: 0.2 }` → 0.2
  - `typhoon` takes the max across its three hazards
  - overlapping shares summing above 1 → 1
- `affectedBarangays(s: Scenario, rows: BarangayHazardRow[], minShare = 0.01): { affected: { barangay: string; share: number; hazards: Hazard[] }[]; missing: Hazard[] }`. PRD §7 lists `affectedBarangays(scenario, zones, barangays)`. This app computes the same answer from the derived table, so there is no overlay in the browser. Keep the name so P1 recognises it. Cases: a share below 1% is excluded; sorting is by share descending, then name; missing hazards are collected once.
- `exposedFacilities(s: Scenario, rows: FacilityHazardRow[]): Map<string, { hazard: Hazard; level: Level }[]>`. Cases: `notInZone` and `outsideCoverage` are not counted; a level below `minLevel` is not counted; a facility in two hazards is one entry with two items.

**Centers and evacuees**

- `candidateCenters(facilities: FacilityCollection, seed = 101): Center[]` uses the `Center` shape from PRD §7 and the same rule as #3: schools sorted by id, capacity `rng.int(15, 60) * 10`, `status: "candidate"`, `source: "OSM"`. Cases: deterministic; capacities within range.
- `excludedCenters(centers: Center[], rows: FacilityHazardRow[], s: Scenario): Map<string, { hazard: Hazard; level: Level }>`. A center's id is its facility id. Case: a center in a surge zone below `minLevel` is not excluded.
- `illustrativePopulation(barangays: BarangayCollection, seed = 105): Record<string, number>` is `rng.int(30, 400) * 10` per barangay, in feature order, so it falls in [300, 4000]. Case: deterministic.
- `anchorsFor(barangays: BarangayCollection): Record<string, LngLat>` uses turf `pointOnFeature`, so the point is inside the polygon. Case: each fixture anchor passes `pointInArea`.
- `estimateEvacuees(affected, population, rate): Record<string, number>`. Cases: rounding; a missing population gives 0.
- `assignToCenters(evacuees, anchors, centers, excludedIds: Set<string>): { load: Record<string, number>; assignment: Record<string, string | null> }`. Cases:
  - the nearest non-excluded center is chosen, even when an excluded one is nearer
  - equal distances break by id
  - with no eligible center the assignment is `null` and the evacuees are added to no load
- `overflow(centers: Center[], load: Record<string, number>): { center: Center; load: number; over: number }[]` keeps only `over > 0`, sorted descending.

**Timeline**

- `PHASES = [{ id: "t-24", hours: -24 }, { id: "t-12", hours: -12 }, { id: "landfall", hours: 0 }, { id: "recovery", hours: 48 }] as const`.
- `evacuatedFraction(hours: number): number` is piecewise linear through (−24, 0.10), (−12, 0.50), (0, 1.00), (24, 0.60), (48, 0.20), clamped outside that range. This is an authored, illustrative curve. Cases: each knot exactly; −18 → 0.30; −30 → 0.10; 60 → 0.20.
- `phaseAt(hours: number): PhaseId` returns the last phase whose `hours` ≤ the input. Cases: −24 → `t-24`; −1 → `t-12`; 0 → `landfall`; 47 → `landfall`; 48 → `recovery`.

## Data

- `useLayer("barangays")`, `useLayer("boundary")`, `useLayer("facilities")`, `useLayer("derived/barangay-hazard")`, `useLayer("derived/facility-hazard")`, plus `useZones()` for the zone overlay of the selected scenario. Pass them all to `AppShell layers`.
- Synthetic data, regenerated from the seed and never persisted:
  - capacities (seed 101)
  - one illustrative population per barangay (seed 105), labelled "Illustrative population — not PSA census data"
  - there are no household or person records
- Store: `createSyncedStore("05-sakuna:scenario", …, { version: 1 })` with `{ activeScenarioId: string | null; raisedAt: string | null; draftScenarioId: string; evacRate: number }`. Defaults: `null`, `null`, `"surge"`, `0.25`. Only `/console` writes, and `/` only reads. `activeScenarioId` holds an id from `SCENARIOS`, so it is compatible with PRD §7.
- Everything is computed with `useMemo` from the derived tables. There is no geometry overlay in the browser except `pointOnFeature` and straight-line `nearest`.
- There are no symbol or text layers (the offline basemap has no glyphs). Names appear in DOM lists and popups.

## Experience

- **Console layout:** the map takes the left two thirds. The right column holds the preset picker (radio cards with hazard icons), a big Raise/Lower button, the tallies and the overflow list. The timeline runs the full width along the bottom: phase markers, scrubber, play.
- **Tone:** calm and neutral until a warning is raised. Raising sweeps in an amber banner (GSAP timeline), fades in the affected barangays and counts up the tallies.
- **Wow moment:** press Play from T-24h. The clock ticks, center bars fill, two centers tip past 100% and flip to "Would overflow by 120", and the evacuee counter climbs. Drag back and it all reverses exactly, because it is one timeline. Recipe: `gsap-motion` **Scrubbable timeline** + **Count-up numbers**.
- **Implementation note:**
  - The timeline tweens a proxy `{ hours }`. Its `onUpdate` writes text through refs and bar transforms with `gsap.set`.
  - React state changes only when the phase changes, never 60 times a second.
  - Never animate `width`.
  - Don't tween map paint from GSAP. If the map should react to time, set the paint property only on phase change.
- **Accessibility:**
  - The presets are a keyboard radio group.
  - Raise/Lower is a real button whose label states the action.
  - A polite live region announces "Warning raised: {scenario}", lowering, and each phase change.
  - Overflow and exclusion are always written as text, not shown by color alone.
  - `prefers-reduced-motion` is respected as described in R5.4.

## Golden-path demo (≤ 2 minutes)

Setup: `/console` on the left at 1280 px and `/` on the right, both on port 5105. Press **Reset demo**.

1. `/console` is calm. Select "Typhoon — Storm surge": the preview shows the zones and the counts it would affect.
2. Press **Raise warning**. The banner sweeps in, and the affected-barangay and exposed-facility counts climb. The `/` window switches to the warning within a second.
3. The overflow panel shows "3 centers excluded — inside storm-surge zone" and "2 centers would overflow" with the illustrative badge. Raise the rate to 40% and the overflow grows.
4. Timeline: press Play from T-24h to Landfall. Bars fill and overflow badges appear. Scrub back to T-12h and they reverse.
5. Select "Earthquake" (min level High) and raise it. It replaces the surge warning, with different barangays and counts.
6. Press **Lower warning**. Both windows return to calm. Open `/sources`.

## Definition of done

- [ ] R5.1–R5.6 meet their acceptance criteria
- [ ] Domain tests pass: `npm run test`
- [ ] `npm run typecheck` and `npm run build` pass
- [ ] `npm run smoke` passes (offline, no console errors, axe clean, screenshots at 390 and 1280)
- [ ] Every string comes from `src/i18n/strings.ts` (en + war + fil drafts); AI-drafted Waray/Filipino strings listed in `NOTES.md` under "Translations to review"
- [ ] `/sources` lists every dataset used; disclaimer footer on every view
- [ ] `STATUS.md`, `AI-LOG.md` (one row per commit) and `DEMO.md` are current

## Out of scope

- The resident point lookup (#1).
- Live headcounts entered by center staff (#3).
- Routing (distances are straight-line).
- Real population figures and weather or PAGASA feeds.
- Saving or sharing scenarios.
- Accounts, SMS and push alerts.

## Stretch (only after the definition of done is met)

- PRD S4: storm-surge advisory variants SSA1–4 as extra presets. This needs per-SSA layers from the data session, so request them in `NOTES.md`; never invent them.
- A drill log: timestamped notes per phase, exported as a `.txt` download (`downloadText` from `@rcene/ui`).
- A printable one-page briefing (affected barangays, exposed facilities, overflow) via `window.print()` with print CSS.
- Replace the illustrative population with PSA 2020 barangay counts (🟢 open) if the data session adds them.

## Platform hooks

- Export `routes`.
- Export `SCENARIOS`, `affectedBarangays`, `exposedFacilities` and `evacuatedFraction`, and the `ScenarioPicker`, `ImpactTallies`, `OverflowPanel` and `ScenarioTimeline` components with no app globals: they take `scenario` and data as props.
- Keep the field name `activeScenarioId` so P1 can lift it into its `andam` store unchanged.
- Give `assignToCenters` / `OverflowPanel` an optional `liveOccupancy?: Record<string, number>` parameter (unused here), so P1 can add #3's real headcounts to the illustrative load.
