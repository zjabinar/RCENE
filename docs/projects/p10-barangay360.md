# P10 · Barangay 360

| | |
|---|---|
| **App** | `apps/p10-barangay360` · dev port 5210 · preview 6210 |
| **Batch** | 5. Run it after batches 1–4 are merged into `main` (#4 is in B1, #8 and #12 in B3) |
| **Proposal** | `docs/proposal.md` (P10 in the monorepo's `docs/PROPOSALS.md`) |
| **Modules** | Core 1, barangay profile and trends: new, built here (no module app)<br>`#4 Bantay Barangay` → Core 2, hazard exposure of one barangay (`docs/modules/04-bantay.md`)<br>Core 3, announcements: new, built here<br>`#8 Sertipiko` → Stretch S1, open requests and the captain's signature (`docs/modules/08-sertipiko.md`)<br>`#12 Proyekto Watch` → Stretch S2, the barangay's projects (`docs/modules/12-proyekto.md`) |
| **Roles** | Punong Barangay → `/captain` (+ `/captain/:barangay`) → full · Resident → `/resident` (+ `/resident/:barangay`) → phone |
| **Data** | boundary, barangays, facilities, all five `hazard-*`, `derived/barangay-hazard`, `derived/facility-hazard` · 🟢 HDX + OSM, 🟡 CDRRMO/CPDCO risk maps (permission) · profile: 🟡 CBMS aggregates only if the LGU grants permission (optional file), otherwise 🟢 synthetic, shaped like CBMS (seed 1001) · synthetic announcements (seed 1002) |
| **AI in the app** | none |
| **Skills to use** | built-in `dataviz` (read it before the first chart or tile), `maplibre-gis`, `gsap-motion` (count-ups), Motion `AnimatePresence` (new announcements), Design plugin `ux-copy` (templates, suppression wording) and `accessibility-review` |

> A Punong Barangay opens their barangay, sees how it changed since 2022 and which mapped hazards cover it, drafts an advisory from that panel, and it lands on a resident's phone in Waray within a second.

## Problem

Barangay officials decide with numbers they rarely see together. CBMS profiles arrive as reports, hazard maps as shapefiles or printouts, and announcements go up on the hall's bulletin board. Public barangay summaries exist for visitors, but nothing puts one barangay's profile, hazard exposure and outreach on one screen for its own officials, or links what they see to what residents hear. Barangay 360 is that screen for each of the 57 barangays, plus a resident view that receives what the captain posts.

## Roles, routes and windows

| Role | Route | Window in the demo | Needs |
|---|---|---|---|
| Punong Barangay | `/captain` → `/captain/:barangay` | laptop, left, 1500 × 1080 | One barangay: profile and trends, hazard exposure, announcements |
| Resident | `/resident` → `/resident/:barangay` | phone, right, 420 × 860 | The barangay's announcements, urgent first, in their own language |
| Anyone | `/sources` | — | Attribution, synthetic-data note, disclaimer |

`:barangay` is the URL-encoded name from `barangays`. `/captain` and `/resident` show a searchable barangay list (57 real, 6 fixtures); an unknown name shows that list with "Barangay not found".

The generated scaffold already has `/` (the role launcher: `RoleLauncher` cards with **Open** and **Open in a new window**), one placeholder page per role route, the nav, and `role.<id>.title` / `role.<id>.summary` strings in three languages (`src/roles.ts`, `src/pages/`, `src/i18n/strings.ts`). Replace each placeholder with the real view and keep the routes. Add `/captain/Sample%20Barangay%201` and `/resident/Sample%20Barangay%201` to `smokeRoutes` in `project.json` (switch to a real name when the data lands). `showReset` on every view. When S1 (requests) is built, extend `role.resident.summary` in all three languages to mention the status of the resident's requests.

## Lift, then wire

| Module app | Becomes | Lift (copy into `src/modules/<name>/`) | Change after lifting |
|---|---|---|---|
| `#4 Bantay Barangay` | Core 2 → exposure panel on `/captain/:barangay` | `LEVEL_WEIGHTS`, `DEFAULT_WEIGHTS`, `hazardExposure`, `facilityCount`, `scoreAll`, `rank`, `joinRows`, `explain` with tests; `BarangayBreakdown` → `bantay/` | Weights fixed at `DEFAULT_WEIGHTS`: no `WeightsPanel`, no `04-bantay:weights` store, no choropleth or ranked table. The barangay comes from the route |
| `#8 Sertipiko` | Stretch S1 | `seedResidents`, `seedRequests`, `currentStatus`, `sortQueue`, `openByBarangay` with tests; `StatusTimeline` → `sertipiko/` | Read-only except the captain's **Sign**, stored in the spine. No request form, staff desk, print or verify pages |
| `#12 Proyekto Watch` | Stretch S2 | `seedProjects`, `targetDate`, `timeElapsed`, `scheduleStatus` with tests; `ProjectsForBarangay`, `ProgressRings` → `proyekto/` | Read-only: open-flag counts show, no flag form or office queue |

#8 and #12 both export `currentStatus`. Import each from its module folder under an alias (`currentStatus as requestStatus`); never merge them.

1. **Check each module app** in this worktree: `../NN-slug/STATUS.md` says `Phase: done`, and its tests pass (`npm run test` in that folder).
2. **Lift** by copying (`cp -r ../04-bantay/src/domain src/modules/bantay/domain`, and so on). Reading other app folders is fine; never edit them. Fix the imports, merge its strings into `src/i18n/strings.ts` under the module's prefix, and make its tests pass here.
3. **If a module app isn't done**, build only the requirements this brief lists, from `docs/modules/NN-slug.md`. Domain first, test-first, with that brief's signatures, so a later lift can replace it.
4. **Record every lift** in `NOTES.md` under "Lifted modules": app, its commit (`git log -1 --format=%h -- ../NN-slug`), files and what you changed.

## Spine (one store, keyed by barangay)

`createSyncedStore("p10-barangay360:spine", …, { version: 1 })`, saved under `rcene:p10-barangay360:spine`.

```ts
interface Barangay360Spine {
  posted: Record<string, Announcement[]>;   // barangay name → announcements posted in this demo
  withdrawn: Record<string, string[]>;      // barangay name → withdrawn ids (seeded or posted)
}
type AnnouncementKind = "advisory" | "event" | "service" | "meeting";
interface Announcement {
  id: string;                               // "ANN-0115": continues after the seeded ids
  barangay: string;
  kind: AnnouncementKind;
  template: TemplateId | null;              // rendered in each reader's language
  vars: Record<string, string | number>;    // date "YYYY-MM-DD", time "HH:MM", place id, purok, hazard, share, level
  text: string | null;                      // free text, shown exactly as typed
  textLang: Lang | null;                    // the language the captain wrote it in
  urgent: boolean;
  postedAt: string;                         // ISO
  expiresAt: string | null;                 // ISO; null = no expiry
}
```

Actions `post(a)` and `withdraw(barangay, id)` are written only by `/captain/:barangay` (one captain window in the demo). The resident only reads. Profiles, exposure and seeded announcements are computed at load in every window and never persisted. S1 moves to `version: 2` with a migration and adds `signed: Record<string, string>` (request id → ISO time), also written only by the captain.

## MVP requirements

Build in this order. **R1 alone is a finished app: a barangay profile explorer.**

| ID | Requirement | Acceptance criteria (testable) |
|---|---|---|
| R1 | **Core 1: barangay profile and trends** on `/captain/:barangay` | `AppShell width="full"`, stacked at 390 px. Figures come from `pickProfiles` (synthetic unless a CBMS file is served). For the latest round, with the change since the first:<br>- `StatTile`s with count-up: population, households, average household size; each with a change written as text ("▲ 3.1% since 2022"; "—" when a figure is suppressed).<br>- Age structure: five bands (0–4, 5–14, 15–24, 25–59, 60+), both rounds side by side (Recharts horizontal bars).<br>- Housing by outer walls (strong, mixed, light, salvaged or makeshift): one 100% stacked bar per round, with % labels.<br>- Services: share of households with improved water, basic sanitation, electricity and internet; one dot per round, joined by a line.<br>Chart colors come from the `dataviz` palette, never the hazard-level colors. Each chart has a visually hidden table with the same numbers. Any count under 5 (0 included) reads "Fewer than 5" and is left out of every percentage and change; `suppressCells` also hides one complementary cell. Footnote: "Counts under 5 are hidden so households can't be identified." A badge on every profile, exactly: synthetic → "Illustrative — synthetic data shaped like CBMS, not CBMS figures"; real → "CBMS {years} · LGU-CBMS office, used with permission". A barangay missing from a CBMS file shows "No CBMS figures for this barangay", never a synthetic stand-in. With R1 alone, `/` shows only the captain card. |
| R2 | **Core 2: hazard exposure** of the same barangay (#4 R4.2) | Next to the profile:<br>- "Exposure index {index} · rank {r} of {N}" from `scoreAll(rows, DEFAULT_WEIGHTS)` and `rank`, with the sub-label "adjustable — not a prediction" and "Weights: a starting point, not an official weighting". The words "risk score" and "prediction" appear nowhere else.<br>- The summary sentence from `explain`, through `t()`.<br>- `BarangayBreakdown`: a bar per hazard by level ("No mapped zones in this barangay"; "Layer not loaded"), facility counts per hazard × level and the named facilities in moderate-or-higher zones.<br>- A locator map fit to the barangay (`featureBounds`): its outline, one hazard's zones at a time (a select; default = the top hazard contributor), its facilities as points.<br>- Rows join with `joinRows` (psgc, then normalized name). No derived row → "No derived data" and no index.<br>- "How the index is calculated" (accordion) with #4's formula and weights.<br>- **Draft an advisory from this** opens the R3 composer filled by `draftFromExposure`; when that returns null, the button is disabled with "No mapped zones in this barangay". |
| R3 | **Core 3: announcements composer** on `/captain/:barangay` | A template select (six templates in `src/content/announcements.ts`, en + war + fil) or "Write your own". Template fields: date, time, place (a fixed list of place ids, e.g. barangay hall, covered court, health station), purok 1–7. Validation with react-hook-form + zod through `validateDraft`. Free text: 10–280 characters, under the line "Don't include residents' names or phone numbers." An **Urgent** switch; expiry none / 1 day / 7 days. Preview tabs EN · Waray · Filipino show exactly what each reader will see (free text as typed, with "Written in {language}"). **Post** writes to the spine and toasts "Posted to residents of {barangay}". Below, this barangay's feed (`feedFor`) with **Withdraw** on each item (AlertDialog to confirm). |
| R4 | **Cross-role: the resident's feed** at `/resident/:barangay` | `AppShell width="phone"`. One sentence above the feed from #4 `explain` ("Hazards mapped in {barangay}: …"). Then `feedFor(barangay, …)`: urgent, unexpired items first under an amber banner with an icon and the word "Urgent", then newest first. Each card: kind icon + label, the text in the reader's language, relative time ("5 min ago"), and "Written in {language}" for free text. At most 20 cards, then **Show older**.<br>Checked with two Playwright pages in one browser context; the run is recorded in `STATUS.md`:<br>- a post on `/captain/B` appears on `/resident/B` within 1 s without reload, slides in (Motion `AnimatePresence`), is marked "New" for 10 s, and a polite live region says "New announcement from {barangay}";<br>- a withdrawal removes it within 1 s;<br>- a post for barangay A never appears on B's feed;<br>- a reload restores the feed; **Reset demo** clears the spine, keeps the language and reloads every window. |
| R5 | Languages, `/sources`, disclaimer | EN / Waray / Filipino via `useLang`, persisted, followed by every window. Templates, place names and every UI string come from the string table (no JSX text literals). `src/i18n/strings.test.ts`: no template, `status.*` or `answer.*` string in any language contains a word from `FORBIDDEN_ANSWER_WORDS`. `app.disclaimer` is overridden in all three languages; the English text is exactly "Prototype. Barangay figures are synthetic unless marked CBMS. Announcements stay in this browser and reach no one else." `/sources`: `SourcesPage` plus `extra` entries (tier `synthetic`): "Barangay profiles: generated (seed 1001), shaped like CBMS barangay aggregates for 2022 and 2024; not CBMS figures." and "Sample announcements: generated (seed 1002), coded ANN-0001…; no names." Footer on every view, `/` included. |

## Domain functions (test-first in `src/domain/`)

**Profile** (`profile.ts`). `ROUNDS = [2022, 2024]` (the CBMS rounds; the charts take any number of rounds). `AgeBand = "0-4" | "5-14" | "15-24" | "25-59" | "60+"`, `Wall = "strong" | "mixed" | "light" | "salvaged"`, `Service = "water" | "sanitation" | "electricity" | "internet"`. `ProfileRound = { year; population; households; age: Record<AgeBand, number>; walls: Record<Wall, number>; services: Record<Service, number> }` (counts of people, households, households). `BarangayProfile = { barangay; psgc?; source: "synthetic" | "cbms"; rounds: ProfileRound[] }`. The optional file `cbms-profile.json` is a `BarangayProfile[]` with `source: "cbms"`; export its zod schema `cbmsProfileSchema`.

- `syntheticProfiles(barangays: BarangayCollection, seed = 1001): BarangayProfile[]`. Names sorted first; one `createRng(seed)` drawn in that order. 2022 population `rng.int(30, 600) * 10`; 2024 = 2022 × (1 + `rng.float(-0.03, 0.06)`), rounded; households = population ÷ `rng.float(4.0, 5.2)`, rounded. Age shares around (0.10, 0.20, 0.18, 0.42, 0.10) ± 0.02; wall shares around (0.45, 0.25, 0.27, 0.03), with 1–5 points moving from light to strong by 2024; service shares water 0.70–0.95, sanitation 0.60–0.90, electricity 0.80–0.98, internet 0.20–0.60, each rising 0–10 points by 2024 (capped at 1). Integer counts by largest remainder. Cases: same seed, same output; input order doesn't matter; one profile per barangay with both rounds; age sums to population and walls to households in every round; each service ≤ households; all counts integers ≥ 0.
- `pickProfiles(file: OptionalLayerState<BarangayProfile[]>, barangays, seed = 1001): { source: "cbms" | "synthetic"; byName: Map<string, BarangayProfile>; note: string | null }`. Cases: `absent` → synthetic, no note; `ready` → cbms, and a barangay missing from the file is missing from `byName`; `invalid` → synthetic with the note "CBMS file could not be read: {error}". The caller shows `LoadingState` while the file state is `loading` and never passes it in.
- `suppressCells(cells: Record<string, number>, min = 5): Record<string, number | "suppressed">`. Cases: `{ a: 120, b: 3, c: 40 }` → b and c suppressed (c is the smallest remaining cell); `{ a: 120, b: 3, c: 2 }` → b and c suppressed, a shown; `{ a: 0, b: 50 }` → both suppressed (0 is under 5); all cells ≥ 5 → unchanged; a total under 5 → every cell suppressed; a tie for the complementary cell → the first in key order.
- `rateOf(count: number, total: number, min = 5): number | null`. Cases: (40, 100) → 0.4; (3, 100) → null; (97, 100) → null (3 households without); (0, 0) → null.
- `change(from: number | "suppressed" | undefined, to: number | "suppressed" | undefined): { abs: number; pct: number | null } | null`. Cases: 1000 → 1031 gives `{ abs: 31, pct: 0.031 }`; either side suppressed or undefined → null; from 0 → `pct: null`.

**Announcements** (`announcements.ts`). Templates: `hazardAdvisory`, `drill`, `assembly`, `healthSchedule`, `waterInterruption`, `cleanup`. English `hazardAdvisory`: "{share} of our barangay's area is in mapped {hazard} zones, up to {level}. Know your nearest evacuation center and keep a go-bag ready. Follow official CDRRMO advisories."

- `seedAnnouncements(barangayNames: string[], seed = 1002, dayStart: Date): Announcement[]`: two per barangay (names sorted), ids `ANN-0001…` in that order, from `drill`, `assembly`, `healthSchedule` and `cleanup`; `postedAt` in the 7 days before `dayStart` (local start of today), none urgent, none expired at `dayStart`. Cases: deterministic; counts and ids; every timestamp before `dayStart`.
- `nextAnnouncementId(seeded, spine): string`: the highest sequence + 1, four digits. Case: seeded up to `ANN-0012` and posted `ANN-0013` → `ANN-0014`.
- `feedFor(barangay, seeded, spine, now): Announcement[]`. Cases: other barangays left out; withdrawn ids (seeded or posted) left out; `expiresAt` ≤ `now` left out; urgent first, then `postedAt` descending, then id; seeded and posted merged.
- `renderAnnouncement(a, lang): { text: string; writtenIn: Lang | null }`, with `translate(strings, lang, key, vars)` and dates and times formatted by `Intl.DateTimeFormat(LOCALES[lang])`. Cases: `drill` in `war` with the date formatted for `LOCALES.war`; a missing var stays visible as `{place}`; free text comes back unchanged in every language with `writtenIn = textLang`; an unknown template → the `announcement.unavailable` string.
- `validateDraft(draft: Draft, now): { ok: true; value: Draft } | { ok: false; errors: Partial<Record<string, string>> }`, where `Draft = { kind; template; vars; text; textLang; urgent; expiry: "none" | "1d" | "7d" }`; `toAnnouncement(draft, barangay, id, now)` then sets `postedAt` and `expiresAt`. Cases: a template without its date → error on `date`; a date before today → error; free text of 9 or 281 characters → error; neither template nor text → error.
- `draftFromExposure(parts: ExplainParts, barangay: string): Draft | null` maps #4's `explain` output to `hazardAdvisory` with the top hazard, its total share and its highest level. Cases: `{ kind: "noMappedZones" }` → null; when "facilities" is the top contributor, the top hazard is used instead.

## Data

- `useLayer` for `boundary`, `barangays`, `facilities`, `derived/barangay-hazard`, `derived/facility-hazard`; `useZones()` for the locator map. Pass all ten layer names to `AppShell layers`.
- **Profile source:** `useOptionalLayer("cbms-profile.json", cbmsProfileSchema)`. The file does not exist today: ask for it in `NOTES.md` under "Requests for the data session" (🟡 CBMS barangay aggregates from the LGU-CBMS office, only with written permission). Never type in, copy or approximate CBMS figures from any other source.
- Synthetic: profiles (seed 1001) and announcements (seed 1002), regenerated at load and never stored. Places are generic ("Covered court"), never people. Codes only (`ANN-0001`); no household or person records.
- Store keys: `p10-barangay360:spine` only. Static data is never persisted.
- No symbol or text map layers (no glyphs offline); names appear in the DOM. The online OSM basemap is only the opt-in `allowOnlineBasemap` toggle.

## Experience

- **Signature:** the captain's cockpit and a resident's phone side by side. The captain writes in English and the phone shows the same notice in Waray, because templates render in the reader's language. Recipes: `gsap-motion` **Count-up numbers** (or `StatTile countUp`) for the tiles; Motion `AnimatePresence` for arriving cards. One library per element.
- **Layout:** at ≥ 1280 px three columns, profile | hazard exposure | announcements; at 390 px stacked in that order. Neutral palette; hazard-level colors only in the exposure panel.
- **Wow moment:** **Draft an advisory from this** turns the exposure sentence into a notice; the preview tabs show it in three languages; one press of **Post** and it slides onto the phone in Waray.
- **Accessibility:** a keyboard path (barangay list → panels → composer → Post; resident list → feed). Charts have hidden tables, and suppressed cells say "Fewer than 5" in text. A polite live region on the resident view for new notices; "Urgent" is always icon + word + color. `prefers-reduced-motion`: numbers set and cards appear with no movement.

## Golden-path demo (≤ 3 minutes)

**Window layout.** Laptop 1920 × 1080: `/captain/<B>` at left (1500 × 1080) and `/resident/<B>` at right (420 × 860), on the same coastal barangay B with mapped storm-surge zones (named in `DEMO.md`). Open both from `/` with **New window**, press **Reset demo** once, and set the resident window to Waray.

1. **0:00 Profile.** The tiles count up with "▲ … since 2022"; the housing bars show the light-material share falling from 2022 to 2024. Point at one "Fewer than 5" cell and at the illustrative badge.
2. **0:40 Exposure.** The sentence "…% of its area is in mapped storm-surge zones (High: …%)", the bars and the named facilities; switch the map's zones to flood; point at "adjustable — not a prediction".
3. **1:15 Draft.** Press **Draft an advisory from this**. Open the Waray and Filipino preview tabs, switch **Urgent** on, press **Post**.
4. **1:45 Resident.** Within a second the urgent advisory appears at the top of the phone, in Waray, marked "New".
5. **2:05 Second notice.** The captain posts `drill` (Saturday, 08:00, covered court); it appears below the urgent one. Withdraw a seeded notice; it disappears from the phone.
6. **2:35 Close.** Open `/sources`: synthetic CBMS-shaped profiles, CDRRMO risk maps, OSM, HDX.

## Definition of done

- [ ] All MVP requirements meet their acceptance criteria
- [ ] Domain and lifted-module tests pass: `npm run test`
- [ ] `npm run typecheck` and `npm run build` pass
- [ ] `npm run smoke` passes for `/`, every role route, both `Sample%20Barangay%201` routes and `/sources` (offline, no console errors, axe clean, screenshots at 390 and 1280)
- [ ] R4 checked with two Playwright pages and recorded in `STATUS.md`; the golden path runs in ≤ 3 minutes with Wi-Fi off
- [ ] Every string comes from `src/i18n/strings.ts` (en + war + fil drafts); AI-drafted strings listed in `NOTES.md` under "Translations to review"
- [ ] `/sources` lists every dataset used; disclaimer footer on every view
- [ ] `NOTES.md` "Lifted modules" lists every lift; `STATUS.md`, `AI-LOG.md` and `DEMO.md` are current

## If time runs out

Cut in this order: stretch → **Show older** and expiry → the preview tabs (keep posting) → the locator map (keep the breakdown) → the services chart. Hide roles that aren't built: filter the launcher cards and the nav with a `READY` set in `src/roles.ts`; their routes show `EmptyState`. R1 + R2 is a profile-and-exposure cockpit for one role. R1 alone is the barangay profile explorer.

## Out of scope

Real CBMS figures without the permission file; household or person records; accounts and logins; SMS, push or social-media posting; editing profiles; #4's weights panel, city ranking table and choropleth; #8's request form, staff desk, print and verify pages; #12's flag form and office queue; anything from GPDSS or Project HABAGAT.

## Stretch (only after the definition of done is met)

- **S1 Open requests** (#8): a panel "Open requests: N" (`openByBarangay`) listing this barangay's open requests in `sortQueue` order (id, type, step, age, "Overdue" as text), from #8's seed (801, computed at load). Rows at "For signature" get **Sign**, which writes `signed[id]`; it counts as a `ready` desk event. The resident view gets a "Track a request" box: `StatusTimeline` for an `RQ-` id of that barangay, which reaches "Ready to claim" within 1 s of the signature. Restore the full `role.resident.summary`.
- **S2 Projects** (#12): `ProjectsForBarangay({ barangay })` with `seedProjects(barangays, 1201)`: status chips with variance, progress rings, open-flag counts; "No projects recorded for this barangay (synthetic)" when there are none.
- **S3 One-page barangay brief:** print CSS and `window.print()` for the profile tiles, the exposure sentence and the latest five announcements.
- **S4 2013 baseline:** when a CBMS file includes the 2013 round, the charts show it as a third round (they draw whatever rounds a profile has; `ROUNDS` only drives the synthetic generator).
