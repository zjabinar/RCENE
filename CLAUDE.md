# Andam Catbalogan

Community preparedness: one warning, every role, live.

The RCENE entry for the RSCENE 2026 AI Vibe Coding Challenge (Catbalogan City, Oct 7). **This repo is one standalone app** at its root: its own dependencies, shared code (`rcene/`), data (`data/`), skills, hooks, Playwright MCP and smoke test. The demo runs **offline** (Wi-Fi off), with **no server and no runtime AI API**.

**The spec is `docs/brief.md`** (P1 roles, spine, R1–R5), with `docs/PRD.md` behind it and the module briefs in `docs/modules/`. On top of it the app has an admin layer: users, an audit log, settings, a dashboard and CRUD for common information (see `docs/plan.md` when it exists).

## Folder map

| Path | What |
|---|---|
| `docs/brief.md` | The spec. Also `docs/PRD.md`, `docs/proposal.md`, `docs/DISCLOSURE.md`, `docs/modules/` (briefs of #1 Ligtas, #3 Likas, #4 Bantay, #5 Sakuna, whose functions P1 builds in `src/modules/`) |
| `docs/plan.md` | The working plan · `docs/screenshots/` is written by the smoke test |
| `src/` | App code: `domain/` (pure functions + tests), `modules/`, `features/`, `pages/`, `i18n/strings.ts`, `routes.tsx`, `roles.ts`, `store.ts`, `components/ui/` (app-only shadcn) |
| `rcene/` | Shared code: `data`, `geo`, `i18n`, `store`, `ui` (+ `ui/theme`), `map`, `kit` (design blocks: `kit/app`, `kit/site`, `kit/poster`, `kit/brand`), `config`, imported as `@rcene/<pkg>`. Read the `README.md` in each (the map API is in the `maplibre-gis` skill, the design system in the `rcene-design` skill), not the source |
| `data/files`, `data/fixtures` | Layers served at `/data/` (real files first, fake fixtures as a per-file fallback). `data/README.md` is the catalogue |
| `models/` | In-browser AI models (gitignored), filled by `npm run fetch-models` |
| `scripts/` | `smoke.mjs`, `fetch-models.mjs`, `data/` (GIS → `data/files` tools), `hooks/` (guard and session context) |
| `sources/` | **Reference material only** (see below): proposals, templates, raw GIS, event material |
| `project.json` | id, slug, title, port, `ai`, brief, `smokeRoutes`, `kind`, `roles` |
| `STATUS.md` · `AI-LOG.md` · `NOTES.md` · `DEMO.md` | Where we are · one row per commit · decisions and notes · the demo script |

## Sources (`sources/`)

`sources/` holds everything that is not the app: `proposals/` (all 30 proposals and briefs, `projects.json`), `templates/` (the `src/` of `starter-app`, `starter-site` and `kit-gallery`), `gis/raw/` (local copy of the GIS archive, gitignored), `docs/`, `assets/`, `kits/`. Its catalogue is `sources/README.md`.

- **Never import from `sources/`.** Copy what you need into `src/` (code) or convert it into `data/files/` (GIS, skill `geo-data-prep`), then adapt it.
- Record what you promoted in `sources/README.md` ("Used by the app") and what you copied in `NOTES.md`. Anything not used can be deleted at any time.
- `sources/` is outside `tsconfig`, vitest and the build: code there is not compiled or tested.

## Commands

```bash
npm ci                                       # install (once)
npm run dev                                  # dev server on port 5201; preview = 6201
npm run test                                 # vitest: src/, rcene/, scripts/
npm run typecheck
npm run build
npm run smoke                                # definition-of-done gate: build, preview offline, console, axe, screenshots at 390/1280
npm run smoke -- --route /x --route /y       # only these routes; the default list is "smokeRoutes" in project.json
npm run data:validate                        # data/files (add -- --fixtures for the fixtures)
npm run data:derive                          # derived/*.json after changing a layer
npm run data:fixtures                        # regenerate the fake fixtures
```

## Working protocol

1. **Read the brief** (`docs/brief.md`) and the READMEs in `rcene/<pkg>/` of the packages it names. If `STATUS.md` shows earlier progress, continue from there.
2. **Domain first, test-first:** pure functions in `src/domain/` (or `src/modules/<name>/`) with `*.test.ts` beside them.
3. **Build requirement by requirement, in the brief's order.** After each one: typecheck, test, commit (`feat(P1): R1.2 nearest eligible center`), add a row to `AI-LOG.md`, update `STATUS.md`. R1 alone must be a finished app.
4. **Verify in a browser:** `npm run dev` in the background, then the Playwright MCP tools (`.mcp.json`, isolated profile) at 390 px and 1280 px.
5. **Polish:** empty/loading/error states, motion (`gsap-motion`), accessibility, copy in all three languages.
6. **Gate:** `npm run smoke` must pass. Keep `DEMO.md` (golden path ≤ 3 min) current.

## Rules

- **Design: use the kit before writing your own UI** (skill `rcene-design`): page headers, consoles, boards, tables, charts, forms, wizards, timelines, meters, QR, empty states (`@rcene/kit/app`); hero, sections, scrollytelling (`@rcene/kit/site`); the A3 poster and presenter mode (`@rcene/kit/poster`); the RCENE mark and weave patterns (`@rcene/kit/brand`). Colours only from theme tokens (5 palettes x light/dark); never hard-code a colour, never use colour alone. Complete pages to copy from are in `sources/templates/`.
- **Shared code** (`rcene/`): prefer using it as-is. Keep changes minimal and list each in `NOTES.md` under "Shared-code changes".
- **Use the shared APIs before writing your own:** `toast` from `@rcene/ui`; `AppShell strings={strings}`; `SourcesPage({ extra, children })` + `SourceCard`; `useFormat().currency(n)`; `toCsv(rows, columns)` from `@rcene/data` with `downloadCsv` / `downloadText` from `@rcene/ui`; `useOptionalLayer(file, schema)` for layers that may not exist; `resetDemo()` from `@rcene/store`.
- **Data:** read layers through `@rcene/data` (`useLayer`, `useZones`, `useOptionalLayer`), never with a bare `fetch` that can 404. Never read `D:\monica` or `C:\lgu_portal`. Synthetic records use codes (`HH-0001`, `USR-001`), **never personal names**. Seed all randomness (`createRng(seed)`) so demos repeat.
- **Hazard answers have three states:** in a mapped zone (with level), not in a mapped zone, outside data coverage. **Never display "safe"**, in any language. Distances are straight-line and labelled so. OSM-derived evacuation sites are "Candidate — not verified by CDRRMO".
- **Users and sign-in are demo-only:** pick a demo account, no passwords, no real authentication, labelled as such. The session is per window (`sessionStorage`), so each demo window can hold a different role.
- **Stores:** `createSyncedStore("andam:<name>", …)` (localStorage, synced across windows). Persist state only, never layers. Every admin mutation also writes an audit entry.
- **Every UI string goes through `src/i18n/strings.ts`** (`extendStrings(common, {en, war, fil})`). Draft Waray and Filipino, and list AI-drafted strings in `NOTES.md` under "Translations to review".
- **Offline:** no CDN fonts, scripts, tiles or models. The online OSM basemap is an opt-in toggle only.
- **Accessibility:** color + icon + text label, never color alone. Every action works by keyboard. Respect `prefers-reduced-motion`. WCAG AA contrast.
- **Credit sources** on `/sources`. The disclaimer footer comes with `AppShell`.
- **Dependencies:** the full stack is already in `package.json` (exact pins, `.npmrc` `save-exact`). Add a package only if truly needed (`npm install <pkg>`), justify it in `NOTES.md`, and never change a major version.
- **Git:** work on a branch, commit with an `AI-LOG.md` row; keep provenance as `docs/DISCLOSURE.md` describes.

## Guard hook (`.claude/settings.json`)

A PreToolUse guard (`scripts/hooks/guard.mjs`) blocks, and tells you why: any path or command touching `D:\monica` or `C:\lgu_portal` (`D:\lgu_portal - GIS` is allowed); reading or editing credential files (`.env*` except `.env.example`, `*.pem`, `*service-account*.json`, API-key files); edits outside this repo (your scratchpad, `~/.claude` and the OS temp folder are fine) or under `node_modules/` and `dist/`. Don't work around a block; write it in `STATUS.md` under Blockers.

## Code conventions

- TypeScript 6 strict with `erasableSyntaxOnly`: no `enum`, no parameter properties, no namespaces. Use `import type` for types. Include the `.ts`/`.tsx` extension on relative imports.
- React 19, function components, `react-router` **7** (`import … from "react-router"`, `createBrowserRouter`). The route table is exported from `src/routes.tsx`.
- Pinned majors: motion 12 (`motion/react`), TanStack Table 8, vitest 4, lucide-react 0.577, maplibre-gl 6 (expressions only, e.g. `["get","level"]`), deck.gl 9.4 as `@deck.gl/*` packages (never the `deck.gl` meta-package), zod 4, Tailwind 4 (CSS-first, no config file).
- `@/` maps to `src/`. Shared primitives come from `@rcene/ui/components/<name>`; app-only shadcn components go in `src/components/ui/`.
- `vite.config.ts` calls `rceneApp()` from `rcene/config/vite.ts`; pass Vite plugins via `plugins` and anything else via `overrides` (deep-merged).

## Roles and the spine

`/` is the role launcher (`RoleLauncher` from `@rcene/ui`). Each role in `project.json` `roles` has a route (`src/roles.ts`): `/console` (CDRRMO operator and admin, full width), `/resident` (phone), `/center` (+ `/center/:id`, phone), `/board` (projector). All roles read and write one synced store, `andam:spine` (`activeScenarioId`, `raisedAt`, `centerLive`); each role usually runs in its own window (**New window** on `/`), and the synced store makes one role's action appear in the others. The functions of the module briefs (`docs/modules/`) are built in `src/modules/{ligtas,sakuna,likas,bantay}/` with their own tests.

## Skills and plugins

| Task | Use |
|---|---|
| Any map or GeoJSON code | skill `maplibre-gis` |
| Converting the raw GIS in `sources/gis/raw` into `data/files` | skill `geo-data-prep` |
| Motion, count-ups, scroll stories | skill `gsap-motion` (imports from `@rcene/ui/motion`) |
| 3D | skill `r3f-scenes` |
| In-browser AI | skill `offline-ai` |
| Theme, layout, blocks, poster, demo, brand | skill `rcene-design` |
| Charts and dashboards | built-in skill `dataviz` (colours from `--chart-*` / `--seq-*`, via `ChartContainer`) |
| UI direction, critique, copy, accessibility | plugins `frontend-design` and Design (`design-critique`, `ux-copy`, `accessibility-review`) |
| TDD, debugging, verification | plugin Superpowers |

The app skills and the installed generic skills live in `.claude/skills/` (`skills-lock.json` records where the generic ones came from). Plugin notes: `sources/docs/SKILLS.md`.
