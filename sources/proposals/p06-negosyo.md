# P6 · Negosyo Catbalogan

| | |
|---|---|
| **App** | `apps/p06-negosyo` · dev port 5206 · preview 6206 |
| **Batch** | 5. Run it after batches 2 (#7 Pila, #9 Negosyo Navigator) and 3 (#10 Reklamo) are merged into `main` |
| **Proposal** | `docs/proposal.md` (P6 in the monorepo's `docs/PROPOSALS.md`) |
| **Modules** | `#9 Negosyo Navigator` → Core 1: wizard, requirements and fee estimate; Core 2: location hazard check (`docs/modules/09-negosyo.md`)<br>`#7 Pila` → Core 3: BPLO appointment booking and Counter 5 (`docs/modules/07-pila.md`)<br>`#10 Reklamo` → stretch: seeded public registry, complaint lookup and filing (`docs/modules/10-reklamo.md`); the MVP lifts only `permitStatus` |
| **Roles** | Applicant → `/applicant` → phone<br>BPLO → `/bplo` → full<br>Public registry → `/registry` → wide |
| **Data** | `boundary`, `barangays`, all five `hazard-*` layers (🟢 OCHA/HDX boundaries; 🟡 CDRRMO/CPDCO risk maps with permission, 🟢 UP NOAH fallback per hazard) · synthetic: BPLO queue morning (seed 701), three seeded applications (seed 6001); stretch registry and complaints (seeds 1001, 1002) · authored, illustrative fee rules, requirements, steps and siting advice |
| **AI in the app** | none (`ai: false`). #10's categoriser is not lifted; stretch S2 uses its keyword fallback only |
| **Skills to use** | `maplibre-gis` (siting map), `gsap-motion` (fee bars, count-up), Motion `AnimatePresence` (wizard steps) and `layout` (checklist, agenda rows), Design plugin `ux-copy` and `accessibility-review` |

> The lot a would-be owner pins on their phone follows the application: the BPLO sees its storm-surge zone on the morning's agenda before the counter visit, and the public registry shows it once the permit is released.

## Problem

Applicants learn which clearances, documents and fees apply only at the counter, so a permit takes several trips (#9). The BPLO has no appointment system (#7). Nobody tells an applicant that the lot they are about to lease sits in a mapped storm-surge zone, because eBOSS permitting and DRRM hazard maps have never been joined (P6). The public can't check whether a business has a valid permit (#10). Separate apps would answer each question once and forget it. In one platform the applicant's answers and pin travel with the appointment to the BPLO's desk and then to the public registry.

## Roles, routes and windows

| Role | Route | Window in the demo | Needs |
|---|---|---|---|
| Applicant | `/applicant` (wizard), `/applicant/result`, `/applicant/book`, `/applicant/t/:code` | A: phone, 420 × 860 (`width="phone"`; on `/applicant/result` the map sits above the lists) | Five questions; checklist, fees and days; a hazard check of the lot; an appointment; the permit outcome |
| BPLO | `/bplo` | B: 1440 × 900 (`width="full"`) | The day's appointments and the application behind each; call, serve, release or return |
| Public registry | `/registry`, `/registry/:id` | C: 1200 × 860 (`width="wide"`) | Registered businesses: permit status and the mapped hazards at their location |

The generated scaffold already has: `/` (the role launcher: `RoleLauncher` cards with **Open** and **New window**), one placeholder page per role route, the nav, and `role.<id>.title` / `role.<id>.summary` strings in three languages (`src/roles.ts`, `src/pages/`, `src/i18n/strings.ts`). Replace each placeholder with the real view; keep the routes. Add to `smokeRoutes` in `project.json`: `/applicant/result`, `/applicant/book`, `/applicant/t/BA-001`, `/registry/BIZ-0081`. With the wizard empty, `/applicant/result` and `/applicant/book` redirect to the first unanswered step; an unknown code or id shows an `EmptyState` with a search box. `showReset` on every route; `layers={["boundary", "barangays", "hazard-flood", "hazard-landslide", "hazard-stormSurge", "hazard-groundShaking", "hazard-liquefaction"]}`. Keep the scaffold's nav and its width-by-role rule; `/applicant` shows a **My checklist** link once the answers are complete.

## Lift, then wire

A platform is built from its module apps, not from scratch.

| Module app | Becomes | Lift (copy into `src/modules/<name>/`) | Change after lifting |
|---|---|---|---|
| `#9 Negosyo Navigator` → `negosyo/` | Core 1, Core 2 | `src/domain/*` with tests (the wording test included), `src/content/{fees,requirements,steps,siting}.ts`, `Wizard`, `RequirementList`, `FeeBreakdown`, `StepsTimeline`, `SitingCheck` | Routes under `/applicant`; store `09-negosyo:wizard` renamed `p06-negosyo:wizard` (adds `myAppId`); `onBook` (#9 S3) opens `/applicant/book`; `SitingCheck` without `onPin` renders read-only for `/bplo` |
| `#7 Pila` → `pila/` | Core 3 | `src/domain/*` with tests (incl. `seed.ts`), `QueueConfigProvider`, `BookingForm`, `TicketView`, `CounterConsole` (not `NowServingBoard`) | Config narrowed to `bplo` with Counter 5 (`c5`) and two services, `business-permit-new` (15 min) and `business-permit-renewal` (10 min), passed to `seedDay` and the components as a parameter (add it at lift if they read `offices.ts` directly); stores `07-pila:tickets` and `:counter-c5` become spine slices `tickets` and `counter`; `call(code)` takes an explicit code so the agenda can call one appointment |
| `#10 Reklamo` → `reklamo/` | Stretch S1, S2 | MVP: `permitStatus` with its test. S1: `seedRegistry`, `seedComplaints`, `businessSummary`, `RegistryTable`, `BusinessCard`. S2: `ComplaintForm`, `currentStatus`, `nextTrackingCode`, `keywordSuggest`, `normalizeText`, `validatePhotos`, `src/content/categories.ts` | Business ids `B-0001` → `BIZ-0001` (`code("BIZ", n)`) so they never look like BPLO tickets `B-001`; never lift `src/ai/` or `useCategorizer`; the registry comes in as a prop |

**Which model wins** where two modules model the same thing:
- **Permit services:** the ids of #20 Sumat's catalogue (`business-permit-new`, `business-permit-renewal`), the same ones P5 uses, replace #7's own service ids.
- **Business record: #10's `Business`** is the registry's only model. A released application becomes one through `releasedBusinesses` (`kind` is #9's `BizType`, `violations: []`).
- **Fees: #9's `estimateFees`** is the only fee model; neither #7 nor #10 has one.
- **Hazard answer: #9's `SitingCheck`** (`lookupHazards`, three states, `sitingNotes`). `worstHazard` only picks one badge for a row from the same statuses.
- **Codes:** walk-ins `B-0nn` and appointments `BA-00n` (#7), applications `APP-0001`, businesses `BIZ-0001`, complaints `RK-0061` (#10, stretch). **Language:** one `useLang` for every window.

1. **Check each module app** in this worktree: `../09-negosyo/STATUS.md`, `../07-pila/STATUS.md` and `../10-reklamo/STATUS.md` say `Phase: done`, and `npm run test` passes in each folder.
2. **Lift** by copying (`cp -r ../09-negosyo/src/domain src/modules/negosyo/domain`, and so on). Reading other app folders is fine; never edit them. Fix the imports, merge strings into `src/i18n/strings.ts` under `negosyo.*`, `pila.*` and `reklamo.*`, and make the tests pass here.
3. **If a module app isn't done**, build only these requirements from `docs/modules/`: R9.1, R9.2, R9.3, R9.4; R7.1 (the console for Counter 5 only), R7.3, R7.4; #10's `permitStatus`. Domain first, test-first, exactly as that brief specifies, so a later lift can replace it.
4. **Record every lift** in `NOTES.md` under "Lifted modules": app, its commit (`git log -1 --format=%h -- ../NN-slug`), files and what you changed.

## Spine (one store, keyed by barangay)

`createSyncedStore("p06-negosyo:spine", …, { version: 1 })`, one slice per writer. Every application and business carries its barangay (`answers.barangay`, `Business.barangay`, names from the layer); `/registry` filters by it.

| Slice | Shape | From | Only writer |
|---|---|---|---|
| `applications` | `Application[]`: `{ id: "APP-0004"; seq; answers: Answers; pin: LngLat \| null; appointmentCode: string; createdAt }` | P6 | `/applicant/book` (`bookWithApplication`: one `set` appends the application and its ticket) |
| `tickets` | `Ticket[]` (appointments) | #7 | `/applicant/book` (same action) |
| `counter` | `{ open: boolean; events: CounterEvent[] }` for `c5` | #7 | `/bplo` (`call(code)`, `recall`, `skip`, `serve`, `setOpen`) |
| `decisions` | `Decision[]`: `{ appId; to: "released" \| "returned"; at; reason?: "incomplete" \| "zoningCheck" \| "other" }` | P6 | `/bplo` (`decide`) |

- `p06-negosyo:wizard`: #9's `{ answers; step; pin }` plus `myAppId: string | null`, written only by `/applicant`. The BPLO never reads drafts.
- Seeds are **computed at load in every window and never stored**: #7 `seedDay(createRng(701), anchor)` for the BPLO morning (walk-ins `B-0nn`), and `seedApplications(createRng(6001), …)` anchored to the start of today. Requirements, fees, steps, siting results, ticket states, statuses and released businesses are all derived.
- The whole object is last-write-wins. Write only on a user action (never on load, on a timer or on rehydrate), and open one window per role. Stretch S2 adds `complaints` (writer `/registry`) and `complaintDesk` (writer `/bplo`).

## MVP requirements

Build in this order. **R1 alone must be a finished, demoable single-feature app** (the platform degrades into #9 Negosyo Navigator).

| ID | Requirement | Acceptance criteria (testable) |
|---|---|---|
| R1 | **Wizard, requirements, fee estimate, steps** (#9 R9.1, R9.2, R9.4) | `/applicant` and `/applicant/result` meet R9.1, R9.2 and R9.4 of `docs/modules/09-negosyo.md`; its six golden fee cases pass here (case 3 totals ₱2,993.75). Amounts use `useFormat().currency`. The fee table's caption reads exactly "Illustrative — confirm with BPLO", followed by #9's sentence "Illustrative estimate, not an official assessment. The BPLO computes actual fees from the City Revenue Code." Answers survive a reload. |
| R2 | **Location hazard check** (#9 R9.3) | `SitingCheck` on `/applicant/result` meets R9.3: the check runs at the barangay's interior point until a pin is dropped ("Barangay centre. Tap the map to pin your lot."); a tap runs `lookupHazards` and shows `HazardStatusList` (three states; missing layers listed as missing) plus "What this means for your business" per in-zone hazard; a pin outside the boundary reads "Outside data coverage. We can't say anything about this place."; a pin in another barangay offers "Use {barangay}"; in-zone results add **Recommended** items, never mixed with legal requirements. The answer renders < 1 s after a tap and is announced politely. #9's wording test also covers P6's own hazard strings (keep them under `platform.hazard.*`): no "safe" in English, no `FORBIDDEN_ANSWER_WORDS` in Waray or Filipino. |
| R3 | **Appointment booking and the BPLO desk** (#7 R7.4, R7.3, R7.1 for Counter 5) | **Book a BPLO appointment** on `/applicant/result` (complete answers only) opens `/applicant/book`: the service is `permitServiceFor(answers.mode)`; days are today plus the next 4 working days; 30-min slots come from `availableSlots` (capacity 2: one counter); the earliest free slot is preselected. **Confirm** runs `bookApplication` and opens `/applicant/t/BA-00n`: "Appointment {day}, {time}. Please arrive by {time − 10 min}.", the QR, the fee total, the `worstHazard` badge and the `appStatus` chip (icon + text). `/bplo`: left, the agenda for the chosen day tab (today plus 4 working days) with time, code, APP id, service, worst-hazard badge (`HazardStatusBadge size="sm"`), fee total and status; right, the selected application: answers, `RequirementList` with Recommended items, `FeeBreakdown`, read-only `SitingCheck` with the pin, and Counter 5: Open/Closed, **Call** (this row; disabled on other days with "Not today"), **Call next** (N), **Recall** (R), **Skip** (S), **Serve** (Enter), then **Release permit** or **Return** with a reason, both enabled only at `served`. |
| R4 | **The cross-role workflow** | (a) **Confirm** in A adds the agenda row to B, with its hazard badge (Motion `layout`). (b) **Call** in B turns A into "Go to Counter 5 now". (c) **Serve** then **Release permit** in B lists `BIZ-0081` on `/registry` in C (code, name "Food business #1", kind, barangay, permit badge "Valid until 31 Dec {year}" from #10's `permitStatus`, worst-hazard badge), and A shows "Permit released: BIZ-0081" linking to `/registry/BIZ-0081`. Each change shows in the other windows in < 1 s without reload; a reload restores it; **Reset demo** returns all windows to the seeded morning. `/registry` searches by code, name or barangay and filters by barangay; empty: "No permits released in this demo yet." `/registry/:id` shows the business with `HazardStatusList` at its location and "Mapped risk zones only; not a site inspection." |
| R5 | **Languages, `/sources`, disclaimer** | EN / Waray / Filipino via `useLang`, shared by all windows; platform strings under `platform.*`. `/sources`: `SourcesPage` (boundaries: OCHA/HDX; risk maps as `sources.json` lists them) with `extra` entries (tier `synthetic`): "BPLO queue morning: seed 701"; "Seeded applications: seed 6001, codes only"; "Released permits: made in this demo, codes only". A "Content in this app" card: fee rules, requirements, steps and advice are illustrative, written for this prototype from general eBOSS knowledge, not Catbalogan's Revenue Code. `app.disclaimer` in three languages: "Prototype. Requirements, fees and timelines are illustrative — confirm with BPLO. Hazard maps show mapped risk zones only. Businesses and appointments are synthetic." |

## Domain functions (test-first in `src/domain/`)

Lifted functions keep their tests in `src/modules/<name>/`. Platform functions take `now` or `dayStart`; build test times with `new Date(y, m, d, h, min)`.

- `permitServiceFor(mode: "new" | "renewal"): "business-permit-new" | "business-permit-renewal"`. One case each.
- `bookApplication({ answers, pin, slotStart }, { tickets /* seed ∪ spine */, applications /* seed ∪ spine */, counters, now }): { ok: true; ticket: Ticket; app: Application } | { ok: false; reason: "incomplete" | "slotUnavailable" }`. Uses #9's `isComplete` and #7's `availableSlots` and `nextCode`. Cases: complete answers and a free slot on a working day with three seeded appointments → ticket `BA-004` (`kind: "appointment"`, `officeId: "bplo"`, the right service, `slotStart`) and `APP-0004` with `appointmentCode: "BA-004"`; incomplete answers → `incomplete`; a past, lunch, weekend or full slot → `slotUnavailable`; a second booking → `BA-005` / `APP-0005`; a renewal books `business-permit-renewal`.
- `appStatus(app, ticketState: TicketState | undefined, decisions: Decision[]): "booked" | "called" | "served" | "missed" | "released" | "returned"`. Ticket states map waiting/undefined → booked, called → called, done → served, skipped → missed. A decision counts only when its `at` is after the ticket's `doneAt`; the earliest counting decision wins. Cases: each mapping; a release dated before serving is ignored; of two counting decisions the earlier wins; other apps' decisions are ignored.
- `agenda({ tickets, states, applications, decisions, day, now }): { ticket; app?: Application; status; due: boolean }[]`: BPLO appointments on `day` only, by `slotStart` then code; `due` when `slotStart − 10 min ≤ now`. Cases: walk-ins and other days excluded; order; the `due` boundary; a ticket without an application keeps its ticket status.
- `releasedBusinesses(applications, decisions, states, { firstSeq = 81, pointOf }): Business[]`: one per released application, in decision time order (ties by APP id), ids `BIZ-0081`…; `name` "{Kind label} #{n}" numbered per kind; `lngLat` = the pin, else `pointOf(barangay)`; `permit: { validUntil: 31 Dec of the release year, 23:59:59.999 local; renewalPending: false }` (illustrative). Cases: two releases → `BIZ-0081`, `BIZ-0082`; a returned application is excluded; no pin → the barangay point; a release on 7 Oct 2026 → valid until 31 Dec 2026.
- `worstHazard(status: Partial<Record<Hazard, HazardStatus>>): { hazard; status } | null`: the in-zone hazard with the highest level (ties in `HAZARDS` order); else the first `notInZone`; else `outsideCoverage`; `{}` → null. One case per branch.
- `seedApplications(rng, barangays: BarangayCollection, dayStart): { tickets; applications }`: Monday to Friday only, three appointments at 13:00, 14:30 and 16:00 (`BA-001`…`BA-003`, `APP-0001`…`APP-0003`) with fixed answers: food with preparation, sole, new, ₱80,000, 18 m², 2 workers; retail, corporation, renewal, ₱1,200,000 capital, ₱3,000,000 sales, 120 m², 6 workers; lodging, 12 rooms, partnership, new, ₱4,500,000, 300 m², 8 workers. Barangays are picked from the sorted names; each pin comes from `randomPointsIn(that barangay, 1, rng)`. Cases: same seed and day → deep-equal; Saturday → empty; every answer passes `isComplete`; every pin is inside its barangay.

## Data

- `useLayer("boundary")`, `useLayer("barangays")`, `useZones()` (all five hazards). Fixtures until the data session lands ("Sample data" badge meanwhile). Distances are not used; if any appear, label them straight-line.
- Synthetic: seeds 701 and 6001 as above (S1 adds 1001 and 1002), never written to a store. Codes only, never personal or business names beyond generic labels.
- Authored: `src/modules/negosyo/content/*` (`FEE_RULES`, requirements, steps, siting advice in en + war + fil).
- Store keys: `p06-negosyo:spine`, `p06-negosyo:wizard`. Layers and content are never persisted.

## Experience

- **Signature:** one lot, three roles side by side. The pin the applicant drops becomes a hazard badge on the BPLO's agenda before the visit and a badge on the public registry after release; no module app joins the two. Recipes: `maplibre-gis` (`ZoneLayer`, `SelectedPoint`, `useFlyTo`), `gsap-motion` (fee bars with `scaleX`, `CountUp` total), Motion `layout` for the agenda row that slides in.
- **Wow moment:** a tap on the shoreline turns the storm-surge chip to "In a mapped risk zone — High" and slides "Business continuity plan" into the checklist; **Confirm** makes the same badge appear on the BPLO's agenda in the other window.
- **Accessibility:** each wizard step is a `<fieldset>` with a `<legend>` and real radio inputs; errors are linked with `aria-describedby`; the siting answer and the applicant's status are `aria-live="polite"`; the map is never the only way in (the barangay answer drives the default check, and `/bplo` shows the statuses as text); every BPLO action is a real button with its key hint; status and permit chips are color + icon + text; touch targets ≥ 44 px; `prefers-reduced-motion` turns the wizard slides, fee bars, count-up and row slide into instant updates.

## Golden-path demo (≤ 3 minutes)

Windows on port 5206, opened from `/` with **New window**: A `/applicant` (420 × 860, left of a 1920 × 1080 screen); B `/bplo` (1440 × 900, right of A); C `/registry` (1200 × 860, on the projector or over B from step 6). Rehearse on a weekday between 08:00 and 16:00; later, the booking moves to the next working day and **Call** says "Not today". Press **Reset demo**. Record the coastal barangay, the shoreline point and the codes in `DEMO.md`.

1. A: Food → "prepare food on site: yes" → Sole proprietorship → New → ₱150,000, 30 m², 3 workers → the coastal barangay, not home-based. (40 s)
2. A `/applicant/result`: the checklist; the fee bars grow and the total counts up to ₱2,993.75 under "Illustrative — confirm with BPLO"; "About 5–11 working days". (15 s)
3. A: tap the shoreline point → storm surge "In a mapped risk zone — High" with what it means; "Business continuity plan" slides in as Recommended. Tap out at sea → "Outside data coverage"; tap the shore again. (25 s)
4. A: **Book a BPLO appointment** → the preselected slot → **Confirm** → `BA-004`, "Please arrive by …". B: the row BA-004 / APP-0004 with the storm-surge badge slides into the agenda. (20 s)
5. B: open the row: answers, checklist with the Recommended item, fees, the pin on the read-only map → **Call** → A: "Go to Counter 5 now". (25 s)
6. B: **Serve** → **Release permit**. C: `BIZ-0081 · Food business #1 · Valid until 31 Dec 2026` with the storm-surge badge. A: "Permit released: BIZ-0081". (20 s)
7. A: switch to Waray; B and C follow. If S1 is built, C: search "Rice" → the demo rice retailer: "Expired since …", short-weight violations. (25 s)
8. Open `/sources`. (10 s)

## Definition of done

- [ ] R1–R5 meet their acceptance criteria
- [ ] Domain and lifted-module tests pass: `npm run test`
- [ ] `npm run typecheck` and `npm run build` pass
- [ ] `npm run smoke` passes for `/`, every role route, the added routes and `/sources` (offline, no console errors, axe clean, screenshots at 390 and 1280)
- [ ] No hazard answer says "safe" in any language (wording test)
- [ ] Every string comes from `src/i18n/strings.ts` (en + war + fil drafts); AI-drafted strings listed in `NOTES.md` under "Translations to review"
- [ ] `/sources` lists every dataset used; disclaimer footer on every view
- [ ] `NOTES.md` "Lifted modules" lists every lift; `STATUS.md`, `AI-LOG.md` and `DEMO.md` are current

## If time runs out

Cut in this order: stretch; R4 (c), release and the registry table (`/registry` then shows "The public registry is not part of this version"); the BPLO desk (keep booking and the ticket page); then R3. With R1 and R2 left, hide the BPLO and registry cards on `/`, drop their routes from `smokeRoutes`, and demo **#9 Negosyo Navigator**.

## Out of scope

- Submitting a real application, payments, eBOSS or BPLO integration, accounts, SMS.
- A zoning answer (there is no zoning layer: the locational clearance item says the CPDO confirms zoning), building-permit fees, a "risk score" for a lot, Catbalogan's actual Revenue Code.
- Any AI model, real business names or owners, holidays, cross-device sync.

## Stretch (only after the definition of done is met)

- **S1 Seeded registry and lookup** (#10 R10.2): the 80 seeded businesses (`BIZ-0001`…`BIZ-0080`, seed 1001) merged with released ones; permit badges, violations in the last 12 months and complaint counts (seed 1002); `/registry/:id` uses `BusinessCard`, listing complaints as code, category, status and month only.
- **S2 File a complaint** (#10 R10.1) from `/registry/:id`: `RK-0061`, `/registry/track/:code`, a keyword suggestion labelled "Suggested by keyword match" that the citizen confirms; desk actions as a **Complaints** tab on `/bplo`.
- **S3 Hazard-aware registry:** a worst-hazard column and an "In a mapped risk zone" filter for every business.
- **S4 Printable checklist** (#9 R9.5) at `/applicant/print`.
