# P8 · Libot Catbalogan+

| | |
|---|---|
| **App** | `apps/p08-libot` · dev port 5208 · preview 6208 |
| **Batch** | 6. Run it after batches 1 (#16) and 4 (#17) are merged into `main` |
| **Proposal** | `docs/proposal.md` (P8 in the monorepo's `docs/PROPOSALS.md`) |
| **Modules** | `#16 Libot Catbalogan` → Core 1 "heritage story map + trail" and Core 2 "hazard advisory" (`docs/modules/16-libot.md`)<br>`#17 Banig` → stretch "banig pattern maker": the 2D maker only, as a trail-end souvenir card (`docs/modules/17-banig.md`)<br>Core 3 "enterprise directory" has no module app; it is built here from this brief |
| **Roles** | Visitor → `/visitor` → phone window<br>Local enterprises → `/directory` → phone window<br>Enterprise owner → `/enterprise` → wide window |
| **Data** | `heritage` (🟡 CPDCO heritage and eco-tourism KML, with permission) · all five `hazard-*` (🟡 CDRRMO/CPDCO risk maps, with permission; 🟢 UP NOAH fallback) · boundary, barangays (🟢 OCHA/HDX) · synthetic: 16 local enterprises `ENT-001`…`ENT-016` (seed 801), business types only, no personal names, no contact details · no photos |
| **AI in the app** | none |
| **Skills to use** | `maplibre-gis` (HTML markers, trail line, zones), `gsap-motion` ("Self-drawing line", MapLibre variant), Motion `layout` (directory re-order), Design plugin `ux-copy` (advisory and listing wording) and `accessibility-review` |

> A visitor opens a heritage trail and the thread draws itself. "Check before you go" says what the official maps show at each stop, and never says "safe". In the next window, local guides and pasalubong shops re-sort by distance to that trail, and when an owner marks a shop closed today, both windows change within a second.

**Wording rule.** The proposal's phrase "safe to visit today" is not used anywhere, in any language. The advisory is titled **Check before you go**. It gives each stop the three-state hazard answer from #16's `siteBadge` (in a mapped zone with level, not in a mapped zone, outside data coverage), plus what local enterprises report for today. "Today" refers only to the listings, never to hazards.

## Problem

Catbalogan's heritage and eco-tourism points sit in a CPDCO KML file no visitor ever sees, and a visitor cannot check whether a stop lies in a mapped flood, landslide or storm-surge zone (PROPOSALS #16). The P8 proposal adds the local guides and pasalubong shops a visitor needs along the way. A trail app alone sends visitors to sites, and a directory alone lists shops. Joined, the trail decides which enterprises are near, the advisory says plainly what the maps show at each stop, and owners keep "open today" current without a server. It hits the event theme dead-centre: heritage threads (sites, banig) woven with innovation threads (hazard data, live listings).

## Roles, routes and windows

| Role | Route | Window in the demo | Needs |
|---|---|---|---|
| Visitor (`visitor`) | `/visitor`, `/visitor/site/:id`, `/visitor/trail/:id`, `/visitor/trail/custom?stops=…` | W1, 420 × 860, left | Sites on a map and in a list, story cards with hazard badges, trails with the "Check before you go" card, a share link |
| Local enterprises (`directory`) | `/directory`, `/directory/:id` | W2, 420 × 860, next to W1 | Guides, pasalubong shops, crafts shops and eateries near the open trail, with today's status |
| Enterprise owner (`enterprise`) | `/enterprise`, `/enterprise/:id` | W3, 1060 × 860, right | Pick a listing (demo); set open or closed today, hours and today's offer; see the listing as visitors see it |

The generated scaffold already has: `/` (the role launcher: `RoleLauncher` cards with **Open** and **New window**), one placeholder page per role route, the nav, and `role.<id>.title` / `role.<id>.summary` strings in three languages (`src/roles.ts`, `src/pages/`, `src/i18n/strings.ts`). Replace each placeholder with the real view; keep the routes. `AppLayout` sets the `AppShell` width from the role, so every `/visitor` view uses #16's phone layout (map about 45 vh on top, panel below). Add `/visitor/trail/<first trail id>`, `/directory/ENT-001` and `/enterprise/ENT-001` to `smokeRoutes` in `project.json`.

## Lift, then wire

A platform is built from its module apps, not from scratch.

| Module app | Becomes | Lift (copy into `src/modules/<name>/`) | Change after lifting |
|---|---|---|---|
| `#16 Libot Catbalogan` | Core 1 and Core 2 → `src/modules/libot/` | `src/domain/*` (with tests, including `copy.test.ts`), `src/content/sites.ts`, `trails.ts`, `categories.ts`, `SiteCard`, `SiteBadge`, `TrailMap`, `TrailStops`, `ShareButton` | Routes move under `/visitor` (`/` → `/visitor`, `/site/:id` → `/visitor/site/:id`, `/trail/:id` → `/visitor/trail/:id`), and share links use the new paths; `16-libot:app` becomes spine slices; strings under `libot.`; `copy.test.ts` widened to every non-test file in this app's `src/` |
| `#17 Banig` | Stretch S1 → `src/modules/banig/` | `src/domain/*` (with tests), `src/canvas/drawWeave.ts`, `src/content/presets.ts`, `PatternMaker` | 2D maker only (R17.1–R17.2), not the gallery (R17.3) or the 3D view (R17.5); `17-banig:maker` becomes `p08-libot:souvenir`; strings under `banig.` |
| none | Core 3 → `src/domain/`, `src/features/directory/` | — | Built here, test-first, from "Domain functions" below |

1. **Check each module app** in this worktree: `../16-libot/STATUS.md` and `../17-banig/STATUS.md` say `Phase: done`, and their tests pass (`npm run test` in that folder).
2. **Lift** by copying (`cp -r ../16-libot/src/domain src/modules/libot/domain`, and so on). Reading other app folders is fine; never edit them. Fix the imports, merge its strings into `src/i18n/strings.ts` under the module's prefix, and make its tests pass here.
3. **If a module app isn't done**, build only the requirements this brief lists, from its brief in `docs/modules/NN-slug.md`. Domain first, test-first, exactly as that brief specifies, so a later lift can replace it.
4. **Record every lift** in `NOTES.md` under "Lifted modules": app, its commit (`git log -1 --format=%h -- ../NN-slug`), files and what you changed.

## Spine (one store, keyed by barangay)

`createSyncedStore("p08-libot:spine", …, { version: 1 })` in `src/store.ts` (`useSpine`). P8 has no per-barangay records: its shared entities are the visitor's trail and the enterprise listings. Listings are keyed by enterprise code, because one owner writes one listing; each enterprise belongs to one barangay (`enterprise.barangay`, shown on its card).

```ts
interface ListingUpdate { openToday: "open" | "closed"; hours: { open: string; close: string } /* "HH:MM" */; offer: string | null /* offer key */; at: number }
interface Spine {
  myTrail: string[];                                    // site ids, max 12 (#16 R16.4)
  category: "all" | HeritageProps["category"];          // the visitor's chip filter
  activeTrail: { id: string; stops: string[] } | null;  // the last trail opened on /visitor (curated id or "custom")
  listings: Record<string, ListingUpdate>;              // "ENT-001" → the owner's latest update
  updatedAt: number | null;                             // from the scaffold
}
```

| Slice | Written by | When |
|---|---|---|
| `myTrail`, `category`, `activeTrail` | `/visitor` | adding, moving or removing a stop; a chip; opening a trail page sets `activeTrail` (kept after leaving it) |
| `listings[id]` | `/enterprise/:id`, only for that id | **Publish update** |
| none | `/directory` | read only |

Everything in the spine is persisted. The store saves the whole object (last write wins), each slice has one writing role, and no slice is written on a timer.

## MVP requirements

Build in this order. **R1 alone must be a finished, demoable single-feature app** (the platform degrades into #16).

| ID | Requirement | Acceptance criteria (testable) |
|---|---|---|
| R1 | Core 1: heritage story map and trails at `/visitor` (#16) | #16's R16.1, R16.3 and R16.4 behave as specified there, under `/visitor`: every heritage feature is an HTML marker button and a list item (the list is the keyboard path); category chips with counts; story cards (authored copy or the category fallback) tagged **"Draft — verify with CPDCO"**, with original SVG illustrations; 2–3 curated trails resolved by `resolveTrail`; the dashed thread draws itself in about 2.5 s, and each stop marker appears as the line reaches it; legs read "{km} km straight-line", under the label "Straight lines between stops — not a walking route. Follow roads and local guidance."; Replay / Previous stop / Next stop with the live region "Stop 2 of 5: {name}"; "Add to my trail" (max 12); Share (`navigator.share`, then clipboard, then a read-only input). A `/visitor/trail/custom?stops=…` link opened in a fresh window draws the same trail; unknown ids give "{n} stops in this link aren't in the current data". `npm run smoke -- --route /visitor --route /sources` passes. |
| R2 | Core 2: hazard badges and the "Check before you go" card | #16's R16.2 unchanged: a full badge on each story card and a compact one in the list, showing exactly one of "Mapped hazards here: Storm surge (High), Flood (Moderate)", "Not in a mapped risk zone", "Outside data coverage" or "Hazard check unavailable — no hazard layers loaded"; "Not checked (layer not available): …" on its own line; "Mapped zones come from CDRRMO risk maps. Check official advisories before you travel." under every badge. Every trail page (curated and custom) opens with a **Check before you go** card built by `trailAdvisory`. It shows the headline ("{n} of {m} stops are in a mapped risk zone", "None of the {m} stops is in a mapped risk zone", "All {m} stops are outside data coverage", or the unavailable text); one line per in-zone stop ("Stop 2 · {name}: Storm surge (High)", color + icon + text); "{k} of {m} stops are outside data coverage" when k > 0; the not-checked line; and always "Mapped zones don't show every risk. Check today's PAGASA and CDRRMO advisories before you travel." Tests: no `badge.*` or `advisory.*` string in en, war or fil contains a word from `FORBIDDEN_ANSWER_WORDS`, and no non-test file in `src/` contains "safe to visit" in any case. |
| R3 | Core 3: the local-enterprise directory at `/directory` | `seedEnterprises` gives 16 listings: 4 guides, 4 pasalubong shops, 4 crafts and banig shops, 4 eateries. Each card shows the type icon + label, the title "{type}, Sample Purok {n}", the code, the barangay, today's status chip (**Open today** / **Closed today** / **Not confirmed today**, color + icon + text), the hours, today's offer if any, and the tag "Sample listing — not a real business". With `activeTrail` set: the heading "Near your trail: {title}", only enterprises within 2 km straight-line of a stop (`nearTrail`), each with "{km} km straight-line from Stop {k}", in `directoryOrder`, plus a "Show all 16" toggle. Without it: "All local enterprises" in id order, and the hint "Open a trail in the Visitor window to see what is near it." Type chips with counts filter the list and a small map (35 vh) with numbered trail stops and enterprise markers (accessible name = title + status). `/directory/:id` shows the full card, a locator map and the nearest stop; an unknown id → `EmptyState`. Each story card on `/visitor/site/:id` gains "Local enterprises nearby": up to 3 within 2 km (`nearTrail(enterprises, [site])`), linking to `/directory/:id`. |
| R4 | The cross-role workflow: trail → directory, owner → directory and visitor | (a) Opening a trail in W1 sets `activeTrail`; in < 1 s W2's "Near your trail" list and map change, and rows re-order with Motion `layout`. (b) `/enterprise` lists the 16 listings (code, type, barangay, today's status, last update) with a filter input. `/enterprise/:id` has **Open today** / **Closed today** (radio group), opening and closing time (`<input type="time">`, seeded defaults), "Today's offer" (that type's authored offers or "No offer today"), **Publish update** (`applyListingUpdate`; `badHours` shows "Closing time must be after opening time."), a live preview of the card exactly as `/directory` renders it, and "Updated {time}". An unknown id shows the list with "Listing not found". (c) After Publish, W2 shows the new chip, hours and offer in < 1 s and re-orders; a polite live region says "{title} is now closed today" (or open). W1's trail page line "Near this trail today: {open} open, {closed} closed, {notSet} not confirmed" (`openCounts`) updates in < 1 s. (d) An update published on an earlier Manila day reads **Not confirmed today**. (e) Reloading any window restores everything; **Reset demo** clears it in every window. |
| R5 | Languages, `/sources`, disclaimer | EN / Waray / Filipino via `useLang`; a switch in one window follows in all. Site copy falls back to English with the "English only" tag (#16); offers are authored in all three languages; P8's own keys use `p8.`, `advisory.`, `directory.` and `enterprise.`; no JSX text literals. `/sources`: `SourcesPage` with heritage (CPDCO, with permission), the risk maps (CDRRMO/CPDCO, with permission; UP NOAH where used) and the boundaries (OCHA/HDX); an `extra` entry (tier `synthetic`): "Sample local enterprises: seed 801, codes ENT-001…ENT-016, business types only, no names or contact details; hours and offers are illustrative"; and a "Content in this app" section: site texts and offers are drafts written for this prototype, to verify with CPDCO; illustrations are original SVG; no photos. `app.disclaimer` is overridden in all three languages: "Prototype for the RSCENE 2026 challenge. Site texts are drafts and enterprise listings are samples. Check official advisories before you travel." |

## Domain functions (test-first in `src/domain/`)

Tests use small inline features (a square boundary, two barangays, three sites), not the data files.

```ts
type BusinessType = "guide" | "pasalubong" | "crafts" | "eatery";
interface Enterprise { id: string; type: BusinessType; purok: number; barangay: string; lon: number; lat: number; anchorSiteId: string | null; hours: { open: string; close: string } }
type OpenToday = "open" | "closed" | "notSet";
interface ListingView { openToday: OpenToday; hours: { open: string; close: string }; offer: string | null; updatedAt: number | null }
interface NearRow { enterprise: Enterprise; km: number; stop: number /* 1-based */ }
```

- `seedEnterprises(sites: HeritageFeature[], barangays: BarangayCollection, boundary: BoundaryCollection, seed = 801): Enterprise[]`: 16 records with ids `ENT-001`…`ENT-016`; types cycle guide, pasalubong, crafts, eatery; anchors cycle through the sites sorted by id. Each point is a seeded offset of 0.2–1.5 km on a seeded bearing from its anchor, accepted when `barangayAt` finds a barangay (up to 30 tries), else `randomPointsIn` the anchor's barangay. With no sites, use `randomPointsIn(boundary, 16, rng)` and `anchorSiteId: null`. `purok` is `rng.int(1, 7)`; `hours` comes from the type's default in `src/content/enterprises.ts`. Cases: deterministic per seed; 4 per type; every point inside a barangay; `barangay` equals the `barangayAt` name; empty sites → 16 points inside the boundary; the record has exactly the `Enterprise` keys (no name, owner or contact field).
- `OFFERS: Record<BusinessType, string[]>` (offer keys). Cases: 2–3 per type; every key has en, war and fil text; no offer text in any language contains "₱" or "PHP" (no prices).
- `manilaDay(ms: number): string`: `YYYY-MM-DD` in UTC+8, independent of the machine time zone. Cases: `2026-10-06T16:30Z` → "2026-10-07"; `2026-10-06T15:59Z` → "2026-10-06".
- `listingView(enterprise: Enterprise, update: ListingUpdate | undefined, now: number): ListingView`. Cases: no update → `notSet` with the seeded hours; same Manila day, closed → `closed`; yesterday's "open" → `notSet`.
- `applyListingUpdate(listings: Record<string, ListingUpdate>, enterprise: Enterprise, patch: Omit<ListingUpdate, "at">, at: number): { ok: true; listings: Record<string, ListingUpdate> } | { ok: false; reason: "badHours" | "unknownOffer" }`: 24-hour `HH:MM` with open before close; offer `null` or a key of `OFFERS[enterprise.type]`; replaces only that id's entry; does not mutate. Cases: 09:00–17:00 ok; 17:00–09:00 and "9:00" → badHours; an eatery offer on a guide → unknownOffer; input unchanged.
- `nearTrail(enterprises: Enterprise[], stops: HeritageFeature[], maxKm = 2): NearRow[]`: straight-line km to the nearest stop (`nearest` from `@rcene/geo`), within `maxKm`, sorted by km, then id. Cases: an enterprise nearer stop 2 gets `stop: 2`; one beyond `maxKm` is dropped; equal km → by id; no stops → `[]`.
- `directoryOrder(rows: NearRow[], views: Record<string, ListingView>): NearRow[]`: open, then notSet, then closed; within each group by km, then id. Cases: a closed nearer one goes after an open farther one; ties.
- `openCounts(rows: NearRow[], views: Record<string, ListingView>): { open: number; closed: number; notSet: number }`. Cases: the counts sum to `rows.length`; empty → zeros.
- `trailAdvisory(stops: HeritageFeature[], badgeById: Record<string, SiteBadge>): Advisory`, with `Advisory = { kind: "inZone" | "noneInZone" | "allOutside" | "unavailable"; total: number; inZone: { stop: number; siteId: string; items: { hazard: Hazard; level: Level }[] }[]; outside: number[]; notChecked: Hazard[] }`. `unavailable` when every stop's badge is `unknown` or absent; `allOutside` when every stop is `outside`; `inZone` when at least one is `hazards`; otherwise `noneInZone`. Stop numbers are 1-based; `items` keep `siteBadge`'s order (most severe first); `notChecked` is the union of the badges' `notChecked`, in `HAZARDS` order. Cases: all `none` → noneInZone; stop 2 with storm surge high and flood moderate → inZone with that order; one outside, others none → noneInZone with `outside: [n]`; all outside → allOutside; no hazard layers → unavailable; missing hazards carried.

Lifted functions keep their own tests in `src/modules/<name>/`: #16 (`siteBadge`, `resolveTrail`, `autoTrail`, `trailLine`, `legDistances`, `kmAtStop`, `encodeStops`, `decodeStops`, `trailHazardSummary`) and, for S1, #17 (`generate`, `strandAt`, `cellRect`, `parseSpec`, `encodeSpec`, `decodeSpec`, `contrastRatio`, `surpriseSpec`).

## Data

- Real layers via `@rcene/data`: `useLayer("heritage")`, `useLayer("boundary")`, `useLayer("barangays")`, `useZones()` (all five); fixtures (`H-001`…`H-005`, all "Sample …") until the data session lands. `AppLayout` passes `layers={["boundary", "barangays", "heritage", "hazard-flood", "hazard-landslide", "hazard-stormSurge", "hazard-groundShaking", "hazard-liquefaction"]}`. Badges, advisories and `nearTrail` rows are memoised per data load.
- If #16's `sites.ts` and `trails.ts` were written against fixture ids and `data/files/heritage.geojson` now exists, rekey them to the real ids (at most 10 sites with authored copy, trails of 3–6 nearby stops) and note it in `NOTES.md`.
- Synthetic data: `seedEnterprises(sites, barangays, boundary, 801)` on load, never persisted, so ids are stable for a given heritage layer (after the layer changes, press **Reset demo**). `src/content/enterprises.ts` holds type labels, icons, default hours (guide 07:00–17:00, pasalubong 08:00–20:00, crafts 08:00–18:00, eatery 06:00–21:00) and `OFFERS` (for example "Guided heritage walk at 9:00", "Banig mats in stock", "Weaving demonstration today"). Codes, never personal names: no owner, phone, e-mail or social-media fields, no prices.
- Store keys: `p08-libot:spine` (above) and, for S1 only, `p08-libot:souvenir` → `{ spec: PatternSpec; saved: PatternSpec[]; surpriseCount: number }`.
- `NOTES.md` → "Requests for the data session": carry over #16's request for the CPDCO heritage and scenic overlay zones only if it is still open.

## Experience

- The **signature**: three windows side by side. The thread draws itself in W1, W2's directory re-sorts around that trail, and one click in the owner's window W3 changes both phone windows. Recipes: `gsap-motion` "Self-drawing line" (MapLibre variant: tween a progress value, `turf.lineSliceAlong`, `setData`, no React state per frame); Motion `layout` on directory rows; a 0.4 s GSAP pulse on the inner status chip when a listing changes (one element, one library).
- Warm, woven tone: the thin interlaced-thread divider from #16. The trail thread color is distinct from the level colors, and level colors appear only on badges and zones. Status chips use icons (door open, door closed, question mark) and text, and "Open today" is never shown as a hazard color.
- The **wow moment**: the owner presses **Closed today**, and on the visitor's directory the guide's chip flips and its card slides below the open ones, while the trail page's "Near this trail today" count changes.
- Accessibility: every map has a list equivalent; markers are buttons with accessible names; stops are an `<ol>`; the advisory is a `<section>` with a heading; polite live regions announce stop changes and share confirmations (W1) and listing changes (W2); the radio group and time inputs have visible labels; touch targets are ≥ 44 px. Reduced motion means the line appears at once, the camera jumps, and there is no re-order animation or pulse. WCAG AA at 390 and 1060 px.

## Golden-path demo (≤ 3 minutes)

Window layout on one 1920 × 1080 screen: press **Reset demo**, then on `/` use **New window** for every role. W1 Visitor, 420 × 860, at x 0. W2 Local enterprises, 420 × 860, at x 430. W3 Enterprise owner, 1060 × 860, at x 860. `DEMO.md` names the coastal site, the trail and the two listings used, with the expected counts.

1. **0:00 · Visitor, W1:** sites on the map and in the list. Tap "Eco-tourism" and open the coastal site: its story card, "Draft — verify with CPDCO", **Mapped hazards here: Storm surge (High)**, and "Local enterprises nearby" with three cards in km straight-line.
2. **0:30 · Visitor, W1:** open the curated trail. The thread draws itself stop by stop, and **Check before you go** reads, for example, "2 of 4 stops are in a mapped risk zone", one line per stop, then "Check today's PAGASA and CDRRMO advisories before you travel." Say: it never calls a place safe; it says what the official maps show.
3. **1:05 · Local enterprises, W2:** it has already changed to "Near your trail: {title}", sorted by distance ("0.4 km straight-line from Stop 1"). Tap "Guides".
4. **1:30 · Enterprise owner, W3:** open the guide at the top of W2, choose **Closed today**, and Publish. Within a second W2's chip reads **Closed today**, the card drops below the open ones, and the live region announces it; W1's line "Near this trail today" shows one more closed.
5. **2:00 · Enterprise owner, W3:** open the crafts shop near Stop 3, choose **Open today**, 09:00–17:00, offer "Weaving demonstration today", and Publish. In W2, clear the "Guides" chip: the crafts shop is near the top with its offer.
6. **2:30 · Visitor, W1:** switch to Waray; all three windows follow. Open `/sources`: CPDCO and CDRRMO data used with permission, OCHA/HDX boundaries, sample enterprises (seed 801).

## Definition of done

- [ ] All MVP requirements meet their acceptance criteria
- [ ] Domain and lifted-module tests pass: `npm run test` (including the copy tests: no "safe" wording)
- [ ] `npm run typecheck` and `npm run build` pass
- [ ] `npm run smoke` passes for `/`, every role route and `/sources` (offline, no console errors, axe clean, screenshots at 390 and 1280)
- [ ] R4 checked in a browser with W1, W2 and W3 as three pages of one Playwright context (shared `localStorage`): every cross-window change in < 1 s
- [ ] Every string comes from `src/i18n/strings.ts` (en + war + fil drafts); AI-drafted strings listed in `NOTES.md` under "Translations to review"
- [ ] `/sources` lists every dataset used; disclaimer footer on every view
- [ ] `NOTES.md` "Lifted modules" lists every lift; `STATUS.md`, `AI-LOG.md` and `DEMO.md` are current

## If time runs out

Cut in this order: stretch items; offers and hours in the owner console (keep Open / Closed today); "Local enterprises nearby" on story cards; the map on `/directory` (the list stays); "Near your trail" sorting (the directory lists all 16 by id); the directory and owner roles (R3–R4). The last fallback is **#16 Libot Catbalogan**: R1 + R2, with the unbuilt roles removed from `src/roles.ts`, `project.json` `roles` and `smokeRoutes`, so no placeholder page is shown.

## Out of scope

The phrase "safe to visit" or any "safe" wording, in any language; live weather, PAGASA or CDRRMO feeds (the demo is offline); bookings, payments, prices, reviews or ratings; real businesses, owner names, phone numbers or social-media links; owner accounts or verification; photos (CPDCO photos are permission-tier; enterprise photos need consent); road routing or walking times; the banig gallery (#17 R17.3) and the 3D weave (#17 R17.5); the CPDCO overlay zones.

## Stretch (only after the definition of done is met)

- S1 Banig souvenir card (the proposal's stretch): a "Make a banig souvenir card" card at the end of every trail page opens `/visitor/souvenir?trail=<id>` with #17's `PatternMaker` (R17.1–R17.2 as specified there, "Surprise me" from `createRng(1701)`). "Download card" exports a 1080 × 1350 PNG (#17's S2): the pattern drawn with the same `drawWeave`, the trail title, its stop names, the date and "Libot Catbalogan+". The card's link carries `p=<encodeSpec(spec)>`.
- S2 On the souvenir page, "Banig and crafts near your trail": the crafts shops from `nearTrail` that are open today.
- S3 Printable trail sheet (#16's S3) with the Check before you go card and the nearby enterprises.
- S4 "Why this badge?" under each story card (#16's S2).
