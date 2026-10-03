> **Module brief** (reference). This is the spec of app #18 Kalinga, copied from the monorepo's `docs/projects/18-kalinga.md`. Its paths and ports are that app's. In P3 Kalinga Catbalogan, `docs/brief.md` says which parts to lift or build, and wins where they differ.

# 18 · Kalinga

| | |
|---|---|
| **App** | `apps/18-kalinga` · dev port 5118 · preview 6118 |
| **Batch** | 1 |
| **Proposal** | `docs/proposal.md` (#18 in the monorepo's `docs/PROPOSALS.md`) · shortlist rank 3 (the strongest human-impact pitch) |
| **Reused by platforms** | P3 Kalinga Catbalogan (core 2 "priority list with check-off" and the synthetic household registry spine, see "Platform hooks") |
| **Data** | `boundary`, `barangays`, all five `hazard-*`, `facilities` (nearest candidate center) · 🟢 HDX boundaries and OSM facilities + 🟡 CDRRMO risk maps (permission) · **synthetic households only** (seed 1801) · CBMS aggregates **not used** (🟡 permission-tier; a P3 upgrade) |
| **AI in the app** | none |
| **Skills to use** | `maplibre-gis` (circle layer, pulsing HTML markers, zones), `gsap-motion` (count-ups, if `StatTile countUp` isn't enough), Motion `layout` for the team list re-sort, Design plugin `ux-copy` (score explanations, "not in a mapped risk zone" wording) and `accessibility-review` |

> Before the surge arrives, the bedridden senior in a very-high storm-surge zone is first on the list, and the coordinator can read exactly why: every point of the score is written out. Kalinga weaves the social-welfare registries into the hazard map and hands the result to tanods as a list they check off from a phone. All households are synthetic.

## Problem

Hazard risk is modelled as purely physical: the LGU portal's own gap analysis lists "vulnerable populations missing from risk models". Seniors, persons with disability, pregnant women, infants and solo parents in hazard zones must be moved first, but they sit in separate registries (senior citizens, PWD, solo-parent and health-worker lists) that never meet the hazard map (PROPOSALS #18). Kalinga overlays a household registry (synthetic here, never real residents) on the CDRRMO risk zones and produces a transparent, assignable, check-off-able pre-emptive evacuation list.

## Users and routes

| Role | Route | Device in the demo | Needs |
|---|---|---|---|
| CSWDO / BDRRMC coordinator | `/` | laptop (1280) | Who must be moved first, why, and which team takes them? |
| Tanod / BHW team | `/team/:id` (`T-01`…`T-04`) | phone-width window (design at 390 px) | My households in order; mark each one moved |
| Public / officials | `/summary` | laptop or projector | Progress by barangay, with small counts hidden |
| Anyone | `/sources` | — | Attribution, the synthetic-data note, disclaimer |

`AppShell width="full" showReset` on `/`; `width="phone"` on `/team/:id`; `width="wide"` on `/summary` and `/sources`. `AppShell layers` = the layers in the header. The coordinator view has "Open Team 1…4 view" links (`target="_blank"`) to set up the demo windows quickly.

## MVP requirements

Build in this order. R18.1 alone is a complete entry.

| ID | Requirement | Acceptance criteria (testable) |
|---|---|---|
| R18.1 | Synthetic households over hazard zones, with a ranked and explained priority list | `generateHouseholds(barangays, createRng(1801))` places 6–12 households per barangay inside the barangay polygon (`randomPointsIn`), coded `HH-0001`… in barangay-name order; no names, addresses, ages or IDs. A permanent banner "Synthetic households — not real residents" on `/` and `/team/:id`. Hazard focus chips (default: storm surge, flood, landslide; all five selectable). A household is **on the list** when it is `inZone` for at least one focused hazard; the rest are counted as "Not in a mapped risk zone for the selected hazards", never described as risk-free. Ranked table (TanStack Table v8): rank, code, barangay, worst hazard + level, flags (icon + text), score, team, status; default order from `rankHouseholds`; sortable columns; filters by barangay, team and code text; 25 rows per page. Selecting a row (click or Enter) flies the map to the household and opens "Why this priority", listing every term of `scoreHousehold` ("Storm surge — Very high: +40", "Bedridden: +25", "Senior citizen: +10", total 75) and the nearest candidate center: "{name} · {km} km straight-line — Candidate, not verified by CDRRMO" (`nearest` from `@rcene/geo`, facilities with `kind === "school"`). Map: zones of one chosen hazard (`ZoneLayer` + `Legend`), on-list households as a circle layer (radius by score, colour by status: waiting / assigned / moved), off-list households as small grey dots, plus a household legend. A "How the score works" panel renders the weight table from the same `WEIGHTS` constant the function uses. |
| R18.2 | Assign households to tanod teams | Four teams `T-01`…`T-04` ("Team 1"…). A team select per row; "Auto-assign" distributes unassigned on-list households (within the current barangay filter) with `balanceAssign`. Each team shows its load: households and bedridden count. Reassigning a moved household is disabled with the reason shown. While any assignment exists the hazard focus chips are disabled with the hint "Clear assignments to change the hazard focus"; "Clear assignments" asks for confirmation. Assignments appear on the matching `/team/:id` window within 1 s, without reload. |
| R18.3 | Team check-off on a phone, synced to the coordinator | `/team/:id` lists the team's households in rank order: code, barangay, flags, worst hazard, nearest candidate center (straight-line), and a "Mark moved" button at least 44 px high. Marking writes only to `18-kalinga:moves`; within 1 s the coordinator's map recolours the point, the table status updates and the progress tiles count up. Moved households slide to a "Moved" section at the bottom (Motion `layout`) showing "Moved {time}" and an "Undo" button. Unknown team id → `EmptyState` with links to the four teams. |
| R18.4 | Progress summary and a public summary with small-cell suppression | On `/`: `StatTile`s with `countUp`: On the list, Assigned, Moved, Waiting — bedridden; plus a progress bar per team. `/summary`: one row per barangay with on-list households, moved, waiting and "% moved", built with `suppressRow`: counts under 5 show "Fewer than 5", the complementary cell is hidden too, and the rate shows only when it can't reveal a hidden count. City total row. The page never shows household points or codes and says: "Counts under 5 are hidden so households in small barangays can't be identified." |
| R18.5 | Language toggle, `/sources`, disclaimer | EN / Waray / Filipino via `useLang`, persisted; all UI text (including flag names and score-term labels) from `src/i18n/strings.ts`. `/sources` uses `SourcesPage` plus a "Synthetic data" entry (in `extra`, tier `synthetic`): "Households are generated by this app (seed 1801). Flags and their rates are illustrative, not CBMS or registry statistics." Disclaimer footer on every view. |

## Domain functions (test-first in `src/domain/`)

Tests use two or three inline square barangays and one inline zone, not the data files.

```ts
type Flag = "senior" | "pwd" | "pregnant" | "infant" | "soloParent" | "bedridden";
interface Household { id: string; barangay: string; lon: number; lat: number; members: number; flags: Flag[] }
```

- `generateHouseholds(barangays: BarangayCollection, rng: Rng, perBarangay: [number, number] = [6, 12]): Household[]` — illustrative flag rates: senior 0.30, pwd 0.08, pregnant 0.06, infant 0.10, soloParent 0.08, bedridden 0.04; `members` 1–8. Cases: same seed → identical output; every point inside its barangay (`pointInArea`); codes `HH-0001`… sequential in barangay-name order with no gaps; flags unique and from `FLAGS`; `infant` or `soloParent` → `members ≥ 2`; a barangay where `randomPointsIn` returns fewer points simply gets fewer households (no crash).
- `WEIGHTS` (in `src/domain/weights.ts`, each with a one-line rationale shown in the UI): hazard level of the worst focused hazard — low 10, moderate 20, high 30, veryHigh 40; bedridden 25 (must be carried, takes the most time and people); pwd 15, pregnant 15, infant 15 (assisted transport or medical attention); senior 10 (slower to move, higher health risk); soloParent 5 (fewer adults to help).
- `worstFocusLevel(status: Partial<Record<Hazard, HazardStatus>>, focus: Hazard[]): { hazard: Hazard; level: Level } | null` — cases: nothing `inZone` → `null`; hazards outside `focus` ignored; equal levels → first in `HAZARDS` order; `outsideCoverage` → `null`.
- `scoreHousehold(hh: Household, worst: { hazard: Hazard; level: Level } | null): { total: number; terms: { key: "hazard" | Flag; points: number; hazard?: Hazard; level?: Level }[] } | null` — cases: `worst === null` → `null` (not on the list); no flags in a high zone → total 30, one term; bedridden + senior in veryHigh → 75, three terms; for every generated household `total` equals the sum of `terms` (property check).
- `rankHouseholds(entries: { hh: Household; score: NonNullable<ReturnType<typeof scoreHousehold>> }[]): RankedHousehold[]` — order: total desc, then hazard points desc, then number of flags desc, then id asc; ranks 1…n. Cases: each tie-break level separately; input order doesn't change output.
- `balanceAssign(ranked: RankedHousehold[], teams: string[], existing: Record<string, string>, moved: Set<string>): Record<string, string>` — greedy in rank order to the team with the lowest load (load = households + 1 extra per bedridden household), ties → team order; existing assignments kept; moved households never reassigned. Cases: 8 equal households over 4 teams → 2 each; a bedridden household tips the next one to another team; deterministic.
- `suppressRow(row: { total: number; parts: Record<string, number> }, min = 5): { total: number | "suppressed"; parts: Record<string, number | "suppressed">; rate: Record<string, number> | null }` — parts sum to the total (here: moved + waiting). Cases: total 3 → everything suppressed, `rate: null`; total 12, moved 2, waiting 10 → both parts suppressed (complementary), total 12 shown, `rate: null`; total 12, moved 6, waiting 6 → all shown, `rate.moved = 0.5`; total 5, moved 0, waiting 5 → both parts suppressed (0 is under 5).
- `progress(onList: RankedHousehold[], assignments: Record<string, string>, moved: Record<string, unknown>): { onList: number; assigned: number; moved: number; waitingBedridden: number }` — cases: empty; moved households count as assigned; bedridden waiting count drops when one is moved.

## Data

- `useLayer("barangays")`, `useLayer("boundary")`, `useZones()` (all five), `useLayer("facilities")`. Classify every household with `lookupHazards` once per data load (memoised), not per render.
- **Synthetic households** (`src/domain/seed.ts`): schema above, seed **1801**, about 520 households on the 57 real barangays (about 54 on the 6 fixture barangays). Regenerated from seed + barangays at load and never persisted. Codes only: no names, ages, addresses, ID numbers or photos, real or invented. Flag categories follow the LGU registries (senior citizens, PWD, solo parents) and health-worker lists (pregnant women, infants, bedridden), as in LGU Portal Pro's registry design; the rates are invented for the demo and labelled so.
- **Not used:** CBMS barangay aggregates (🟡 permission-tier, pending; P3 may add them for the barangay ranking only, households stay synthetic) and anything from `D:\monica` (GPDSS / Project HABAGAT): not its island-barangay list, vulnerability findings or risk levels. The `coastal` property of `barangays` may be shown.
- **Stores** (two, so the coordinator and the teams never overwrite each other; each is last-write-wins):
  - `createSyncedStore("18-kalinga:plan")`, written only by `/`, version 1: `{ focus: Hazard[]; mapHazard: Hazard; assignments: Record<string /* HH id */, string /* team id */> }`.
  - `createSyncedStore("18-kalinga:moves")`, written only by `/team/:id` windows, version 1: `{ moved: Record<string /* HH id */, { team: string; at: string /* ISO time */ }> }`.

## Experience

- **Tone:** calm and operational. Hazard level colours appear only on zones and hazard badges; household status uses its own small set (waiting, assigned, moved), always with an icon and a label.
- **Wow moment:** the top 10 waiting households pulse on the coordinator map (HTML `Marker` with a CSS ring pulse and the rank number inside; all other points stay in the circle layer). When a tanod marks one moved on the phone, its pulse stops and the dot turns into a check, the next household starts pulsing, and the tiles count up, all through the synced store. On the phone the item slides into "Moved" (Motion `layout`). Recipe: `gsap-motion` count-up; Motion for the list (one element, one library).
- **Accessibility:** the table is the keyboard path to everything on the map; Enter on a row opens "Why this priority"; a live region on `/` announces "HH-0042 marked moved by Team 2"; flags are icon + text; team-view buttons ≥ 44 px; reduced motion → static ring instead of a pulse and no slide; WCAG AA at 390 and 1280 px.

## Golden-path demo (≤ 2 minutes)

1. `/` on the laptop: storm-surge zones, the "Synthetic households" banner, the ranked list. Click rank 1 → "Storm surge — Very high +40 · Bedridden +25 · Senior citizen +10 = 75" and the nearest candidate center.
2. "Auto-assign" → four teams with balanced loads (bedridden households count extra).
3. Open `/team/T-01` in a phone-width window: Team 1's households in rank order.
4. Mark the top two moved on the phone → on the laptop the pulses move to the next households and "Moved" counts up.
5. Open `/summary`: point at "Fewer than 5" — "small barangays can't be identified, the same rule the LGU applies to its own figures".
6. Switch the phone window to Waray.

## Definition of done

- [ ] R18.1–R18.5 meet their acceptance criteria
- [ ] Domain tests pass: `npm run test`
- [ ] `npm run typecheck` and `npm run build` pass
- [ ] `npm run smoke` passes (offline, no console errors, axe clean, screenshots at 390 and 1280)
- [ ] Every string comes from `src/i18n/strings.ts` (en + war + fil drafts); AI-drafted Waray/Filipino strings listed in `NOTES.md` under "Translations to review"
- [ ] `/sources` lists every dataset used; disclaimer footer on every view
- [ ] `STATUS.md`, `AI-LOG.md` (one row per commit) and `DEMO.md` are current

## Out of scope

Real household or registry data of any kind (no import feature), CBMS aggregates, routing or vehicle dispatch (there is no road network), SMS or alerts, editing households, logins and roles, program referrals (P3 stretch), anything from GPDSS.

## Stretch (only after the definition of done is met)

- S1 Barangay ranking (P3 core 1): choropleth of each barangay's share of on-list households, synthetic, using `suppressRow` rules.
- S2 Light-material housing flag (synthetic, shaped like the CBMS housing-materials categories) as one more documented score term.
- S3 Printable team sheet (print CSS: codes, flags, nearest candidate center, check boxes).
- S4 Equipment hint per team: "needs a stretcher" when the team has bedridden households.

## Platform hooks

Export `routes` (already). Keep `generateHouseholds`, `WEIGHTS`, `scoreHousehold`, `rankHouseholds`, `balanceAssign`, `suppressRow` and `progress` pure, and `PriorityTable`, `WhyPanel`, `TeamList` and `HouseholdLayer` prop-driven. The `Household` shape is P3's registry spine: P3 adds referral fields, never names. When CBMS permission arrives, P3 replaces only the barangay ranking input; the households stay synthetic.
