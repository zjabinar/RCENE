# P9 · Luntian Catbalogan

| | |
|---|---|
| **App** | `apps/p09-luntian` · dev port 5209 · preview 6209 |
| **Batch** | 6. Run it after batch 3 (`14-basura`) and batch 4 (`02-tubig`, `15-bakhaw`) are merged into `main` |
| **Proposal** | `docs/proposal.md` (P9 in the monorepo's `docs/PROPOSALS.md`) |
| **Modules** | `#14 Basura Alert` → core "waste schedule + game" (R1) · `#02 Tubig` → core "sea-level-rise exposure view", 2D only (R3) · `#15 Bakhaw Watch` → its domain feeds R3's mangrove column; its views are stretch "mangrove change" (S1, S2). Briefs copied to `docs/modules/14-basura.md`, `02-tubig.md`, `15-bakhaw.md`. Built here, no module app: core "violation report" (R2) |
| **Roles** | Resident → `/resident` → phone · ENRO → `/enro` → full · Planner → `/planner` → full |
| **Data** | `boundary`, `barangays`, `facilities`, `hazard-stormSurge`, `derived/barangay-hazard` (🟢 HDX + OSM; 🟡 CDRRMO storm-surge map with permission, 🟢 UP NOAH fallback) · optional `coastal-2015`, `coastal-2020` (🟡 NAMRIA; may never arrive) · synthetic, labelled illustrative: routes (salt 1401), MRFs (seed 1402), game rounds (seed 1403 + round), seeded reports (seed 9001), mangrove illustration (seed 1501) |
| **AI in the app** | none |
| **Skills to use** | `maplibre-gis` (barangay pick, MRF and report markers, surge zones), `gsap-motion` (countdown digits, count-ups), Motion (`drag` for the game, `layout` for new rows), Design plugin `ux-copy` (Waray-first copy, the report form) and `accessibility-review`. Not `r3f-scenes`: no three.js in this app |

> A resident checks tomorrow's pickup, learns which bin a sachet goes in and reports mangrove cutting from her phone. The ENRO desk sees the report arrive and validates it, and the planner sees it on that barangay's sea-level-rise exposure row, all in the same minute.

## Problem

The city's "today's collection" lookup returned nothing every day, residents have no public way to report an environmental violation, and coastal exposure sits in technical layers planners can't open (documented needs in `docs/proposal.md`). Waste, violations and coastal exposure belong to one portfolio: a report of mangrove cutting or dumping into the sea is a coastal-planning fact, not only a complaint. One workflow carries it from a resident's phone to the ENRO desk to the planner's exposure table. Three separate apps would drop it at each hand-off.

## Roles, routes and windows

| Role | Route | Window in the demo | Needs |
|---|---|---|---|
| Resident (`resident`) | `/resident` (barangay pick; tiles Schedule, Game, Report a problem; "My reports") · `/resident/b/:barangay` · `/resident/game` · `/resident/report` · `/resident/track` · `/resident/track/:code` | phone window 420 × 860; `AppShell width="phone"` | When is my pickup, which bin, report a problem and follow it |
| ENRO (`enro`) | `/enro` | 1440 × 900; `width="full" showReset` | New reports, triage, status |
| Planner (`planner`) | `/planner` (S1: `/planner/mangroves`, S2: `/planner/surge`) | 1440 × 900; `width="full" showReset` | Which barangays the water reaches, and what is in them |
| Anyone | `/` (role launcher) · `/sources` | — | Pick a role; attribution and the illustrative-data notes |

The generated scaffold already has: `/` (the role launcher: `RoleLauncher` cards with **Open** and **New window**), one placeholder page per role route, the nav, and `role.<id>.title` / `role.<id>.summary` strings in three languages (`src/roles.ts`, `src/pages/`, `src/i18n/strings.ts`). Replace each placeholder with the real view; keep the routes. `:barangay` is the URL-encoded barangay name. Add `/resident/game`, `/resident/report`, `/resident/track/VR-0001` and `/resident/b/<a barangay name>` to `smokeRoutes` in `project.json`.

## Lift, then wire

| Module app | Becomes | Lift (copy into `src/modules/<name>/`) | Change after lifting |
|---|---|---|---|
| `#14 Basura Alert` | R1 (R14.1–R14.4) | `basura/`: `src/domain/*` with tests (`manilaParts`, `manilaInstant`, `pickupsOn`, `nextPickups`, `countdown`, `assignRoute`, `parseDemoNow`, `seedMrfs`, `nearestMrf`, `newRound`, `answer`, `summary`), `src/content/{routes,holidays,items}.ts`, `SchedulePanel`, `NextPickupCountdown`, `MrfMap`, `SegregationGame` | Routes `/` → `/resident`, `/b/:barangay` → `/resident/b/:barangay`, `/game` → `/resident/game`. `14-basura:app` becomes `p09-luntian:resident`. Strings under `basura.` |
| `#02 Tubig` | R3 (R2.1 only) | `tubig/`: `SSA_PRESETS`, `levelThreshold`, `facilityExposure`, `barangaysTouched` with tests, `ExposureMap`, `WaterControls`, `ExposureTallies`. Never `FloodScene`, `src/three/*`, the terrain functions or any file that imports `three` | `02-tubig:app` (`waterM`, `presetId`) merges into the spine; `/map` → `/planner` |
| `#15 Bakhaw Watch` | R3's mangrove column; S1–S2 | `bakhaw/`: domain with tests (`coastalDataMode`, `coastalClass`, `coastalBarangays`, `seedMangroves`, `changeByBarangay`, `totals`, `shareAtLeast`, `swipeFromKey`) and its coastal zod schema; for S1–S2 also `SwipeCompare`, `ChangeTable`, `SurgeCrossSection` | `15-bakhaw:app` is not lifted (S1's swipe state stays per window). If #15 isn't done, R3 needs only `coastalDataMode`, `coastalClass`, `seedMangroves` and `shareAtLeast` |

1. **Check each module app** in this worktree: `../NN-slug/STATUS.md` says `Phase: done`, and its tests pass (`npm run test` in that folder).
2. **Lift** by copying (`cp -r ../14-basura/src/domain src/modules/basura/domain`, and so on). Reading other app folders is fine; never edit them. Fix the imports, merge its strings into `src/i18n/strings.ts` under the module's prefix, and make its tests pass here.
3. **If a module app isn't done**, build only the requirements and functions this brief lists, from `docs/modules/NN-slug.md`. Domain first, test-first, exactly as that brief specifies, so a later lift can replace it.
4. **Record every lift** in `NOTES.md` under "Lifted modules": app, its commit (`git log -1 --format=%h -- ../NN-slug`), files and what you changed.

## Spine (one store, keyed by barangay)

`createSyncedStore("p09-luntian:spine", …, { version: 1 })`:

```ts
{
  reports: Record<string /* VR-0013… */, ViolationReport>;  // resident · new reports only; seeded ones are regenerated
  events: StatusEvent[];                                    // enro · on seeded and new reports
  waterM: number;                                           // planner · default 0.5
  presetId: "ssa1" | "ssa2" | "ssa3" | "ssa4" | null;       // planner · default null
}
```

Actions: `fileReport(report)`, `addEvent(event)`, `setWater(m)`, `setPreset(id)`. Each field has one writer role: the resident window only adds reports, the ENRO window only adds events (it never edits a report), the planner only sets the water. The presenter acts in one window at a time, so last-write-wins never drops a change; never write the spine from a timer. Every report carries its barangay; the ENRO counts, the planner's table and its report markers join on it (`psgc` when both sides have it, else the trimmed, lower-cased name). Per-device conveniences live in `createSyncedStore("p09-luntian:resident", …, { version: 1 })`: `{ langChosen: boolean; lastBarangay: string | null; bestScore: number; myReports: string[] }` (#14's store plus the codes this device filed).

## MVP requirements

Build in this order. **R1 alone must be a finished, demoable single-feature app** (it is #14).

| ID | Requirement | Acceptance criteria (testable) |
|---|---|---|
| R1 | Waste schedule and segregation game on `/resident` (lift R14.1–R14.4) | Every R14.1–R14.4 criterion holds with the routes renamed: `/resident` picks a barangay from a searchable list or the map (`barangayAt`; "Tap inside the city"), offers "Back to {lastBarangay}" and the three tiles; `/resident/b/:barangay` has the Today card, the countdown ticking every second, the 7-day strip, holiday notes ("Moved from Mon 30 Nov: Bonifacio Day"), "Illustrative schedule, confirm with the City ENRO" always visible, the `?now=` demo clock with its chip, the nearest illustrative MRF with "{km} km straight-line", and `EmptyState` for an unknown barangay; `/resident/game` deals 8 items, works by drag and by keyboard (select, then 1–4), scores with `answer` and keeps the best score. R14.2: the first visit with no saved choice sets Waray (all windows follow). Lifted tests pass in `src/modules/basura/`. |
| R2 | Violation report and the ENRO desk | **Form** (`/resident/report`, react-hook-form + `reportSchema`): category (six, icon + text), barangay (prefilled from `lastBarangay`; a map tap sets it with `barangayAt`), an optional map point, "What did you see?" (10–500 characters, hint "Don't write people's names"), date seen (not after today, Manila). No name, phone or photo fields; the form says "No name needed. Your tracking number is your only link to this report." Submit → `nextReportCode` (`VR-0013` after the 12 seeded), shown large with Copy and "Keep this number", then `/resident/track/:code`: a stepper Received → Validated → Inspection scheduled → Resolved or Dismissed, with dates and the outcome or reason. `/resident/track` takes a code; an unknown code → `EmptyState`.<br>**Desk** (`/enro`): `StatTile`s with `countUp` (Received, Validated, Inspection scheduled, Closed = resolved + dismissed); a TanStack table, newest first (code, received, category, barangay, status, days open), filters by status, category and barangay, code search, 25 rows a page; a map of report points by status (a report with no point sits at its barangay's interior point with a dashed ring, "Barangay only"). Selecting a row (click or Enter) opens the detail: text (seeded text through `t()`), history, fly-to, and the barangay's illustrative route and next pickup ("Route B · next: Recyclable, Mon 5 Oct, 6:00 AM", from `assignRoute` + `nextPickups`). Action buttons are `allowedNext(status)`; Resolved needs an outcome and Dismissed a reason (`AlertDialog`). Report status uses its own icon + text set, never hazard colours. |
| R3 | Sea-level-rise exposure by barangay on `/planner` (lift #02's R2.1, 2D only) | `WaterControls` (0.5–4.5 m in 0.5 m steps, "Sea-level rise / water height", `aria-valuetext` "2.5 metres", SSA1–SSA4 with `aria-pressed`), `ExposureMap` (surge zones at or above `levelThreshold(waterM)`, exposed and not-exposed facilities, touched barangays outlined), `ExposureTallies` with `countUp`, and #02's caption word for word: "Counted: facilities inside mapped storm-surge risk zones at {level} or above. Water height → zone level is an illustrative mapping." Surge layer missing → `DataMissing` and "—" in every tally and table cell, never 0.<br>**Table** from `exposureByBarangay`: Barangay · Coastal · Area in counted zones (%) · Exposed schools · Health · Other · Mangroves in counted zones (ha) · Validated coastal reports. Default order by area share; sortable (`aria-sort`); "Download CSV" (`toCsv` + `downloadCsv`, with water height and level columns); selecting a row fits the map to that barangay. A share of 0 reads "0% (no mapped surge zone at {level} or above)", never "safe".<br>**Mangroves.** `coastalDataMode` real → `mangroveHaInZones` on `coastal-2020` with a one-line NAMRIA source note; otherwise on `seedMangroves(…, 1501).y2020`, with an "Illustration" tag on the column header and #15's banner text above the table. Never mixed.<br>No file under `src/` imports `three` or `@react-three/*`. |
| R4 | The cross-role workflow | Submit on `/resident/report` → the report appears at the top of `/enro` in < 1 s with a "New" badge (2 s highlight), Received counts up, and a polite live region says "New report VR-0013: Mangrove cutting, {barangay}". An ENRO status change shows on `/resident/track/:code` in < 1 s. Once a coastal report (`waterDumping`, `mangroveCutting`) is Validated, its barangay's "Validated coastal reports" cell on `/planner` goes up by one and a report marker (HTML `Marker`, category icon) appears on the planner map in < 1 s. A reload of any window restores reports, statuses and the water height. |
| R5 | Languages, `/sources`, disclaimer | EN / Waray / Filipino via `useLang`; every string in `src/i18n/strings.ts`, content in `src/content/*`. #14's test that every `en` key has a `war` entry is extended to the whole platform table and to `sample-reports.ts`. A test asserts no string in any language contains a word from `FORBIDDEN_ANSWER_WORDS`. `app.disclaimer` overridden in all three languages: "Prototype. Collection schedules, MRF locations, seeded reports and mangrove patches are illustrative. Confirm with the City ENRO." `/sources`: `SourcesPage` plus `extra` entries (tier `synthetic`): routes (salt 1401), MRFs (seed 1402), the holiday list, seeded reports ("12 sample reports, seed 9001, no names"), the mangrove illustration (#15's wording) or the NAMRIA layers in real mode, and the water height → zone level table as an app assumption. Footer on every view. |

## Domain functions (test-first in `src/domain/`)

Tests use inline squares and rows, not the data files. Lifted functions keep their own tests in `src/modules/<name>/`.

```ts
type Category = "illegalDumping" | "openBurning" | "unsegregated" | "waterDumping" | "mangroveCutting" | "other";
type ReportStatus = "received" | "validated" | "inspection" | "resolved" | "dismissed";
type Outcome = "noticeIssued" | "cleanedUp" | "referredToBarangay" | "noViolation";
type DismissReason = "duplicate" | "notEnoughDetail" | "outsideJurisdiction";
interface ViolationReport { code: string; category: Category; barangay: string; lngLat: LngLat | null;
  text?: string; textKey?: string; seenOn: string /* YYYY-MM-DD, Manila */; createdAt: string /* ISO */ }
interface StatusEvent { code: string; to: ReportStatus; at: string; outcome?: Outcome; reason?: DismissReason }
const COASTAL_CATEGORIES: Category[] = ["waterDumping", "mangroveCutting"];
interface ExposureRow { barangay: string; share: number; touched: boolean; school: number; health: number; other: number }
```

- `reportSchema(now: Date, barangayNames: string[])` (zod 4). Cases: a valid report; text of 9 characters after trimming and of 501 are rejected; an unknown barangay and a missing category are rejected; `seenOn` tomorrow (Manila) is rejected, but with `now = 2026-10-06T23:30:00Z` a `seenOn` of `2026-10-07` is accepted (Manila is already the 7th; use #14's `manilaParts`).
- `nextReportCode(reports: { code: string }[]): string`: highest number + 1, via `code("VR", n)`. Cases: `[]` → `VR-0001`; `VR-0001`…`VR-0012` → `VR-0013`; `[VR-0002, VR-0010]` → `VR-0011`.
- `seedReports(barangays: BarangayCollection, seed = 9001, anchorYmd = "2026-10-01"): { reports: ViolationReport[]; events: StatusEvent[] }`: 12 reports, each category twice (seeded shuffle), each barangay drawn with `rng.pick` from the name-sorted list, a point from `randomPointsIn(<that barangay>, 1, rng)`, `seenOn` 1–21 days before the anchor, `createdAt` that day between 07:00 and 19:00 Manila, `textKey` from `src/content/sample-reports.ts`, codes `VR-0001`… in `createdAt` order. Seeded events leave 4 received, 3 validated, 2 inspection, 2 resolved, 1 dismissed. Cases: same seed → identical; codes in time order; every point inside its barangay (`pointInArea`); those status counts; works on the 6 fixture barangays.
- `allowedNext(status: ReportStatus): ReportStatus[]`: received → validated, dismissed; validated → inspection, dismissed; inspection → resolved, dismissed; resolved and dismissed → none.
- `reportStatus(code: string, events: StatusEvent[]): { status: ReportStatus; history: StatusEvent[] }`: events for `code` sorted by `at`; an event not in `allowedNext` of the current status is ignored; resolved without an outcome or dismissed without a reason is ignored. Cases: each step; a skip (received → resolved) ignored; nothing after a final status; the two missing-detail cases.
- `reportsByBarangay(reports: ViolationReport[], events: StatusEvent[]): Record<string, { total: number; open: number; coastalValidated: number }>`: open = not resolved or dismissed; coastalValidated = validated, inspection or resolved, in `COASTAL_CATEGORIES`. Cases: a dismissed coastal report doesn't count; a received one doesn't either; a resolved one does.
- `exposureByBarangay(rows: BarangayHazardRow[], exposed: FacilityFeature[], barangayOf: (f: FacilityFeature) => string | null, threshold: Level): ExposureRow[] | null`: `share = shareAtLeast(row, "stormSurge", threshold)`, `touched = share ≥ 0.01`; facility kinds as in `facilityExposure` (`hospital` counts as health); sorted by share desc, then name. Cases: `null` when no row has a `stormSurge` key; the touched set equals `barangaysTouched(rows, threshold)` for all four levels (property); lowering the threshold never lowers a share; a facility whose `barangayOf` is `null` is left out (the table footnote counts it).
- `mangroveHaInZones(mangroves: CoastalCollection, surge: ZoneCollection, barangays: BarangayCollection): Record<string, Record<Level, number>>`: hectares (2 decimals) of mangrove features (`coastalClass`) inside the union of surge zones at or above each level, per barangay, with the Turf 7 FeatureCollection calls #15 describes. Cases with hand-made squares: a 100 ha patch inside a `high` zone → low, moderate and high 100, veryHigh 0; half inside → 50; a beach polygon is ignored; values never rise from low to veryHigh; a barangay with no mangroves is absent.

Compute `classifyPoints`, `exposureByBarangay` inputs and `mangroveHaInZones` once per data load (memoised); moving the slider only filters. If `mangroveHaInZones` takes over 1 s on real data, show `LoadingState` in that column and record the timing in `NOTES.md`.

## Data

- `useLayer("boundary")`, `useLayer("barangays")`, `useLayer("facilities")`, `useLayer("derived/barangay-hazard")`, `useZones(["stormSurge"])`. Pass them to `AppShell layers` for the "Sample data" badge. Facility statuses come from `classifyPoints(facilities, { stormSurge }, boundary)`; a facility's barangay is `properties.barangay`, else `barangayAt`.
- **Optional coastal layers** (not in `LAYER_FILES`): `useOptionalLayer("coastal-2015.geojson" | "coastal-2020.geojson", schema)` with #15's schema; a file missing from the manifest is never requested. `invalid` → illustrative mode plus "The coastal files were found but not recognised." Add #15's request for these files to this app's `NOTES.md` under "Requests for the data session".
- **Synthetic, labelled illustrative in the UI and on `/sources`:** routes A–D per barangay (`assignRoute`, salt 1401), MRFs (`seedMrfs`, seed 1402), game rounds (seed 1403 + round), 12 seeded reports (`seedReports`, seed 9001), mangrove patches (`seedMangroves`, seed 1501, illustrative mode only). Holidays from #14's `src/content/holidays.ts`.
- **Report text** typed by a resident stays in this browser's `localStorage` and is shown only on `/enro` and that report's tracking page. Nothing is sent anywhere. No names, contacts, photos or reporter location.
- **Stores:** `p09-luntian:spine` and `p09-luntian:resident` (shapes above). Layers and seeded records are never persisted.

## Experience

- **Signature:** three windows show one report's whole life: typed on a phone, triaged at the ENRO desk, and counted on the planner's exposure row for the barangay the water reaches. Recipes: Motion `layout` for the arriving row, `gsap-motion` count-up for the tiles (or `StatTile countUp`). One element, one library.
- **Wow moments:** the game (lifted from #14); SSA2 on the planner: zones redraw, tallies count up, the touched barangays outline.
- **Tone:** neighbourly and Waray-first on the resident side; plain and operational on `/enro` and `/planner`. Streams, report statuses and hazard levels each have their own colours, always with an icon and a label.
- **Accessibility:** the game is fully playable by keyboard and tap; the ENRO and planner tables are the keyboard path to everything on their maps; polite live regions for new reports, status changes on the tracking page and the tallies (once per change); the countdown announces at most once a minute; resident targets ≥ 44 px; reduced motion: no shake, fly, slide or highlight sweep, count-ups show final values. WCAG AA at 390 and 1280 px.

## Golden-path demo (≤ 3 minutes)

Layout on a 1920 × 1080 screen: `/resident` in a 420 × 860 window on the left; `/enro` in a 1440 × 900 window on the right; `/planner` in a 1440 × 900 window in the same place, behind `/enro` (all from the launcher's **New window**). Press **Reset demo** first. `DEMO.md` names barangay X: coastal, with storm-surge zones and an exposed facility.

1. 0:00 · Resident (Waray, first visit): pick X. Today card, the countdown, the week strip, the nearest illustrative MRF. Switch to English: all windows follow.
2. 0:30 · Resident: Game. Banana peel → Biodegradable (+10); coffee sachet → Recyclable (wrong, the reason shows); the next item by keyboard (select, press 3).
3. 1:00 · Resident: Report a problem (X prefilled). Mangrove cutting, tap the shore, one line of text, Submit → `VR-0013` and its tracking page. ENRO: the row lands on top with "New", Received counts up.
4. 1:35 · ENRO: Enter on `VR-0013`: the text, the point, X's route and next pickup. Validate. Resident: the stepper moves to Validated within a second.
5. 2:05 · Planner (bring it forward): SSA2. Zones at High or above, tallies count up; row X shows 1 validated coastal report and the marker sits on the map; the mangrove column is tagged Illustration. Drag to 4.5 m: counts step up at 2.5 and 3.5 m.
6. 2:40 · `/sources`: OCHA/HDX, OSM, the storm-surge source and every illustrative set. Done by 3:00.

## Definition of done

- [ ] R1–R5 meet their acceptance criteria
- [ ] Domain and lifted-module tests pass: `npm run test`
- [ ] `npm run typecheck` and `npm run build` pass; no `three` import under `src/`
- [ ] `npm run smoke` passes for `/`, every role route, the added `smokeRoutes` and `/sources` (offline, no console errors, axe clean, screenshots at 390 and 1280)
- [ ] Every string comes from `src/i18n/strings.ts` (en + war + fil drafts); AI-drafted strings listed in `NOTES.md` under "Translations to review"
- [ ] `/sources` lists every dataset used; disclaimer footer on every view
- [ ] `NOTES.md` "Lifted modules" lists every lift; `STATUS.md`, `AI-LOG.md` and `DEMO.md` are current

## If time runs out

Cut in this order: (1) every stretch item; (2) R3's mangrove column and the #15 lift; (3) R3 and R4's planner step: the platform is resident + ENRO, and `/planner` shows `EmptyState` "Sea-level-rise exposure is not in this version"; (4) R2: the platform is **#14 Basura Alert** (R1 + R5) behind the role launcher.

## Out of scope

Photos, names, contact details or the reporter's location; SMS, push or e-mail; the real City ENRO schedule, MRF list or case system; fines and legal notices; business complaints (that is #10 and P6); 3D, three.js and terrain; hydrodynamic modelling or real inundation depth; any claim that the water slider shows where the sea will reach; NAMRIA sea-level-rise polygons unless the data session ships them; accounts and logins.

## Stretch (only after the definition of done is met)

- **S1 Mangrove change** at `/planner/mangroves`: lift R15.1–R15.2 (`SwipeCompare`, `ChangeTable`), linked from the planner page; add the route to `smokeRoutes`.
- **S2 Mangroves and storm surge** at `/planner/surge`: lift R15.3 (`SurgeCrossSection`) beside the exposure view.
- **S3 ENRO export:** "Download CSV" of reports (code, received, category, barangay, status; free text left out), with `toCsv` + `downloadCsv`.
- **S4 Add to calendar** on `/resident/b/:barangay` (#14's stretch, an `.ics` of the next 4 weeks).
