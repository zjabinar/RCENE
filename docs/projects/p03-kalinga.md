# P3 · Kalinga Catbalogan

| | |
|---|---|
| **App** | `apps/p03-kalinga` · dev port 5203 · preview 6203 |
| **Batch** | 5. Run it after batch 1 (its module app `18-kalinga`) is merged into `main` |
| **Proposal** | `docs/proposal.md` (P3 in the monorepo's `docs/PROPOSALS.md`) · platform shortlist rank 3 |
| **Modules** | `#18 Kalinga` → core "priority list with check-off": R1 (R18.1) and R3 (R18.2–R18.4) (brief copied to `docs/modules/18-kalinga.md`). Built here, no module app: core "vulnerability profile and ranking" (R2) and stretch "program referrals" (S1). R1 comes from #18 so the platform degrades into #18 |
| **Roles** | CSWDO and BDRRMC → `/planner` → full · Tanod and BHW → `/field` → phone |
| **Data** | `boundary`, `barangays`, all five `hazard-*`, `facilities`, `derived/barangay-hazard` (🟢 HDX + OSM, 🟡 CDRRMO risk maps with permission) · synthetic households (seed 1801, codes only) · synthetic barangay profiles shaped like CBMS (seed 3001) · optional real CBMS aggregates (🟡, only with LGU permission) |
| **AI in the app** | none |
| **Skills to use** | `maplibre-gis` (choropleth, circle layer, pulsing markers), `dataviz` (sequential ramp, housing-mix bar; read it before any chart), `gsap-motion` (count-ups), Motion `layout` (re-sorts), Design plugin `ux-copy` and `accessibility-review` |

> The CSWDO sees which barangays combine light-material housing, seniors and young children with mapped hazard zones, turns the top five into a pre-emptive evacuation list with every rank explained, and watches tanods check households off from their phones, live. Every household and profile is synthetic.

## Problem

The LGU portal's own gap list says risk is modelled as purely physical and "vulnerable populations missing from risk models". Who is vulnerable (CSWDO registries, CBMS) and where the hazard is (CDRRMO maps) live in separate places, and the list a tanod carries is built by hand. One workflow lets the barangay ranking decide the household list, and lets the field check-off flow back into that ranking. Two separate apps would leave that hand-off on paper.

## Roles, routes and windows

| Role | Route | Window in the demo | Needs |
|---|---|---|---|
| CSWDO and BDRRMC (`planner`) | `/planner` (barangay ranking, profile, time-lapse) · `/planner/list` (priority list, teams) · `/planner/summary` (public progress) | laptop window 1440 × 900; `AppShell width="full" showReset` (`/planner/summary`: `wide`) | Which barangays first, which households, which team, how far along |
| Tanod and BHW (`field`) | `/field` (four team cards) · `/field/:team` (`T-01`…`T-04`) | phone window 420 × 860; `width="phone"` | My households in order; mark each one moved |
| Anyone | `/` (role launcher) · `/sources` | — | Pick a role; attribution and the synthetic-data notes |

The generated scaffold already has: `/` (the role launcher: `RoleLauncher` cards with **Open** and **New window**), one placeholder page per role route, the nav, and `role.<id>.title` / `role.<id>.summary` strings in three languages (`src/roles.ts`, `src/pages/`, `src/i18n/strings.ts`). Replace each placeholder with the real view; keep the routes. The planner pages share a sub-nav: Barangays (`/planner`), Priority list (`/planner/list`), Summary (`/planner/summary`). Until R2 exists, `/planner` redirects to `/planner/list`. Add `/planner/list`, `/planner/summary`, `/field/T-01` to `smokeRoutes` in `project.json`.

## Lift, then wire

| Module app | Becomes | Lift (copy into `src/modules/kalinga/`) | Change after lifting |
|---|---|---|---|
| `#18 Kalinga` | R1 (R18.1), R3 (R18.2–R18.4) | `src/domain/*` with tests (`generateHouseholds`, `WEIGHTS`, `worstFocusLevel`, `scoreHousehold`, `rankHouseholds`, `balanceAssign`, `suppressRow`, `progress`, `seed.ts`), `PriorityTable`, `WhyPanel`, `TeamList`, `HouseholdLayer`, its strings under the `kalinga.` prefix | `18-kalinga:plan` and `18-kalinga:moves` merge into the spine. Routes: `/` → `/planner/list`, `/team/:id` → `/field/:team`, `/summary` → `/planner/summary`. "Open Team N view" calls `openRoleWindow("/field/T-0N", "p03-kalinga-field-T-0N", "phone")` from `@rcene/ui`. Keep seed 1801 and every lifted test as is; never edit a lifted domain function (wrap it in `src/domain/`) |

1. **Check the module app** in this worktree: `../18-kalinga/STATUS.md` says `Phase: done`, and its tests pass (`npm run test` in that folder).
2. **Lift** by copying (`cp -r ../18-kalinga/src/domain src/modules/kalinga/domain`, and so on). Reading other app folders is fine; never edit them. Fix the imports, merge its strings into `src/i18n/strings.ts`, and make its tests pass here.
3. **If #18 isn't done**, build R18.1–R18.4 from `docs/modules/18-kalinga.md`: domain first, test-first, exactly as that brief specifies, so a later lift can replace it.
4. **Record every lift** in `NOTES.md` under "Lifted modules": app, its commit (`git log -1 --format=%h -- ../18-kalinga`), files and what you changed.

## Spine (one store, keyed by barangay)

`createSyncedStore("p03-kalinga:spine", …, { version: 1 })`:

```ts
{
  focus: Hazard[];                                        // planner · default ["stormSurge", "flood", "landslide"]
  mapHazard: Hazard;                                      // planner · default "stormSurge"
  scope: string[];                                        // planner · barangay names in the list; [] = all barangays
  assignments: Record<string /* HH id */, string /* T-0N */>;  // planner
  moved: Record<string /* HH id */, { team: string; at: string /* ISO */ }>; // field
}
```

Actions: `setFocus`, `setMapHazard`, `toggleScope(name)`, `setScope(names)`, `assign(id, team)`, `applyAssignments(map)`, `clearAssignments`, `markMoved(id, team)`, `undoMoved(id)`. Every field has one writer role: `/planner*` writes all but `moved`, and only `/field/:team` writes `moved`. The presenter acts in one window at a time, so last-write-wins never drops a change; never write the spine from a timer. The selected year is per-window UI state (default 2024), not in the spine, because Play steps it on a timer. Every record joins on the barangay: profiles, hazard rows, households and progress match on `psgc` when both sides have it, else on the trimmed, lower-cased name. Households, profiles, scores and ranks are regenerated or derived at load and never persisted.

## MVP requirements

Build in this order. **R1 alone must be a finished, demoable single-feature app** (it is #18's R18.1).

| ID | Requirement | Acceptance criteria (testable) |
|---|---|---|
| R1 | Priority list on `/planner/list` (lift R18.1) | Every R18.1 criterion holds with `/` read as `/planner/list`: `generateHouseholds(barangays, createRng(1801))`; the banner "Synthetic households — not real residents" on `/planner/*` and `/field/*`; hazard focus chips; the on-list rule, with the rest counted as "Not in a mapped risk zone for the selected hazards"; the ranked TanStack table (25 rows a page; filters by barangay, team and code); "Why this priority" listing every `scoreHousehold` term and the nearest candidate center "{name} · {km} km straight-line — Candidate, not verified by CDRRMO"; the map (one hazard's zones + `Legend`, households by status, off-list grey dots); "How the score works" from `WEIGHTS`. Lifted tests pass in `src/modules/kalinga/`. |
| R2 | Barangay vulnerability profile, ranking and housing time-lapse on `/planner` | **Mode.** `pickProfiles` uses the real CBMS file when ready, else `seedProfiles(barangays, 3001)`. Illustrative mode shows a non-dismissible banner: "Illustrative profiles shaped like CBMS barangay aggregates. Not real statistics: CBMS figures need LGU permission." Real mode shows a one-line note naming the LGU-CBMS office and the years.<br>**Ranking table.** One row per barangay: rank, barangay, index (0–100, 1 decimal), the four term points, change against the previous year in the sequence ("▲ 2", "▼ 1", "—", icon + text; 2013 shows "—"), progress "{moved} / {onList} moved" ("—" until a list exists). Sortable; the default order is `rankBarangays`.<br>**Year.** A radio group "2013 · 2022 · 2024" (arrow keys) and Play/Pause: Play steps 2013 → 2022 → 2024, 2 s per year, and stops at 2024.<br>**Map.** Choropleth of the light-material share for the selected year in 5 fixed classes (`lightClass`) plus a neutral class with a dashed outline, "Fewer than 5 households"; the legend lists every class as text; the selected barangay is outlined. A city housing-mix bar (strong / mixed / light, % with labels) for the selected year.<br>**Why this rank.** Click or Enter on a row (or a map click) opens a panel with one line per term, e.g. "Storm surge, High or above: 54% of its area (city range 0–62%) → +34.8 of 40"; age and wall shares through `suppressParts` ("Fewer than 5"); "Not counted: fewer than 5" for a suppressed term; "Hazard not computed" when the barangay has no derived row. Never "safe" or "low risk": 0% reads "No mapped zone at High or above for the selected hazards".<br>**Method.** "How the index works" renders `BVI_WEIGHTS` with their rationale and the line "A ranking to plan outreach, relative to the other barangays. Not a prediction and not an official weighting."<br>The hazard focus chips here are the same spine `focus` as R1. The ranking updates < 200 ms after a year or focus change (memoised). |
| R3 | Teams, field check-off and progress (lift R18.2–R18.4) | Every R18.2–R18.4 criterion holds with the routes renamed: four teams; "Auto-assign" with `balanceAssign`; a moved household can't be reassigned; focus chips **and scope chips** locked while any assignment exists ("Clear assignments to change the hazard focus"); "Clear assignments" asks to confirm; tiles with `countUp` (On the list, Assigned, Moved, Waiting — bedridden) and a progress bar per team; the top 10 waiting households pulse. `/field` shows four team cards with their load (households, bedridden). `/field/:team` is `TeamList`: rank order, "Mark moved" ≥ 44 px, a "Moved" section with "Moved {time}" and Undo. A team with nothing assigned shows "No households assigned to Team {n} yet. They appear here when the coordinator assigns them." An unknown team shows `EmptyState` with links to the four teams. `/planner/summary` is R18.4 with `suppressRow`. |
| R4 | The cross-role workflow | On `/planner`, "Build the list for the top 5" sets `scope` to the five top-ranked names, and a per-row "In the list" checkbox toggles one barangay. `/planner/list` then ranks only households in scope and shows the scope as removable chips ("All barangays" when empty). After Auto-assign, Team 1's households appear on `/field/T-01` in < 1 s without reload. "Mark moved" there recolours the point on `/planner/list`, counts the tiles up, announces "HH-0042 marked moved by Team 2" in a polite live region and updates the progress column on `/planner`, all in < 1 s. A reload of any window restores focus, map hazard, scope, assignments and moves. |
| R5 | Languages, `/sources`, disclaimer | EN / Waray / Filipino via `useLang` (all windows follow); every string, including flag, term, wall and age labels, in `src/i18n/strings.ts`. A test asserts no string in any language contains a word from `FORBIDDEN_ANSWER_WORDS` (so a confirm dialog avoids "sigurado"). `app.disclaimer` overridden in all three languages: "Prototype. Households and barangay profiles are synthetic. Follow CSWDO and CDRRMO instructions." `/sources`: `SourcesPage` plus `extra` entries (tier `synthetic`): #18's household entry (seed 1801) and "Barangay profiles are generated by this app (seed 3001), shaped like CBMS barangay aggregates (age structure, outer-wall materials, 2013/2022/2024). Not CBMS data; the trend is invented to exercise the time-lapse." In real mode, a CBMS entry (tier `permission`, LGU-CBMS office) replaces it. Footer on every view. |

## Domain functions (test-first in `src/domain/`)

Tests use two or three inline square barangays and inline rows, not the data files. Lifted #18 functions keep their own tests in `src/modules/kalinga/`.

```ts
type Year = 2013 | 2022 | 2024;                  // YEARS, in this order
type AgeBand = "under5" | "age5to17" | "age18to59" | "age60plus";
type Wall = "strong" | "mixed" | "light";        // outer walls: concrete/brick/stone · mixed · wood/bamboo/nipa/salvaged
interface BarangayProfile { barangay: string; psgc?: string; year: Year; households: number; population: number;
  age: Record<AgeBand, number>; walls: Record<Wall, number> }   // age sums to population, walls to households
type Share = number | "suppressed";
type CbmsFile = { source: string; rows: BarangayProfile[] };   // the optional real file
type TermKey = "exposure" | "lightHousing" | "seniors" | "children";
interface IndexInput { barangay: string; exposure: { hazard: Hazard; share: number } | null; lightHousing: Share; seniors: Share; children: Share }
interface ScoredBarangay { barangay: string; score: number; incomplete: boolean;
  terms: Record<TermKey, { value: number | null; norm: number; points: number }> }
```

- `seedProfiles(barangays: BarangayCollection, seed = 3001): BarangayProfile[]`: barangays in name order, draws in a fixed order. Households 2013 `int(30, 1500)`, 2022 × `float(1.05, 1.30)`, 2024 × `float(1.00, 1.06)`; population = households × `float(4.2, 5.2)`; age shares under5 `float(0.08, 0.13)`, 5–17 `float(0.24, 0.32)`, 60+ `float(0.05, 0.12)`, 18–59 the rest; walls 2013 light `float(0.35, 0.75)`, mixed `float(0.10, 0.25)`, strong the rest; light share × `float(0.55, 1.05)` for 2022 and × `float(0.85, 1.05)` for 2024, mixed share kept. Round counts, putting the remainder in `age18to59` and `strong`. Cases: same seed → identical; 3 rows per barangay (18 on the fixtures); parts sum exactly; households never fall across years; every share within its range.
- `pickProfiles(state: OptionalLayerState<CbmsFile>, synthetic: BarangayProfile[]): { mode: "cbms" | "illustrative"; profiles: BarangayProfile[]; invalid: boolean } | null`: `loading` → `null`. Cases: `ready` → the file's rows only, never mixed with synthetic ones (a barangay missing from the file gets no profile and shows "No CBMS row"); `absent` → illustrative; `invalid` → illustrative with `invalid: true`.
- `suppressParts<K extends string>(parts: Record<K, number>, min = 5): { total: number | "suppressed"; parts: Record<K, number | "suppressed">; share: Record<K, Share> }`: total under `min` → everything suppressed; each part under `min` (0 included) is suppressed; if exactly one part is suppressed, the next smallest is too (ties → key order), so no hidden count can be worked out from the total. Cases: total 3; `{ strong: 40, mixed: 3, light: 20 }` → mixed and light suppressed, total 63 shown; two parts under 5 → only those two; nothing under 5 → shares sum to 1 (± 0.001); property: for two parts, a part is suppressed exactly when #18's `suppressRow` suppresses it (all pairs 0–20).
- `exposureShare(row: BarangayHazardRow | undefined, focus: Hazard[], min: Level = "high"): { hazard: Hazard; share: number } | null`: per focused hazard, the sum of shares at levels ≥ `min`, capped at 1 (levels can overlap in the source); the largest wins. Cases: overlap capped at 1; hazards outside `focus` ignored; tie → first in `HAZARDS` order; no row, or no focused hazard key → `null`.
- `indicators(profile: BarangayProfile, row: BarangayHazardRow | undefined, focus: Hazard[]): IndexInput`: lightHousing = walls.light / households, seniors = age60plus / population, children = under5 / population, each `"suppressed"` when `suppressParts` hides that part. Cases: the walls example above → lightHousing `"suppressed"`; no row → `exposure: null`.
- `BVI_WEIGHTS: Record<TermKey, number> = { exposure: 40, lightHousing: 30, seniors: 15, children: 15 }`, each with a one-line rationale string shown in the UI.
- `vulnerabilityIndex(inputs: IndexInput[], weights = BVI_WEIGHTS): ScoredBarangay[]`: per term, min–max over the inputs' numeric values (`norm = (v − min) / (max − min)`; 0 for all when max = min); `points = weight × norm`; a `null` or `"suppressed"` value gives `norm` 0, `points` 0 and `incomplete: true`; `score` = Σ points, 1 decimal. Cases: a barangay holding every maximum scores 100; all equal → 0; points sum to score (± 0.05, property); a suppressed term is 0 and `incomplete`.
- `rankBarangays(scored: ScoredBarangay[]): (ScoredBarangay & { rank: number })[]`: score desc, then exposure points desc, then name (`localeCompare(…, "en")`); ranks 1…n. Cases: each tie-break; input order doesn't matter.
- `rankDelta(current, previous): Record<string, number>`: positive = moved up. Case: a swap gives +1 / −1.
- `lightClass(share: Share): 0 | 1 | 2 | 3 | 4 | "suppressed"`: fixed breaks at 0.2 / 0.4 / 0.6 / 0.8, so years stay comparable. Cases: 0 → 0, 0.2 → 1, 1 → 4, `"suppressed"`.
- `barangayProgress(onList: RankedHousehold[], assignments: Record<string, string>, moved: Record<string, unknown>): Record<string, { onList: number; assigned: number; moved: number }>`. Cases: empty; a moved household counts as assigned; a barangay with nothing on the list is absent.

## Data

- `useLayer("barangays")`, `useLayer("boundary")`, `useZones()` (all five), `useLayer("facilities")`, `useLayer("derived/barangay-hazard")`. Pass all of them to `AppShell layers`. Classify households with `lookupHazards` once per data load (memoised), as #18 does.
- **Households:** #18's `generateHouseholds`, seed 1801, about 520 on the 57 barangays (about 54 on the 6 fixtures). Codes `HH-0001`… only: no names, ages, addresses, IDs or photos.
- **Profiles:** `seedProfiles(…, 3001)`, 3 years × 57 barangays. Invented values labelled illustrative everywhere they show.
- **Optional real CBMS** (not in `LAYER_FILES`): `useOptionalLayer("cbms-barangay.json", schema)` with an app-local zod schema for `CbmsFile`. Absent → no request, illustrative mode. Write the contract in `NOTES.md` under "Requests for the data session": the data session delivers it **only** from the LGU-CBMS office, with written permission (tier `permission`), maps the CBMS wall categories to `strong` / `mixed` / `light`, and records that mapping in `data/README.md`. Never from GPDSS, Project HABAGAT or any `D:\monica` copy.
- **Not used:** anything from `D:\monica` (its CBMS extracts, island list, vulnerability findings, risk levels). `BVI_WEIGHTS` are this brief's own starting point.
- **Store:** `p03-kalinga:spine` only (shape above).

## Experience

- **Signature:** the housing-materials time-lapse. Press Play: the choropleth steps 2013 (pre-Haiyan) → 2022 → 2024 (`fill-color-transition` 800 ms), the city housing-mix bar morphs, rows re-sort with Motion `layout` and ▲ ▼ chips appear. Then the multi-window moment: a tanod's "Mark moved" on the phone stops that household's pulse on the laptop and moves the barangay's progress.
- **Tone:** calm and operational. Hazard colours only on zones and hazard badges; household status (waiting / assigned / moved) and rank change use their own small sets, always icon + text.
- **Accessibility:** the ranking and priority tables are the keyboard path to everything on the maps (Enter opens the panel). The year control is a labelled radio group; Play/Pause uses `aria-pressed`. A polite live region announces "2022: light-material walls in 41% of households city-wide" and each move. Phone buttons ≥ 44 px. Reduced motion: no crossfade, no re-sort slide, a static ring instead of the pulse; Play still steps. WCAG AA at 390 and 1280 px.

## Golden-path demo (≤ 3 minutes)

Layout on a 1920 × 1080 screen: `/planner` in a 1440 × 900 window on the left; `/field/T-01` in a 420 × 860 window on the right (both from the launcher's **New window**). Press **Reset demo** first.

1. 0:00 · Planner, `/planner`: the illustrative banner and the ranking. Click rank 1: "Why this rank" writes out every term. Point at a "Fewer than 5" cell. The field window shows "No households assigned to Team 1 yet".
2. 0:30 · Planner: press Play. 2013 → 2022 → 2024: the light-material classes shrink in most barangays, rows re-sort, ▲ ▼ chips show.
3. 0:55 · Planner: "Build the list for the top 5" → `/planner/list` with five scope chips. Click household rank 1: every score term (for example "Storm surge — Very high +40 · Bedridden +25 · Senior citizen +10 = 75") and the nearest candidate center, straight-line.
4. 1:25 · Planner: Auto-assign. The field window fills with Team 1's households in under a second.
5. 1:50 · Field: Mark moved on the top two. The planner's pulses move to the next households, the tiles count up and the live region speaks. Open the Barangays tab: progress "2 / {n} moved".
6. 2:25 · Planner: `/planner/summary`, "Fewer than 5": small barangays can't be identified. Switch to Waray (both windows follow). Open `/sources`. Done by 3:00.

## Definition of done

- [ ] R1–R5 meet their acceptance criteria
- [ ] Domain and lifted-module tests pass: `npm run test`
- [ ] `npm run typecheck` and `npm run build` pass
- [ ] `npm run smoke` passes for `/`, every role route, the added `smokeRoutes` and `/sources` (offline, no console errors, axe clean, screenshots at 390 and 1280)
- [ ] Every string comes from `src/i18n/strings.ts` (en + war + fil drafts); AI-drafted strings listed in `NOTES.md` under "Translations to review"
- [ ] `/sources` lists every dataset used, including both synthetic sets; disclaimer footer on every view
- [ ] `NOTES.md` "Lifted modules" lists every lift; the CBMS file contract is under "Requests for the data session"; `STATUS.md`, `AI-LOG.md` and `DEMO.md` are current

## If time runs out

Cut in this order: (1) every stretch item; (2) Play and the crossfade (keep the year radio group); (3) R4's scope (the list covers all barangays; the progress column stays); (4) R2: `/planner` redirects to `/planner/list` and the platform is **#18 Kalinga** (R1 + R3 + R5) behind the role launcher.

## Out of scope

Real household or registry data of any kind, and any import feature; personal names, ages, addresses, IDs or photos; real CBMS figures without written LGU permission; anything from GPDSS, Project HABAGAT or `D:\monica`; poverty or income scoring; routing or vehicle dispatch (no road network); SMS or alerts; logins; editing households; any claim that the index predicts harm.

## Stretch (only after the definition of done is met)

- **S1 Program referrals** (the proposal's stretch). `src/content/programs.ts`: program types with the flags they fit (social pension → senior; PWD ID and assistance → pwd; solo parent ID → soloParent; maternal and child health follow-up → pregnant, infant; shelter assistance → light-material housing). `suggestPrograms(hh): ProgramId[]` with tests. On `/field/:team`, a moved household gets "Refer" (multi-select). Add `referrals: Record<HH id, { programs: ProgramId[]; team: string; at: string }>` (written only by `/field`) and bump the spine to version 2 with a `migrate` that adds `{}`. `/planner/list` gets a Referrals tab by program and barangay; `/planner/summary` adds counts through `suppressRow`. Wording: "Suggested referral. The CSWDO decides eligibility."
- **S2 Light-material housing term** (#18's S2): each household gets `housing` drawn from its barangay's 2024 wall shares (seed 3002). A P3 wrapper adds "Light-material housing: +10" to `scoreHousehold`'s terms; the lifted function stays untouched.
- **S3 Printable team sheet** (#18's S3).
