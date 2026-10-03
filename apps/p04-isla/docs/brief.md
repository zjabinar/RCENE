# P4 · Isla Link

| | |
|---|---|
| **App** | `apps/p04-isla` · dev port 5204 · preview 6204 |
| **Batch** | 6. Run it after batch 1 (`03-likas`) and batch 4 (`19-ayuda`) are merged into `main` |
| **Proposal** | `docs/proposal.md` (P4 in the monorepo's `docs/PROPOSALS.md`), restored on open data only (Decisions, 2026-10-03) |
| **Modules** | The cores are new. Two patterns are borrowed:<br>`#3 Likas` → the board (R3.3: `Board`, Motion re-sort, count-up totals) for the needs board (`docs/modules/03-likas.md`)<br>`#19 Ayuda Tracker` → the log (the R19.3 "Recent claims" feed, the R19.1 rehydrate-then-write step, the R19.4 one-time sample load) for the boat-run log (`docs/modules/19-ayuda.md`) |
| **Roles** | Island barangay → `/island` → phone · CDRRMO and port office → `/ops` → full · Sea-travel advisory → `/advisory` → full |
| **Data** | `boundary`, `barangays`, `land` (🟢 HDX) · PAGASA's public Tropical Cyclone Wind Signal definitions · synthetic needs and boat trips (seed 4041) · tiers `open` + `synthetic` |
| **AI in the app** | none |
| **Skills to use** | `maplibre-gis` (island fills, cluster markers, the "Animating a route line" recipe for sea lanes), `gsap-motion` (count-ups, banner sweep), Motion `layout` (board re-sort, log rows), Design `ux-copy` and `accessibility-review` |

> An island barangay posts that it has a patient to transfer and no water. The port office sees it jump to the top of the needs board, the advisory shows whether boats may sail under the current cyclone signal, and a dispatched boat's sea lane draws itself across the water while the island's window says "On the way".

## Problem

Catbalogan's island barangays depend on boats for water, rice, medicine and patient transfers, and a tropical cyclone signal can stop sea travel for days (`docs/proposal.md`). The islands' needs, the signal and the boats that answer them are not in one place, so the mainland cannot see at a glance which island needs what, which has gone quiet, and which trips may sail. One shared board, fed by the islands' posts and the signal, closes that gap.

**Independence.** Open data only. Which barangays are islands is **computed** from the HDX `barangays` and `land` layers by `findIslands`. No list is typed in or copied from any document. Nothing from GPDSS or Project HABAGAT is used. Read nothing outside this repository.

## Roles, routes and windows

| Role | Route | Window in the demo | Needs |
|---|---|---|---|
| Island barangay (`island`) | `/island` (picker) → `/island/:id` | phone width, 420 px | Post today's status and needs in < 45 s; see what is on the way; confirm that a boat arrived |
| CDRRMO and port office (`ops`) | `/ops` | full width, ≥ 1080 px | The needs board and island map; dispatch boat runs when the advisory allows; the boat-run log |
| Sea-travel advisory (`advisory`) | `/advisory` | full width, projector | The current signal and what it means for sea travel, readable from 5 m; enter the signal (demo input) |

The generated scaffold already has: `/` (the role launcher: `RoleLauncher` cards with **Open** and **New window**), one placeholder page per role route, the nav, and `role.<id>.title` / `role.<id>.summary` strings in three languages (`src/roles.ts`, `src/pages/`, `src/i18n/strings.ts`). Replace each placeholder with the real view; keep the routes. Add `/island/:id`, where `:id` is `islandId(feature)`, and add `/island/<first island's id>` to `smokeRoutes` (with fixtures, `/island/FIXTURE-1`). An unknown id shows the picker with "Island barangay not found".

## Lift, then wire

| Module app | Becomes | Lift (copy into `src/modules/<name>/`) | Change after lifting |
|---|---|---|---|
| `#3 Likas` → `board` | The needs board (R1) | `Board` (generic rows, Motion `layout` re-sort, at most 12 rows then "+ N more centers"), the totals tiles with count-up | Rows are islands, ordered by `needsBoardOrder` (not `boardOrder`). The chip is the urgency. No capacity bar. "+ N more islands" |
| `#19 Ayuda Tracker` → `log` | The boat-run log (R3) | The "Recent claims" feed component (Motion row entry); the rehydrate-then-write helper | Rows are trips (`TRIP-001`…) with an Underway / Arrived chip |

No domain functions are lifted: P4's rules are new and live in `src/domain/`.

1. **Check each module app** in this worktree: `../03-likas/STATUS.md` and `../19-ayuda/STATUS.md` say `Phase: done`, and `npm run test` passes in each folder.
2. **Lift** by copying the components named above. Reading other app folders is fine; never edit them. Fix the imports, merge the strings they need into `src/i18n/strings.ts` under `board.*` and `log.*`, and make their tests pass here.
3. **If a module app isn't done**, build only the pattern from `docs/modules/NN-slug.md`: a generic `Board` with #3 R3.3's layout rules but not its ordering (Motion re-sort, count-up totals, at most 12 rows), or a feed with #19 R19.3's "Recent claims" rules (last 10, new rows animate in).
4. **Record every lift** in `NOTES.md` under "Lifted modules": app, its commit (`git log -1 --format=%h -- ../NN-slug`), files and what you changed.

## Spine (one store, keyed by barangay)

`createSyncedStore("p04-isla:spine", …, { version: 1 })`:

```ts
type Signal = 0 | 1 | 2 | 3 | 4 | 5;                // 0 = no tropical cyclone wind signal
type Needs = { water: number; rice: number; medicine: number; patients: number }; // 20-L containers, 25-kg sacks, kits, patients (counts only)
type IslandPost = { islandId: string; at: string; status: "normal" | "needsHelp" | "urgent"; needs: Needs };
type Trip = { id: string; islandId: string; boat: "small" | "large"; cargo: Needs; dispatchedAt: string; signal: Signal; synthetic?: true };
interface Spine {
  posts: Record<string, IslandPost>;   // latest post per island id. Writer: /island/:id, for its own island (and Load sample day, once, for islands without a post)
  trips: Trip[]; nextTrip: number;     // TRIP-001… (code("TRIP", n, 3)). Writer: /ops
  arrivals: Record<string, string>;    // trip id → ISO time. Writer: /island/:id of the trip's island
  signal: Signal; signalAt: string | null; // writer: /advisory
  sampleLoaded: boolean;               // writer: /ops
}
```

- All of it is persisted. The island set, the clusters and the shore points are computed at load (memoized) and never persisted.
- A new post replaces the island's previous one. Only trips dispatched at or after a post count against it.
- **Every write** goes through one helper: `await useSpine.persist.rehydrate()`, then `setState`. Each slice has the one writer named above.

## MVP requirements

Build in this order. **R1 alone is a finished entry**: an island needs board fed live by the islands.

| ID | Requirement | Acceptance criteria (testable) |
|---|---|---|
| R1 | **Island needs board** (Core 1: computed islands, needs requests, board and map) | `findIslands` and `clusterIslands` run once per load. In `sample` mode every view shows a warning notice (icon + text): "Sample islands: no barangay in this data is separate from the mainland, so the first 3 coastal barangays stand in."<br>**`/island`:** a searchable list of island barangays, grouped under "Island cluster A", "B"…, keyboard operable.<br>**`/island/:id`:** a status radio group (Normal / Needs supplies / Urgent) and four integer fields with − / + steppers (≥ 44 px): Water (20-L containers, 0–999), Rice (25-kg sacks, 0–999), Medicine (kits, 0–99), Patients to transfer (0–20). Validation uses zod, with messages linked by `aria-describedby`. The form says "Numbers only. Don't record names or conditions." There is no free-text field. **Post update** replaces the island's post, and a toast says "Posted at {time}". Below the form, each requested item shows Requested, On the way (TRIP-003) or Delivered (`deliveryState`), plus "{km} km straight-line from the nearest mainland shore".<br>**`/ops`:** the map (`BaseMap` fit to the islands) with island fills by urgency and one HTML marker per cluster showing its letter and "{n} urgent", plus the board: `StatTile`s with `countUp` for Islands reporting (24 h) "{x} / {n}", Urgent, Patients waiting and Boats underway; and one row per island with name, cluster, urgency chip (icon + text: Urgent / No update for 24 h / Needs supplies / Boat on the way / Covered), reasons ("1 patient to transfer", "Water: 30 containers", "No update since {time}"), last update, distance and a **Dispatch** button (R3). At 390 px the board comes first and the map follows.<br>A post in an island window re-sorts the ops board in < 1 s; a reload restores it.<br>**Load sample day** on `/ops` (`seedDay`, seed 4041) works once, then reads "Sample day loaded". |
| R2 | **Sea-travel advisory** (Core 2) | **`/advisory`** shows the signal with PAGASA's wind category and range, e.g. "Signal No. 2 — Gale-force winds, 62–88 km/h", or "No tropical cyclone wind signal". It shows the advisory from `seaAdvisory`: level `normal` → "No signal: trips may sail. Check Coast Guard advisories."; `smallHeld` → "Small boats (motorbanca): stay in port" and "Larger vessels: only with Coast Guard clearance"; `suspended` → "All sea trips suspended". The line "Illustrative rule — follow PCG and PAGASA advisories" is always visible at ≥ 20 px. It also shows "Issued {time}", one line per island cluster ("Cluster A: 3 islands · 1 urgent") and Boats underway. Text ≥ 28 px and the headline ≥ 56 px at 1920 × 1080.<br>The demo input is a select on `/advisory` only: "PAGASA signal for Catbalogan (demo input)", with None and 1–5.<br>A change shows in every window in < 1 s: a banner on `/island/:id` and `/ops` (GSAP sweep; instant under reduced motion) with icon + text, e.g. "Signal No. 2: all sea trips suspended (illustrative rule)". Signal None removes the banners.<br>No `advisory.*` or `urgency.*` string, in any language, contains a word from `FORBIDDEN_ANSWER_WORDS` (tested in `src/i18n/strings.test.ts`). |
| R3 | **Boat runs and their log** (Core 3; the proposal's stretch, promoted because workflow step 4 and the signature need it) | **Dispatch** opens a dialog: boat class (Small boat (motorbanca) / Larger vessel), and cargo prefilled with `outstanding` and editable. **Confirm** is disabled when `canDispatch` fails, with the reason visible, e.g. "Sea travel suspended under Signal No. 2 (illustrative rule)". Confirm creates `TRIP-00n`, shows a toast "TRIP-003 dispatched to {island}" and returns focus to the row.<br>**Sea lane:** a straight line from the island's shore point to its `pointOnFeature`, drawn over 1.2 s with the `maplibre-gis` route recipe, dashed while underway and removed on arrival. Its label is "{km} km straight-line — not a sailing route".<br>**`/island/:id`** shows "On the way: TRIP-003 · Larger vessel" with a **Boat arrived** button that writes `arrivals`. The ops log row then reads "Arrived {time}", and the island's items move to Delivered.<br>An underway trip whose boat class the current signal now holds shows "Signal raised after departure" (icon + text) on `/ops` and `/advisory`.<br>**Log** on `/ops`: newest first, the last 10 trips (code, island, boat class, cargo, dispatched time, status chip), new rows animate in, and seeded rows are tagged "Sample". |
| R4 | **The cross-role workflow** | Each step shows in the other windows in < 1 s, without a reload: a post → `/ops`; a signal change → `/island/:id` and `/ops`; a dispatch → `/island/:id` ("On the way") and `/advisory` (Boats underway); an arrival → `/ops` and `/advisory`. A reload of any window restores its state. `AppShell showReset` clears every window. |
| R5 | Languages, `/sources`, disclaimer | EN / Waray / Filipino via `useLang`, persisted, followed by every open window. All UI text comes from `src/i18n/strings.ts`, including the PAGASA category names and the advisory lines; grep finds no JSX text literals.<br>`/sources`: `SourcesPage` plus `extra` entries for "PAGASA Tropical Cyclone Wind Signals — public definitions" (tier `open`, `https://www.pagasa.dost.gov.ph`) and the synthetic needs and trips (tier `synthetic`, seed 4041, codes only). The `children` section explains how island barangays are computed (`findIslands`, HDX `barangays` + `land`) and shows the sea-travel rule table, labelled illustrative.<br>`app.disclaimer` is overridden in all three languages: "Prototype. Island needs and boat trips are synthetic. The sea-travel rule is illustrative — follow PCG and PAGASA advisories." |

## Domain functions (test-first in `src/domain/`)

**Islands** (turf from `@turf/turf`; distances are great-circle "straight-line" km)

- `mainlandOf(land: BoundaryCollection): Feature<Polygon>` returns the largest polygon part by `area` across all features. Cases: one polygon → itself; a MultiPolygon with a large and a small part → the large part.
- `islandId(f: BarangayFeature): string` returns `psgc` when present, else the name lower-cased with runs of other characters turned into `-`. Cases: `"FIXTURE-1"`; "Sample Barangay 1" without `psgc` → `"sample-barangay-1"`.
- `findIslands(barangays: BarangayCollection, land: BoundaryCollection, sampleMax = 3): { mode: "computed" | "sample"; islands: BarangayFeature[] }`. An island barangay is one where **no** polygon part intersects the mainland (`booleanIntersects`; touching counts as intersecting). Results are sorted by name. When none is found, the result is `sample`: the `coastal: true` barangays by name, at most `sampleMax` (the first `sampleMax` by name when none is coastal). Cases:
  - the fixtures (`data/fixtures/barangays.geojson` + `land.geojson`, read with `node:fs`) → `sample`, Sample Barangay 1, 2 and 3
  - the fixtures plus a square barangay at 124.78–124.80 E, 11.76–11.78 N → `computed`, that barangay only
  - a barangay that shares one edge with the mainland → not an island
  - a MultiPolygon barangay with one part on the mainland and one offshore → not an island
  - a land MultiPolygon whose small part holds a barangay → that barangay is an island
- `clusterIslands(islands: BarangayFeature[], linkKm = 5): IslandCluster[]`, with `IslandCluster = { id: string; islandIds: string[]; center: LngLat }`. Single-linkage on each island's `pointOnFeature`. Ids are `"A"`, `"B"`… in the order of each cluster's first member by name, and `center` is the mean of the member points. Cases: two islands 3 km apart → one cluster; 12 km apart → two; a chain of 4 km + 4 km (ends 8 km apart) → one cluster; `[]` → `[]`.
- `shorePoint(island: BarangayFeature, mainland: Feature<Polygon>): { point: LngLat; km: number }` returns the nearest point on the mainland's outer ring (`polygonToLine` + `nearestPointOnLine`) to the island's `pointOnFeature`. Case: an island 5 km west of a straight north–south coast → 5 ± 0.1 km, with the point on the ring.

**Advisory**

- `TCWS`: PAGASA's five signals as `{ signal; wind; kmh: [min, max | null]; threat }`. Test the rows exactly: 1 strong winds, 39–61, minimal to minor threat; 2 gale-force, 62–88, minor to moderate; 3 storm-force, 89–117, moderate to significant; 4 typhoon-force, 118–184, significant to severe; 5 typhoon-force, 185 or more, extreme.
- `SEA_RULE = { smallHeldFrom: 1, allHeldFrom: 2 }` in `src/config/sea-rule.ts`, with the comment "illustrative — follow PCG and PAGASA advisories".
- `seaAdvisory(signal: Signal, rule = SEA_RULE): { level: "normal" | "smallHeld" | "suspended"; small: "allowed" | "held"; large: "allowed" | "held" }`. Cases: 0 → normal; 1 → smallHeld, with large allowed; 2 to 5 → suspended; with `{ smallHeldFrom: 2, allHeldFrom: 3 }`, signal 2 → smallHeld.
- `canDispatch(boat: "small" | "large", signal: Signal, rule = SEA_RULE): { ok: true } | { ok: false; reason: "smallHeld" | "suspended" }`. Cases: small at 1 → smallHeld; large at 1 → ok; large at 2 → suspended.
- `heldUnderway(trips: Trip[], arrivals, signal: Signal, rule = SEA_RULE): string[]` returns the ids of trips without an arrival whose boat class is now held. Case: an arrived trip is never listed.

**Needs and board**

- `outstanding(post: IslandPost | undefined, trips: Trip[]): Needs` is the post's needs minus the cargo of that island's trips dispatched at or after `post.at`, per item, floored at 0. Cases: no post → all 0; a trip dispatched before the post doesn't count; two trips add up; cargo above the need → 0.
- `deliveryState(post, trips, arrivals): Record<keyof Needs, "none" | "requested" | "onTheWay" | "delivered">`. An item not requested → none; outstanding > 0 → requested; otherwise a covering trip without an arrival → onTheWay, and with all arrived → delivered.
- `urgencyOf(post, trips: Trip[], arrivals, nowIso: string): { level: "urgent" | "noUpdate" | "needs" | "onTheWay" | "covered"; reasons: Reason[] }`, checked in this order. **urgent**: outstanding patients ≥ 1, or the status is `urgent` and no trip to the island was dispatched since the post. **noUpdate**: no post, or a post more than 24 h old. **needs**: anything outstanding. **onTheWay**: nothing outstanding, but a trip since the post has no arrival. **covered**: otherwise. Cases: a 30-hour-old post with 1 patient → urgent; a post exactly 24 h old → not noUpdate; status `urgent` with a trip dispatched since → not urgent; a patient on an underway trip → onTheWay, and covered after its arrival; no post → noUpdate; all zero → covered.
- `needsBoardOrder(islands: BarangayFeature[], posts, trips, arrivals, nowIso): BarangayFeature[]` orders urgent, noUpdate, needs, onTheWay, covered, then by oldest post (no post first), then by name.
- `boardTotals(islands, posts, trips, arrivals, nowIso): { reporting: number; islands: number; urgent: number; patientsWaiting: number; underway: number }`. `reporting` counts posts less than 24 h old. `patientsWaiting` sums each post's patients minus those on arrived trips since the post, floored at 0, so it drops on arrival, not on dispatch.
- `seedDay(islandIds: string[], rng: Rng, now: Date, existing: Record<string, IslandPost>)` returns `{ posts; trips; arrivals; nextTrip }`. It posts for every island without an existing post, at `now` minus 1–10 h. Needs are water 0–40, rice 0–20 and medicine 0–5. Exactly one island gets 1 patient (status `urgent`). With 3 or more islands, a different one is posted 26 h ago. It adds two arrived trips, `TRIP-001` and `TRIP-002` (`synthetic: true`, islands picked by `rng`), dispatched 20 and 18 h ago, and `nextTrip` is 3. Cases: deterministic for a seed and `now`; never overwrites an existing post; the patient island and the stale island differ.

## Data

- `useLayer("boundary")`, `useLayer("barangays")` and `useLayer("land")`; pass `layers={["boundary", "barangays", "land"]}` to `AppShell`. A missing layer shows `DataMissing`.
- **Synthetic:** island posts and trips from `seedDay` (seed 4041), written to the spine once by **Load sample day**. Codes only (`TRIP-001`); patients are counts, never names or conditions.
- **Open definitions:** `TCWS` in `src/domain/signals.ts`; the category and threat names are translated in the string table.
- **Store keys:** `p04-isla:spine` and the shared `lang`.
- **Requests for the data session** (`NOTES.md`): an OpenStreetMap port or ferry-terminal point, so that lanes can start at the city port instead of the nearest shore (see Stretch). After the real data lands, record the computed island count and names in `NOTES.md`.
- The offline basemap has no glyphs: cluster letters are HTML markers, and island names appear only in the DOM.

## Experience

- **Signature:** three windows. The signal changes in the advisory and banners sweep into the island phone and the ops console at once, while Dispatch greys out with its reason. A dispatch draws a sea lane on the ops map in the same second that the island's phone says "On the way". Recipes: the `maplibre-gis` route-line animation, Motion `layout` for the board and log rows, `StatTile countUp`, a GSAP banner sweep.
- **Wow moment:** island clusters pulse by the urgency of their most urgent island (CSS `motion-safe` animation on the cluster markers: urgent every 1 s, needs every 2.5 s, otherwise still), so the pulse changes the moment a post or an arrival changes that urgency.
- **Accessibility:**
  - Keyboard path: the island picker, the − / + steppers and Post update; the board rows, Dispatch and the dialog (focus trapped, then returned to the row); the signal select.
  - Polite live regions: "{island}: urgent — 1 patient to transfer" on `/ops`, and the new signal and advisory on every view.
  - Every urgency and advisory state is color + icon + text. The board carries everything the map shows.
  - `prefers-reduced-motion`: no pulse, lanes appear whole, no re-sort, sweep or count-up.
  - WCAG AA at 390 and 1280 px; touch targets ≥ 44 px on `/island/:id`.

## Golden-path demo (≤ 3 minutes)

Setup: `npm run build && npm run preview` (port 6204). Press **Reset demo**, then **Load sample day** on `/ops`. Record in `DEMO.md` the demo island (one that is neither the seeded urgent nor the stale island) and its id.

Layout on a 1920 × 1080 screen: **A** `/island/<demo id>` at 420 px on the left; **B** `/ops` at 1080 px in the middle; **C** `/advisory` at 420 px on the right, or full screen on the projector.

1. (0:00) B: one Urgent row (sample), one "No update for 24 h", the rest Needs supplies; one cluster marker pulses.
2. (0:10) C: set the signal to No. 2. C reads "Signal No. 2 — Gale-force winds, 62–88 km/h · All sea trips suspended". Banners sweep into A and B.
3. (0:30) A: post Urgent, water 30, rice 10, patients 1. B: the island jumps to the top with "1 patient to transfer · Water: 30 containers"; Patients waiting counts up; C's cluster line shows one more urgent.
4. (1:10) B: open **Dispatch** for it. Confirm is disabled: "Sea travel suspended under Signal No. 2 (illustrative rule)".
5. (1:25) C: lower the signal to No. 1. Small boats stay in port; larger vessels only with Coast Guard clearance. B's banner updates.
6. (1:45) B: **Dispatch** a Larger vessel with the prefilled cargo. TRIP-003's sea lane draws itself, a log row appears as Underway and the row moves to Boat on the way. A shows "On the way: TRIP-003"; C shows Boats underway: 1.
7. (2:15) A: **Boat arrived**. B's log reads "Arrived {time}", the lane disappears, the row moves to Covered and Patients waiting counts down.
8. (2:35) Switch to Waray in any window (all follow), then open `/sources`: HDX, the PAGASA definitions, the illustrative rule and the synthetic needs.

## Definition of done

- [ ] All MVP requirements meet their acceptance criteria
- [ ] Domain and lifted-module tests pass: `npm run test` (both `findIslands` cases: fixtures → `sample`, offshore square → `computed`)
- [ ] `npm run typecheck` and `npm run build` pass
- [ ] `npm run smoke` passes for `/`, every role route, `/island/<first id>` and `/sources` (offline, no console errors, axe clean, screenshots at 390 and 1280)
- [ ] Every string comes from `src/i18n/strings.ts` (en + war + fil drafts); AI-drafted strings listed in `NOTES.md` under "Translations to review"
- [ ] `/sources` lists every dataset and the PAGASA definitions; disclaimer footer on every view
- [ ] `NOTES.md` "Lifted modules" lists every lift; `STATUS.md`, `AI-LOG.md` and `DEMO.md` are current

## If time runs out

Cut in this order: the "Signal raised after departure" warning; the lane animation (draw the lane whole); the cluster pulse (static markers); the log (keep dispatch and arrival); R3; R2. What remains is R1, the island needs board. P4 has no single-feature parent among #1–#20, so R1 is the fallback entry.

## Out of scope

- Live PAGASA or PCG feeds, or any network call: the signal is a demo input.
- Real boat schedules, vessel tracking, sailing routes, travel times or weather.
- Names, conditions or contacts of patients or residents.
- Accounts, SMS and radio integration.
- A typed-in or copied list of island barangays.

## Stretch (only after the definition of done is met)

- Lanes that start at the city port, once the data session ships an OSM port or ferry-terminal point.
- A post history per island (the last 7 days) with a small sparkline per need.
- A small cluster map on `/advisory`, with the clusters colored and labelled by urgency.
- CSV export of the trip log (codes and numbers only; `toCsv` and `downloadCsv`).
