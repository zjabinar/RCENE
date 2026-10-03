# 01 · Ligtas Ba Ako?

| | |
|---|---|
| **App** | `apps/01-ligtas` · dev port 5101 · preview 6101 |
| **Batch** | 1 |
| **Proposal** | `docs/proposal.md` (#1 in the monorepo's `docs/PROPOSALS.md`) · this is **Core 1 of `docs/PRD.md`** (Andam Catbalogan) |
| **Reused by platforms** | P1 Andam Catbalogan (resident view `/`), P6 (hazard check of a business lot), P8 (site hazard badge) |
| **Data** | boundary, barangays, all five `hazard-*` layers, facilities · 🟢 open + 🟡 CDRRMO risk maps (permission) |
| **AI in the app** | none |
| **Skills to use** | `maplibre-gis`, `gsap-motion` (polish), Design plugin `ux-copy` for the answer wording |

> Tap any place in Catbalogan and get a truthful answer: which mapped hazards apply there, the nearest open evacuation center, and what to do now — in Waray, Filipino or English. It never says "safe".

## Problem

Hazard knowledge exists as CDRRMO shapefiles and printed maps, so residents can't ask "is my street in a storm-surge zone?". A production lookup the builder audited answered *safe* for every coordinate on Earth because the submitted coordinates were never applied. A trustworthy lookup must distinguish **in a mapped risk zone**, **not in a mapped zone** and **outside the data**. (PRD §2, problems 1–2. In public material, describe the audited failure generally — never name the system.)

## Users and routes

| Role | Route | Device in the demo | Needs |
|---|---|---|---|
| Resident | `/` | phone-width window (design at 390 px) | "Am I in danger here? Where do I go?" |
| Resident | `/b/:barangay` | same | the same answer for a barangay picked from a list (centroid point) |
| Anyone | `/sources` | — | attribution and disclaimer |

Use `AppShell width="phone"` for `/` and `/b/:barangay`.

## MVP requirements

Build in this order. R1.1 alone is a complete entry.

| ID | Requirement | Acceptance criteria (testable) |
|---|---|---|
| R1.1 | Tap a point (or pick a barangay from a searchable list) to see the status of **every** hazard at that point | Each hazard shows exactly one of: **In a mapped risk zone — {level}**, **Not in a mapped risk zone**, **Outside data coverage** (outside the city boundary). Uses `lookupHazards` from `@rcene/geo` and `HazardStatusList` from `@rcene/ui`. The word "safe" (or ligtas/luwas) never appears as an answer. Missing hazard layers are listed as missing, not answered. Answer renders < 1 s after a tap. |
| R1.2 | Show the nearest eligible evacuation center | Candidates are facilities with `kind === "school"` (PRD §8.2 Plan B — labelled **Candidate — not verified by CDRRMO**). Eligible = open and below capacity (no scenario in this app). Straight-line distance, labelled "straight-line". Seeded illustrative capacity per candidate. Shows top 3 with distance. |
| R1.3 | "What to do now" checklist for each hazard present at the point | Content per hazard × language in `src/content/checklists.ts` (en + war + fil drafts); shown only for hazards with `inZone`. |
| R1.4 | Language toggle EN / Waray / Filipino | Persists across reloads (`useLang`). No hard-coded UI text anywhere (grep for JSX text literals). |
| R1.5 | `/sources` page and disclaimer footer on every view | Uses `SourcesPage` and `AppShell` (footer is automatic). |

## Domain functions (test-first in `src/domain/`)

- `summarize(status: Partial<Record<Hazard, HazardStatus>>): { worst: Level | null; inZone: Hazard[]; notInZone: Hazard[]; outside: boolean }` — cases: all notInZone → worst null; mixed levels → the most severe; all outsideCoverage → `outside: true`.
- `candidateCenters(facilities, rng): Center[]` — schools → `{ id, name, lon, lat, capacity, status: "candidate", source: "OSM" }` with seeded capacity in [150, 600]; deterministic for a seed.
- `nearestEligible(pt, centers, live, limit = 3)` — filters `open && occupancy < capacity`, sorts by straight-line km (`nearest` from `@rcene/geo`); cases: closed center skipped, full center skipped, ties stable.
- Shape `Center` exactly as PRD §7 (`id, name, barangay, lon, lat, capacity, status: "official" | "candidate", source: "CDRRMO" | "OSM"`) so P1 can lift it unchanged.

## Data

- `useZones()` (all five hazards), `useLayer("boundary")`, `useLayer("barangays")`, `useLayer("facilities")`.
- Synthetic: candidate capacities only (seed 101). Occupancy starts at 0, all open.
- Store `createSyncedStore("01-ligtas:app")`: `{ selected: LngLat | null; selectedBarangay: string | null }`. Centers' live state is not needed here (P1 adds it).
- Works on fixtures until the real data lands; the "Sample data" badge shows meanwhile.

## Experience

- Phone-first card under (or over, as a bottom sheet) a full-height map. Calm neutral palette; level colors appear only on the badges and zones.
- **Wow moment:** tap → the map flies to the point (`useFlyTo`) and the hazard chips stagger in (already built into `HazardStatusList`); the "worst level" summary counts up/pulses once. Respect reduced motion.
- Barangay picker: searchable list (Command-style input or simple filter) — the map is never the only way in.
- Zones layer toggle: show one hazard's zones at a time (`ZoneLayer`, `Legend`).
- Accessibility: keyboard-only path (pick barangay → read answer), color + icon + label, live region announcing the new answer.

## Golden-path demo (≤ 2 minutes)

1. `/` on a phone-width window. Tap a coastal point → storm surge **In a mapped risk zone — High**, flood moderate, landslide **Not in a mapped risk zone**; nearest candidate center with "1.2 km straight-line".
2. Switch to Waray — the whole card changes language.
3. Tap a point out at sea / outside the city → every hazard says **Outside data coverage** ("we don't pretend to know").
4. Pick an upland barangay from the list → landslide high, checklist for landslide appears.
5. Open `/sources`: CDRRMO risk maps used with permission, OSM, HDX.

## Definition of done

- [ ] R1.1–R1.5 meet their acceptance criteria
- [ ] Domain tests pass: `npm run test`
- [ ] `npm run typecheck` and `npm run build` pass
- [ ] `npm run smoke` passes (offline, no console errors, axe clean, screenshots at 390 and 1280)
- [ ] Every string comes from `src/i18n/strings.ts` (en + war + fil drafts); AI-drafted Waray/Filipino strings listed in `NOTES.md` under "Translations to review"
- [ ] `/sources` lists every dataset used; disclaimer footer on every view
- [ ] `STATUS.md`, `AI-LOG.md` (one row per commit) and `DEMO.md` are current

## Out of scope

Scenario raising (that's #5 / P1 console), live capacity updates (#3), routing (no road network), any "risk score", accounts.

## Stretch

- S1 "Why?" explainer under the card: which layer matched and what the level means (PRD S1).
- Share link `/?at=lon,lat` that restores the point.

## Platform hooks

Export `routes` (already), keep `HazardCard`, `BarangayPicker`, `CenterList` and the domain functions free of app-specific globals so P1 Andam can mount `/` as its resident view and add the scenario banner on top.
