# 00 · Data foundation (local only)

| | |
|---|---|
| **Runs where** | **Only on the user's Windows PC** — the source archive is `D:\lgu_portal - GIS\`, which no cloud session can reach |
| **Runs in** | the **monorepo root** (not an app folder), in its own worktree |
| **Batch** | 0 — run first, review, merge into `main` **before** batch 1 |
| **Branch** | `proj/00-data` |
| **Write scope** | `data/**` (the root `data/files/` and `data/README.md`), `scripts/data/**` |
| **Skill** | `geo-data-prep` (read it first — it has the tested mapshaper recipes) |
| **Spec** | `docs/PRD.md` §8 (files, sources, conversion steps, data rules) |

> Turn the local GIS archive into small, clean WGS84 GeoJSON in the root `data/files/` so every app switches from fake fixtures to real Catbalogan data — with every source credited. After the merge, `pnpm sync-data` copies it into every app.

## Hard rules

- **Never read anything under `D:\monica`** (GPDSS / Project HABAGAT — someone else's unpublished research). **Never copy anything from `C:\lgu_portal`** (it holds credential files). The guard hook blocks both; don't try to work around it.
- Barangay- and facility-level data only. No personal data.
- Raw sources (`.shp`, `.dbf`, `.kmz`, …) never get committed — only the converted outputs. `.gitignore` already blocks the raw formats.
- 🟡 permission-tier layers (CDRRMO/CPDCO risk maps) may be committed **only because the repo is private**. Never push this branch to a public remote.
- Output must validate: `node scripts/data/validate.mjs` exits 0.
- Root `data/` is the canonical copy. Never edit an app's `data/` folder by hand: `pnpm sync-data` writes those.

## Pass 1 — needed by batch 1 (do these first, commit after each)

| Output (`data/files/`) | Source (PRD §8.1) | Notes |
|---|---|---|
| `boundary.geojson` | `D:\lgu_portal - GIS\data\region8\administrative_boundaries\catbalogan_city_boundary.geojson` | properties `{ name }` |
| `barangays.geojson` (57) | `…\administrative_boundaries\catbalogan_barangays.geojson` | properties `{ name, psgc?, coastal? }`; check the count is 57 |
| `land.geojson` | region/province boundaries, dissolved and heavily simplified, clipped to a box ~0.3° around the city | only for the offline basemap coastline; keep it tiny (< 150 KB) |
| `hazard-flood.geojson`, `hazard-landslide.geojson`, `hazard-stormSurge.geojson`, `hazard-groundShaking.geojson`, `hazard-liquefaction.geojson` | `D:\lgu_portal - GIS\gis_data\CATBALOGAN\Shapefiles (Mappers)\Risk Map\{Flood,Landslide,Stormsurge,Groundshaking,Liquifaction}\` | choose ONE canonical layer per hazard (default *Population to {Hazard} Risk*), map its category field to `low/moderate/high/veryHigh`, dissolve by level, properties `{ hazard, level, sourceLayer }`. Reproject (folders mix UTM 51N and geographic `.prj`), clip to the boundary, simplify keeping shapes. **Fallback:** UP NOAH layer for that hazard (`noah_hazards\`, clipped) — record the substitution. |
| `facilities.geojson` | `D:\lgu_portal - GIS\data\region8\critical_facilities\*.geojson` clipped to the boundary | properties `{ id, name, kind, barangay?, osmId? }`; `kind` ∈ school/hospital/health/police/fire/townhall/other |
| `heritage.geojson` | CPDCO eco-tourism and heritage KML points (Catbalogan folder) | `node scripts/data/kml-to-geojson.mjs`; properties `{ id, name, category, description? }` |
| `derived/barangay-hazard.json`, `derived/facility-hazard.json` | computed | `node scripts/data/derive.mjs` |
| `sources.json` | authored | one entry per file: title, attribution (PRD §8.4 wording), tier, license/url, notes |

Then fill in the "Canonical layer per hazard and level mapping" and "Conversion record" sections of `data/README.md`: for each hazard, the chosen layer path, its category field, and the category → level table. Keep the rest of that README (it is the data catalogue every app gets a copy of).

**Target:** everything in `data/files/` together < 3 MB. Check with `node scripts/data/validate.mjs`.

## Pass 2 — only before the batch that needs it

| Output | For | Source |
|---|---|---|
| `landcover-2010.geojson`, `landcover-2020.geojson` | #13 Bukas Datos (batch 2) | NAMRIA land cover (🟡 — check permission; otherwise skip and #13 uses facilities/hazards only) |
| `coastal-2015.geojson`, `coastal-2020.geojson` | #15 Bakhaw Watch (batch 4) | NAMRIA coastal resources (🟡) |
| `heightmap-catbalogan.png` + `heightmap-catbalogan.json` (contract in brief 02 and the `r3f-scenes` skill) | #2 Tubig (batch 4) | the only real elevation is Calbayog DSM/DTM; for Catbalogan bake from a public DEM while online — or #2 uses a stylised terrain and says so |

These layers are optional: apps load them with `useOptionalLayer`, which checks `/data/manifest.json` first, so they need no `LAYER_FILES` entry. Each one needs a `sources.json` entry, a row in `data/README.md`, and validation. If a layer should become a regular `LAYER_FILES` layer, that is a change to the shared code in `apps/_template/rcene/data/`: say so in the final commit message, and the orchestrator applies it in the package window (`pnpm sync-shared`).

## Verification

1. `node scripts/data/validate.mjs` → exit 0, size under 3 MB.
2. `node scripts/data/derive.mjs` → derived tables written; spot-check 3 barangays you know.
3. `pnpm sync-data` (copies `data/` into every app's `data/`, the template included), then `pnpm --filter @rcene/template dev` → open http://localhost:5100: the coastline, 57 barangays and the flood zones draw; tapping a known coastal point gives a storm-surge answer that matches the printed CDRRMO map; the "Sample data" badge is **gone**.
4. `pnpm --filter @rcene/template smoke` passes (the template's own smoke test).
5. Commit per pass, **only `data/**` and `scripts/data/**`**, with an `AI-LOG.md`-style note in the commit body (which layer was chosen per hazard and why). Leave the app copies from step 3 uncommitted: after the merge, the orchestrator runs `pnpm sync-data` on main and commits them.

## Definition of done (pass 1)

- [ ] All pass-1 files exist in `data/files/`, validate, and total < 3 MB
- [ ] `data/README.md` records the canonical layer and level mapping per hazard
- [ ] `sources.json` credits every file with the PRD §8.4 attribution wording
- [ ] Template app shows real data with no "Sample data" badge (after `pnpm sync-data`)
- [ ] Nothing from `D:\monica` or `C:\lgu_portal`; no raw source files committed

## Out of scope

Any app code. Any change outside the write scope (including the app copies of `data/`). Barangay statistics (CBMS) — that's a separate permission decision for #18 / P3.
