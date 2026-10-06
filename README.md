# Andam Catbalogan

*Andam*: ready. One map that tells a resident whether a place is in a mapped hazard zone, where to go, and whether there is still room there. It updates live, in every open window, the moment the CDRRMO raises a warning. An admin console manages users, settings, an audit log and the city's common information (evacuation centers, barangays, hotlines, agencies, advisories, relief supplies).

Built for the **RSCENE 2026 AI Vibe Coding Challenge** (Open Category), October 7, 2026, Tandaya Hall, **Catbalogan City**. What was prepared before the event is disclosed in [`docs/DISCLOSURE.md`](docs/DISCLOSURE.md).

## Quick start (Windows)

Needs **Node 22.18 or newer**.

```powershell
npm ci             # installs from package-lock.json
npm run dev        # http://localhost:5201
```

| Command | Does |
|---|---|
| `npm run dev` | Dev server on port 5201 (`npm run preview` serves a build on 6201) |
| `npm run test` · `npm run typecheck` · `npm run build` | Tests, TypeScript, production build |
| `npm run smoke` | The done gate: builds, serves offline, checks every route in light and dark at 390 and 1280 px (console errors, axe), writes screenshots |
| `npm run data:validate` · `data:derive` · `data:fixtures` | Data tools (`scripts/data/`) |

## Roles

| Role | Route | Window in the demo |
|---|---|---|
| Launcher | `/` | opens each role in its own window |
| CDRRMO operator / admin | `/console` | laptop |
| Resident | `/resident` | phone width |
| Evacuation center staff | `/center`, `/center/:id` | phone width |
| Public board | `/board` | projector |
| Anyone | `/sources` | attribution and disclaimer |

There is no server: the roles share one synced store in the browser, so an action in one window shows up in the others within a second. Sign-in uses demo accounts only (no passwords, no real authentication).

## Layout

| Path | What |
|---|---|
| `src/` | The app |
| `rcene/` | Shared code: data contracts and loaders, geometry, the synced store, translations (English, Waray, Filipino), UI and themes, map, the design kit |
| `data/` | Map layers served at `/data/`: real layers in `files/`, fake fixtures in `fixtures/` (a per-file fallback), the catalogue in `README.md` |
| `docs/` | `brief.md` (the spec), `PRD.md`, `modules/`, `DISCLOSURE.md`, `proposal.md` |
| `scripts/` | Smoke test, model fetcher, data tools, Claude Code hooks |
| `sources/` | Reference material the app may draw from, and that can be deleted once unused: proposals, page templates, the raw GIS archive copy (gitignored), event material. See [`sources/README.md`](sources/README.md) |
| `.claude/` | Claude Code settings, the guard hook wiring and skills |

## Data rules

- **`D:\LGU_Portal`, `D:\AI-ARUS` and `D:\monica` are read-only sources.** They are the builder's own codebases. Pull from them through the `source-codebases` skill; never edit them, never open their credential files, never export personal-data tables.
- **Never copy anything from `C:\lgu_portal`.** It holds credential files. The GIS archive is `D:\lgu_portal - GIS`, copied into `sources/gis/raw/` (never committed).
- **Keep this repo private.** Some layers in `data/files/` are permission-tier (used with LGU permission, not open data).
- No personal data, real or invented: synthetic records use codes.

## Judging rubric

| Criterion | Weight |
|---|---|
| Effective use of AI technologies | 20% |
| Innovation and creativity | 20% |
| Functionality and technical execution | 20% |
| User experience and interface design | 15% |
| Relevance and practical impact | 15% |
| Presentation and poster quality | 10% |
