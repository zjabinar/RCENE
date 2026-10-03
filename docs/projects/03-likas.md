# 03 · Likas

| | |
|---|---|
| **App** | `apps/03-likas` · dev port 5103 · preview 6103 |
| **Batch** | 1 |
| **Proposal** | `docs/PROPOSALS.md` #3 · this is **Core 3 of `docs/PRD.md`** (Andam Catbalogan, R3.1–R3.3) |
| **Reused by platforms** | P1 Andam Catbalogan (evacuation finder, `/center/:id`, `/board`), P4 Isla Link (board pattern; P4 is set aside in the `docs/PROPOSALS.md` decisions, so this only means keep the board generic) |
| **Data** | boundary, barangays, facilities (schools become candidate centers), all five `hazard-*` layers · 🟢 HDX + OSM, 🟡 CDRRMO risk maps (permission) · synthetic: illustrative candidate capacities (seed 101) |
| **AI in the app** | none |
| **Skills to use** | `maplibre-gis`, `gsap-motion` (count-ups, banner sweep), Motion `layout` for the board re-sort, Design plugin `ux-copy` (reasons and badges) and `accessibility-review` (board legibility) |

> Find the nearest evacuation center that is open, has room and is outside the active hazard, and watch every center fill up live on a public board as staff log arrivals. There is no server.

## Problem

Catbalogan has no mapped list of evacuation centers with capacities (PRD §2, problem 3) and no evacuation routing (one of the documented needs in `docs/PROPOSALS.md`), so nobody can tell a family where to go or whether there is room when they arrive. When a warning is raised, a center *inside* the hazard zone can still be listed as a destination (PRD §2, problem 4). Likas makes the eligibility rule explicit, visible and unit-tested, and syncs live headcounts across windows with no server.

## Users and routes

| Role | Route | Device in the demo | Needs |
|---|---|---|---|
| Resident | `/` | phone-width window (design at 390 px) | "Where do I go, and is there room?" |
| Center manager | `/center` (picker) → `/center/:id` | small window | Log arrivals and departures; open or close the center |
| Public display | `/board` | projector or second screen, 1920 × 1080 | Readable from 5 m: active warning, centers by available space, totals |
| Anyone | `/sources` | — | Attribution and disclaimer |

Use `AppShell width="phone"` for `/`, `/center` and `/center/:id`, `width="full"` for `/board`, and `showReset` everywhere. Nav: Find a center (`/`), Center staff (`/center`), Board (`/board`), Data sources.

Smoke visits only `/` and `/sources` by default, so also run it with `--route /center --route /board --route /center/<first candidate id>`.

## MVP requirements

Build in this order. R3.1 alone is a complete entry: a finder with tested eligibility.

| ID | Requirement | Acceptance criteria (testable) |
|---|---|---|
| R3.1 | **Finder.** Tap the map, or pick a barangay from a searchable list, to get the nearest **eligible** centers. Includes the PRD R3.1 eligibility rule. | Centers are OSM schools as candidates (PRD §8.2 Plan B), each with a visible **Candidate — not verified by CDRRMO** badge. `isEligible` implements PRD R3.1 exactly: open, below capacity, and not inside any zone of the active scenario at or above its `minLevel`. With no scenario active, only "open" and "below capacity" apply. Shows the top 3 eligible centers with name, barangay, distance labelled **straight-line** (`distance.straightLine`), a capacity bar with the text "{occupancy} / {capacity}" and a status chip. Any ineligible center **nearer** than the first recommendation appears under "Not recommended" with every reason ("Closed", "Full", "Inside storm-surge zone — High"). If nothing is eligible, the 3 nearest ineligible centers are shown with reasons and the message "No eligible center found. Follow CDRRMO instructions." A point outside the city boundary shows the note "Outside data coverage" above the list. The answer renders < 1 s after a tap, the map flies to the point, and no wording anywhere says "safe". |
| R3.2 | **Center manager** (PRD R3.2) at `/center/:id` | Buttons −10, −1, +1, +10, plus a number field with **Log arrivals** and **Log departures**, and an Open/Closed switch. Occupancy never goes below 0. Exceeding capacity is allowed and shown as **OVER CAPACITY**. Status chip is one of OPEN / FULL / OVER CAPACITY / CLOSED, always as text + icon + color. A change shows in every other open window of the app in < 1 s, and a reload restores it. `/center` lists all centers with a filter input. An unknown id shows that list with "Center not found". Touch targets ≥ 44 px. |
| R3.3 | **Public board** (PRD R3.3) at `/board` | Totals: evacuees, open centers, and centers with space, counting up on change. Centers are sorted: eligible ones by available space (most first), then full or over capacity, then excluded by hazard, then closed. Ties are broken by name. Each row has a capacity bar and a status chip. Rows re-sort with Motion `layout`. At most 12 rows, then "+ N more centers". Footnote: "Candidate centers are OpenStreetMap schools, not verified by CDRRMO. Capacities are illustrative." Legible at 1920 × 1080: row text ≥ 28 px, totals ≥ 56 px, WCAG AA contrast. |
| R3.4 | **Hazard filter** (a demo control standing in for #5's scenario) | A select in the AppShell `actions` on every route: "None" plus the five PRD §8.3 presets, labelled "Hazard filter (demo)". It is stored as `activeScenarioId` and synced across windows. When a preset is active: a warning banner shows on `/`, `/board` and `/center/:id`. Centers inside a zone of the preset's hazards at or above its `minLevel` become ineligible with the reason "Inside {hazard} zone — {level}" (use `HazardStatusBadge`). The manager view says "Residents are not being sent here: inside {hazard} zone". If a preset's hazard layer is missing, a notice says "Could not check {hazard}: layer not loaded" and the center is listed as unchecked, never silently counted as clear. Turning the filter off removes every banner. |
| R3.5 | **What to bring** + language toggle EN / Waray / Filipino | "Before you go" checklist (8 items) under the resident's first recommendation, from `src/content/bring.ts` (en + war + fil drafts). The language choice persists across reloads and follows in every window (`useLang`). No hard-coded UI text (grep for JSX text literals). |
| R3.6 | `/sources` and disclaimer footer on every view | `SourcesPage`, plus an app section "Synthetic data in this app" listing the candidate capacities (seed 101, range 150–600). The footer comes with `AppShell`. On `/board`, the disclaimer is ≥ 20 px. |

## Domain functions (test-first in `src/domain/`)

- **Types.** `Center` exactly as PRD §7: `{ id, name, barangay, lon, lat, capacity, status: "official" | "candidate", source: "CDRRMO" | "OSM" }`. `CenterLive = { occupancy: number; open: boolean }`. `Scenario = { id: string; hazards: Hazard[]; minLevel: Level }`, with labels from the string table (`scenario.<id>`). `SCENARIOS` holds the PRD §8.3 table verbatim. Test that ids are unique and each row matches the table.
- `candidateCenters(facilities: FacilityCollection, barangays: BarangayCollection, seed = 101): Center[]`: schools only, sorted by `id`. Capacity is `createRng(seed).int(15, 60) * 10`, drawn in that order, so it falls in [150, 600]. `barangay` comes from `properties.barangay`, else `barangayAt`, else `""`. `status: "candidate"`, `source: "OSM"`. Cases: non-schools skipped; same seed gives the same output; every capacity is in range and a multiple of 10.
- `liveOf(live: Record<string, CenterLive>, id: string): CenterLive`: a missing entry gives `{ occupancy: 0, open: true }`.
- `applyDelta(live: CenterLive, n: number): CenterLive`. Cases: 3 − 5 gives 0; going past capacity is allowed; `open` is untouched.
- `centerLevels(centers: Center[], zones: ZonesByHazard): Record<string, Partial<Record<Hazard, Level | null>>>` uses `zoneLevelAt` from `@rcene/geo`. A hazard is absent when its layer is missing, and `null` when the center is in no zone of it.
- `isEligible(center, live: CenterLive, scenario: Scenario | null, levels: Partial<Record<Hazard, Level | null>>): Eligibility`, where `Eligibility = { eligible: boolean; reasons: Reason[]; unchecked: Hazard[] }` and `Reason = { kind: "closed" } | { kind: "full" } | { kind: "insideHazard"; hazard: Hazard; level: Level }`. Cases, which are the PRD G3 tests:
  - open, with room, no scenario → eligible
  - closed → `closed`
  - occupancy equal to capacity → `full`; occupancy above capacity → `full`
  - preset `surge` with the center in a storm-surge **high** zone → `insideHazard`
  - preset `surge` with the center in a storm-surge **low** zone (below `moderate`) → eligible
  - preset `quake` (min `high`) with the center in groundShaking **moderate** → eligible
  - the preset's hazard layer is missing → eligible, with `unchecked: [hazard]`
  - several problems at once → reasons in the fixed order closed, full, insideHazard
- `recommend(pt: LngLat, centers, live, scenario, levelsById, limit = 3): { recommended: { center; km }[]; notRecommended: { center; km; reasons }[] }` ranks by straight-line distance via `nearest` from `@rcene/geo`. Cases:
  - a closed nearest center is skipped and listed as not recommended
  - a full one is skipped
  - none eligible → `recommended: []` and the 3 nearest in `notRecommended`
  - equal distances keep a stable order by id
- `capacityState(live: CenterLive, capacity: number): "open" | "full" | "over" | "closed"`.
- `boardOrder(centers, live, eligibilityById): Center[]` follows the order in R3.3. Cases: an excluded center goes after a full one; a closed one goes last; ties break by name.
- `totals(centers, live, eligibilityById): { evacuees: number; openCenters: number; withSpace: number }`.

## Data

- `useLayer("facilities")`, `useLayer("barangays")`, `useLayer("boundary")`, `useZones()` (all five, for the filter). Pass `layers={["boundary", "barangays", "facilities", "hazard-stormSurge", "hazard-flood", "hazard-landslide", "hazard-groundShaking", "hazard-liquefaction"]}` to `AppShell` so the "Sample data" badge is right. Fixtures give 6 schools; real data gives more. Compute `centerLevels` once per load, memoized.
- Synthetic data: capacities only. Use seed 101 and range 150–600, the same as `01-ligtas`, so P1 shows comparable numbers; exact equality with 01 is not required. All centers start open with occupancy 0. There are no people records.
- Stores:
  - `createSyncedStore("03-likas:centers", …, { version: 1 })` holds `{ centerLive: Record<string, CenterLive> }` (the PRD §7 field name), with actions `arrive(id, n)`, `depart(id, n)` and `setOpen(id, open)`. Only `/center/:id` writes, so each center has one writer.
  - `createSyncedStore("03-likas:app", …, { version: 1, partialize })` persists only `{ activeScenarioId: string | null }` (the PRD §7 name). The resident's selected point and barangay are per-window UI state and are not synced.
- Static data (layers, centers, presets) is never persisted.
- The offline basemap has no glyphs, so there are no symbol or text layers. Center names appear in the DOM list and popups, never as map labels.

## Experience

- **Resident:** phone-first. The map takes the top half and the result sheet sits below. The palette is calm, turning amber only while the hazard filter is active. Candidate badges are always visible.
- **Wow moment:**
  - On `/center/:id`, staff press +10 and the board re-sorts with Motion `layout` while the totals count up (`gsap-motion` count-up recipe, or `StatTile countUp`).
  - When that center hits **FULL**, the resident's window moves its recommendation to the next center in the same second.
  - Raising the hazard filter sweeps the banner in (GSAP timeline), and the nearest center slides from the recommendations into "Not recommended — inside storm-surge zone".
  - One element, one library: Motion owns the rows, GSAP owns the numbers inside them.
- **Accessibility:**
  - A keyboard-only path: barangay list → results; the manager buttons; the filter select.
  - A polite live region announces each new recommendation and occupancy change.
  - Every status is color + icon + text.
  - The board uses large type.
  - `prefers-reduced-motion` turns re-sorts and count-ups into instant updates.

## Golden-path demo (≤ 2 minutes)

Setup: three windows on port 5103. `/` at phone width, `/board` on the right, and a small `/center/:id` window for the center that will be recommended once the filter is on (record its id in `DEMO.md`). Press **Reset demo** first.

1. `/`: tap a coastal point. Three candidate centers appear with "1.4 km straight-line", capacity bars and candidate badges.
2. Set the header **Hazard filter (demo)** to "Typhoon — Storm surge". Banners appear in all three windows, and the nearest center moves to "Not recommended — inside storm-surge zone (High)".
3. `/center/:id`: press +10 twice, then type the remaining capacity into **Log arrivals**. The center reaches **FULL**, the board re-sorts, and the resident's recommendation moves to the next center.
4. Close another center from its manager page. The board shows it as **CLOSED** at the bottom.
5. Switch to Waray in any window (all windows follow), then set the filter back to "None". The banners clear.
6. Open `/sources`: CDRRMO risk maps used with permission, OSM, HDX, and illustrative capacities.

## Definition of done

- [ ] R3.1–R3.6 meet their acceptance criteria
- [ ] Domain tests pass: `pnpm test` (in `apps/03-likas`)
- [ ] `pnpm typecheck` and `pnpm build` pass
- [ ] `node ../../scripts/smoke.mjs --app 03-likas` passes (offline, no console errors, axe clean, screenshots at 390 and 1280)
- [ ] Every string comes from `src/i18n/strings.ts` (en + war + fil drafts); AI-drafted Waray/Filipino strings listed in `NOTES.md` under "Translations to review"
- [ ] `/sources` lists every dataset used; disclaimer footer on every view
- [ ] `STATUS.md`, `AI-LOG.md` (one row per commit) and `DEMO.md` are current

## Out of scope

- The point hazard lookup (that's #1).
- A real scenario console (that's #5; here a demo filter stands in).
- Routing: there is no road network, so distances are straight-line only.
- An official CDRRMO center list (Plan A). If it arrives, it becomes a data-package change between batches.
- Accounts, SMS and push alerts.

## Stretch (only after the definition of done is met)

- **S2 Center verification** (PRD): on `/center/:id`, "Verify (CDRRMO)" promotes a candidate to `status: "official"` with an edited capacity. Store it in a third synced store, `03-likas:verified`.
- The board pages through all centers, 12 at a time, every 10 s. Pause it under reduced motion.
- A share link `/?at=lon,lat` that restores the resident's point.

## Platform hooks

- Export `routes`.
- Export the domain functions (`isEligible`, `recommend`, `boardOrder`, `candidateCenters`, `SCENARIOS`) and the `Center` / `CenterLive` / `Scenario` types unchanged, so P1 lifts them as they are.
- Keep `CenterList`, `CapacityBar`, `Board` and `CenterManager` free of app globals. They take `scenario: Scenario | null` and the live map as props, so P1 can pass #5's raised scenario instead of the demo hazard filter and merge the stores into `andam`.
