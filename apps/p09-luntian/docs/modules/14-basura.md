> **Module brief** (reference). This is the spec of app #14 Basura Alert, copied from the monorepo's `docs/projects/14-basura.md`. Its paths and ports are that app's. In P9 Luntian Catbalogan, `docs/brief.md` says which parts to lift or build, and wins where they differ.

# 14 · Basura Alert

| | |
|---|---|
| **App** | `apps/14-basura` · dev port 5114 · preview 6114 |
| **Batch** | 3 |
| **Proposal** | `docs/proposal.md` (#14 Basura Alert — waste collection and segregation guide, in the monorepo's `docs/PROPOSALS.md`) |
| **Reused by platforms** | P9 Luntian Catbalogan (core "waste schedule + game", step 1 of its workflow) |
| **Data** | boundary, barangays (🟢 OCHA/HDX) · synthetic, labelled **Illustrative**: collection routes A–D assigned per barangay (hash salt 1401), materials recovery facility (MRF) points (seed 1402), game round order (seed 1403) · holiday list as config (`src/content/holidays.ts`) · no permission-tier data |
| **AI in the app** | none |
| **Skills to use** | `maplibre-gis` (barangay pick by tap, MRF markers, straight-line distance), `gsap-motion` (countdown digits, score count-up), Design plugin `ux-copy` (Waray-first wording, game feedback) |

> Pick your barangay and see, in Waray first, what is collected today, a live countdown to the next pickup that knows the holidays, the nearest MRF, and a drag-and-drop game that teaches which bin each thing goes in.

## Problem

PROPOSALS records two failures: the existing "today's collection" lookup returned nothing every day, and the public facility list hid a real MRF. Segregation at source (RA 9003) only works if households know which stream goes out on which day, and most residents read Waray more easily than English ("no Waray/Filipino localisation" is a documented need too). This app never gives a blank answer: it always shows the next pickup, or says plainly that no schedule is on file. Its schedule and MRF locations are illustrative until the City ENRO provides real ones, and it says so.

## Users and routes

| Role | Route | Device in the demo | Needs |
|---|---|---|---|
| Resident | `/` | phone-width window (design at 390 px) | Pick a barangay from a searchable list or by tapping the map |
| Resident | `/b/:barangay` | same | Today's collection, the next-pickup countdown, the week ahead, the nearest MRF |
| Resident, student | `/game` | same (also fine on a laptop) | Learn the four streams by playing |
| Anyone | `/sources` | — | Attribution, the illustrative-schedule note, disclaimer |

Use `AppShell width="phone"` on every route. Pass `layers={["boundary", "barangays"]}`. `:barangay` is the barangay name, URL-encoded.

## MVP requirements

Build in this order. R14.1 alone is a complete entry.

| ID | Requirement | Acceptance criteria (testable) |
|---|---|---|
| R14.1 | Barangay → today, countdown and week ahead | `/` offers a searchable barangay list and a map; tapping the map picks `barangayAt(point)` (outside every barangay → "Tap inside the city"). `/b/:barangay` shows: a **Today** card (streams collected today with their time window, or "No collection today"), a **Next pickup** countdown ticking every second (days, hours, minutes, seconds) to the start of the next window from `nextPickups`, "Happening now, until 9:00 AM" while a window is open, a 7-day strip with stream icons and labels, and a note on any pickup moved by a holiday ("Moved from Mon 30 Nov: Bonifacio Day"). The label "Illustrative schedule, confirm with the City ENRO" is always visible. The answer is never blank (domain test: every route, every day of 2026–2027, has a next pickup within 7 days). Unknown barangay in the URL → `EmptyState` with a link back to the list. A `?now=2026-11-29T18:00+08:00` query parameter sets a demo clock, parsed by `parseDemoNow`, and shows a visible "Demo date" chip. |
| R14.2 | Waray first | On the first visit (no saved choice, tracked by `langChosen` in the app store) the language is set to Waray; choosing any language sets `langChosen`. A domain test asserts every `en` key in `src/i18n/strings.ts` and `src/content/items.ts` has a `war` entry, so Waray never falls back to English. Copy is short, concrete and second-person (drafted with `ux-copy`). |
| R14.3 | Nearest MRF on a map | `/b/:barangay` shows the barangay highlighted, illustrative MRFs from `seedMrfs` as HTML markers with a hollow, dashed style, and a dashed straight line from a point inside the barangay to the nearest MRF with "{km} km straight-line" (`nearestMrf`). The card and the popup both say "Illustrative MRF location, not an official facility list" and list the streams it accepts and its hours. The barangay list and the card are the non-map path to the same answer. |
| R14.4 | "Where does this go?" game | `/game` deals a round of 8 items (`newRound`, seed 1403 + round number) from the 18 in `src/content/items.ts`. Drag an item card (motion/react `drag`, `dragSnapToOrigin`) onto one of four bins (Biodegradable, Recyclable, Residual, Special waste); the drop is resolved by hit-testing `info.point` (page coordinates) against each bin's rect plus `window.scrollX/scrollY`. Keyboard and tap alternative with the same outcome: select an item (Enter/Space or tap), then choose a bin button or press 1–4; Escape cancels. Correct → the item drops into the bin and the points float up; wrong → a short shake, the correct bin is highlighted and a one-line reason is shown. Scoring by `answer` (below). End of round: score (count-up), accuracy, best streak, the items to review with their reasons, "Play again". Best score per device is kept. |
| R14.5 | `/sources`, disclaimer | `/sources` lists OCHA/HDX boundaries and `tier: "synthetic"` entries for the routes, the MRFs and the holiday list ("national holidays only; confirm local holidays and the real schedule with the City ENRO"). Disclaimer footer on every view. |

Illustrative routes (`src/content/routes.ts`; weekdays 0 = Sunday):

| Route | Biodegradable | Recyclable | Residual | Special waste | Window |
|---|---|---|---|---|---|
| A | Mon, Thu | Sat | Wed | 1st Sat of the month | 05:00–08:00 |
| B | Tue, Fri | Mon | Sat | 2nd Sat | 06:00–09:00 |
| C | Mon, Thu | Wed | Sat | 3rd Sat | 14:00–17:00 |
| D | Wed, Sat | Fri | Tue | 4th Sat | 07:00–10:00 |

Weekly pickups use `onHoliday: "shift"` (to the next day that is neither a holiday nor a Sunday); monthly special-waste pickups use `onHoliday: "skip"`.

Game items (`src/content/items.ts`, en + war + fil names and a one-line reason each; local rules can differ, so the reasons say "in Catbalogan's illustrative guide"): banana peel, leftover rice, dry leaves, fish bones, eggshells → **Biodegradable**; rinsed plastic bottle, aluminum can, dry cardboard, glass bottle, old newspaper → **Recyclable**; coffee sachet, styrofoam food box, used diaper, candy wrapper → **Residual**; used battery, broken fluorescent tube, expired medicine, old phone charger → **Special waste**.

## Domain functions (test-first in `src/domain/`)

All dates are Manila local time (UTC+8, no daylight saving), computed with UTC arithmetic so tests pass in any machine time zone.

```ts
type Stream = "biodegradable" | "recyclable" | "residual" | "special";
type Rule =
  | { stream: Stream; kind: "weekly"; weekdays: number[]; start: string; end: string; onHoliday: "shift" | "skip" }
  | { stream: Stream; kind: "monthly"; nth: 1 | 2 | 3 | 4; weekday: number; start: string; end: string; onHoliday: "shift" | "skip" };
interface Route { id: "A" | "B" | "C" | "D"; rules: Rule[] }
interface Holiday { ymd: string; key: string }                 // key → i18n holiday name
interface Pickup { stream: Stream; ymd: string; start: Date; end: Date; shiftedFrom?: string; holidayKey?: string; inProgress?: boolean }
```

- `manilaParts(d: Date): { ymd: string; weekday: number; minutes: number }` and `manilaInstant(ymd: string, hhmm: string): Date`. Cases: `2026-10-06T23:30:00Z` → `2026-10-07`, Wednesday (3), 450 minutes; `2026-12-31T16:30:00Z` → `2027-01-01`; round trip `manilaInstant("2026-10-07", "05:00")` → `2026-10-06T21:00:00Z`.
- `pickupsOn(route, ymd, holidays): Pickup[]` — the day's pickups after holiday rules: includes pickups shifted in, excludes ones moved away or skipped; no duplicate stream on one day. Cases: Mon 30 Nov 2026 (holiday) on route A → no biodegradable; Tue 1 Dec 2026 → biodegradable with `shiftedFrom: "2026-11-30"`; Thu 24 Dec 2026 (holiday) → shifted past Fri 25 Dec (holiday) to Sat 26 Dec; Thu 31 Dec 2026 → past Fri 1 Jan 2027 to Sat 2 Jan 2027; a monthly pickup on a holiday with `skip` → gone.
- `nextPickups(route, now: Date, holidays, opts = { horizonDays: 21, limit: 3 }): Pickup[]` — windows whose end is after `now`, sorted by start; an open window comes first with `inProgress: true`. Cases: route A Wed 07:00 Manila → residual in progress; route A Wed 08:30 → next is Thu biodegradable; Sunday evening → Monday; property: for every route and every day of 2026–2027 at 23:59, the first result starts within 7 days.
- `countdown(now: Date, target: Date): { days; hours; minutes; seconds }` — never negative. Cases: 1 day 2 h 3 min 4 s; target in the past → all zero.
- `assignRoute(barangayName: string, routes: Route[]): Route` — FNV-1a hash of the trimmed, lower-cased name with salt 1401, modulo the route count. Cases: same name in any list order → same route; names "Barangay 1" … "Barangay 57" use all four routes.
- `parseDemoNow(search: string): Date | null` — ISO date-time from `?now=`; invalid → `null`. Cases: valid with `+08:00`; garbage; missing.
- `seedMrfs(barangays, seed = 1402): Mrf[]` with `Mrf { id; barangay; lon; lat; accepts: Stream[]; hours: string; illustrative: true }` — `max(2, round(n / 6))` MRFs, ids `MRF-01`…, each point inside its barangay (`randomPointsIn`). Cases: deterministic; 6 fixture barangays → 2 MRFs; 57 → 10.
- `nearestMrf(pt: LngLat, mrfs: Mrf[]): { mrf: Mrf; km: number } | null` — via `nearest` from `@rcene/geo`; empty list → `null`.
- `newRound(items, seed: number, size = 8): string[]` — deterministic shuffle (`createRng(seed).shuffle`), no repeats within a round.
- `answer(state: GameState, itemId: string, bin: Stream): GameState` with `GameState { round: string[]; answered: Record<string, { bin: Stream; correct: boolean }>; score: number; streak: number; bestStreak: number }` — correct: `+10 + 2 × streak` (streak before this answer, bonus capped at +20), streak + 1; wrong: +0, streak reset to 0; an item already answered is ignored. Cases: 8 correct in a row → 136; a wrong answer in the middle resets the bonus; answering the same item twice changes nothing.
- `summary(state): { score; correct; total; accuracy; bestStreak; review: string[] }` — accuracy rounded to whole percent. Case: 6 of 8 → 75.

## Data

- `useLayer("barangays")`, `useLayer("boundary")`. Works on fixtures until the real data lands; the Sample data badge shows meanwhile.
- Synthetic: routes (fixed table above, assigned per barangay by `assignRoute`), MRFs (`seedMrfs`, seed 1402), game order (seed 1403 + round). All labelled illustrative in the UI and on `/sources`. No personal names.
- Holidays (`src/content/holidays.ts`, editable config): national holidays with fixed or computable dates for 2026 and 2027: 1 Jan, Maundy Thursday and Good Friday (2026: 2–3 Apr; 2027: 25–26 Mar), Black Saturday (2026: 4 Apr; 2027: 27 Mar), 9 Apr (Day of Valor), 1 May, 12 Jun, 21 Aug, National Heroes Day (2026: 31 Aug; 2027: 30 Aug), 1 Nov, 30 Nov, 8 Dec, 24 Dec, 25 Dec, 30 Dec, 31 Dec. Eid holidays and other proclaimed days are added when proclaimed; local holidays are left for the City to confirm (record that in `NOTES.md`).
- `NOTES.md` → "Requests for the data session": an optional `mrf` point layer (`{ id, name, barangay, accepts }`) if the City ENRO shares real MRF locations; until then the app uses `seedMrfs` only.
- Store `createSyncedStore("14-basura:app")` → `{ langChosen: boolean; lastBarangay: string | null; bestScore: number }`, `version: 1`. `/` offers "Back to {lastBarangay}" when set.

## Experience

- Friendly and neighbourly, Waray first, big readable numbers. Each stream has a color, an icon and a label (colors are illustrative and never the only signal). Phone-first: the countdown is the hero of `/b/:barangay`.
- **Wow moment:** the game. Items fly into bins with a satisfying drop (Motion `drag` and `layout`), points float up, the bins react; at the end the score counts up (GSAP count-up recipe, on a separate element). The countdown digits roll each second (GSAP on the digit elements only, or plain text with reduced motion).
- Import `gsap` and `useGSAP` from `@rcene/ui/motion` (already registered); don't create a second registration file. Never let Motion and GSAP animate the same element.
- Map: barangay outlines, the selected barangay filled, MRF markers and the distance label as HTML (`Marker`, `Popup`), since the offline basemap has no glyphs. The list is always an alternative to the map.
- Use shadcn primitives from `@rcene/ui/components/<name>` (button, card, badge, input). If one is missing, use a plain element styled with the shared tokens and note it in `NOTES.md`.
- Accessibility: the game is fully playable by keyboard and by tap without dragging; bins are buttons with names; a polite live region announces each result ("Correct: banana peel goes in Biodegradable, plus 12"); the countdown announces in the live region at most once a minute (not every second); `<html lang>` follows the language; reduced motion removes shakes and flying items but keeps the feedback text.

## Golden-path demo (≤ 2 minutes)

1. Phone window `/` opens in Waray. Search a barangay, pick it → `/b/<name>`: Today card, the countdown ticking, the week strip.
2. Open `/b/<a route A barangay>?now=2026-11-29T18:00+08:00` (DEMO.md names the barangay): the "Demo date" chip shows; the next biodegradable pickup is **Tue 1 Dec**, "Moved from Mon 30 Nov: Bonifacio Day".
3. Scroll to the map: the nearest illustrative MRF, "1.4 km straight-line", clearly marked illustrative.
4. `/game`: drag banana peel → Biodegradable (+10), coffee sachet → Recyclable (wrong: "Sachets are residual: layered plastic can't be recycled here"), then use the keyboard (select, press 3) for the next item.
5. Finish the round → score counts up, items to review. Switch to English to show all three languages. `/sources`.

## Definition of done

- [ ] R14.1–R14.5 meet their acceptance criteria
- [ ] Domain tests pass: `npm run test`
- [ ] `npm run typecheck` and `npm run build` pass
- [ ] `npm run smoke` passes (offline, no console errors, axe clean, screenshots at 390 and 1280)
- [ ] Every string comes from `src/i18n/strings.ts` (en + war + fil drafts); AI-drafted Waray/Filipino strings listed in `NOTES.md` under "Translations to review"
- [ ] `/sources` lists every dataset used; disclaimer footer on every view
- [ ] `STATUS.md`, `AI-LOG.md` (one row per commit) and `DEMO.md` are current

## Out of scope

Push notifications or SMS reminders (no server); the real City ENRO schedule or MRF list; violation reporting (a separate P9 module); truck tracking; leaderboards across devices; offline install (no PWA extra in this app).

## Stretch (only after the definition of done is met)

- "Add to calendar": download an `.ics` file of the next 4 weeks of pickups, generated locally (`downloadText(name, text, "text/calendar;charset=utf-8")` from `@rcene/ui`).
- A "special waste" explainer card: what counts and why it stays separate.
- Timed mode for the game (60 seconds), with the best time kept per device.

## Platform hooks

Export `routes` (already), plus `SchedulePanel({ barangay, now })`, `NextPickupCountdown`, `MrfMap` and `SegregationGame`, with the domain functions and content tables free of app-specific globals. P9 Luntian Catbalogan mounts `/b/:barangay` as its "waste schedule" step and `/game` as its "play" step, and can replace `src/content/routes.ts` and `seedMrfs` with real City ENRO data without changing the components.
