# P2 · Bayanihan Response

| | |
|---|---|
| **App** | `apps/p02-response` · dev port 5202 · preview 6202 |
| **Batch** | 6. Run it after batch 4 (`06-snap`, `19-ayuda`) is merged into `main` |
| **Proposal** | `docs/proposal.md` (P2 in the monorepo's `docs/PROPOSALS.md`) |
| **Modules** | `#6 Damage Snap` → Core 1: report form, offline queue, ★AI severity suggestion (`docs/modules/06-snap.md`)<br>`#19 Ayuda Tracker` → Core 3: QR distribution with duplicate guard, plus the public view (`docs/modules/19-ayuda.md`)<br>Core 2, the triage board, is new |
| **Roles** | Field report → `/report` → phone · CDRRMO triage → `/triage` → full · Relief volunteer → `/relief` → phone · Public dashboard → `/public` → full |
| **Data** | `boundary`, `barangays` (🟢 HDX) · synthetic: households (seed 1901), sample incidents (seed 2021) · codes only, no personal data |
| **AI in the app** | ★AI in-browser (skill `offline-ai`), lifted from #6 R6.5: CLIP zero-shot photo classification in a Web Worker suggests a severity, a person confirms it, and `ruleSeverity` is the deterministic fallback |
| **Skills to use** | `offline-ai` (read first), `maplibre-gis`, `gsap-motion` (count-ups), Motion (cards), built-in `dataviz` (public chart), Design `ux-copy` and `accessibility-review` |

> A field officer files a damage report with no signal. When it syncs, the CDRRMO verifies it and assigns relief to that barangay. A volunteer scans household cards against that assignment, with duplicates blocked, and the public screen shows the relief arriving. Four windows, one record.

## Problem

Damage reports are written on paper and re-encoded later, and relief claims are kept on paper lists, so double claims and missed households show up only after the operation (`docs/proposal.md`; the LGU portal's gap list records field work that must survive without signal). The report and the relief are also separate records. Nobody can show which report led to which relief, or which barangay is still waiting. One spine that carries a report from the field to triage, to distribution and to the public view closes both gaps.

## Roles, routes and windows

| Role | Route | Window in the demo | Needs |
|---|---|---|---|
| Field report (`report`) | `/report` (form) → `/report/outbox` | phone width, 420 px | File a geotagged report in < 60 s with no signal; watch it queue, then sync |
| CDRRMO triage (`triage`) | `/triage` | full width, ≥ 1080 px | See synced reports; verify each with a priority; assign relief to its barangay |
| Relief volunteer (`relief`) | `/relief` → `/relief/:station` (`EC-01`…) · `/relief/cards` | phone width | See which barangays are assigned; scan or type a card; get a clear result |
| Public dashboard (`public`) | `/public` | full width, projector | What relief reached which barangay; aggregates only, no codes |

The generated scaffold already has: `/` (the role launcher: `RoleLauncher` cards with **Open** and **Open in a new window**), one placeholder page per role route, the nav, and `role.<id>.title` / `role.<id>.summary` strings in three languages (`src/roles.ts`, `src/pages/`, `src/i18n/strings.ts`). Replace each placeholder with the real view; keep the routes. Add `/report/outbox`, `/relief/:station` and `/relief/cards`, and add `/report/outbox`, `/relief/EC-01` and `/relief/cards` to `smokeRoutes` in `project.json`. In `src/AppLayout.tsx`, `/relief/cards` is the one exception to its role's width: `width="wide"`, with a print stylesheet (#19 R19.1).

## Lift, then wire

| Module app | Becomes | Lift (copy into `src/modules/<name>/`) | Change after lifting |
|---|---|---|---|
| `#6 Damage Snap` → `snap` | Core 1 (R1) | `src/domain/*` with tests (`DAMAGE_CATEGORIES`, `SEVERITIES`, `reportInputSchema`, `ruleSeverity`, `severityFromScores`, `syncStep`, `recoverOnLoad`, `tallyByBarangay`, `seedReports`, `fitWithin`); `ReportForm`, `Outbox`; `src/ai/*` behind `suggestSeverity(blob)`; `photoStore` (`src/lib/photo-db.ts`) | The `06-snap:reports` store becomes spine fields. IndexedDB database renamed `rcene-p02-response`. Outbox copy names the triage board. The sync loop runs only on `/report/outbox` |
| `#19 Ayuda Tracker` → `ayuda` | Core 3 (R3) and the public view (R4) | `src/domain/*` with tests (`checkDigit`, `cardCode`, `cardPayload`, `parseCard`, `checkClaim`, `isRepeatScan`, `assignPoints`, `generateHouseholds`, `coverageByBarangay`, `totals`, `displayCount`); `ScanStation`, `QrCardSheet`, `CoverageChart` | The `19-ayuda:claims` store becomes spine fields; no setup store. One fixed round, `R1` ("Round 1 — Family food packs"). `ScanStation` takes a `check` prop, and P2 passes `reliefCheck` |
| none | Core 2 (R2) | Built here, test-first | — |

1. **Check each module app** in this worktree: `../06-snap/STATUS.md` and `../19-ayuda/STATUS.md` say `Phase: done`, and `npm run test` passes in each folder.
2. **Lift** by copying (`cp -r ../06-snap/src/domain src/modules/snap/domain`, and so on). Reading other app folders is fine; never edit them. Fix the imports, merge their strings into `src/i18n/strings.ts` under the prefixes `snap.*` and `ayuda.*`, and make their tests pass here.
3. **If a module app isn't done**, build only what this brief lists from `docs/modules/NN-slug.md`: #6 R6.1, R6.2 and R6.5; #19 R19.1 and R19.2 plus the domain functions named above. Domain first, test-first, so a later lift can replace it.
4. **Record every lift** in `NOTES.md` under "Lifted modules": app, its commit (`git log -1 --format=%h -- ../NN-slug`), files and what you changed.

## Spine (one store, keyed by barangay)

`createSyncedStore("p02-response:spine", …, { version: 1 })`:

```ts
interface Spine {
  reports: DamageReport[];                  // field reports, #6 shape (DR-0001…). Writer: /report, /report/outbox
  nextSeq: number;                          // writer: /report
  signal: "offline" | "online";             // the simulated field signal. Writer: /report/outbox
  triage: Record<string, TriageEntry>;      // by report id; absent = "new". Writer: /triage
  assignments: Record<string, Assignment>;  // by barangay name. Writer: /triage
  includeSynthetic: boolean;                // sample incidents shown on /triage and /public (default true). Writer: /triage
  claims: Claim[]; blocked: BlockedAttempt[]; // #19 shapes, round "R1". Writer: /relief/:station
}
type TriageEntry = { state: "new" | "verified" | "assigned"; priority?: 1 | 2 | 3; verifiedAt?: string; assignedAt?: string };
type Assignment = { barangay: string; point: string /* EC-01 */; round: string; reportIds: string[]; at: string };
```

- All of it is persisted. The household registry, the distribution points and the sample incidents are regenerated from their seeds at load and never persisted. Photos stay in IndexedDB, keyed by report id, readable by every window of this origin.
- **Every write** goes through one helper: `await useSpine.persist.rehydrate()`, then `setState` (the #19 R19.1 pattern). A window never writes stale state, and each slice has the one writer named above.

## MVP requirements

Build in this order. **R1 alone is a finished entry**: #6's field half, a report form with an offline outbox and the AI suggestion.

| ID | Requirement | Acceptance criteria (testable) |
|---|---|---|
| R1 | **Field report with offline queue and ★AI** (Core 1, #6) | #6 R6.1, R6.2 and R6.5 pass as written in `docs/modules/06-snap.md`, on `/report` and `/report/outbox`, with these changes:<br>- the outbox copy says "Prototype: there is no server. Synced means added to this browser's triage board."<br>- `src/AppLayout.tsx` drops `showReset` for a **Reset demo** button in `actions` on every view, which clears the photo store, then calls `resetDemo({ keep: ["lang"] })`<br>- with `models/` empty, choosing a photo shows "Rule-based suggestion (AI model not available)", and the form still saves<br>- nothing under `/models/` is requested before a photo is chosen |
| R2 | **Triage board** (Core 2, new) at `/triage` | Three columns, **New**, **Verified** and **Assigned**, with counts in their headings, ordered by `triageBoard`. Only `synced` reports appear: field reports, plus the sample incidents while "Include sample incidents" is on (default on; each sample card is tagged "Sample").<br>**Card:** code, barangay, category, severity (icon + text), households, the severity source in words ("AI suggestion confirmed", "AI suggestion changed", "Rule-based suggestion confirmed", "Rule-based suggestion changed", "Set by hand"), the photo thumbnail from `photoStore` (an image-off icon when there is none) and the time filed.<br>**Verify** on a New card shows a priority radio group (1 Urgent, 2 High, 3 Routine), preset to `suggestPriority` and labelled "Suggested by rule — you decide". **Confirm** moves the card to Verified.<br>**Assign relief** on a Verified card moves it to Assigned and shows "Relief assigned: {barangay} → Evacuation center {n} (synthetic)". An Assigned card shows a bar and "{served} / {registered} households served" (`assignmentProgress`).<br>**Map** beside the columns (`BaseMap` + `PointLayer`): one circle per card, colored by column, with a legend that names each color with icon + text. Clicking a circle focuses its card.<br>A report synced in the field window appears in New in < 1 s, with a one-time pulse at its point and the polite announcement "New report DR-0001, {barangay}, {severity}". After Confirm or Assign, focus moves to the card in its new column. At 390 px the columns stack. |
| R3 | **QR relief distribution** (Core 3, #19) | #19 R19.1 (manual entry, card sheet, duplicate guard, rehydrate-then-check) and R19.2 (webcam, StrictMode-proof, `isRepeatScan`) pass on `/relief/:station` and `/relief/cards`, with households from `generateHouseholds(names, assignPoints(names), createRng(1901))`.<br>`/relief` lists the stations and an **Assigned relief** list (barangay, station, report codes, progress). It updates < 1 s after an assignment in `/triage`. Each station page lists the barangays assigned to it.<br>There are **five** results, each icon + text + color, in an `aria-live="assertive"` region: Accepted, Already claimed, Not recognised, Check the code, and **Not on the relief list yet** ("{barangay} has no assigned report yet. Ask the CDRRMO."). The last comes from `reliefCheck`, and nothing is written for it. |
| R4 | **The cross-role workflow**, ending on the public dashboard | Each step shows in the next window in < 1 s, without a reload: a sync in `/report/outbox` → a New card in `/triage`; Assign → `/relief` and `/public`; an Accepted scan → the triage card's progress and `/public`. A reload of any window restores its state. **Reset demo** clears every window.<br>`/public`: `StatTile`s with `countUp` show Reports verified, Barangays with relief assigned, Households served and Duplicate claims blocked (city totals, exact numbers; served and blocked from #19 `totals`). A "Relief by barangay" table from `publicRows` shows barangay, a status chip (Waiting for relief / Relief assigned / Relief in progress / Completed / No verified report), households served (`displayCount`) and coverage. `CoverageChart` has "Show as table".<br>No report codes, household codes or unverified reports appear on `/public`. Row text ≥ 24 px and tile values ≥ 48 px at 1920 × 1080. The footnote says "Households and sample incidents are synthetic." |
| R5 | Languages, `/sources`, disclaimer | EN / Waray / Filipino via `useLang`, persisted, followed by every open window. All UI text comes from `src/i18n/strings.ts`, including the five scan results and the triage labels; grep finds no JSX text literals. The CLIP prompts stay in English (model input; a code comment says so).<br>`/sources`: `SourcesPage` plus `extra` entries (tier `synthetic`) for the households and points (seed 1901) and the sample incidents (seed 2021, `SYN-0001`…`SYN-0010`), and an AI section with the model id, its license and "runs on this device; photos never leave it".<br>`app.disclaimer` is overridden in all three languages: "Prototype for drills. Households and sample incidents are synthetic. There is no server: synced reports stay in this browser." |

## Domain functions (test-first in `src/domain/`)

Lifted functions keep their tests in `src/modules/snap/` and `src/modules/ayuda/`. These are the platform's own:

- `sampleIncidents(barangays: BarangayCollection): DamageReport[]` = `seedReports(barangays, 2021, 10)` with `id` set to the code. Cases: 10 reports `SYN-0001`…`SYN-0010`; every one `synced` and `synthetic`; the same output twice.
- `triageOf(triage: Record<string, TriageEntry>, id: string): TriageEntry`. A missing entry gives `{ state: "new" }`.
- `suggestPriority(r: { severity: Severity; households: number }): 1 | 2 | 3`. Returns 1 when severity is 4 or households ≥ 20; 2 when severity is 3 or households ≥ 5; otherwise 3. Cases: (4, 0) → 1; (1, 20) → 1; (1, 19) → 3; (3, 0) → 2; (1, 5) → 2; (2, 4) → 3.
- `triageBoard(reports: DamageReport[], triage): Record<"new" | "verified" | "assigned", DamageReport[]>`. Drops anything not `synced`. Sorts each column by priority (`suggestPriority` for New, the set priority otherwise), then severity descending, households descending, `createdAt` ascending, code. Cases: a queued report is absent; field and sample reports merge; ties break by code.
- `verify(triage, id: string, priority: 1 | 2 | 3, nowIso: string)`. Moves New → Verified. Case: verifying a report that is already Verified or Assigned returns **the same reference**.
- `assign(s: { triage; assignments }, report: DamageReport, points: DistributionPoint[], round: string, nowIso: string): { triage; assignments }`. Moves Verified → Assigned and creates `assignments[report.barangay]` with the point whose `barangays` include it, or appends the id to an existing one. Cases: a New report → same reference; the first assignment creates the record; a second report from the same barangay appends without changing `point` or `at`; a barangay that no point serves → same reference.
- `reliefCheck(id: string, ctx: { claims: Claim[]; registry: Map<string, Household>; assignments: Record<string, Assignment>; round: string })` returns `{ kind: "accept"; household; assignment }`, `{ kind: "duplicate"; previous: Claim }`, `{ kind: "unknown" }` or `{ kind: "notAssigned"; household }`. It calls `checkClaim` first: unknown, then duplicate, then the assignment gate. Cases: a household of an assigned barangay → accept; the same household again after its claim → duplicate with the earliest claim; a household of an unassigned barangay → notAssigned; an id not in the registry → unknown; a duplicate is reported even when the barangay has no assignment.
- `assignmentProgress(a: Assignment, registry: Household[], claims: Claim[]): { served: number; registered: number }`. Counts unique households of `a.barangay` with a claim in `a.round`. Cases: a duplicate claim never double-counts; claims of other rounds are ignored.
- `publicRows(names: string[], reports: DamageReport[], triage, assignments, registry: Household[], claims: Claim[], round: string): PublicRow[]`, where `PublicRow = { barangay; verified: number; status: "waiting" | "assigned" | "inProgress" | "complete" | "none"; served: number | "fewerThan5"; rate: number | null }`. `verified` counts reports in Verified or Assigned. `status` is `none` (no verified report), `waiting` (verified, no assignment), `assigned` (assigned, 0 served), `inProgress` (some served) or `complete` (all registered households served). `rate` comes from `coverageByBarangay` and `served` from `displayCount`. Rows are sorted waiting, assigned, inProgress, complete, none, then by name. Cases: a New report never counts; 3 households served shows `"fewerThan5"`; the status moves none → waiting → assigned → inProgress as the report is verified, assigned and served.

## Data

- `useLayer("boundary")` and `useLayer("barangays")`; pass `layers={["boundary", "barangays"]}` to `AppShell`. A missing `barangays` layer shows `DataMissing`.
- **Synthetic**, generated at load and never persisted:
  - households from #19 (seed 1901: 15–40 per barangay, codes `HH-0001`…, `members` 1–9) and points from `assignPoints` (`EC-01`…)
  - 10 sample incidents (seed 2021)

  Codes only: no names, phone numbers, addresses or free text. The QR payload carries only the card code.
- **Stores:** `p02-response:spine` (above) and the shared `lang`. Photos: IndexedDB `rcene-p02-response`, object store `photos`.
- **Models:** `npm run fetch-models -- --model clip` in this folder, or `--from ../06-snap/models` to copy without the network. `models/` is never committed.

## Experience

- **Signature:** four windows, one record. DR-0001's whole journey is visible. In the phone window it goes queued → synced. On the triage board it lands in New with its field photo and "AI suggestion confirmed". When assigned, its progress bar fills as the volunteer scans. On the projector, its barangay's row turns from "Waiting for relief" to "Relief in progress". Recipes: Motion `layout` for cards changing column (as #6's outbox cards), #6's one-time pulse, `StatTile countUp`.
- **Wow moment:** flip **Field signal (simulated)** to Online. The card syncs in the phone window and appears on the triage board, photo included, in the same second.
- **Accessibility:**
  - The whole workflow works by keyboard: "Pick barangay instead" in the form, the signal switch, Verify / Confirm / Assign relief, and manual card entry.
  - Polite live regions for saved, synced, new-card and assignment events; an assertive region for scan results.
  - The map is never the only source: the columns carry every report.
  - `prefers-reduced-motion` turns column moves, pulses and count-ups into instant changes.
  - Touch targets ≥ 44 px in the phone windows; WCAG AA at 390 and 1280 px.

## Golden-path demo (≤ 3 minutes)

Setup: `npm run build && npm run preview` (port 6202), with models fetched. Print one card from `/relief/cards` for a household in the demo barangay, and one for a household elsewhere; record both codes in `DEMO.md`. Press **Reset demo**.

Layout on a 1920 × 1080 screen: **A** `/report` at 420 px on the left; **B** `/triage` at 1080 px in the middle; **C** `/relief/EC-0n` (the station serving the demo barangay) at 420 px on the right; **D** `/public` full screen on the projector. With one screen, D replaces B for step 7.

1. (0:00) B shows 10 sample incidents in New. D shows every barangay as "No verified report".
2. (0:10) A: choose a photo. "Suggested on this device: Severe (61%)" appears; press **Use suggestion**. Choose House — partially damaged, households 6, "Pick barangay instead", the demo barangay. **Save**: "Saved to outbox".
3. (0:50) A, `/report/outbox`: one queued. Switch **Field signal (simulated)** to Online. DR-0001 syncs, and in B it lands in New with its photo, "AI suggestion confirmed" and a pulse on the map.
4. (1:10) B: **Verify**. The priority is preset to "2 High" (severity Severe, 6 households); **Confirm**. Then **Assign relief**. C's station now lists the demo barangay, and D's row turns to "Relief assigned".
5. (1:40) C: scan the printed card (or type it). **Accepted**. B's card shows "1 / {n} households served"; D's Households served counts up and the row turns to "Relief in progress".
6. (2:00) C: scan the same card again. "Already claimed — EC-0n, {time}". D's Duplicate claims blocked goes up by one. Type the second card: "Not on the relief list yet".
7. (2:30) D: switch to Waray (every window follows), then open `/sources`: HDX, the synthetic households and incidents, and the on-device model.

## Definition of done

- [ ] All MVP requirements meet their acceptance criteria
- [ ] Domain and lifted-module tests pass: `npm run test`
- [ ] `npm run typecheck` and `npm run build` pass
- [ ] `npm run smoke` passes for `/`, every role route, `/report/outbox`, `/relief/EC-01`, `/relief/cards` and `/sources` (offline, `models/` empty so the rule-based fallback answers, no console errors, axe clean, screenshots at 390 and 1280)
- [ ] The golden path, model loaded, checked by hand in `npm run preview`; the result recorded in `DEMO.md`
- [ ] Every string comes from `src/i18n/strings.ts` (en + war + fil drafts); AI-drafted strings listed in `NOTES.md` under "Translations to review"
- [ ] `/sources` lists every dataset and the model; disclaimer footer on every view
- [ ] `NOTES.md` "Lifted modules" lists every lift; `STATUS.md`, `AI-LOG.md` and `DEMO.md` are current

## If time runs out

Cut in this order: the `CoverageChart` on `/public` (keep the table); the webcam (manual entry stays); the triage map (keep the columns); the assignment gate (`reliefCheck` becomes `checkClaim`); `/public` (an `EmptyState` that names the stretch); R3; R2. What remains is R1: the platform falls back to **#6 Damage Snap**'s field form, outbox and AI suggestion.

## Out of scope

- A real server, sync across devices, and accounts.
- Names, phone numbers, addresses, free text, and photos of people.
- Integration with DSWD systems; relief-goods inventory; SMS.
- Routing or travel times.
- Any AI that runs off the device or sets a value without a person's action.

## Stretch (only after the definition of done is met)

- #6 R6.4: the installable PWA, for the field window.
- #6 R6.3: the deck.gl heatmap and hexbins as a layer toggle on `/triage`.
- A "Could not verify" triage state, through a version 2 migration of the spine.
- #19 R19.4: rounds ("Start new round") and "Load sample progress".
- CSV export of assignments and claims (codes only; `toCsv` and `downloadCsv`).
- #19 S2: entitlement by household size, shown on Accepted.
