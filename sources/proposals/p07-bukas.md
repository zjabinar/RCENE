# P7 · Bukas Catbalogan

| | |
|---|---|
| **App** | `apps/p07-bukas` · dev port 5207 · preview 6207 |
| **Batch** | 6. Run it after batches 2 (#13) and 3 (#11, #12) are merged into `main` |
| **Proposal** | `docs/proposal.md` (P7 in the monorepo's `docs/PROPOSALS.md`) |
| **Modules** | `#13 Bukas Datos` → Core 1 "scroll story" (`docs/modules/13-datos.md`)<br>`#12 Proyekto Watch` → Core 2 "projects map" (`docs/modules/12-proyekto.md`)<br>`#11 Bayanihan Budget` → Core 3 "budget vote"; the proposal's stretch "feedback" is the small cross-role step in R4 (`docs/modules/11-bayanihan.md`) |
| **Roles** | Data story → `/story` → full window<br>Projects map → `/projects` → wide window<br>Budget vote → `/budget` → phone window<br>Planning office → `/planning` → full window |
| **Data** | boundary, barangays (🟢 OCHA/HDX) · all five `hazard-*` (🟡 CDRRMO/CPDCO risk maps, with permission; 🟢 UP NOAH fallback) · facilities (🟢 OSM) · `derived/barangay-hazard`, `derived/facility-hazard` · synthetic, labelled "Sample": 18 infrastructure projects (seed 1201), 12 proposals with illustrative costs (placement seed 1101), simulated ballots (seed 1102) · no photos (CEEPUO site photos would be 🟡 and are not used) |
| **AI in the app** | none |
| **Skills to use** | `gsap-motion` (scroll story, rings, bucket, count-ups), `maplibre-gis` (story map, project and proposal pins), built-in `dataviz` (story charts, results race, category chart), Design plugin `ux-copy` and `accessibility-review` |

> Scroll through what the city's own data shows, see what is being built and how far behind it is, then split ₱2,000,000 of virtual budget on a phone: the planning office's board re-ranks within a second, and the office's reply to your feedback comes back to the phone.

In this brief, **projects** are #12's infrastructure projects being built (`InfraProject`, `PRJ-2026-001`…`PRJ-2026-018`). **Proposals** are #11's proposed projects on the ballot (`ProposedProject`, `P-01`…`P-12`).

## Problem

PROPOSALS lists "hazard data locked in technical formats" among Catbalogan's documented needs. Infrastructure spending is published under the Full Disclosure Policy as PDF and spreadsheet reports, and barangay funds are decided in assemblies most residents never attend. Each of #13, #12 and #11 fixes one step: understand the data, see what is built, choose what comes next. Joined, a resident goes from reading to choosing to telling the office, and the planning office sees each ballot and comment arrive and can answer it. The proposal's own reason it scores: it is the most visually designed option, and the story doubles as the poster.

## Roles, routes and windows

| Role | Route | Window in the demo | Needs |
|---|---|---|---|
| Data story (`story`) | `/story` | W1, 1440 × 900, left (reads at 390 too) | The #13 scroll story; its `projects` chapter links on to `/projects` |
| Projects map (`projects`) | `/projects`, `/projects/:id` | W1 again: the story's link opens it there | What is being built, where, and how far along against schedule |
| Budget vote (`budget`) | `/budget`, `/budget/p/:id` | W2, 420 × 860, right edge | Split the budget, cast one ballot, leave feedback, read the reply |
| Planning office (`planning`) | `/planning` | W3, 1440 × 900, behind W1 (or full screen on a projector) | Live results race, funding line, simulated neighbours, feedback inbox with replies |

The generated scaffold already has: `/` (the role launcher: `RoleLauncher` cards with **Open** and **New window**), one placeholder page per role route, the nav, and `role.<id>.title` / `role.<id>.summary` strings in three languages (`src/roles.ts`, `src/pages/`, `src/i18n/strings.ts`). Replace each placeholder with the real view; keep the routes. `AppLayout` sets the `AppShell` width from the role of the route, so `/projects/:id` is wide and `/budget/p/:id` is phone. Add `/projects/PRJ-2026-001` and `/budget/p/P-01` to `smokeRoutes` in `project.json`.

## Lift, then wire

A platform is built from its module apps, not from scratch.

| Module app | Becomes | Lift (copy into `src/modules/<name>/`) | Change after lifting |
|---|---|---|---|
| `#13 Bukas Datos` | Core 1 → `src/modules/story/` | `src/domain/*` (with tests), `src/content/chapters.ts`, `Story`, `HazardChapter`, `RankedBars`, `SvgMap` (and `Poster`, used only by S1) | Mounted at `/story`; the `projects` chapter is appended as data in `chapters.ts`; `13-datos:app` becomes `p07-bukas:story`; strings under `story.` |
| `#12 Proyekto Watch` | Core 2 → `src/modules/projects/` | `src/domain/*` (with tests), `ProjectMap`, `ProjectCard`, `ProgressRings`, `BeforeAfter`, `public/illustrations/*.svg` (to this app's `public/illustrations/`) | `/` → `/projects`, `/p/:id` → `/projects/:id`; filters move to the URL query; flag screens are not mounted (S2); `12-proyekto:*` stores are not created; strings under `projects.` |
| `#11 Bayanihan Budget` | Core 3 → `src/modules/budget/` | `src/domain/*` (with tests), `src/content/projects.ts` (rename `proposals.ts`), `src/content/config.ts`, `BallotScreen`, `BudgetBucket`, `ResultsRace`, `ResultsBoard` | `/` → `/budget`, `/p/:id` → `/budget/p/:id`, `/results` → the board in `/planning`; the three `11-bayanihan:*` stores become spine slices; strings under `budget.` |

1. **Check each module app** in this worktree: `../13-datos/STATUS.md`, `../12-proyekto/STATUS.md` and `../11-bayanihan/STATUS.md` say `Phase: done`, and their tests pass (`npm run test` in that folder).
2. **Lift** by copying (`cp -r ../13-datos/src/domain src/modules/story/domain`, and so on). Reading other app folders is fine; never edit them. Fix the imports, merge its strings into `src/i18n/strings.ts` under the module's prefix, and make its tests pass here.
3. **If a module app isn't done**, build only the requirements this brief lists, from its brief in `docs/modules/NN-slug.md`. Domain first, test-first, exactly as that brief specifies, so a later lift can replace it.
4. **Record every lift** in `NOTES.md` under "Lifted modules": app, its commit (`git log -1 --format=%h -- ../NN-slug`), files and what you changed.

## Spine (one store, keyed by barangay)

`createSyncedStore("p07-bukas:spine", …, { version: 1 })` in `src/store.ts` (`useSpine`). A participatory-budget round belongs to one barangay, so rounds are keyed by barangay name. The MVP runs one round, in `pilotBarangay(barangays)` from #11.

```ts
interface Feedback { id: string; topic: string /* "P-01"…"P-12" | "general" */; note: string; token: string; at: number }
interface Reply { text: string; at: number }
interface Round {
  ballots: Ballot[]; simulated: Ballot[]; simRunning: boolean;   // #11's Ballot
  feedback: Feedback[]; replies: Record<string, Reply>;          // feedback id → the office's one reply
}
interface Spine {
  rounds: Record<string, Round>;                                   // barangay name → round
  device: { token: string; draft: Allocations; ballotId: string | null };
  updatedAt: number | null;                                        // from the scaffold
}
```

| Slice | Written by | Actions |
|---|---|---|
| `device`, `rounds[b].ballots`, `rounds[b].feedback` | `/budget` | `setAllocation`, `castBallot`, `nextVoter`, `addFeedback` |
| `rounds[b].simulated`, `rounds[b].simRunning`, `rounds[b].replies` | `/planning` | `addSimulated`, `setSimRunning`, `reply` |
| none | `/story`, `/projects` | read only |

Everything in the spine is persisted. The store saves the whole object (last write wins), and each slice has one writing role. The only timed writer is the simulation (one ballot per 300 ms), so R4 blocks casting while it runs.

## MVP requirements

Build in this order. **R1 alone must be a finished, demoable single-feature app** (the platform degrades into #13).

| ID | Requirement | Acceptance criteria (testable) |
|---|---|---|
| R1 | Core 1: the data story at `/story` (#13) | #13's R13.1–R13.3 and R13.6 behave as specified there: chapters `intro`, `coast`, `flood`, `slopes`, `facilities`, `care`, `ranking`, `about`; the CSS-sticky map (45 vh below 1024 px); one ScrollTrigger per chapter whose `onToggle` fits the camera in about 1.2 s; SplitText headline; three count-up `StatTile`s that read "6 barangays" on fixtures; the caveat "Share of land area inside a mapped risk zone, not share of people." on each hazard chapter; `DataMissing` for a missing layer; "Show as table" on every chart; one CSV download per data chapter. `SmoothScroll` wraps `/story` only. `landcover` (R13.4) appears only if it was lifted finished; don't build it here. `npm run smoke -- --route /story --route /sources` passes. |
| R2 | Core 2: projects map at `/projects` (#12) and the story's `projects` chapter | #12's R12.1–R12.2: `seedProjects(barangays, 1201, "2026-09-30")` gives 18 pins colored by `scheduleStatus` (legend with icon + label), the list sorted by severity, status chips, the fund-source select, 4 count-up tiles; `/projects/:id` shows every FDP field, "Data as of 30 Sep 2026 (synthetic)", both progress rings with their text equivalent, the chip with variance ("23 points behind plan"), the contractor code with "Contractor names are withheld in this demo." and the keyboard-operable before/after wipe; unknown id → `EmptyState`. Filters live in the URL query (`?status=behind,overdue&fund=ldrrmf&category=drainage`); `category` filters by `categoryOfType` and shows a dismissible chip. The story gains a `projects` chapter after `ranking` (and `landcover`), before `about`: pins by status on the sticky map, "{x} of {n} projects are behind schedule or overdue." (6 of 18 with seed 1201), a bar chart of `statusCounts` with "Show as table", and the link "Open the projects map" → `/projects?status=behind,overdue` (6 pins). |
| R3 | Core 3: budget vote at `/budget` and the results board in `/planning` (#11) | #11's R11.1–R11.4 with the 12 proposals placed in `pilotBarangay(barangays)` and `BUDGET` ₱2,000,000: numbered pins, cards, allocation controls (step ₱5,000, `clampAllocation`, `maxAllocatable`, inline clamp note), the budget bucket, confirm dialog, receipt `B-0001`, one ballot per device token (`castBallot` → `alreadyVoted`), "Next voter (demo kiosk)", `/budget/p/:id`. `/planning` shows the race (Motion `layout`), **Funded** / **Not funded this round** (icon + text) from `fundedProjects`, the leftover, 3 count-up tiles, ballots split "25 simulated · 1 cast", "Add 25 simulated ballots" (one per 300 ms) and pesos by category with "Show as table". Each proposal card adds one line from `similarWork`: "Similar work under way: {n} projects, {k} behind schedule or overdue", linking to `/projects?category=<category>`; no line when n = 0. "Demo: one ballot per browser on this device. A real vote needs verified residents." stays visible on `/budget`. |
| R4 | The cross-role workflow: ballot and feedback to the planning office, reply back | (a) A ballot cast in W2 changes W3's count, race order and funding line in < 1 s, without reload. (b) "Leave feedback" on `/budget` (on the receipt, and as a link under the proposal list before voting): topic select (the 12 proposals + "General"), note of 10–280 characters, the lines "Don't include names or phone numbers." and "Feedback stays in this browser; nothing is sent to the City."; `addFeedback` blocks a phone number or e-mail inline; success shows **FB-0001**, then FB-0002, … (c) In < 1 s the item tops W3's "Unanswered" list, and a polite live region says "New feedback FB-0001: {topic}". (d) W3's **Reply** (1–140 characters, same guard) stores one reply (`replyToFeedback`); in < 1 s W2 shows "Planning office reply: {text}" under that feedback, and W3 moves it to "Answered" with no Reply button. Replies are signed by the role, never a person. (e) While `simRunning` is true, W2's Submit is disabled with "The board is adding simulated ballots. Try again in a few seconds." (f) Reloading any window restores ballots, feedback and replies; **Reset demo** clears them in every window. |
| R5 | Languages, `/sources`, disclaimer | EN / Waray / Filipino via `useLang`; a switch in one window follows in all; lifted strings under `story.`, `projects.`, `budget.`, P7's own under `p7.`; no JSX text literals. `/sources`: `SourcesPage` with the `sources.json` entries of every layer used; `extra` entries (tier `synthetic`) for the projects (seed 1201, `PRJ-2026-…`, contractors `CTR-01`…`CTR-06`), the proposals (fixed costs, placement seed 1101), the simulated ballots (seed 1102) and the illustrations; #12's FDP field-mapping table as `children`. `app.disclaimer` is overridden in all three languages: "Civic-education demo. Projects, proposals, costs and ballots are samples. This is a consultation, not an election." A test asserts that no `story.*` string in any language contains a word from `FORBIDDEN_ANSWER_WORDS`. |

## Domain functions (test-first in `src/domain/`)

The functions that join the modules. Types `Feedback`, `Reply` and `Round` as in "Spine"; `ProjectType`, `InfraProject`, `ScheduleStatus` from #12; `Category`, `ProposedProject`, `Ballot` from #11.

- `emptyRound(): Round` and `roundOf(rounds: Record<string, Round>, barangay: string): Round`: a missing key returns `emptyRound()`, never `undefined`, and adds no key. Cases: missing key; existing key returns that round unchanged.
- `categoryOfType(type: ProjectType): Category | null`: road → mobility, footbridge → mobility, drainage → drainage, water → water, seawall → preparedness, building → `null`. Cases: a table test over every `ProjectType`.
- `similarWork(category: Category, projects: InfraProject[], asOf: string): { ids: string[]; behindOrOverdue: number }`: projects whose `categoryOfType(type)` equals `category`, ids ascending; counts `scheduleStatus` `behind` or `overdue`. Cases: `lighting` → `{ ids: [], behindOrOverdue: 0 }`; seed 1201 `drainage` equals a hand filter; `asOf` before every NTP date → 0.
- `statusCounts(projects: InfraProject[], asOf: string): Record<ScheduleStatus, number>`. Cases: seed 1201 → notStarted 2, onTrack 6, behind 4, overdue 2, complete 4; empty list → all 0.
- `addFeedback(list: Feedback[], input: { topic: string; note: string; token: string }, proposals: ProposedProject[], at: number): { ok: true; item: Feedback; list: Feedback[] } | { ok: false; reason: "unknownTopic" | "tooShort" | "tooLong" | "contactInfo" }`: trims the note; 10–280 characters; `containsContactInfo` (lifted from #12); id `code("FB", list.length + 1)`; does not mutate `list`. Cases: 9 characters → tooShort; 281 → tooLong; "Call 0917-123-4567" → contactInfo; topic "P-13" → unknownTopic; "general" accepted; two valid calls → FB-0001, FB-0002.
- `replyToFeedback(replies: Record<string, Reply>, list: Feedback[], id: string, text: string, at: number): { ok: true; replies: Record<string, Reply> } | { ok: false; reason: "unknownFeedback" | "alreadyReplied" | "empty" | "tooLong" | "contactInfo" }`: one reply per feedback, 1–140 characters after trim; an `at` earlier than the feedback's `at` is raised to it. Cases: each reason; a valid reply; inputs not mutated.
- `inboxOrder(list: Feedback[], replies: Record<string, Reply>): { item: Feedback; reply: Reply | null }[]`: unanswered first, newest first within each group, ties by id. Cases: mixed list; empty list → `[]`.

Lifted functions keep their own tests in `src/modules/<name>/`: #13 (`shareAtLeast`, `exposureIndex`, `distanceToNearest`, `chapterCamera`, …), #12 (`seedProjects`, `scheduleStatus`, `summarize`, `containsContactInfo`, and `nextStatuses` / `applyReview` for S2), #11 (`pilotBarangay`, `placeProjects`, `setAllocation`, `validateBallot`, `castBallot`, `tally`, `fundedProjects`, `simulateBallots`, `byCategory`).

## Data

- Real layers via `@rcene/data`: `useLayer` for `boundary`, `barangays`, `facilities` and the two `derived/*` tables, `useZones()` for all five hazards; fixtures until the data session lands. `AppLayout` passes `layers={["boundary", "barangays", "hazard-flood", "hazard-landslide", "hazard-stormSurge", "hazard-groundShaking", "hazard-liquefaction", "facilities", "derived/barangay-hazard", "derived/facility-hazard"]}`.
- Synthetic data, regenerated on load and never persisted (deterministic, so stored ballots and feedback keep pointing at the same ids): `seedProjects(barangays, 1201, "2026-09-30")`; `placeProjects(content, pilotBarangay(barangays), 1101)` with #11's fixed content table (total ₱5,900,000); `simulateBallots(proposals, BUDGET, 25, 1102)`. Codes only: `PRJ-2026-…`, `CTR-01`…`CTR-06`, `P-01`…, `B-0001`, `S-0001`, `FB-0001`. Device tokens are random UUIDs. Replies are signed "Planning office".
- Store keys: `p07-bukas:spine` (above) and `p07-bukas:story` → `{ lastChapter: string | null }` (was `13-datos:app`). Project filters live in the URL, not in a store.
- `NOTES.md` → "Requests for the data session": carry over #13's two requests only if they are still open.

## Experience

- The **signature**: four windows, one civic loop. The story explains, the map shows, the phone decides and the board answers. Side by side, a resident's ballot re-ranks the office's board, and the office's reply lands on the resident's phone. Recipes: `gsap-motion` "Scrollytelling with a pinned map" (story), "Self-drawing line" and "Count-up" (rings, tiles, bucket); Motion `layout` (race rows) and `AnimatePresence` (inbox items, the reply on the phone). One element, one library.
- One header and palette across roles: an editorial story, a newspaper-like projects map, a warm accent for the budget. Status colors appear only on pins, chips and rings; level colors only on hazard zones.
- The **wow moment**: Submit on the phone, and the race re-orders on the board while the tiles count up. Then 25 simulated ballots race in and the funding line settles. Then a feedback card slides into the inbox, and the reply appears on the phone.
- Accessibility: the story reads with the map hidden, and its chapter list gives keyboard jumps; the projects list is the keyboard path into every project; sliders have `aria-valuetext` in pesos; the inbox has "Unanswered" and "Answered" headings; polite live regions announce the remaining budget (W2), new feedback (W3) and an arriving reply (W2); every status is color + icon + text. Reduced motion means no Lenis, no SplitText, instant camera moves, rings in their final state and instant re-ordering.

## Golden-path demo (≤ 3 minutes)

Window layout on one 1920 × 1080 screen: press **Reset demo**, then on `/` use **New window** for three roles. W1 Data story, 1440 × 900, at the left edge. W3 Planning office, 1440 × 900, at the same spot behind W1 (or full screen on a projector). W2 Budget vote, 420 × 860, at the right edge, always visible. `DEMO.md` names the project used in step 3, the proposal card with a "Similar work" line used in step 4, and the expected numbers.

1. **0:00 · Data story, W1:** the headline splits in and the tiles count up. Scroll to `coast`: the map flies to the shore and the bars grow. Read the caveat: land area, not people.
2. **0:30 · Data story, W1:** scroll to `ranking` ("not a risk score"), then `projects`: 18 pins, "6 of 18 projects are behind schedule or overdue." Click **Open the projects map**: W1 shows `/projects` with 6 pins.
3. **0:55 · Projects map, W1:** open the project from `DEMO.md`. The rings draw ("38% built, 61% of the time used"), the chip reads **Behind — 23 points**, and the before/after wipe sweeps open.
4. **1:25 · Budget vote, W2:** point at the card `DEMO.md` names for its "Similar work under way: …" line. Fund the water system fully (₱950,000), the drainage canal ₱850,000 and the sirens ₱200,000: the bucket is full. Submit, confirm: **B-0001**.
5. **1:55 · Planning office, W3** (bring it forward): it already shows 1 ballot with the water system first. Press **Add 25 simulated ballots**: rows race and re-rank, the funding line settles, the counters count up.
6. **2:20 · Budget vote, W2:** **Leave feedback**, topic "Drainage canal". Type a phone number: blocked. Remove it and submit: **FB-0001**. W3's inbox shows it within a second. **Planning office, W3:** reply "Noted for the barangay planning workshop." W2 shows the reply under FB-0001.
7. **2:50 · any window:** switch to Waray; all three windows follow. Open `/sources` in W1.

## Definition of done

- [ ] All MVP requirements meet their acceptance criteria
- [ ] Domain and lifted-module tests pass: `npm run test`
- [ ] `npm run typecheck` and `npm run build` pass
- [ ] `npm run smoke` passes for `/`, every role route and `/sources` (offline, no console errors, axe clean, screenshots at 390 and 1280)
- [ ] R4 checked in a browser with W2 and W3 as two pages of one Playwright context (shared `localStorage`): every cross-window change in < 1 s
- [ ] Every string comes from `src/i18n/strings.ts` (en + war + fil drafts); AI-drafted strings listed in `NOTES.md` under "Translations to review"
- [ ] `/sources` lists every dataset used; disclaimer footer on every view
- [ ] `NOTES.md` "Lifted modules" lists every lift; `STATUS.md`, `AI-LOG.md` and `DEMO.md` are current

## If time runs out

Cut in this order: stretch items; the reply (R4 d: feedback goes one way into the inbox); the `similarWork` line; the before/after wipe; the story's `projects` chapter; feedback (R4 keeps ballot → board); `/projects` (R2). The last fallback is **#13 Bukas Datos**: R1 alone, with the unbuilt roles removed from `src/roles.ts`, `project.json` `roles` and `smokeRoutes`, so no placeholder page is shown.

## Out of scope

Real FDP data, real budgets or real project lists; elections, identity checks or accounts; any server: ballots, feedback and replies stay in the browser; sending feedback by e-mail or SMS; photos (CEEPUO photos are permission-tier); names of people or contractors; risk scores or weighting (that is #4); routing; editing projects or proposals; AI.

## Stretch (only after the definition of done is met)

- S1 `/story/poster`: #13's `Poster` (R13.5 as specified there, on `PosterPage`, `PosterFigure` and `PrintButton` from `@rcene/kit/poster`) plus one P7 figure, the projects by schedule status drawn with `SvgMap`. "The story doubles as the poster."
- S2 Flags: #12's R12.3–R12.4. "Flag an issue" on `/projects/:id`, the office queue as a "Flags" tab in `/planning`, the trail growing live in W1 (spine slices `flags` and `reviews`, each with one writer).
- S3 A live `vote` chapter at the end of the story: the top 3 proposals from `tally` and the funding line, updating while the story is open.
- S4 #11's results map on `/planning`: proposal pins scaled by pesos pledged.
