# 11 · Bayanihan Budget

| | |
|---|---|
| **App** | `apps/11-bayanihan` · dev port 5111 · preview 6111 |
| **Batch** | 3 |
| **Proposal** | `docs/proposal.md` (#11 Bayanihan Budget — participatory budgeting, in the monorepo's `docs/PROPOSALS.md`) |
| **Reused by platforms** | P7 Bukas Catbalogan (core module "budget vote": the ballot `/` and the results board `/results`, see "Platform hooks") |
| **Data** | boundary, barangays (🟢 OCHA/HDX) · synthetic: 12 proposed projects (fixed content table, map placement seed 1101) and simulated ballots (seed 1102), all labelled "Sample" · no permission-tier data |
| **AI in the app** | none |
| **Skills to use** | `maplibre-gis` (pins as HTML markers, fly-to), `gsap-motion` (bucket fill, count-ups), built-in `dataviz` (every chart on `/results`, Recharts), Design plugin `ux-copy` (ballot rules, honesty notes, empty states) |

> Twelve proposed projects pinned on a barangay map and ₱2,000,000 of virtual budget: fill the bucket, cast one ballot, and watch the results race re-rank live on the big screen.

## Problem

Barangay development funds are decided in assemblies most residents never attend, and the projects on the table are rarely shown with their cost and location side by side, so the trade-off ("₱950,000 for the water system means no streetlights this year") stays invisible. P7 Bukas Catbalogan's workflow needs a step where "residents allocate a virtual budget and vote" (PROPOSALS #11, P7). This app makes that trade-off tangible with a fixed budget and live results. It is a consultation and civic-education demo, not an election, and it says so on every screen.

## Users and routes

| Role | Route | Device in the demo | Needs |
|---|---|---|---|
| Resident | `/` | phone-width window (design at 390 px) | See the proposed projects on the map, split the budget, cast one ballot, get a receipt |
| Resident | `/p/:id` | same | One project's details: cost, purok, what it fixes, where it is |
| Barangay assembly / public | `/results` | second window, wide (projector, design at 1280 px) | Live tally, the results race, which projects the budget would fund |
| Anyone | `/sources` | — | Attribution, synthetic-data note, disclaimer |

Use `AppShell width="phone"` for `/` and `/p/:id`, `AppShell width="full" showReset` for `/results`. Pass `layers={["boundary", "barangays"]}` so the Sample data badge works.

## MVP requirements

Build in this order. R11.1 alone is a complete entry.

| ID | Requirement | Acceptance criteria (testable) |
|---|---|---|
| R11.1 | Ballot: projects on a map and in a list, allocate the budget, cast one ballot per device | The 12 projects from `src/content/projects.ts` show as numbered HTML `Marker` pins inside the pilot barangay (map fits it; other barangays drawn faintly) and as cards in a list. Tapping a pin highlights and scrolls to its card; "Show on map" on a card flies to the pin (`useFlyTo`); "Details" opens `/p/:id` (full purpose text, purok, cost, a small map, the same allocation control; unknown id → `EmptyState` with a link back). Each card shows title ("Drainage canal, Sample Purok 3"), category icon + label, cost in whole pesos, a one-line purpose and an allocation control (slider step ₱5,000, numeric input, "Fund fully", "Clear"). The budget bucket shows allocated / ₱2,000,000 and the remaining amount. A control's maximum is `maxAllocatable`, so the total can never exceed the budget and no project can receive more than its cost; typed values are clamped by `clampAllocation` and the clamp is explained inline. Submit is enabled only when `validateBallot` returns no errors; a confirm dialog lists the allocations and the unspent amount; confirming stores the ballot (`B-0001`, `B-0002`, …) and shows a receipt. Reloading keeps the draft (before voting) or the receipt (after). A second cast from the same device token is refused by `castBallot`. The note "Demo: one ballot per browser on this device. A real vote needs verified residents." is visible on `/`. |
| R11.2 | Live results board `/results` | Opened in a second window, it updates within 1 s of a ballot being cast in the first window, without reload (store sync). Race chart: one row per project, sorted by `tally`, rows re-order with Motion `layout`, bar length proportional to pesos pledged, value label in pesos and supporter count. Funding line: projects returned by `fundedProjects` carry a **Funded** badge (icon + text), the others **Not funded this round**; leftover budget shown. `StatTile`s with `countUp`: ballots cast, total pesos pledged, projects funded. Zero ballots → `EmptyState` "No ballots yet". |
| R11.3 | Simulated neighbours and demo kiosk | `/results` has "Add 25 simulated ballots": appends `simulateBallots` output one ballot every 300 ms so the race visibly re-ranks; disabled while running; counts are shown split ("25 simulated · 1 from this device") and simulated ballots are labelled as such. The receipt on `/` has "Next voter (demo kiosk)", which issues a new device token and clears the draft, with a line saying this exists only for the demo. "Reset demo" (AppShell) clears everything. |
| R11.4 | Pesos by category chart | Recharts horizontal `BarChart` on `/results`: pesos pledged per category, sorted descending, direct value labels, one hue (follow `dataviz`), animates when data changes; a "Show as table" toggle renders the same numbers as a `<table>`. |
| R11.5 | Language toggle, `/sources`, disclaimer | EN / Waray / Filipino via `useLang`; every string from `src/i18n/strings.ts`, including project titles and purposes. `/sources` lists OCHA/HDX boundaries plus two `tier: "synthetic"` entries (projects, simulated ballots). Disclaimer footer on every view (AppShell). |

## Domain functions (test-first in `src/domain/`)

Types (keep them exported and free of React):

```ts
type Category = "drainage" | "lighting" | "mobility" | "health" | "childcare" | "water" | "preparedness" | "environment";
interface ProposedProject { id: string; category: Category; purok: number; cost: number; barangay: string; lon: number; lat: number }
type Allocations = Record<string, number>;            // projectId → whole pesos, keys with 0 removed
interface Ballot { id: string; token: string; allocations: Allocations; castAt: number; simulated: boolean }
type BallotError = "empty" | "unknownProject" | "notWholePesos" | "negative" | "overProjectCost" | "overBudget";
```

- `pilotBarangay(barangays: BarangayCollection): BarangayFeature` — the barangay with the largest area (`turf.area`), ties by name. Cases: fixture → the largest of the 6; deterministic.
- `placeProjects(content, pilot, seed = 1101): ProposedProject[]` — one seeded point per project inside the pilot barangay (`randomPointsIn`). Cases: same seed → deep-equal; ids `P-01`…`P-12` in content order; every point `pointInArea` of the pilot; costs copied unchanged.
- `maxAllocatable(allocs, projectId, projects, budget): number` — `min(cost, budget − Σ others)`, never below 0. Cases: empty draft → cost; budget nearly spent → the remainder; budget fully spent elsewhere → 0.
- `clampAllocation(allocs, projectId, raw, projects, budget): number` — floors to whole pesos and clamps to `[0, maxAllocatable]`. Cases: 1500.75 → 1500; −5 → 0; above max → max; NaN → 0.
- `setAllocation(allocs, projectId, amount, projects, budget): { ok: true; allocations: Allocations } | { ok: false; reason: BallotError }` — does not mutate the input; 0 removes the key. Cases: each reason; exactly spending the whole budget is allowed; one peso over is `overBudget`.
- `validateBallot(allocs, projects, budget): BallotError[]` — empty list means valid. Cases: `{}` → `["empty"]`; unknown id; total over budget; valid partial spend (leftover allowed).
- `castBallot(ballots, allocs, token, now, projects, budget): { ok: true; ballot: Ballot } | { ok: false; reason: BallotError | "alreadyVoted" }` — id `code("B", ballots.length + 1)`. Cases: second ballot with the same token → `alreadyVoted`; invalid draft → its first error.
- `tally(ballots, projects): TallyRow[]` with `TallyRow { projectId; pledged; supporters; rank }` — sorted by pledged desc, then supporters desc, then id asc; projects with 0 included last. Cases: no ballots → all zero in id order; tie-breaks.
- `fundedProjects(rows, projects, budget): { funded: string[]; leftover: number }` — greedy down the ranking: fund a project if its full cost fits the remaining budget, otherwise skip it and continue; never fund a project with 0 pledged. Cases: exact fit; the #1 project too expensive is skipped and #2, #3 funded; all zero → none.
- `simulateBallots(projects, budget, n, seed = 1102): Ballot[]` — category preference weights (from `src/content/projects.ts`) so results are uneven; ids `S-0001`…, tokens `SIM-001`…; `simulated: true`. Cases: deterministic per seed; for seeds 1–20 and n = 25 every ballot passes `validateBallot`.
- `byCategory(rows, projects): { category; pledged }[]` — for R11.4. Case: sums equal Σ pledged.
- Pesos: no local `formatPeso`. Use the shared `useFormat().currency(n)` in components, or `formatCurrency` from `@rcene/i18n` in pure code (₱, locale-aware). Amounts here are whole pesos, so pass 0 decimals: `currency(n, 0)`, `formatCurrency(n, lang, 0)`.

## Data

- `useLayer("barangays")`, `useLayer("boundary")`. Works on fixtures until the real data lands; the Sample data badge shows meanwhile.
- Synthetic projects: a fixed content table in `src/content/projects.ts` (title and purpose are i18n keys; costs are fixed so the story is the same every rehearsal), placed by seed 1101 inside the pilot barangay. Total cost ₱5,900,000, about 3× the ₱2,000,000 budget (`BUDGET` in `src/content/config.ts`). Titles use the pattern "{type}, Sample Purok {n}". No personal names anywhere.

  | id | Category | Title (EN) | Purok | Cost (₱) |
  |---|---|---|---|---|
  | P-01 | drainage | Drainage canal | 3 | 850,000 |
  | P-02 | lighting | Solar streetlights (10 posts) | 1 | 420,000 |
  | P-03 | mobility | Concrete footpath to the school | 5 | 600,000 |
  | P-04 | health | Health station supplies and BP monitors | 2 | 180,000 |
  | P-05 | childcare | Day-care center roof repair | 4 | 350,000 |
  | P-06 | water | Spring box and tap stands | 6 | 950,000 |
  | P-07 | preparedness | Early-warning sirens and radios | 1 | 280,000 |
  | P-08 | environment | Mangrove nursery | 7 | 150,000 |
  | P-09 | environment | Materials recovery bins and compost pit | 2 | 220,000 |
  | P-10 | drainage | Canal covers and declogging | 5 | 300,000 |
  | P-11 | mobility | Footbridge repair | 6 | 1,200,000 |
  | P-12 | preparedness | Evacuation kit stockpile | 3 | 400,000 |

- Simulated ballots: `simulateBallots(projects, BUDGET, 25, 1102)`.
- Stores (one writer per store, per `@rcene/store` guidance), all `version: 1`:
  - `createSyncedStore("11-bayanihan:device")` → `{ token: string; draft: Allocations; ballotId: string | null }`. Written only by `/`. `token` is `crypto.randomUUID()` on first load.
  - `createSyncedStore("11-bayanihan:ballots")` → `{ ballots: Ballot[] }`. Written only by `/` (ballots cast on this device).
  - `createSyncedStore("11-bayanihan:simulated")` → `{ ballots: Ballot[]; running: boolean }`. Written only by `/results`.
  - `/results` tallies both ballot lists. Last write wins per store; that's acceptable with one voter window and one board window.

## Experience

- Calm civic tone, warm accent for the budget. Phone ballot: map at the top (about 35 vh), project list below, a sticky bottom bar with a mini bucket, the remaining amount and Submit. Results board: large type (rows at least 20 px), high contrast, readable from the back of a hall.
- **Wow moment:** the budget bucket fills as you allocate (SVG bucket; GSAP tweens the fill's `scaleY` from the bottom with a short ease, a gentle settle at 100%; `gsap-motion` "core pattern", with the slider handler's tween wrapped as in its "Animations started by events" section), and on the board the results race re-ranks as ballots stream in (Motion `layout` on the rows) while `StatTile` counters count up. One library per element: rows are Motion, numbers are GSAP.
- Import `gsap`, `useGSAP` and plugins from `@rcene/ui/motion` (already registered); don't create a second registration file.
- Map: pins are HTML `Marker`s with the project number (the offline basemap has no glyphs, so no symbol text layers); popups via `Popup`. Category colors appear only on pins and icons; every pin also has its number and its card has a text label.
- Use shadcn primitives from `@rcene/ui/components/<name>` (button, card, slider, dialog, badge, input). If one is missing, use a plain element styled with the shared tokens and note it in `NOTES.md`.
- Accessibility: every slider has `aria-valuetext` in pesos ("₱350,000 of ₱850,000"); arrows change it by ₱5,000 and PageUp/PageDown by ₱50,000; the numeric input has a visible label; a polite live region announces the remaining budget after each change; the race chart has a table alternative; Funded / Not funded use icon + text, never color alone; reduced motion makes the bucket and the re-rank instant.

## Golden-path demo (≤ 2 minutes)

1. Projector window: `/results` shows "No ballots yet".
2. Phone window `/`: tap pin 6 → the water-system card highlights; "Fund fully" ₱950,000 → the bucket fills to 48%.
3. Give the drainage canal ₱850,000 and the early-warning sirens ₱200,000 → the bucket is full; the streetlights slider now tops out at ₱0 and the inline note explains why.
4. Submit → confirm → receipt **B-0001**. The projector updates within a second: 1 ballot, water first.
5. Projector: "Add 25 simulated ballots" → rows race and re-rank, the funding line settles, counters count up.
6. Phone: reload → still the receipt (one ballot per device). Switch to Waray. Open `/sources`: synthetic projects and ballots, OCHA/HDX boundaries.

## Definition of done

- [ ] R11.1–R11.5 meet their acceptance criteria
- [ ] Domain tests pass: `npm run test`
- [ ] `npm run typecheck` and `npm run build` pass
- [ ] `npm run smoke` passes (offline, no console errors, axe clean, screenshots at 390 and 1280)
- [ ] Every string comes from `src/i18n/strings.ts` (en + war + fil drafts); AI-drafted Waray/Filipino strings listed in `NOTES.md` under "Translations to review"
- [ ] `/sources` lists every dataset used; disclaimer footer on every view
- [ ] `STATUS.md`, `AI-LOG.md` (one row per commit) and `DEMO.md` are current

## Out of scope

Real identity verification, accounts or any server; ranked-choice or knapsack voting variants; real barangay project lists or real costs; QR codes (no `qrcode` extra in this app); editing or proposing projects; tamper-proofing beyond "one token per browser".

## Stretch (only after the definition of done is met)

- Results map on `/results`: the same pins scaled by pesos pledged.
- "My ballot vs the community" comparison on the receipt.
- Barangay switcher: run the same 12-project ballot in another barangay (projects re-placed by seed).

## Platform hooks

Export `routes` (already), and keep `BallotScreen`, `BudgetBucket`, `ResultsRace`, `ResultsBoard` and every domain function free of app-specific globals: they take `projects`, `budget` and the ballot lists as props or arguments. P7 Bukas Catbalogan will feed its own project list (possibly from #12's data) into the same components, mount `/` as its "vote" step and `/results` as its public board.
