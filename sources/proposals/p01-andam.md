# P1 · Andam Catbalogan

| | |
|---|---|
| **App** | `apps/p01-andam` · dev port 5201 · preview 6201 |
| **Batch** | 5. Run it after batches 1–4 are merged into `main` (#1, #3 and #4 are in B1, #5 in B2) |
| **Proposal** | `docs/proposal.md` (P1 in the monorepo's `docs/PROPOSALS.md`) · the composition target of `docs/PRD.md` (Cores 1–3, §5, §7, §8.3). Where this brief and the PRD differ, this brief wins |
| **Modules** | `#1 Ligtas Ba Ako?` → Core 1, resident hazard check (`docs/modules/01-ligtas.md`)<br>`#5 Sakuna Sim` → Core 2, CDRRMO scenario console (`docs/modules/05-sakuna.md`)<br>`#3 Likas` → Core 3, eligibility rule, center staff and public board (`docs/modules/03-likas.md`)<br>`#4 Bantay Barangay` → Stretch S1, plain-language explainer (`docs/modules/04-bantay.md`) |
| **Roles** | CDRRMO console → `/console` → full · Resident → `/resident` → phone · Evacuation center staff → `/center` (+ `/center/:id`) → phone · Public board → `/board` → full |
| **Data** | boundary, barangays, facilities, all five `hazard-*`, `derived/barangay-hazard`, `derived/facility-hazard` · 🟢 HDX + OSM, 🟡 CDRRMO/CPDCO risk maps (permission) · synthetic: candidate capacities (seed 101); illustrative population (seed 105, stretch S2 only) |
| **AI in the app** | none |
| **Skills to use** | `maplibre-gis`, `gsap-motion` (banner timeline, count-ups), Motion `layout` (board re-sort), built-in `dataviz` (tallies), Design plugin `ux-copy` (warning and reason wording) and `accessibility-review` (board legibility) |

> The CDRRMO raises "Typhoon — Storm surge" once, and within a second the resident's phone stops recommending the school inside the surge zone, the public board lights up, and center staff fill the next center until the resident is sent to another.

## Problem

Hazard knowledge sits in shapefiles and printed maps. A lookup that can't tell "not in a mapped zone" from "no data" gives false reassurance. There is no mapped list of evacuation centers with capacities, and when a warning is raised nobody can see which centers sit inside the hazard (PRD §2). Apps #1, #5 and #3 each fix one of these, but apart: the console's warning never reaches the resident's recommendation, and the staff's headcounts never reach the console or the board. Andam joins them through one store, so one warning changes every role's view.

## Roles, routes and windows

| Role | Route | Window in the demo | Needs |
|---|---|---|---|
| CDRRMO operator | `/console` | laptop, left, 1080 × 1080 | Pick a preset, raise or lower it; affected barangays, exposed facilities, centers now |
| Resident | `/resident` (+ `/resident/b/:barangay`) | phone, 420 × 860 | "Is this place in a mapped zone? Where do I go, and is there room?" |
| Center staff | `/center` → `/center/:id` | phone, 420 × 640 | Log arrivals and departures; open or close the center |
| Public display | `/board` | projector, 1920 × 1080 | Readable from 5 m: the warning, affected barangays, centers by space, totals. Built on `BoardShell` (`@rcene/kit/app`) in the `malinaw` palette (`AppShell palette="malinaw"`) |
| Anyone | `/sources` | — | Attribution and disclaimer |

**Routes differ from the PRD in one place:** `/` is the role launcher, and the PRD's resident view `/` is `/resident` here (#1's `/b/:barangay` becomes `/resident/b/:barangay`). `/console`, `/center` (+ `/center/:id`) and `/board` keep the PRD paths.

The generated scaffold already has `/` (the role launcher: `RoleLauncher` cards with **Open** and **New window**), one placeholder page per role route, the nav, and `role.<id>.title` / `role.<id>.summary` strings in three languages (`src/roles.ts`, `src/pages/`, `src/i18n/strings.ts`). Replace each placeholder with the real view and keep the routes. Add `/center/F-001` (the first fixture candidate; switch to the first real candidate id when the data lands) to `smokeRoutes` in `project.json`. `showReset` on every view.

## Lift, then wire

| Module app | Becomes | Lift (copy into `src/modules/<name>/`) | Change after lifting |
|---|---|---|---|
| `#1 Ligtas Ba Ako?` | Core 1 → `/resident` | `src/domain/*` with tests (`summarize`, `nearestEligible`), `HazardCard`, `BarangayPicker`, `CenterList`, `src/content/checklists.ts` → `ligtas/` | Routes as above. Drop the store `01-ligtas:app`: the selected point is per-window state. Its `candidateCenters` is replaced by #3's. At R3, #3's `CenterList` replaces #1's |
| `#5 Sakuna Sim` | Core 2 → `/console` | `SCENARIOS`, `affectedShare`, `affectedBarangays`, `exposedFacilities`, `excludedCenters` with tests; `ScenarioPicker`, `ImpactTallies` → `sakuna/` | `05-sakuna:scenario` → spine (`activeScenarioId`, `raisedAt`). `draftScenarioId` becomes per-window state. Its overview `/` is not lifted: the resident and board banners replace it |
| `#3 Likas` | Core 3 → finder rule in `/resident`, `/center`, `/center/:id`, `/board` | `candidateCenters`, `liveOf`, `applyDelta`, `centerLevels`, `isEligible`, `recommend`, `capacityState`, `boardOrder`, `totals` with tests; `CenterList`, `CapacityBar`, `Board`, `CenterManager` → `likas/` | `03-likas:centers` and `03-likas:app` → spine. The "Hazard filter (demo)" select is **not** lifted: `scenario` comes from the spine. Its `SCENARIOS` copy is dropped for #5's (same PRD §8.3 table; keep one table test) |
| `#4 Bantay Barangay` | Stretch S1 | `joinRows`, `scoreAll`, `explain`, `DEFAULT_WEIGHTS` with tests → `bantay/` | No weights panel, choropleth or ranked table; only the explainer sentence |

**One center model.** The module briefs define `candidateCenters` three ways. The platform uses #3's only: `candidateCenters(facilities, barangays, 101)` (schools sorted by id, capacity `createRng(101).int(15, 60) × 10`, `status: "candidate"`, `source: "OSM"`). Use it from R1 on, so centers and capacities never change between requirements. **One exclusion rule.** Every role decides eligibility with #3's `centerLevels` (zones through `zoneLevelAt`) and `isEligible`. #5's `excludedCenters` (derived table) is kept only for the consistency test below.

1. **Check each module app** in this worktree: `../NN-slug/STATUS.md` says `Phase: done`, and its tests pass (`npm run test` in that folder).
2. **Lift** by copying (`cp -r ../01-ligtas/src/domain src/modules/ligtas/domain`, and so on). Reading other app folders is fine; never edit them. Fix the imports, merge its strings into `src/i18n/strings.ts` under the module's prefix, and make its tests pass here.
3. **If a module app isn't done**, build only the requirements this brief lists, from `docs/modules/NN-slug.md`. Domain first, test-first, with that brief's signatures, so a later lift can replace it.
4. **Record every lift** in `NOTES.md` under "Lifted modules": app, its commit (`git log -1 --format=%h -- ../NN-slug`), files and what you changed.

## Spine (one store, keyed by barangay)

`createSyncedStore("p01-andam:spine", …, { version: 1 })`, saved under `rcene:p01-andam:spine`. It is PRD §7's `AndamState` without `lang`. Its per-barangay half, the barangay × hazard matrix, is static and computed per load (below); the persisted half is keyed by scenario id and center id.

```ts
interface AndamSpine {
  activeScenarioId: string | null;          // an id from SCENARIOS (PRD §8.3), or null
  raisedAt: string | null;                  // ISO time of the raise
  centerLive: Record<string, CenterLive>;   // key = center id = facility id; missing → { occupancy: 0, open: true }
}
```

| Action | Pure reducer (`src/domain/spine.ts`) | Written only by |
|---|---|---|
| `raise(id)` / `lower()` | `raise(s, id, now)`, `lower(s)` | `/console` |
| `arrive(id, n)`, `depart(id, n)`, `setOpen(id, open)` | `logPeople(s, id, ±n)`, `setOpen(s, id, open)` (via #3 `applyDelta`) | `/center/:id`, for that id only |

Not persisted, computed once per load: layers, `SCENARIOS`, centers, `levelsById` (`centerLevels`), and the barangay × hazard matrix (`derived/barangay-hazard`, keyed by barangay name). Per-window only: the resident's point, the console's draft preset, the timeline position (S2). The language stays in the shared `lang` store (`useLang`, three languages), not in the spine. The store saves the whole object (last write wins), so each role writes only its own fields.

## MVP requirements

Build in this order. **R1 alone is a finished app: #1 Ligtas Ba Ako? at `/resident`.**

| ID | Requirement | Acceptance criteria (testable) |
|---|---|---|
| R1 | **Core 1: resident hazard check** at `/resident` (#1 R1.1–R1.4, PRD R1.1–R1.4) | `AppShell width="phone"`. Tap the map or pick a barangay from a searchable list. `HazardStatusList` shows every hazard in exactly one of **In a mapped risk zone — {level}**, **Not in a mapped risk zone**, **Outside data coverage**; a missing layer is listed as missing, never answered. The answer renders < 1 s after a tap, and the map flies to the point. The top 3 nearest open, below-capacity centers (#1 `nearestEligible`), each with name, "{km} km straight-line" and the badge **Candidate — not verified by CDRRMO**. A "What to do now" checklist for each `inZone` hazard. Keyboard path: barangay list → answer. A polite live region announces each new answer. |
| R2 | **Core 2: scenario console** at `/console` (#5 R5.1, PRD R2.1–R2.2) | `AppShell width="full"`, usable from 1080 px. The five PRD §8.3 presets as a keyboard radio group, each showing its hazards and minimum level. Selecting previews; **Raise warning** writes `activeScenarioId` and `raisedAt` (one at a time; raising another replaces it); **Lower warning** clears both. Raised adds the amber banner "{scenario} · raised {time}"; preview has none. Map: the scenario's zones (`ZoneLayer minLevel`), affected barangays filled by share and outlined. `StatTile`s with count-up: affected barangays "n of N"; exposed facilities in total and by kind (schools; health = `health` + `hospital`; other). Affected list sorted by share, with "% of area". #5's rules: affected = share ≥ 1% ("≥ 1% of its area"); a facility counts once; a missing layer shows "Not counted: {hazard} layer not loaded". A reload restores the raised state. |
| R3 | **Core 3: centers** (#3 R3.1–R3.3, PRD R3.1–R3.3) | **Resident:** R1's list switches to #3 `recommend` with the spine's scenario. Eligible = open, below capacity and not inside any zone of the active scenario at or above its `minLevel`. Nearer ineligible centers go under "Not recommended" with every reason ("Closed", "Full", "Inside storm-surge zone — High"). Nothing eligible → the 3 nearest with reasons and "No eligible center found. Follow CDRRMO instructions." A point outside the boundary shows "Outside data coverage" above the list.<br>**`/center`:** every center, with a filter; an unknown id shows the list with "Center not found". **`/center/:id`:** −10, −1, +1, +10, a number field with **Log arrivals** / **Log departures**, an Open/Closed switch. Occupancy never < 0; over capacity is allowed and shown as **OVER CAPACITY**. Chip OPEN / FULL / OVER CAPACITY / CLOSED, always text + icon + color. Targets ≥ 44 px. An excluded center shows "Residents are not being sent here: inside {hazard} zone".<br>**`/board`** (`width="full"`): totals (evacuees, open centers, centers with space) count up; rows in `boardOrder` (eligible by available space, then full or over, then excluded, then closed; ties by name) with capacity bar and chip, re-sorted with Motion `layout`; at most 12 rows, then "+ N more centers"; footnote "Candidate centers are OpenStreetMap schools, not verified by CDRRMO. Capacities are illustrative." At 1920 × 1080: row text ≥ 28 px, totals ≥ 56 px, disclaimer ≥ 20 px, WCAG AA. |
| R4 | **The warning workflow** (PRD R2.3 and §5) | Checked with two Playwright pages in one browser context per pair of roles; the run is recorded in `STATUS.md`.<br>- **Raise** in `/console` → within 1 s `/resident`, `/board` and `/center/:id` show the same banner; the board adds "Affected barangays: n of N"; the resident card shows the `urgency` line and a center inside the zone moves to "Not recommended".<br>- **Log arrivals** in `/center/:id` up to FULL → within 1 s the board re-sorts; if that center was the resident's first recommendation, the next eligible one takes its place; the console's "Centers now" tiles (`centersNow`: evacuees, open, with space, excluded) update.<br>- **Lower** → every banner and `urgency` line is gone within 1 s.<br>- A reload of any window restores the same state. **Reset demo** clears the spine, keeps the language and reloads every window. |
| R5 | Languages, `/sources`, disclaimer | EN / Waray / Filipino via `useLang`, persisted, followed by every window. Scenario labels (`scenario.<id>`), checklists and every UI string come from the string table (no JSX text literals). `src/i18n/strings.test.ts`: no `status.*`, `answer.*`, `result.*` or `urgency.*` string in any language contains a word from `FORBIDDEN_ANSWER_WORDS`. `app.disclaimer` is overridden in all three languages; the English text is exactly "Prototype for preparedness information. In an emergency, follow official CDRRMO advisories." `/sources`: `SourcesPage` plus an `extra` entry (tier `synthetic`): "Candidate center capacities: generated (seed 101), 150–600 in steps of 10; not CDRRMO figures." Footer on every view, `/` included. |

`urgency` wording (English; draft Waray and Filipino):
- `evacuate`: "Evacuate now → {center}", with "This point is in a mapped {hazard} zone ({level}) of the active warning. Follow CDRRMO and barangay instructions." With no eligible center: "Evacuate now. No eligible center found. Follow CDRRMO instructions."
- `watch`: "Warning active. This point is not in a mapped zone of this warning at {minLevel} or above. Follow official advisories."
- `unknown`: "Warning active. This point can't be checked: {reason}." (`outside data coverage` / `{hazard} layer not loaded`). `calm` shows no line.

## Domain functions (test-first in `src/domain/`)

- `scenarioById(id: string | null | undefined): Scenario | null`. Cases: `null` → null; `"surge"` → the surge row; an unknown id (a stale persisted value) → null, so every view shows "No active warning" instead of crashing.
- `raise(s, id, now)`, `lower(s)`, `logPeople(s, id, n)`, `setOpen(s, id, open)`: pure, never mutate `s`. Cases: an unknown id leaves `s` unchanged; raise replaces the active id and sets `raisedAt` to `now.toISOString()`; lower clears both; `logPeople` on a missing entry starts from `{ occupancy: 0, open: true }`; 3 − 5 → 0; `setOpen` keeps occupancy.
- `urgency(status: Partial<Record<Hazard, HazardStatus>>, scenario: Scenario | null): { kind: "calm" } | { kind: "evacuate"; hazard: Hazard; level: Level } | { kind: "watch" } | { kind: "unknown"; reason: "outsideCoverage" | "layerMissing" }`. Cases: no scenario → calm; `surge` + stormSurge high → evacuate (stormSurge, high); `surge` + stormSurge low → watch; `quake` + groundShaking moderate → watch; `typhoon` + flood veryHigh and stormSurge high → evacuate with flood (most severe level; ties in the scenario's hazard order); every scenario hazard `outsideCoverage` → unknown/outsideCoverage; every scenario hazard absent → unknown/layerMissing.
- `excludedIds(centers: Center[], scenario: Scenario | null, levelsById): Set<string>`: ids whose `isEligible` with `{ occupancy: 0, open: true }` has an `insideHazard` reason. Cases: no scenario → empty; a low surge level is not excluded; a missing layer is not excluded (it is `unchecked`). **Consistency test** on `data/fixtures/`: for each of the five presets, `excludedIds` equals the keys of #5's `excludedCenters` over `derived/facility-hazard`. If real data ever differs, note it in `NOTES.md`; the zone rule wins.
- `centersNow(centers, live, eligibilityById): { evacuees; openCenters; withSpace; excluded; full; closed }` extends #3's `totals`. Cases: a closed center counts only as closed; an open excluded center with room counts as excluded, not with space; over capacity counts as full; evacuees include closed centers' occupancy.
- `residentAnswer(pt: LngLat, ctx: { zones; boundary; centers; live; scenario; levelsById }): { status; summary; urgency; recommended; notRecommended; outside: boolean }` composes `lookupHazards`, #1 `summarize`, `urgency` and #3 `recommend`. Fixture cases: (a) calm → 3 recommended, `calm`; (b) `surge` raised at a fixture point inside a surge zone → `evacuate`, and the nearest center inside that zone is in `notRecommended` with `insideHazard`; (c) the first recommendation set FULL → the next one is first; (d) a point outside the boundary → `outside: true`, every status `outsideCoverage`, centers still listed.

Lifted functions keep their tests in `src/modules/<name>/`. PRD §16's tests must be among them: `lookupHazards` outside coverage, `isEligible` inside-hazard exclusion, `nearestEligible`, `affectedBarangays`.

## Data

- `useLayer` for `boundary`, `barangays`, `facilities`, `derived/barangay-hazard`, `derived/facility-hazard`; `useZones()` for all five hazards. Pass all ten layer names to `AppShell layers`. One `useAndamData()` hook computes centers and `levelsById` once per load (memoized) for every route. Fixtures give 6 schools.
- Synthetic: capacities only (seed 101); occupancy starts at 0, all centers open. S2 adds the illustrative population (seed 105, "not PSA census data"). No household or person records.
- Store keys: `p01-andam:spine` only. Static data is never persisted.
- No symbol or text map layers (the offline basemap has no glyphs): names appear in DOM lists and popups. The online OSM basemap is only the opt-in `allowOnlineBasemap` toggle.

## Experience

- **Signature:** four windows of one app, one role each, synced through the spine with no server. One press of **Raise warning** changes three other windows within a second. Recipes: `gsap-motion` **timeline** for the banner sweep and **Count-up numbers** (or `StatTile countUp`); Motion `layout` for the board rows. One library per element. One `WarningBanner` component serves every role.
- **Tone:** neutral when calm; amber banner and accents while a warning is raised. Level colors appear only on badges, zones and chips.
- **Wow moment:** at the raise, the resident's nearest center slides from the recommendation into "Not recommended — inside storm-surge zone (High)" while "Evacuate now →" points to the next one. Later, staff log arrivals, the board re-sorts and the resident's recommendation moves on.
- **Accessibility:** a keyboard path for every role (preset radio group; a Raise/Lower button whose label states the action; barangay list → answer; manager buttons and number field). Polite live regions: console ("Warning raised: {scenario}", "Warning lowered"), resident (new warning, new first recommendation), center (occupancy). The board announces only the banner, not its counters. Every status is color + icon + text. Under `prefers-reduced-motion` the banner appears, numbers set and rows move with no animation.

## Golden-path demo (≤ 3 minutes)

**Window layout.** Laptop 1920 × 1080: `/console` at left (1080 × 1080), `/resident` in the middle (420 × 860), `/center/<Y>` at right (420 × 640). Projector 1920 × 1080: `/board`, full screen (F11). Without a projector (PRD §17, question 1), the board sits behind the console and comes forward with Alt+Tab at step 4. Open each window from `/` with **New window**, then press **Reset demo** once. `DEMO.md` records the coastal point and the centers X (ends up excluded), Y (fills up) and Z (takes over).

1. **0:00 Calm.** `/resident`: tap the coastal point. Storm surge "In a mapped risk zone — High", flood moderate, landslide "Not in a mapped risk zone"; nearest center X at "{km} km straight-line" with the candidate badge.
2. **0:30 Raise.** `/console`: select "Typhoon — Storm surge"; the preview shows zones and counts. Press **Raise warning**: the banner sweeps in and the counts climb.
3. **0:55 The resident's view changes.** Within a second: the banner, "Evacuate now → Y", and X under "Not recommended — inside storm-surge zone (High)".
4. **1:20 Board.** Banner, "Affected barangays: n of N", centers by available space, X listed after the full ones as excluded.
5. **1:40 Arrivals.** `/center/Y`: type 25 → **Log arrivals**, 40 → **Log arrivals**, then the remaining capacity → **FULL**. The board re-sorts, the console's "With space" drops by one, and the resident's recommendation moves to Z.
6. **2:30 Lower.** `/console`: **Lower warning**. Every window returns to calm.
7. **2:45 Close.** Switch to Waray in one window (all follow), open `/sources`, and say the PRD §5 closing line.

## Definition of done

- [ ] All MVP requirements meet their acceptance criteria
- [ ] Domain and lifted-module tests pass: `npm run test` (PRD §16 tests included)
- [ ] `npm run typecheck` and `npm run build` pass
- [ ] `npm run smoke` passes for `/`, every role route, `/center/F-001` and `/sources` (offline, no console errors, axe clean, screenshots at 390 and 1280)
- [ ] R4 checked with two Playwright pages and recorded in `STATUS.md`; the golden path runs in ≤ 3 minutes with Wi-Fi off
- [ ] Every string comes from `src/i18n/strings.ts` (en + war + fil drafts); AI-drafted strings listed in `NOTES.md` under "Translations to review"
- [ ] `/sources` lists every dataset used; disclaimer footer on every view
- [ ] `NOTES.md` "Lifted modules" lists every lift; `STATUS.md`, `AI-LOG.md` and `DEMO.md` are current

## If time runs out

Cut in this order: stretch → the console map (keep the tallies and the affected list) → board animation (instant re-sort) → the `/center` list (keep `/center/:id`). Hide roles that aren't built: filter the launcher cards and the nav with a `READY` set in `src/roles.ts`; their routes show `EmptyState`. R1 + R2 is #1 with the scenario console (the PRD §12 path). R1 alone is **#1 Ligtas Ba Ako?**.

## Out of scope

Routing (there is no road network); accounts and logins; SMS and push alerts; real population figures and PAGASA feeds; saving or sharing scenarios; the official CDRRMO center list (Plan A arrives as a data change); #3's hazard-filter select; #5's overview `/`; #4's weights panel, choropleth and ranked table; anything from GPDSS or Project HABAGAT.

## Stretch (only after the definition of done is met)

- **S1 "Why?" explainer** (PRD S1 + #4): under the resident card, for each `inZone` hazard, the mapped layer it came from (its `sources.json` title) and what the level means; then #4's `explain` for the point's barangay ("54% of {barangay}'s area is in mapped storm-surge zones (High: 31%)"). No index or rank is shown to residents.
- **S2 Overflow and timeline** (#5 R5.3–R5.4) in a console tab: excluded and would-overflow centers (illustrative, seed 105), the spine's occupancy passed as `liveOccupancy` and shown as a "Logged now" column (not added to the projected load), and the T-24h → Recovery timeline, per window.
- **S3 Center verification** (PRD S2): "Verify (CDRRMO)" in the console promotes a candidate to `official` with an edited capacity. Spine `version: 2` adds `verified: Record<string, { capacity: number }>` (with a migration), written only by `/console`.
- **S4 "Before you go"** (#3 R3.5) under the resident's first recommendation.
- **S5 SSA1–4 presets** (PRD S4), only if the data session ships per-SSA layers. Ask in `NOTES.md` under "Requests for the data session"; never invent them.
