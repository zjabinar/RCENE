# 19 · Ayuda Tracker

| | |
|---|---|
| **App** | `apps/19-ayuda` · dev port 5119 · preview 6119 |
| **Batch** | 4 |
| **Proposal** | `docs/PROPOSALS.md` #19 |
| **Reused by platforms** | P2 Bayanihan Response (core 3 "QR distribution with duplicate guard"; stretch "public transparency view", see "Platform hooks") |
| **Data** | `barangays` · 🟢 HDX boundaries · **synthetic households** (seed 1901), synthetic distribution points `EC-01`… and synthetic sample claims (seed 1902) |
| **AI in the app** | none |
| **Skills to use** | built-in `dataviz` (read it before the first chart or stat tile), `gsap-motion` (count-ups, only if `StatTile countUp` isn't enough), Design plugin `ux-copy` (scan-result wording) and `accessibility-review` |

> Scan the card, not the person: each household's relief claim is checked in under a second, a second claim in the same round is blocked with when and where the first one happened, and the dashboard shows live which barangays are still waiting.

## Problem

Relief claims are tracked on paper lists, so double claims and households that were missed go unnoticed until after the operation (PROPOSALS #19). Volunteers need something that works with a laptop webcam and no signal; coordinators need to see the gaps by barangay and by evacuation center while distribution is still running. The household QR card here stands in for a real relief card (such as DSWD's family access card); integrating with real lists is out of scope, and every household is synthetic.

## Users and routes

| Role | Route | Device in the demo | Needs |
|---|---|---|---|
| Relief coordinator | `/` | laptop or projector (1280) | Coverage by barangay and by center, live; duplicates blocked; rounds |
| Volunteer | `/scan` → `/scan/:station` (`EC-01`…) | laptop with webcam, or a phone-width window | Scan or type a card code; a clear Accepted / Already claimed / Not recognised answer |
| Registration desk | `/cards` | laptop → printer | A printable QR card sheet per barangay |
| Anyone | `/sources` | — | Attribution, the synthetic-data note, disclaimer |

`AppShell width="wide" showReset` on `/`; `width="phone"` on `/scan` and `/scan/:station`; `width="wide"` on `/cards` (a print stylesheet hides the app chrome) and `/sources`. `AppShell layers={["barangays"]}`. `/scan` is a list of station links.

## MVP requirements

Build in this order. R19.1 alone is a complete entry (it works without any camera).

| ID | Requirement | Acceptance criteria (testable) |
|---|---|---|
| R19.1 | Registry, printable QR cards, manual-entry claims with the duplicate-claim guard | `assignPoints` maps every barangay to one synthetic center ("Evacuation center 1 (synthetic)"); `generateHouseholds(barangayNames, points, createRng(1901))` makes 15–40 households per barangay, codes `HH-0001`… in barangay-name order, `members` 1–9, no names. `/cards`: pick a barangay → cards showing `cardCode` (e.g. `HH-0042-6`), barangay, members, assigned center and a QR of `cardPayload` made with `qrcode` (`toDataURL`, error correction M, printed at least 3 cm wide, `alt="QR code for HH-0042"`); 10 cards per A4 page under `@media print`; "Print" calls `window.print()`. `/scan/:station`: a code field that accepts `HH-0042-6`, `hh 0042 6` or `HH00426` (Enter submits) → `parseCard` → `checkClaim` → a result panel: **Accepted** (code, barangay, members, round), **Already claimed** ("First claimed at {center}, {time}", this round), **Not recognised** (valid code, not in the registry) or **Check the code** (bad check digit or not an Ayuda card). Accepted writes a claim; blocked duplicates are recorded too. Before writing, the station calls `await useClaims.persist.rehydrate()` and re-runs `checkClaim` on the fresh state. The result is announced in an `aria-live="assertive"` region and stays until the next scan; focus returns to the field. Station tally: "This station: {n} claims · {d} duplicates blocked". Unknown station id → `EmptyState` with the station list. |
| R19.2 | Webcam scanning with html5-qrcode | A "Start camera" button (the camera **never** starts on page load) starts `Html5Qrcode` (QR format only, `fps: 10`, `qrbox: 240`) in a fixed-size, labelled region; decoded text goes through the same pipeline as typed codes. **StrictMode-proof:** one scanner instance per mount; starts and stops are serialised through one promise chain, so React's dev double-mount never opens two cameras or throws "already under transition"; cleanup awaits a pending start before `stop()` then `clear()`; stopping a scanner that isn't scanning is a no-op. Manual check in dev (StrictMode on): start → go to `/` → back → start: one video, no console errors. **Repeat-frame debounce:** the same code decoded again at the same station within 3 s is ignored (`isRepeatScan`), so one card held in front of the camera gives one result, not "Accepted" followed by "Already claimed". No camera, permission denied or `getUserMedia` missing → "Camera not available — type the code instead", focus moves to the code field; manual entry is always visible. **Test the webcam on the actual demo laptop** (lighting, distance about 20 cm, printed cards and cards shown on a phone screen) and record the result in `DEMO.md`. |
| R19.3 | Live dashboard by barangay and by evacuation center | `/`: `StatTile`s with `countUp`: Households registered, Served this round, Coverage, Duplicate claims blocked. Recharts (follow `dataviz`): "Coverage by barangay" as horizontal bars of served share 0–100 %, lowest coverage first, one row per barangay in a scrollable panel (about 22 px per row); "Claims by center" as bars (at most 8). Single series each, so no legend; the title names the measure; one hue, thin bars with 2 px gaps, recessive axes, text in text colours; a hover tooltip with served and registered; a "Show as table" toggle renders the same rows as a table. Counts under 5 show "Fewer than 5" (`displayCount`); coverage shows only when registered ≥ 5. A "Recent claims" feed (last 10: code, center, time) where new rows animate in (Motion). Everything updates within 1 s of a scan in another window, without reload. |
| R19.4 | Rounds, sample progress, reset | A setup panel on `/`: the active round (default "Round 1 — Family food packs"); "Start new round" adds `R2`, `R3`… with a label; duplicates are per round (a household served in Round 1 can claim in Round 2). "Load sample progress" fills the active round with about 45 % deterministic claims (`sampleProgress`, seed 1902) spread over centers and the last two hours, plus 3 blocked duplicates, so the dashboard has a story at minute zero; it can't be loaded twice for the same round. `AppShell showReset` clears every store for rehearsals. |
| R19.5 | Language toggle, `/sources`, disclaimer | EN / Waray / Filipino via `useLang`, persisted; all UI text, including the four scan results, from `src/i18n/strings.ts`. `/sources` uses `SourcesPage` plus a "Synthetic data" entry: households, centers (seed 1901) and sample claims (seed 1902) are generated by this app; no real beneficiaries. Disclaimer footer on every view. |

## Domain functions (test-first in `src/domain/`)

```ts
interface Household { id: string; barangay: string; members: number; point: string }
interface DistributionPoint { id: string; barangays: string[] } // label comes from strings: "Evacuation center {n} (synthetic)"
interface Claim { id: string; hh: string; round: string; station: string; at: string } // scans: crypto.randomUUID(); sample claims: S-00001…
interface BlockedAttempt { hh: string; round: string; station: string; at: string }
```

- `checkDigit(id: string): number` — for `HH-d1d2d3d4`: `(1·d1 + 3·d2 + 7·d3 + 9·d4) mod 10`. `cardCode(id)` → `"HH-0042-6"`; `cardPayload(id)` → `"AYUDA1:HH-0042-6"`. Cases: `checkDigit("HH-0042") === 6`; every single-digit substitution in `HH-0001`…`HH-0300` changes the check digit (property test; the weights are coprime to 10).
- `parseCard(text: string): { kind: "ok"; id: string } | { kind: "badCheck" } | { kind: "notAyuda" }` — trims, uppercases, strips an `AYUDA1:` prefix, spaces and hyphens, then matches `HH` + 4 digits + check digit. Cases: `cardPayload` round-trips; `hh-0042-6`, `HH 0042 6`, `HH00426` → ok; `HH-0042-5` → badCheck; a URL, random text or empty string → notAyuda.
- `checkClaim(claims: Claim[], id: string, round: string, registry: Map<string, Household>): { kind: "accept"; household: Household } | { kind: "duplicate"; previous: Claim } | { kind: "unknown" }` — cases: first claim → accept; same id, same round → duplicate with the **earliest** previous claim (by `at`, whatever the array order); same id, another round → accept; id not in the registry → unknown.
- `isRepeatScan(last: { code: string; at: number } | null, code: string, now: number, windowMs = 3000): boolean` — cases: same code 1 s later → true; same code 4 s later → false; different code → false; `last === null` → false.
- `assignPoints(barangayNames: string[]): DistributionPoint[]` and `generateHouseholds(barangayNames: string[], points: DistributionPoint[], rng: Rng, perBarangay: [number, number] = [15, 40]): Household[]` — `count = clamp(round(n / 8), 2, 8)`; barangays sorted by name and split into `count` contiguous groups of near-equal size; each household's `point` is its barangay's center. Cases: same seed → identical output; codes sequential with no gaps; 57 names → 7 points, 6 names → 2 points of 3; every barangay in exactly one point.
- `coverageByBarangay(registry: Household[], claims: Claim[], round: string): { barangay: string; registered: number; served: number; rate: number | null }[]` — served counts unique households in that round; claims of other rounds ignored; sorted by rate ascending, then name; `rate` is `null` when registered < 5. Cases: a duplicate claim in the data never double-counts; empty claims → all served 0.
- `claimsByPoint(claims, round, points)`, `totals(registry, claims, blocked, round): { registered; served; coverage; blocked }` — cases: blocked attempts of other rounds excluded; coverage = served / registered.
- `displayCount(n: number): number | "fewerThan5"` — cases: 0–4 → `"fewerThan5"`; 5 → 5.
- `sampleProgress(registry, round, rng, share = 0.45, now: Date): { claims: Claim[]; blocked: BlockedAttempt[] }` — cases: deterministic for a seed and `now` (claim ids `S-00001`… via `code("S", n, 5)`, never random); no household claimed twice; about `share` of households claimed (± 5 %); exactly 3 blocked attempts, each for an already-claimed household; every claim at the household's own center.

## Data

- `useLayer("barangays")` only, for the barangay names. Registry, centers and sample claims are generated at load from the names and seeds and never persisted. If `barangays` is missing → `DataMissing`.
- **Synthetic** (`src/domain/seed.ts`): households seed **1901** (about 1,560 on the 57 real barangays, about 165 on the 6 fixtures), centers derived from names, sample claims seed **1902**. Codes only: no names, ID numbers, photos or addresses, real or invented. The QR payload carries only the code. Nothing from `D:\monica`.
- **Stores:**
  - `createSyncedStore("19-ayuda:claims")`, written by the `/scan/:station` windows (and once by "Load sample progress" before scanning starts), version 1: `{ claims: Claim[]; blocked: BlockedAttempt[] }`.
  - `createSyncedStore("19-ayuda:setup")`, written only by `/`, version 1: `{ rounds: { id: string; label: string }[]; activeRound: string; sampleLoaded: Record<string /* round id */, boolean> }`.
  - The station identity is the route param, never stored.
- **Demo boundary:** the windows share one laptop's `localStorage`; there is no cross-device sync. Two stations scanning the same card in the same instant could both accept (last write wins); the rehydrate-then-check step narrows this. Write in `DEMO.md` and `NOTES.md` that a real deployment needs one shared database with a unique (household, round) rule.

## Experience

- **Tone:** brisk and high-contrast; volunteers work in a crowded gym with glare. The scan result fills the panel in large type: Accepted (check icon), Already claimed (stop icon, "First claimed at EC-02, 10:41"), Not recognised (question icon), Check the code (pencil icon). Always icon + text + colour.
- **Wow moment:** two windows side by side. Scan a card at the station: the dashboard tile counts up and that barangay's bar grows within a second. Hold the same card up again: "Already claimed — EC-01, 10:42" and "Duplicate claims blocked" ticks up. Recipe: `StatTile countUp` (or the `gsap-motion` count-up), Recharts' built-in bar animation (`isAnimationActive={false}` under reduced motion), Motion for the feed rows.
- **Accessibility:** manual entry is the keyboard path and is always present; an assertive live region for results; the camera region is labelled; QR images have alt text; every chart has a table view; reduced motion → no count-up or feed animation; WCAG AA at 390 and 1280 px.

## Golden-path demo (≤ 2 minutes)

Before the demo: print one sheet from `/cards` and have one card on a phone screen as a backup. Rehearse the webcam on this laptop.

1. `/` on the laptop: "Load sample progress" → the tiles count up; "Coverage by barangay", lowest first: "these barangays are still waiting".
2. `/scan/EC-01` in a second, phone-width window: "Start camera", hold up a printed card → **Accepted**; the dashboard updates.
3. Hold the same card up again → **Already claimed — EC-01, {time}**; "Duplicate claims blocked" goes up by one.
4. Type the code with one digit wrong → **Check the code**. Say: "If the camera fails, typing works the same way."
5. "Start new round" → the same card is accepted again for Round 2.
6. Switch the station to Waray; open `/sources`.

## Definition of done

- [ ] R19.1–R19.5 meet their acceptance criteria
- [ ] Domain tests pass: `pnpm test` (in `apps/19-ayuda`)
- [ ] `pnpm typecheck` and `pnpm build` pass
- [ ] `node ../../scripts/smoke.mjs --app 19-ayuda` passes (offline, no console errors, axe clean, screenshots at 390 and 1280)
- [ ] Every string comes from `src/i18n/strings.ts` (en + war + fil drafts); AI-drafted Waray/Filipino strings listed in `NOTES.md` under "Translations to review"
- [ ] `/sources` lists every dataset used; disclaimer footer on every view
- [ ] `STATUS.md`, `AI-LOG.md` (one row per commit) and `DEMO.md` are current

## Out of scope

Real beneficiary lists, names, ID numbers, photos or signatures; inventory of relief goods; SMS; sync across devices or any server; integration with DSWD systems; incident reporting and triage (P2 cores 1–2); logins; a map.

## Stretch (only after the definition of done is met)

- S1 Public transparency view `/public` (P2 stretch): coverage rates by barangay only, `displayCount` rules, no codes, large type for a display screen.
- S2 Entitlement by household size (for example, packs = ceil(members / 5)), shown on Accepted and summed on the dashboard.
- S3 CSV export of the active round's claims (Blob download, codes only).
- S4 Sound and vibration feedback on result (`navigator.vibrate` where available), off by default.

## Platform hooks

Export `routes` (already). Keep `parseCard`, `cardCode`, `cardPayload`, `checkClaim`, `isRepeatScan`, `coverageByBarangay`, `totals` and `sampleProgress` pure; keep `ScanStation` (props: `station`, `round`, `onResult`), `QrCardSheet` and `CoverageChart` prop-driven. P2 keeps households and claims keyed by barangay on its spine and puts incident triage before distribution; its public dashboard reuses `coverageByBarangay` with the same small-count rules.
