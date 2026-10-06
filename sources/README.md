# Sources

Reference material for the app. **Nothing in `src/`, `rcene/` or `scripts/` imports from here**, and nothing here is built, tested or served. Use it by copying or converting what you need into the app, then record it below. Anything not listed under "Used by the app" can be deleted at any time; the full monorepo it came from is on the `main` branch history.

## Catalogue

| Path | What | Size | In git |
|---|---|---|---|
| `proposals/PROPOSALS.md` | The 20 single-feature proposals and 10 platforms (P1–P10), decisions log, stack | 43 KB | yes |
| `proposals/*.md`, `projects.json` | One brief per proposal (00-data, 01–20, p01–p10, the three reference projects, two brief templates) and their manifest | 0.7 MB | yes |
| `templates/starter-app/` | `src/` of the application starter: role launcher, console with KPIs, chart and table, form wizard, record page (timeline, meter, QR), phone view, board | 0.3 MB | yes |
| `templates/starter-site/` | `src/` of the website starter: landing page, scrollytelling story with the map, about page, A3 poster, presenter mode | 0.2 MB | yes |
| `templates/kit-gallery/` | `src/` of the design-kit gallery: an example for every block of `rcene/kit` | 0.3 MB | yes |
| `gis/raw/catbalogan/` | Copy of `D:\lgu_portal - GIS\gis_data\CATBALOGAN`: `Hazards-Risks (CDRRMO)` (8.5 MB), `Shapefiles (Mappers)` incl. `Risk Map` (18 MB), `Eco-Tourism (CTCAIO)` (KML + photos/videos, 238 MB), `Public Utilities (CEEPUO)` (530 MB, mostly photos/videos), `For Future Developments (CTIIPO)`, `Updates on CLUP (CPDCO)` (PDF), `CATBALOGAN_GIS_ANALYSIS.md`, `PRD_Catbalogan.md` | 858 MB | **no** (local only) |
| `gis/raw/region8/` | From `D:\lgu_portal - GIS\data\region8`: `administrative_boundaries/` (Catbalogan boundary and barangays, Region 8 provinces for the land outline) and `critical_facilities/` (OSM schools, hospitals, police, fire) | 79 MB | **no** (local only) |
| `docs/SKILLS.md` | Skills and plugins to install, and where | 14 KB | yes |
| `docs/superpowers/specs/` | The competition codebase design (2026-09-03) | 17 KB | yes |
| `docs/event/VibeCoding_Challenge.txt` | The challenge text and rubric | 1 KB | yes |
| `assets/event/` | Event poster, LGU booth photo, registration screenshot | 0.8 MB | yes |
| `assets/m-BCPSPXeE.jpg` | Another copy of the event poster | 0.3 MB | yes |
| `kits/RSCENE-2026-Vibe-Coding-Kit.zip` | The competition kit: prompts, four-hour runbook, checklists, poster and demo templates | 37 KB | yes |

Not copied: the UP NOAH fallback layers stay at `D:\lgu_portal - GIS\data\region8\noah_hazards` (large; read them in place if a CDRRMO layer is unusable).

## Rules

- **Code:** copy a page or function from `templates/` into `src/`, adapt it, and note it in `NOTES.md`. Never import across.
- **GIS:** convert with the skill `geo-data-prep` into `data/files/` (WGS84, 5 decimals, under 3 MB total), credit it in `data/files/sources.json`, run `npm run data:derive` and `npm run data:validate`. Raw files stay in `gis/raw/`, which is gitignored as a whole: never move a raw `.kml`, `.geojson` or shapefile anywhere else in the repo.
- **Privacy:** `gis/raw` holds permission-tier LGU data and photos. Keep it local; never push it or copy it to a public place. `catbalogan/PRD_Catbalogan.md` and `CATBALOGAN_GIS_ANALYSIS.md` are background reading only.
- **Discard:** when something is no longer needed, delete it and remove its row here.

## Used by the app

| Source | Became | When |
|---|---|---|
| `proposals/p01-andam.md` + `01-ligtas`, `03-likas`, `04-bantay`, `05-sakuna` | `docs/brief.md`, `docs/modules/` (copied at generation) | 2026-10-07 |
