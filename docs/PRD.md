# Andam Catbalogan — Product Requirements

| | |
|---|---|
| **Version** | 0.1 — draft for review |
| **Date** | 2026-10-02 |
| **Competition** | RSCENE 2026 AI Vibe Coding Challenge (Open Category) — October 7, 2026, Tandaya Hall, Catbalogan City |
| **Builder** | Zaldy A. Jabiñar (solo) |
| **Origin** | Platform P1 in `docs/PROPOSALS.md` |
| **Codebase design** | `docs/superpowers/specs/2026-09-03-rscene-competition-codebase-design.md` |

> ***Andam*** — ready. One map that tells a resident whether a place is in danger, where to go, and whether there is still room there. It updates live the moment the CDRRMO raises a warning.

---

## 1. Summary

Andam Catbalogan is a community-preparedness web app with three connected views. These are not separate apps; they share one store, so they are three windows onto the same state:

- **Residents** check the hazard status of any point in the city and find the nearest *safe, open* evacuation center.
- **The CDRRMO** raises a hazard scenario. Every view updates within a second.
- **Evacuation-center staff** log arrivals. A public board shows centers filling up live.

The demo runs on one laptop with Wi-Fi off. It uses the CDRRMO's own risk maps, used with the LGU's permission, and OpenStreetMap. There is no server, no account system, and no AI model at runtime. AI's role is in how the app was built (§10).

## 2. Problem

Catbalogan faces typhoons, storm surge, flooding, rain-induced landslides, and earthquakes. The CDRRMO's own risk maps cover all five, but that knowledge doesn't reach the people who need it, at the moment they need it.

1. **Residents can't check their own risk.** Hazard information exists as shapefiles and printed maps. A resident cannot ask, "Is my street in a storm-surge zone?"
2. **A lookup that can't tell "safe" from "no data" gives false reassurance.** A production hazard lookup the builder audited answered *safe* for every coordinate on Earth, because the coordinates submitted to it were never applied. A truthful answer has to distinguish "in a mapped risk zone", "not in a mapped zone", and "outside the data".
3. **There is no mapped list of evacuation centers with capacities.** The builder's own Catbalogan GIS analysis lists this as a *critical DRRM gap* (`D:\lgu_portal - GIS\gis_data\CATBALOGAN\PRD_Catbalogan.md`). Nobody can tell a family where to go, or whether there is room when they get there.
4. **Warnings don't connect to places.** When a warning is raised, a resident can't see whether it applies to them. An evacuation center *inside* the hazard zone can still be listed as a destination.

> In public material (poster, pitch), describe problem 2 generally. Do not name the system it came from.

## 3. Goals and non-goals

### Goals

| # | Goal | Measured by |
|---|---|---|
| G1 | A resident gets a truthful hazard answer for any point in Catbalogan, in Waray or English | Answer renders < 1 s after a tap. Never displays "safe". |
| G2 | The CDRRMO raises a scenario and every open view reflects it | All windows update < 1 s, with no server |
| G3 | Residents are only ever directed to centers that are open, have room, and are outside the active hazard | Eligibility rule is unit-tested |
| G4 | The demo is independent of the venue | Full golden path runs with Wi-Fi off |

### Non-goals

- Real accounts or authentication. Roles are separate routes.
- Real SMS or push alerts.
- Turn-by-turn routing. There is no road-network dataset, so distances are straight-line and labelled as such.
- Machine-learning risk prediction, or any computed "risk score" presented as fact.
- Real household or personal data of any kind.
- Anything from GPDSS / Project HABAGAT (`D:\monica`): no code, outputs, data, or findings.
- Deployment. The app runs on localhost.

## 4. Users and roles

| Role | Route | Device in the demo | What they need |
|---|---|---|---|
| Resident | `/` | Phone-sized window | "Am I in danger here? Where do I go? Is there room?" |
| CDRRMO operator | `/console` | Laptop window | Raise and lower a scenario; see affected barangays and exposed facilities |
| Center manager | `/center/:id` | Small window | Log arrivals and departures; open or close the center |
| Public display | `/board` | Projector or second screen | Readable from 5 m: active warning, centers, capacity, totals |

## 5. The golden path — the demo story (about 3 minutes)

**Setup:** three windows side by side — `/console` on the left, `/` resized to phone width in the middle, `/board` on the projector or right side. A fourth small window holds `/center/:id` for the center that will fill up.

1. **Calm day.** In the resident view, tap a coastal point. The card shows each hazard's status at that point (for example *Storm surge: mapped high-risk zone · Flood: mapped moderate · Landslide: not in a mapped zone*), plus the nearest open center and its straight-line distance.
2. **The CDRRMO raises "Typhoon — Storm surge".** The operator picks the preset in `/console` and presses **Raise warning**. Affected barangays highlight, and the exposed-facility count animates up.
3. **The resident view changes live.** A warning banner appears. The card turns to *Evacuate now →* a center that is **outside** the surge zone. The nearer center is listed as *excluded — inside the storm-surge zone*. This is the moment that shows the product thinks.
4. **The board lights up**: warning banner, affected-barangay count, and centers sorted by available space.
5. **Arrivals.** In `/center/:id`, staff log +25, then +40. Capacity bars fill and the board re-sorts. The center reaches **FULL**, and the resident's recommendation moves to the next eligible center.
6. **The CDRRMO lowers the warning.** All views return to calm.

**Closing line:** *"Every hazard zone you saw is the CDRRMO's own risk map. Every facility is from OpenStreetMap. Both were prepared before today. Everything else was built in the last four hours, with AI."*

## 6. Modules and scope

Build in this order. Each core module builds on the one before, and **Core 1 is a complete entry on its own**. If time runs out after Core 1, the submission is still a finished single-feature app.

### Core 1 — Ligtas Ba Ako? (resident hazard lookup)

| ID | Requirement | Acceptance criteria |
|---|---|---|
| R1.1 | Tap a point on the map, or pick a barangay from a list, to see the status of every hazard type at that point | Each hazard shows exactly one of three states: **In a mapped risk zone — {level}**, **Not in a mapped risk zone**, or **Outside data coverage** (point is outside the city boundary). The word "safe" never appears. |
| R1.2 | Show the nearest eligible evacuation center | Straight-line distance, labelled "straight-line". Uses the eligibility rule in R3.1; with no scenario active, only "open" and "below capacity" apply. |
| R1.3 | Show a "what to do now" checklist for each hazard present | Content is prepared before the event (§11) and shown in the active language |
| R1.4 | Language toggle: Waray / English | The choice persists across reloads. Every UI string comes from the string table — no hard-coded text. |
| R1.5 | Data-sources and disclaimer page | Lists every source with attribution (§8.4). Footer on every view: *"Prototype for preparedness information. In an emergency, follow official CDRRMO advisories."* |

### Core 2 — Scenario console (CDRRMO)

| ID | Requirement | Acceptance criteria |
|---|---|---|
| R2.1 | Pick a scenario preset, then raise or lower the warning | Presets from §8.3. Only one scenario is active at a time. |
| R2.2 | Show the scenario's effect on the console map | Affected barangays are highlighted, with counts of affected barangays and exposed facilities |
| R2.3 | Propagate scenario state to every open view | All windows update < 1 s. A reloaded window restores the current state. |

### Core 3 — Evacuation finder and capacity board

| ID | Requirement | Acceptance criteria |
|---|---|---|
| R3.1 | Eligibility rule: a center is **eligible** if and only if it is open, below capacity, and **not inside any zone of the active scenario at or above its minimum level** | Ineligible centers show the reason ("inside storm-surge zone", "full", "closed"). Unit-tested. |
| R3.2 | Center manager view: log arrivals and departures (+1 / +10 / −1), open or close the center | Occupancy never goes below 0. Exceeding capacity is allowed but shown as **OVER CAPACITY**. |
| R3.3 | Public board | Shows the active warning banner, centers sorted by available space with capacity bars, and total evacuees and open centers. Text stays legible at 1920 × 1080 from 5 m. |

### Stretch — only if the golden path passes end-to-end by T+2:15

| ID | Feature |
|---|---|
| S1 | **"Why?" explainer.** Under the hazard card, explain in plain language which mapped layers matched and what each level means |
| S2 | **Center verification.** CDRRMO promotes an OSM *candidate* center to *official* and sets its real capacity |
| S3 | **Filipino**, as a third language |
| S4 | **NOAH storm-surge advisory levels (SSA1–4)** as scenario variants |

## 7. Architecture

- **Stack:** as in the codebase design spec. Vite + React 19 + TypeScript + Tailwind v4 + shadcn/ui; MapLibre via `react-map-gl/maplibre`; `@turf/turf`; Zustand; `motion` and GSAP. **No three.js** — 3D adds nothing to this product's information.
- **Routes:** `/`, `/console`, `/center/:id`, `/board`, `/sources`.
- **State:** one Zustand store, persisted to `localStorage` under the key `andam`. Other windows rehydrate on the browser's `storage` event, which fires in every other same-origin window when the key changes. That is all the cross-window sync needs: no server, and no message protocol to debug. `BroadcastChannel` is the fallback if rehydration proves flaky.
- **Basemap works offline.** The map draws the city boundary, barangays, and sea from local GeoJSON on a plain background. Online raster tiles are an *optional* toggle when Wi-Fi works. Fonts are self-hosted, with no CDN calls.
- **Pure logic in `src/domain/`**, separate from React, so it can be unit-tested with Vitest:
  - `lookupHazards(point, zones, boundary)` returns the three-state status per hazard
  - `isEligible(center, scenario, zones)` returns eligible, or a reason it isn't
  - `nearestEligible(point, centers, scenario, zones)`
  - `affectedBarangays(scenario, zones, barangays)`

### State shape

```ts
type Hazard = "flood" | "landslide" | "stormSurge" | "groundShaking" | "liquefaction";
type Level = "low" | "moderate" | "high" | "veryHigh"; // mapped from each layer's own categories during data prep

type HazardStatus =
  | { kind: "inZone"; level: Level }
  | { kind: "notInZone" }
  | { kind: "outsideCoverage" };

interface Center {
  id: string;
  name: string;
  barangay: string;
  lon: number;
  lat: number;
  capacity: number;
  status: "official" | "candidate"; // candidate = derived from OSM, not yet verified by CDRRMO
  source: "CDRRMO" | "OSM";
}

interface Scenario {
  id: string;
  label: { en: string; war: string };
  hazards: Hazard[];
  minLevel: Level; // zones at or above this level count as affected
}

interface AndamState {
  lang: "en" | "war";
  activeScenarioId: string | null;
  centerLive: Record<string, { occupancy: number; open: boolean }>;
}
```

Static data (zones, barangays, centers, scenarios) loads from `public/data/` and is **not** persisted. Only `AndamState` is persisted.

## 8. Data

### 8.1 Files that ship in `app/public/data/`

| Output | Source | Tier |
|---|---|---|
| `boundary.geojson` | HDX/OCHA: `D:\lgu_portal - GIS\data\region8\administrative_boundaries\catbalogan_city_boundary.geojson` | 🟢 Open |
| `barangays.geojson` (57) | HDX/OCHA: `…\administrative_boundaries\catbalogan_barangays.geojson` | 🟢 Open |
| `hazard-{flood,landslide,stormSurge,groundShaking,liquefaction}.geojson` | CDRRMO/CPDCO risk maps: `D:\lgu_portal - GIS\gis_data\CATBALOGAN\Shapefiles (Mappers)\Risk Map\{Flood,Landslide,Stormsurge,Groundshaking,Liquifaction}\` | 🟡 Permitted (user-confirmed 2026-10-02) |
| `facilities.geojson` | OpenStreetMap via `D:\lgu_portal - GIS\data\region8\critical_facilities\*.geojson`, clipped to the boundary | 🟢 Open |
| `centers.json` | CDRRMO evacuation-center list *if received* (§8.2); otherwise OSM schools as candidates | 🟡 / 🟢 |
| `scenarios.json` | Authored (§8.3) | — |
| `sources.json` | Authored: attribution for each file | — |

**Fallback:** if a CDRRMO hazard layer turns out unusable in prep, use the UP Project NOAH layer for that hazard (🟢, Samar-wide under `noah_hazards\`, clipped to the boundary). Note the substitution in `sources.json`.

**Canonical layer per hazard.** Each hazard folder holds several exposure layers (population, critical facilities, urban use, …). During prep, choose **one** per hazard — default *Population to {Hazard} Risk* — and map its own category field onto `Level`. Record the choice and the mapping in `app/public/data/README.md`. These layers map *risk to people and assets*, not the full hazard extent, which is why the UI says "mapped risk zone".

**Conversion** happens before the event, with `npx mapshaper`:
- reproject to WGS84 (`-proj wgs84`); the folder mixes UTM 51N and geographic `.prj` files
- clip to the city boundary
- simplify, keeping shapes
- keep only the needed fields
- write GeoJSON at five-decimal precision

**Target:** total data under 3 MB.

### 8.2 Evacuation centers

The user holds permission for the CDRRMO list, but no file exists in the local archive. The builder's own analysis records this as a gap.

- **Plan A:** request the list from the CDRRMO (name, barangay, coordinates or address, capacity) **by Saturday, October 4**, and convert it to `centers.json` with `status: "official"`.
- **Plan B:** use OSM schools inside the boundary as `status: "candidate"`, with an illustrative capacity. Every candidate carries a visible **Candidate — not verified by CDRRMO** badge, and the board shows a footnote. Stretch S2 then becomes the story of the CDRRMO closing that gap.

### 8.3 Scenario presets

| ID | Label (EN) | Hazards | Min level |
|---|---|---|---|
| `surge` | Typhoon — Storm surge | stormSurge | moderate |
| `flood` | Heavy rain — Flooding | flood | moderate |
| `landslide` | Heavy rain — Landslide | landslide | moderate |
| `typhoon` | Typhoon — combined | stormSurge, flood, landslide | moderate |
| `quake` | Earthquake | groundShaking, liquefaction | high |

Waray labels are prepared with the content in §11.

### 8.4 Data rules

- **Never read from `D:\monica`.** Never copy anything from `C:\lgu_portal`; its root holds credential files.
- Barangay-level and facility-level data only. No personal data, real or invented, appears anywhere in the app.
- Every source is credited on `/sources` and on the poster:
  - *Risk maps: Catbalogan City CDRRMO / CPDCO, used with permission.*
  - *Boundaries: OCHA/HDX.*
  - *Facilities: © OpenStreetMap contributors (ODbL).*
  - *NOAH layers, if used: UP NOAH Center.*
- Keep the written LGU permission at hand on demo day. Judges may ask.

## 9. Experience and visual design

- **Tone:** calm by default, urgent only when a warning is active. Color carries state: neutral on calm days, amber and red during a warning. Risk levels always pair color with an icon and a text label, never color alone.
- **Signature motion moments** (see the `gsap-motion` skill):
  - hazard chips stagger in on each lookup (GSAP)
  - the warning banner sweeps in with a GSAP timeline when a scenario is raised
  - occupancy and total counts count up (GSAP)
  - the board's center list re-sorts with Motion `layout`
  - the map flies to the selected point (MapLibre)
- **Accessibility:**
  - WCAG AA contrast
  - every action is keyboard-operable
  - `prefers-reduced-motion` respected
  - the board uses large type
  - Waray is a first-class language, not a translation afterthought
- **Phone-first resident view.** Design it at 390 px wide. It is shown in a phone-width window during the demo.

## 10. AI usage — the 20% criterion

No AI runs inside the app, by decision. The AI score therefore rests on the build process, made visible:

- **Built with Claude Code**, using the ECC plugin and the project's `gsap-motion` skill. Every prompt that shaped the product and every accept or reject decision goes into `docs/AI-LOG.md` at each commit.
- **AI-written data-prep commands** (mapshaper), prepared before the event and logged.
- **AI-drafted Waray strings, corrected by a human.** Keep the before and after. *"Here's what the AI got wrong in Waray, and how we fixed it"* is a strong, honest poster panel.
- **AI-generated unit tests** for the four domain functions in §7, reviewed by a human.
- **Poster panel "How AI built Andam":** tools used, number of logged prompts, what AI did, what the human decided.

## 11. Prepared before the event vs. built on the day

**Fair-play line:** data, a generic scaffold, content, skills and rehearsal are prepared ahead. **All Andam feature code is written during the four hours.**

| Before October 7 | On October 7 |
|---|---|
| Data conversion → `app/public/data/` | All routes, components and domain functions |
| Generic scaffold per the codebase spec, with no Andam-specific code | Unit tests for §7 |
| String table content and "what to do" checklists (EN + Waray) as plain text | Wiring the content into the UI |
| Evacuation-center list (Plan A) or the Plan B decision | Poster and demo rehearsal |
| A full dry run on a throwaway branch, **deleted afterwards** | |

## 12. Four-hour build plan

| Window | Work |
|---|---|
| T+0:00–0:20 | Confirm the topic fits. If a theme is announced, map Andam onto it or switch to the shortlist. Re-read this PRD. Start `AI-LOG.md`. |
| T+0:20–0:35 | Strip unused scaffold modules (3D, tables), load `public/data/`, commit a baseline |
| T+0:35–1:25 | **Core 1**, including the basic `isEligible` (open + below capacity), with tests for `lookupHazards` and `nearestEligible` |
| T+1:25–1:55 | **Core 2**, with a test for `affectedBarangays` |
| T+1:55–2:45 | **Core 3**: extend `isEligible` with the active-scenario hazard exclusion, and test it. Golden path end-to-end by **T+2:15**, then stretch only if green. |
| T+2:45 | **Feature freeze** |
| T+2:45–3:15 | Polish: motion, empty/loading states, accessibility pass, Wi-Fi-off check |
| T+3:15–3:45 | Poster |
| T+3:45–4:00 | Rehearse the golden path twice |

## 13. Pre-event checklist (October 2–6)

| Owner | Task | Due |
|---|---|---|
| Zaldy | Request the CDRRMO evacuation-center list | Oct 4 |
| Zaldy | Confirm the topic format with the organizers (self-chosen or announced) | Oct 4 |
| Zaldy | Have the written LGU data permission ready to show | Oct 6 |
| Claude (after approval) | Convert data → `app/public/data/` + `sources.json` + data README | Oct 3 |
| Claude (after approval) | Generic scaffold per the codebase spec | Oct 4 |
| Zaldy + Claude | EN + Waray string table and "what to do" checklists — AI drafts, Zaldy corrects | Oct 4 |
| Both | Full four-hour dry run on a throwaway branch, then delete it | Oct 5 |
| Zaldy | Test on the competition laptop: on battery, Wi-Fi off, with the projector if possible | Oct 6 |

## 14. Demo and poster

**Demo:** the golden path (§5), rehearsed. The backup is a 60-second screen recording of the golden path, made at T+3:40.

**Poster outline** (the competition requires problem statement, AI tools, development process, and impact):
1. **Problem** — §2, in one sentence each, with the "safe vs no data" point made generally
2. **Andam in one picture** — the three windows, mid-warning
3. **What makes it different** — truthful three-state answers; centers inside the hazard are never recommended; live sync across roles with no server; Waray-first
4. **How AI built it** — §10 panel
5. **Data** — sources and permissions (§8.4)
6. **Impact and next steps** — official evacuation-center registry, SMS/push alerts, every barangay hall on the board

## 15. Risks

| Risk | Mitigation |
|---|---|
| Topic is announced on the day and doesn't fit | The generic scaffold plus the warm shortlist in `PROPOSALS.md`; the data foundation is reusable |
| No evacuation-center list arrives | Plan B (§8.2): labelled OSM candidates |
| CDRRMO layer categories are inconsistent | Choose the canonical layer and mapping during prep; NOAH fallback per hazard |
| Venue Wi-Fi fails | Offline basemap and self-hosted fonts; the golden path is rehearsed with Wi-Fi off |
| Build overruns | Core 1 stands alone; stretch gated at T+2:15; freeze at T+2:45 |
| A resident reads the app as an official safety guarantee | Three-state answers, no "safe" wording, disclaimer footer, "candidate" badges |
| Judges question the data | The `/sources` page and the written permission |

## 16. Success criteria

1. The golden path runs end to end in about 3 minutes, with Wi-Fi off and no console errors.
2. Unit tests pass for:
   - `lookupHazards`, including outside-coverage
   - `isEligible`, including the inside-hazard exclusion
   - `nearestEligible`
   - `affectedBarangays`
3. No view ever displays "safe".
4. `/sources` credits every dataset, and the disclaimer footer appears on every view.
5. `AI-LOG.md` and the poster are complete by T+4:00.

## 17. Open questions

1. Will there be a projector or second screen for `/board` at Tandaya Hall? If not, the board shares the laptop screen in a split layout.
2. Waray and English only, or Filipino too (stretch S3)?
3. Plan B capacities: one flat illustrative number per school, or an estimate scaled by school size?
