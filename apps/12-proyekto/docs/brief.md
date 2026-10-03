# 12 · Proyekto Watch

| | |
|---|---|
| **App** | `apps/12-proyekto` · dev port 5112 · preview 6112 |
| **Batch** | 3 |
| **Proposal** | `docs/proposal.md` (#12 Proyekto Watch — infrastructure project tracker, in the monorepo's `docs/PROPOSALS.md`) |
| **Reused by platforms** | P7 Bukas Catbalogan (core "projects map"), P10 Barangay 360 (stretch "requests and projects": a barangay's projects and open flags) |
| **Data** | boundary, barangays (🟢 OCHA/HDX) · synthetic: 18 infrastructure projects with Full Disclosure Policy–style fields, contractors as codes only (seed 1201) · before/after **SVG illustrations** in `public/illustrations/` (no photos) · no permission-tier data (CEEPUO site photos would be 🟡 and are not used) |
| **AI in the app** | none |
| **Skills to use** | `maplibre-gis` (status-colored pins, fly-to), `gsap-motion` (self-drawing progress rings with DrawSVG, before/after wipe, count-ups), Design plugin `ux-copy` (flag form, status trail, "behind schedule" wording) |

> Every infrastructure project on one map: what it costs, who builds it (by code), how far along it is against where it should be by now, and a one-tap way to flag a problem and watch the office answer.

## Problem

Infrastructure spending is published under the DILG Full Disclosure Policy as PDF and spreadsheet reports on bulletin boards and websites: technically public, practically unreadable, the same "data locked in technical formats" gap PROPOSALS lists under documented needs. A resident walking past a stalled drainage project cannot tell whether it is late, how much it costs or whom to tell. This app turns FDP-style fields into a map, a progress-versus-schedule ring and a citizen flag with a visible status trail, so P7 can show "what is being built" and P10 can show a barangay its own projects.

## Users and routes

| Role | Route | Device in the demo | Needs |
|---|---|---|---|
| Resident | `/` | wide window (1280 px; must also work at 390 px) | Map and list of projects, filters, city-wide summary |
| Resident | `/p/:id` | phone-width window (390 px) | One project: FDP fields, progress against schedule, before/after, flags and their trails, "Flag an issue" |
| Resident | `/my-flags` | same | Flags filed from this device, each with its status trail |
| City engineering office staff | `/office` | second window, wide | Flag queue; advance a flag's status with a short public note |
| Anyone | `/sources` | — | Attribution, synthetic-data note, FDP field mapping |

Use `AppShell width="wide"` for `/` and `/office`, `width="phone"` for `/p/:id` and `/my-flags`, `showReset` on `/office`. Pass `layers={["boundary", "barangays"]}`.

## MVP requirements

Build in this order. R12.1 alone is a complete entry.

| ID | Requirement | Acceptance criteria (testable) |
|---|---|---|
| R12.1 | Projects map, list and detail with progress against schedule | 18 seeded projects show as map pins colored by `scheduleStatus` (legend with icon + label) and as a list sorted by status severity (overdue, behind, on track, not started, complete) then title. Filter chips by status and a fund-source select narrow both map and list; a barangay search filters the list. `StatTile`s with `countUp`: projects, total contract amount, average physical progress, behind or overdue. Clicking a pin selects it (the map flies to it, `SelectedPoint` marks it, a preview card offers "Open"); "Open" or a list item goes to `/p/:id`; an unknown id shows `EmptyState` with a link back. The detail shows a small locator map, every field in the FDP mapping table below, a "Data as of 30 Sep 2026 (synthetic)" stamp, two concentric progress rings (outer: physical % complete; inner: time elapsed %) with the percentage in the center, and a status chip from `scheduleStatus` with its variance ("23 points behind plan"). The contractor is shown as its code with the note "Contractor names are withheld in this demo." |
| R12.2 | Before/after wipe | The detail shows a type-matched pair from `public/illustrations/<type>-before.svg` and `<type>-after.svg` (6 types × 2 files, authored by the session as simple flat SVG, no text inside the images), captioned "Illustration, not a site photo". For unfinished projects the after side is labelled "Planned result". On first view the divider sweeps from 0 to 50% with GSAP in about 0.9 s (reduced motion: starts at 50%). The divider follows the pointer when dragged and works from the keyboard: `role="slider"`, ←/→ move 5%, Home/End go to 0/100, `aria-valuetext` says "Showing 50% after". |
| R12.3 | Flag an issue | "Flag an issue" on `/p/:id` opens a form (react-hook-form + zod): category (Work has stopped · Open trench or no barriers at the site · Quality concern · No project signboard · Something else) and a note of 10–280 characters. There are no name or contact fields, and a line says "Don't include names or phone numbers." `containsContactInfo` blocks a note containing a phone number or e-mail address with an inline message. Submitting creates `FLAG-0001`, `FLAG-0002`, … with a trail starting at **Received** and a timestamp; the flag appears on the project detail and on `/my-flags`; list items show an open-flag count. |
| R12.4 | Office queue with a live status trail | `/office` lists every flag grouped by current status. Each flag offers only the transitions from `nextStatuses`, plus an optional public note (≤ 140 characters, same contact-info guard). Each action appends a trail entry `{ status, at, note? }` and never edits earlier entries. A resident window on `/p/:id` or `/my-flags` shows the new trail entry within 1 s, without reload (store sync). Trail entries name the office ("City Engineering Office"), never a person. |
| R12.5 | Language toggle, `/sources`, disclaimer | EN / Waray / Filipino via `useLang`; every string from `src/i18n/strings.ts`. `/sources` lists OCHA/HDX boundaries, a `tier: "synthetic"` entry for the projects and the illustrations, and the FDP field-mapping table. Disclaimer footer on every view, plus the line "Flags stay in this browser; nothing is sent to the City." on the flag form. |

FDP field mapping (show it on `/sources`; FDP report column names vary by report and year, so say "FDP-style"):

| FDP-style column | Field | Notes |
|---|---|---|
| Reference No. | `referenceNo` | e.g. `2026-CW-014` |
| Name of Project | `title` | "{type}, Sample Purok {n}" |
| Location | `barangay`, `purok` | barangay from the loaded layer |
| Source of Fund | `fundSource` | 20% Development Fund · LDRRMF · General Fund · SEF · National transfer |
| Approved Budget for the Contract (ABC) | `abc` | whole pesos |
| Contract Amount | `contractAmount` | 85–99% of ABC |
| Name of Winning Bidder | `contractor` | code only, `CTR-01` … `CTR-06` |
| Date of Notice to Proceed, Contract Duration | `ntpDate`, `durationDays` | target date is derived |
| % Accomplishment (physical) | `physicalPct` | 0–100 |
| Amount Disbursed | `disbursed` | ≤ contract amount |

## Domain functions (test-first in `src/domain/`)

```ts
type ProjectType = "road" | "drainage" | "footbridge" | "building" | "seawall" | "water";
type FundSource = "devFund20" | "ldrrmf" | "generalFund" | "sef" | "nationalTransfer";
interface InfraProject {
  id: string; referenceNo: string; type: ProjectType; purok: number; barangay: string; lon: number; lat: number;
  fundSource: FundSource; abc: number; contractAmount: number; contractor: string;
  ntpDate: string; durationDays: number; physicalPct: number; disbursed: number; asOf: string;
}
type ScheduleStatus = "notStarted" | "onTrack" | "behind" | "overdue" | "complete";
type FlagStatus = "received" | "acknowledged" | "inspecting" | "resolved" | "referred";
interface Flag { id: string; projectId: string; category: string; note: string; createdAt: number; token: string }
interface TrailEntry { status: FlagStatus; at: number; note?: string }
```

- `targetDate(p): string` and `timeElapsed(p, asOf): number` (0..1, clamped). Cases: NTP equals `asOf` → 0; past target → 1; dates as `YYYY-MM-DD` computed in UTC so the machine time zone never matters.
- `scheduleStatus(p, asOf): { status: ScheduleStatus; variancePts: number }` — `physicalPct ≥ 100` → complete; `asOf` before NTP → notStarted; past target and under 100 → overdue; `physicalPct − 100 × timeElapsed < −10` → behind; otherwise onTrack. `variancePts` is that difference, rounded. Cases: each status; exactly −10 → onTrack; complete wins over overdue.
- `seedProjects(barangays, seed = 1201, asOf = "2026-09-30"): InfraProject[]` — 18 projects, ids `PRJ-2026-001`…; build each from an intended status (2 not started, 6 on track, 4 behind, 2 overdue, 4 complete), then derive dates and progress to match. Cases: deterministic per seed; `scheduleStatus` of each project equals its intended status; `contractAmount ≤ abc`; `disbursed ≤ contractAmount`; all money values are integers; every point inside its barangay; only codes in `contractor`.
- `summarize(projects, asOf): { count; totalContract; avgPhysical; behindOrOverdue }`. Cases: empty list → zeros, no NaN.
- `nextStatuses(s: FlagStatus): FlagStatus[]` — received → acknowledged; acknowledged → inspecting or referred; inspecting → resolved or referred; resolved and referred are final. Cases: each state; final states → `[]`.
- `currentStatus(flag, trail: TrailEntry[] | undefined): FlagStatus` — last entry, or `received` when the office has not acted.
- `applyReview(reviews: Record<string, TrailEntry[]>, flag, next, at, note?): { ok: true; reviews } | { ok: false; reason: "invalidTransition" | "contactInfo" | "noteTooLong" }` — append-only; does not mutate input. Cases: valid chain to resolved; skipping a step refused; acting on a final state refused; `at` earlier than the last entry is bumped to the last entry's time (trail stays ordered).
- `containsContactInfo(text): boolean` — PH mobile numbers (`09XXXXXXXXX`, `0917-123-4567`, `+63 917 123 4567`) and e-mail addresses. Cases: those three formats and `name@example.ph` → true; "Km 3.5 drainage", "Purok 4, 2 meters deep", "₱1,200,000" → false.
- Pesos: no local `formatPeso`. Use the shared `useFormat().currency(n)` in components, or `formatCurrency` from `@rcene/i18n` in pure code (₱, locale-aware). Amounts here are whole pesos, so pass 0 decimals: `currency(n, 0)`, `formatCurrency(n, lang, 0)`.

## Data

- `useLayer("barangays")`, `useLayer("boundary")`. Works on fixtures until the real data lands; the Sample data badge shows meanwhile.
- Synthetic projects: `seedProjects(barangays, 1201)` in `src/domain/seed.ts`, regenerated on load (deterministic, so flags keep pointing at the same `PRJ-…` ids). Money ranges by type (ABC): road ₱2M–15M, drainage ₱0.8M–5M, footbridge ₱1M–6M, building ₱2M–12M, seawall ₱5M–25M, water ₱1M–8M. `asOf` is fixed at `2026-09-30` so every rehearsal shows the same schedule state. No personal names; contractors `CTR-01`…`CTR-06`; trail entries name the office, not a person.
- Illustrations: 12 SVG files in `public/illustrations/`, 4:3 `viewBox`, under 8 KB each, neutral palette, no embedded text. They are drawings, never presented as photos.
- Stores (one writer per store), `version: 1`:
  - `createSyncedStore("12-proyekto:flags")` → `{ token: string; flags: Flag[] }`. Written only by resident routes. `token` is `crypto.randomUUID()` on first load and marks "my flags".
  - `createSyncedStore("12-proyekto:reviews")` → `{ reviews: Record<string, TrailEntry[]> }`. Written only by `/office`.
  - `createSyncedStore("12-proyekto:app")` → `{ statusFilter: ScheduleStatus[]; fundFilter: FundSource | "all" }`.

## Experience

- Sober, trustworthy, newspaper-like: neutral base, status colors only on pins, chips and rings, every status also with an icon and a word. Money in whole pesos with the peso sign.
- **Wow moment:** opening a project, the two rings draw themselves (DrawSVG from `@rcene/ui/motion` on the ring strokes, the center number counting up; `gsap-motion` "self-drawing line" + "count-up" recipes), then the before/after divider sweeps open. The gap between the rings makes "behind schedule" visible at a glance. Then, in the office window, advancing a flag makes the resident's trail grow live (Motion `AnimatePresence` on the new entry; one library per element).
- Import `gsap`, `useGSAP`, `DrawSVGPlugin` and the rest from `@rcene/ui/motion` (already registered); don't create a second registration file.
- Map: status-colored circle pins (`PointLayer`), selection with `SelectedPoint`, labels and counts in HTML (`Marker`/`Popup`) because the offline basemap has no glyphs.
- Use shadcn primitives from `@rcene/ui/components/<name>` (button, card, badge, dialog, select, textarea). If one is missing, use a plain element styled with the shared tokens and note it in `NOTES.md`.
- Accessibility: the rings have a text equivalent ("38% built, 61% of the time used"); the wipe divider is a keyboard slider; the list is the keyboard path into every project (the map is never the only way in); form errors are linked with `aria-describedby`; a polite live region announces new trail entries; reduced motion shows rings and the wipe in their final state.

## Golden-path demo (≤ 2 minutes)

1. `/` wide window: 18 pins, the summary tiles count up. Filter "Behind schedule" → 4 pins.
2. Click one → the map flies to it → "Open" → `/p/PRJ-2026-…` (DEMO.md names the project; resize this window to phone width or open the same URL in the phone window): the rings draw (for example 38% built vs 61% of the time used), chip **Behind — 23 points**, then the before/after wipe sweeps open; drag it, then use the arrow keys.
3. "Flag an issue" → "Work has stopped" + a note. Type a phone number → blocked with a clear message; remove it → submit → **FLAG-0001 · Received**.
4. Office window `/office`: Acknowledge → Inspecting, note "Site visit scheduled". The phone window's trail grows live.
5. Switch to Waray. Open `/sources`: FDP mapping, synthetic projects, OCHA/HDX boundaries.

## Definition of done

- [ ] R12.1–R12.5 meet their acceptance criteria
- [ ] Domain tests pass: `npm run test`
- [ ] `npm run typecheck` and `npm run build` pass
- [ ] `npm run smoke` passes (offline, no console errors, axe clean, screenshots at 390 and 1280)
- [ ] Every string comes from `src/i18n/strings.ts` (en + war + fil drafts); AI-drafted Waray/Filipino strings listed in `NOTES.md` under "Translations to review"
- [ ] `/sources` lists every dataset used; disclaimer footer on every view
- [ ] `STATUS.md`, `AI-LOG.md` (one row per commit) and `DEMO.md` are current

## Out of scope

Real FDP data, real contractor names or real project photos; photo upload on flags; sending flags anywhere (e-mail, SMS, server); accounts; audit findings; charts beyond the rings and tiles (no chart library in this app); routing to a project.

## Stretch (only after the definition of done is met)

- Import a real FDP "Bid Results on Civil Works" CSV through a pure `fromFdpRow(row)` mapper (pasted text, parsed locally), with the mapping table above as its tests.
- Progress history per project (a small sparkline drawn as SVG) from seeded monthly snapshots.
- "Projects near me": tap the map, list projects within 1 km straight-line (`nearest` from `@rcene/geo`).

## Platform hooks

Export `routes` (already), and keep `ProjectMap`, `ProjectCard`, `ProgressRings`, `BeforeAfter`, `FlagForm`, `FlagTrail` and the domain functions free of app-specific globals (projects, flags and reviews come in as props). Add `ProjectsForBarangay({ barangay })` (list + open-flag counts) so P10 Barangay 360 can drop it into a barangay page, and keep `InfraProject` FDP-shaped so P7 can swap the synthetic seed for imported FDP rows.
