# RCENE

Preparation repo for the **RSCENE 2026 AI Vibe Coding Challenge** (Open Category): a four-hour solo build of a working web app, a poster and a live demo, on **October 7, 2026** at Tandaya Hall, **Catbalogan City**.

Twenty single-feature civic apps for Catbalogan are pre-built here before the event, in parallel Claude Code sessions. On the day, one of them is picked and continued for the four hours as the entry. That is disclosed openly: see [`docs/DISCLOSURE.md`](docs/DISCLOSURE.md). The integrated platforms (P1–P10) come later, composed from the finished apps.

## Repo map

| Path | What |
|---|---|
| `apps/` | `_template` (the reference app, port 5100) and the 20 apps `NN-slug` (ports 5101–5120). **Each app folder is a self-contained project**: its own `package.json` and `package-lock.json`, its own copy of the shared code in `rcene/` (data contracts, geometry, store, i18n, UI, map, Vite config), its own `data/`, `CLAUDE.md`, Claude Code skills and hooks, Playwright MCP and smoke test. Each keeps `AI-LOG.md`, `STATUS.md`, `NOTES.md` and `DEMO.md`. |
| `data/` | The canonical data: real layers in `files/`, fake fixtures in `fixtures/` (a per-file fallback), the catalogue in `README.md`. Copied into every app's `data/` with `pnpm sync-data`; apps fetch `/data/<file>`. |
| `docs/` | PRD, proposals, disclosure, parallel-build how-to, skills; `projects/` (manifest `projects.json` + one brief per app, copied into the app as `docs/brief.md`); `event/` (challenge text) |
| `scripts/` | Monorepo tooling: `new-app.mjs`, `sync-shared.mjs`, `sync-data.mjs`, `lockfiles.mjs`, `check-standalone.mjs`, `stack.mjs`, `smoke.mjs` and `fetch-models.mjs` (wrappers over each app's own), `launch-worktrees.ps1`, `data/` (conversion and fixtures), `hooks/` |
| `stack.json` | The exact version of every dependency, for every app |
| `assets/` | `event/` images |
| `.claude/` | Root settings and the root-only skill `geo-data-prep` (the app skills live inside each app) |

There is no shared `packages/` folder: the reference copy of the shared code is `apps/_template/rcene/`, and `pnpm sync-shared` pushes changes from there into the apps.

## Quick start (Windows)

Needs **Node 22.18 or newer**.

**The monorepo** (daily development, pnpm):

```powershell
node --version                            # v22.18 or newer
npm i -g pnpm@10                          # or: corepack enable
pnpm install                              # one install for every app
pnpm --filter @rcene/01-ligtas dev        # http://localhost:5101 (or: cd apps\01-ligtas; pnpm dev)
```

**One app on its own** (a copied folder, npm):

```powershell
cd C:\entry\01-ligtas                     # any copy of apps\01-ligtas
npm ci                                    # installs from its package-lock.json
npm run dev                               # also: npm run test | typecheck | build | smoke | fetch-models
```

| Command (repo root) | Does |
|---|---|
| `pnpm test` · `pnpm typecheck` · `pnpm build` | Tests, TypeScript and production builds across the workspace |
| `node scripts/smoke.mjs --app 01-ligtas` | Runs that app's own smoke test: boots it and checks every route offline |
| `pnpm new-app <slug>` | Generates `apps/<slug>` from the template and its row in `projects.json` |
| `pnpm sync-shared --all` | Pushes template changes (shared code, scripts, skills, config, docs) into the apps; changed files are skipped unless `--force` |
| `pnpm sync-data` | Mirrors root `data/` into every app |
| `pnpm lockfiles` | Writes each app's `package-lock.json` |
| `pnpm check-standalone --all` | Checks that no app reaches outside its folder (`--install <slug>` does a real `npm ci` in a temp copy) |
| `pnpm stack:check` | Checks every app's versions against `stack.json` |

Any app runs the same way: `pnpm --filter @rcene/<slug> dev` on its port below (the template is `@rcene/template` on 5100), or `npm run dev` in a standalone copy. Preview port = dev port + 1000.

## The 20 apps

Source of truth: [`docs/projects/projects.json`](docs/projects/projects.json). Batch B0 is the local data session ([`00-data.md`](docs/projects/00-data.md)); B4 is optional.

| # | App (brief) | Folder | Port | Batch |
|---|---|---|---|---|
| 01 | [Ligtas Ba Ako?](docs/projects/01-ligtas.md) | `apps/01-ligtas` | 5101 | B1 |
| 02 | [Tubig](docs/projects/02-tubig.md) | `apps/02-tubig` | 5102 | B4 |
| 03 | [Likas](docs/projects/03-likas.md) | `apps/03-likas` | 5103 | B1 |
| 04 | [Bantay Barangay](docs/projects/04-bantay.md) | `apps/04-bantay` | 5104 | B1 |
| 05 | [Sakuna Sim](docs/projects/05-sakuna.md) | `apps/05-sakuna` | 5105 | B2 |
| 06 | [Damage Snap](docs/projects/06-snap.md) | `apps/06-snap` | 5106 | B4 |
| 07 | [Pila](docs/projects/07-pila.md) | `apps/07-pila` | 5107 | B2 |
| 08 | [Sertipiko](docs/projects/08-sertipiko.md) | `apps/08-sertipiko` | 5108 | B3 |
| 09 | [Negosyo Navigator](docs/projects/09-negosyo.md) | `apps/09-negosyo` | 5109 | B2 |
| 10 | [Reklamo](docs/projects/10-reklamo.md) | `apps/10-reklamo` | 5110 | B3 |
| 11 | [Bayanihan Budget](docs/projects/11-bayanihan.md) | `apps/11-bayanihan` | 5111 | B3 |
| 12 | [Proyekto Watch](docs/projects/12-proyekto.md) | `apps/12-proyekto` | 5112 | B3 |
| 13 | [Bukas Datos](docs/projects/13-datos.md) | `apps/13-datos` | 5113 | B2 |
| 14 | [Basura Alert](docs/projects/14-basura.md) | `apps/14-basura` | 5114 | B3 |
| 15 | [Bakhaw Watch](docs/projects/15-bakhaw.md) | `apps/15-bakhaw` | 5115 | B4 |
| 16 | [Libot Catbalogan](docs/projects/16-libot.md) | `apps/16-libot` | 5116 | B1 |
| 17 | [Banig](docs/projects/17-banig.md) | `apps/17-banig` | 5117 | B4 |
| 18 | [Kalinga](docs/projects/18-kalinga.md) | `apps/18-kalinga` | 5118 | B1 |
| 19 | [Ayuda Tracker](docs/projects/19-ayuda.md) | `apps/19-ayuda` | 5119 | B4 |
| 20 | [Sumat](docs/projects/20-sumat.md) | `apps/20-sumat` | 5120 | B2 |

## Docs

- [`docs/PARALLEL.md`](docs/PARALLEL.md) — how to run the parallel worktree build
- [`docs/SKILLS.md`](docs/SKILLS.md) — skills and plugins to use
- [`docs/PRD.md`](docs/PRD.md) — Andam Catbalogan (P1) requirements, data, build plan
- [`docs/PROPOSALS.md`](docs/PROPOSALS.md) — the 30 proposals, decisions log, stack
- [`docs/DISCLOSURE.md`](docs/DISCLOSURE.md) — what was pre-built, and how to verify it
- [`data/README.md`](data/README.md) — the data catalogue: layers, tiers, rules

## Data rules

- **Never read anything under `D:\monica`.** It is someone else's unpublished research.
- **Never copy anything from `C:\lgu_portal`.** It holds credential files.
- **Keep this repo private.** Some committed layers in `data/files/` (and each app's copy in `apps/<slug>/data/files/`) are permission-tier (used with LGU permission, not open data).

## Judging rubric

| Criterion | Weight |
|---|---|
| Effective use of AI technologies | 20% |
| Innovation and creativity | 20% |
| Functionality and technical execution | 20% |
| User experience and interface design | 15% |
| Relevance and practical impact | 15% |
| Presentation and poster quality | 10% |
