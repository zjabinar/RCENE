# 16 · Libot Catbalogan

| | |
|---|---|
| **App** | `apps/16-libot` · dev port 5116 · preview 6116 |
| **Batch** | 1 |
| **Proposal** | `docs/proposal.md` (#16 in the monorepo's `docs/PROPOSALS.md`) · shortlist rank 2 (answers the event theme directly) |
| **Reused by platforms** | P8 Libot Catbalogan+ (core 1 "heritage story map + trail" and core 2 "hazard advisory", see "Platform hooks") |
| **Data** | `heritage` (CPDCO eco-tourism and heritage KML points), all five `hazard-*`, `boundary`, `barangays` · 🟡 CPDCO KML and CDRRMO risk maps (permission) + 🟢 HDX boundaries · no synthetic data · authored site copy (draft) |
| **AI in the app** | none |
| **Skills to use** | `maplibre-gis` (HTML markers, line layer, offline basemap), `gsap-motion` ("Self-drawing line", MapLibre variant), Design plugin `ux-copy` (badge wording) and `accessibility-review` |

> *The Living Tapestry*, on a map: every heritage and nature site in Catbalogan is a thread, a trail weaves them into one story that draws itself stop by stop, and the hazard layer is the innovation thread that tells a visitor honestly what the maps show at each stop.

## Problem

Tourism in Catbalogan is promoted by hand or through foreign platforms, and the CPDCO's eco-tourism and heritage points sit in a KML file no visitor ever sees. A visitor also cannot check whether a destination lies in a mapped flood, landslide or storm-surge zone (PROPOSALS #16). This app turns that KML into story cards and short trails, and gives every site the same three-state hazard answer as #1 Ligtas: **"Mapped hazards here: …"**, **"Not in a mapped risk zone"** or **"Outside data coverage"**. It never tells a visitor a site is "safe to visit".

## Users and routes

| Role | Route | Device in the demo | Needs |
|---|---|---|---|
| Visitor | `/` | phone-width window (design at 390 px), also shown at 1280 | "What is there to see, and where?" Map of all sites, filterable list, trail picker |
| Visitor | `/site/:id` | same | One site's story card and hazard badge (deep link) |
| Visitor | `/trail/:id` | phone-width window | A curated trail: self-drawing line, numbered stops, leg distances (straight-line) |
| Visitor | `/trail/custom?stops=id1,id2,…` | a fresh window | A trail built with "Add to my trail" and shared as a link |
| Anyone | `/sources` | — | Attribution, content notes and disclaimer |

Use `AppShell width="full"` for the map routes and `width="wide"` for `/sources`. Phone layout: map on top (about 45 vh), panel below. At ≥ 1024 px: map left, panel right (like the template `Home`). Set `AppShell layers` to every layer listed in the header so the "Sample data" badge is correct.

## MVP requirements

Build in this order. R16.1 alone is a complete entry.

| ID | Requirement | Acceptance criteria (testable) |
|---|---|---|
| R16.1 | Site map and story cards | Every feature of `useLayer("heritage")` appears as an HTML `Marker` (a button with a category icon; accessible name = site name + category) **and** as an item in a list next to the map; the list is the keyboard path. Category chips (heritage, eco-tourism, scenic, other) with counts filter both map and list. Choosing a site navigates to `/site/:id`, flies to it (`useFlyTo`) and opens its story card; focus moves to the card heading. The card uses authored copy from `src/content/sites.ts` when the id has it, otherwise the generic fallback card for its category (name, category, the KML `description` if any, the category's "visit respectfully" tips). Both kinds show a **"Draft — verify with CPDCO"** tag. Barangay line = `properties.barangay`, else the `barangayAt` name, else omitted. Illustration = an original inline SVG per category; no photos. Unknown id → `EmptyState` with a link home. Missing `heritage` layer → `DataMissing` via `LoadGate`. |
| R16.2 | Hazard-aware badge per site | `siteBadge(lookupHazards(pt, zones, boundary), missing)` drives a full badge on the card and a compact one in the list. It shows exactly one of: **"Mapped hazards here: Storm surge (High), Flood (Moderate)"** (most severe first), **"Not in a mapped risk zone"**, **"Outside data coverage"**, or **"Hazard check unavailable — no hazard layers loaded"**. Hazards whose layer is missing appear on a separate line, "Not checked (layer not available): …", and are never folded into "Not in a mapped risk zone". Color + icon + text, never color alone. Under every badge: "Mapped zones come from CDRRMO risk maps. Check official advisories before you travel." A test asserts no `badge.*` string (en, war, fil) contains any of `FORBIDDEN_ANSWER_WORDS` from `@rcene/i18n`, and a second test reads every non-test file in `src/` and asserts the phrase "safe to visit" appears nowhere. |
| R16.3 | Curated trails with a self-drawing line | 2–3 trails authored in `src/content/trails.ts` as ordered lists of heritage ids, resolved with `resolveTrail` (hidden when it returns `null`). `/trail/:id` fits the map to the trail, shows numbered stop markers (HTML markers 1…n), an ordered stop list with leg distances "{km} km straight-line" and the total, and a dashed line of **straight segments between stops**, labelled "Straight lines between stops — not a walking route. Follow roads and local guidance." On open the line draws itself from the first to the last stop in about 2.5 s (GSAP tween + `turf.lineSliceAlong`, writing to the GeoJSON source with `setData`; no React state per frame); each stop marker appears when the line reaches it. "Replay", "Previous stop" and "Next stop" buttons fly to and highlight a stop, and a live region announces "Stop 2 of 5: {name}". Trail summary: "{n} of {m} stops are in a mapped risk zone". Reduced motion: the full line appears at once and the camera jumps instead of flying. |
| R16.4 | Shareable trail link | "Add to my trail" on each story card (max 12 stops; move up/down; remove), persisted in `16-libot:app`; "My trail" opens `/trail/custom?stops=…`. "Share" on any trail page uses `navigator.share` when available, else copies the absolute URL with `navigator.clipboard.writeText`, else shows it in a read-only, pre-selected input; confirmation in an `aria-live` region. Opening a `/trail/custom?stops=…` link in a fresh window (empty storage) shows the same stops in the same order and draws the line; unknown or duplicate ids are dropped with the notice "{n} stops in this link aren't in the current data". Fewer than 2 valid stops → `EmptyState` explaining why. |
| R16.5 | Language toggle, `/sources`, disclaimer | EN / Waray / Filipino via `useLang`, persisted. All UI text from `src/i18n/strings.ts`. Site copy carries en + war + fil drafts; a missing language falls back to English with a small "English only" tag. `/sources` uses `SourcesPage` (heritage KML: CPDCO, used with permission; risk maps: CDRRMO/CPDCO, used with permission; boundaries: OCHA/HDX) plus a "Content in this app" note (as `children`): site texts are drafts written for this prototype, to be verified with CPDCO; illustrations are original SVG. Disclaimer footer on every view (automatic in `AppShell`). |

## Domain functions (test-first in `src/domain/`)

Tests use small inline features (two or three points, a square boundary, one zone), not the data files.

- `siteBadge(status: Partial<Record<Hazard, HazardStatus>>, missing: Hazard[]): SiteBadge` with `SiteBadge = { kind: "hazards"; items: { hazard: Hazard; level: Level }[]; notChecked: Hazard[] } | { kind: "none"; notChecked: Hazard[] } | { kind: "outside"; notChecked: Hazard[] } | { kind: "unknown" }`. Cases: every hazard `notInZone` → `none`; mixed levels → `hazards` sorted by level (most severe first), ties in `HAZARDS` order; any `outsideCoverage` → `outside`; empty status → `unknown`; `missing` is carried into `notChecked` unchanged.
- `resolveTrail(trail: TrailDef, sites: HeritageFeature[]): ResolvedTrail | null` where `TrailDef = { id; titleKey; stops: string[]; fallback: { category?: HeritageProps["category"]; maxStops: number } }` and `ResolvedTrail = { id; stops: HeritageFeature[]; source: "authored" | "auto" }`. Cases: all ids resolve → authored order kept; unknown ids dropped; fewer than 2 resolve → `autoTrail(sites, trail.fallback)` with `source: "auto"`; still fewer than 2 → `null`.
- `autoTrail(sites, { category?, maxStops, startId? }): HeritageFeature[]` — nearest-neighbour order (straight-line, `@rcene/geo` `nearest`) starting at `startId` or the lowest id. Cases: category filter applied; `maxStops` respected; ties broken by id; deterministic; empty input → `[]`.
- `trailLine(stops): Feature<LineString> | null`, `legDistances(stops): number[]` (km), `kmAtStop(legs, index): number`. Cases: one stop → `null` line and `[]` legs; two points 0.01° of latitude apart → one leg of 1.11 km (± 0.01); `kmAtStop(legs, 0) === 0`; `kmAtStop(legs, last)` equals the sum of legs.
- `encodeStops(ids: string[]): string` and `decodeStops(param: string | null, known: Set<string>): { ids: string[]; dropped: number }`. Cases: round trip; unknown ids dropped and counted; duplicates removed (first kept, counted as dropped); more than 12 truncated; ids containing commas or spaces survive (URL-encode each id); `null` or empty → `{ ids: [], dropped: 0 }`.
- `trailHazardSummary(stops, badgeById: Record<string, SiteBadge>): { inZone: number; total: number }`. Cases: counts only `kind: "hazards"`; `unknown` and `outside` not counted as in-zone.
- Copy rules test (see R16.2) lives in `src/domain/copy.test.ts`.

## Data

- `useLayer("heritage")`, `useZones()` (all five hazards), `useLayer("boundary")`, `useLayer("barangays")`. Badges are computed once per data load (memoised by site id), not per render.
- **Real or fixture ids.** First thing in the session: check whether `data/files/heritage.geojson` exists. If it does, author `sites.ts` and `trails.ts` against its ids (choose 2–3 trails of 3–6 nearby stops; write copy for at most 10 sites, all on trails). If it doesn't, author against the fixtures `H-001`…`H-005` (all named "Sample …") and add to `NOTES.md`: "Rekey `src/content/sites.ts` and `trails.ts` when the real heritage layer lands." The generic fallback card and `autoTrail` keep the app correct with any ids.
- **Copy rules** (`src/content/sites.ts`, `SiteCopy = { id; intro: L10n; notice: L10n[]; respect: L10n[]; status: "draft" }`, `L10n = { en: string; war?: string; fil?: string }`): write only from the site's name, category and KML `description`. No invented dates, founders, legends, opening hours, fees or distances. "What to notice" bullets are observational; "Visit respectfully" bullets are generic to the category. Category fallback copy lives in `src/content/categories.ts`.
- Synthetic data: none. No personal data. Nothing from `D:\monica`. The CPDCO heritage and scenic **overlay zones** are not in `LAYER_FILES`; don't add them (request them in `NOTES.md` under "Requests for the data session", for P8).
- Store `createSyncedStore("16-libot:app")`, version 1: `{ myTrail: string[]; category: "all" | HeritageProps["category"] }`. The selected site and active trail are route state, not persisted.

## Experience

- **Tone:** warm and editorial; a thin interlaced-thread motif (inline SVG) as section dividers. The trail line uses a warm "thread" color that is distinct from the hazard level colors; level colors appear only on badges and on zones.
- **Wow moment:** open a trail → the map fits the trail, then the dashed thread draws itself from stop to stop while each numbered marker pops in as the line reaches it (GSAP timeline; animate an inner element of the marker, never the `Marker` wrapper). Recipe: `gsap-motion` → "Self-drawing line" (tween a progress value, `turf.lineSliceAlong`, `setData` on the source obtained via `useMap()` from `react-map-gl/maplibre`). At most one React state update per stop reached.
- A "Show mapped zones" switch (off by default, one hazard at a time, `ZoneLayer` + `Legend`) keeps the map calm until a visitor asks.
- Labels: the offline basemap has no glyphs, so site names and stop numbers are HTML markers or list items, never symbol text layers.
- **Accessibility:** every map action has a list equivalent; stops are an ordered list (`<ol>`); markers are buttons with accessible names; badges pair color, icon and text; live regions announce stop changes and share confirmations; reduced motion respected; WCAG AA contrast at 390 and 1280 px.

## Golden-path demo (≤ 2 minutes)

1. `/` in a phone-width window: all sites on the map and in the list; tap the "Eco-tourism" chip.
2. Tap a coastal site → the map flies there; the card shows its story, "Draft — verify with CPDCO", and **"Mapped hazards here: Storm surge (High)"**.
3. Open an inland site → **"Not in a mapped risk zone"**. Say: "It never promises a site is free of risk; it says what the official maps show."
4. Pick a curated trail → the thread draws itself; press "Next stop" twice; point at "1.2 km straight-line" and the "not a walking route" label.
5. Add three sites to "My trail", press "Share", paste the link into a new window → the same trail draws itself there.
6. Switch to Waray; open `/sources` (CPDCO and CDRRMO data used with permission).

## Definition of done

- [ ] R16.1–R16.5 meet their acceptance criteria
- [ ] Domain tests pass: `npm run test`
- [ ] `npm run typecheck` and `npm run build` pass
- [ ] `npm run smoke` passes (offline, no console errors, axe clean, screenshots at 390 and 1280)
- [ ] Every string comes from `src/i18n/strings.ts` (en + war + fil drafts); AI-drafted Waray/Filipino strings listed in `NOTES.md` under "Translations to review"
- [ ] `/sources` lists every dataset used; disclaimer footer on every view
- [ ] `STATUS.md`, `AI-LOG.md` (one row per commit) and `DEMO.md` are current

## Out of scope

Road or footpath routing and walking times (there is no road network), opening hours, fees and bookings, photos (CPDCO photos are permission-tier; P8), the local-enterprise directory (P8), the CPDCO overlay zones, live weather or a "today" advisory, reviews, accounts.

## Stretch (only after the definition of done is met)

- S1 Scroll story on `/trail/:id`: sticky map (CSS `position: sticky`) plus one chapter per stop; ScrollTrigger `onToggle` flies to the stop and extends the line to `kmAtStop`. Smooth scroll with `SmoothScroll` from `@rcene/ui/motion` on this page only; add `data-lenis-prevent` to the map container.
- S2 "Why this badge?" under the card: which layer matched and what the level means.
- S3 Printable trail sheet (print CSS: stop list, distances, badges, disclaimer).

## Platform hooks

Export `routes` (already). Keep `SiteCard`, `SiteBadge` (the component), `TrailMap`, `TrailStops`, `ShareButton` and all domain functions free of app-specific globals: they take sites, badges and trails as props. P8 mounts `/` and `/trail/:id`, adds an enterprise directory beside the site cards and the #17 banig souvenir as a trail-end card. P8's travel advisory must reuse `siteBadge` and its wording; the platform never turns it into a "safe to visit" claim.
