# RSCENE 2026 AI Vibe Coding Challenge — Competition Codebase Design

- **Date:** 2026-09-03
- **Event:** RSCENE 2026 Regional Smart Communities Exposition, Catbalogan City
- **Competition:** AI Vibe Coding Challenge (Open Category)
- **Event date:** 2026-10-07, Day 2 afternoon, Tandaya Hall
- **Status:** Approved; implemented 2026-10-03 as a pnpm monorepo (see the revision notes and `docs/PARALLEL.md`)
- **Revised:** 2026-10-02 — §4 stack updated after the proposal review (see `docs/PROPOSALS.md`)
- **Revised:** 2026-10-03 — pre-build decision: all 20 single-feature proposals are built before the event, one is continued on the day (`docs/PRD.md` §11, `docs/DISCLOSURE.md`). §1–§8 updated for the pnpm monorepo and the parallel build.

## 1. Context

A four-hour solo competition to take an unknown topic from idea to a working web application, plus a project poster and a live demonstration.

### Confirmed constraints

| Constraint | Value | Source |
|---|---|---|
| Duration | 4 hours, hard stop | Event poster |
| Deliverables | Functional web app, project poster, live demo | Event poster |
| Team size | Solo | User decision |
| Stack | JS/TS + React | User decision |
| Runtime AI in app | No AI API, no keys, no server. AI use is in the build process; the three ★AI apps (06, 10, 20) may run small models in the browser, offline (`offline-ai` skill) | User decision, 2026-10-03 clarification |
| Demo target | Local only, no deployment | User decision |
| Prepared repo | Permitted | User decision |
| Pre-built feature code | Used and disclosed; organizers asked by 2026-10-04 | User decision (2026-10-03) |
| Topic | Unknown until the event | Event format |

### Judging rubric

| Criterion | Weight |
|---|---|
| Effective use of AI technologies | 20% |
| Innovation and creativity | 20% |
| Functionality and technical execution | 20% |
| User experience and interface design | 15% |
| Relevance and practical impact | 15% |
| Presentation and poster quality | 10% |

The official competition site returned HTTP 403 and could not be retrieved. All rules above derive from the event poster. If official rules text becomes available, reconcile this document against it.

## 2. Goals and non-goals

### Goals

1. Eliminate project setup from the four-hour window.
2. Pre-make every decision that does not depend on the topic.
3. Capture AI-use evidence as a byproduct of working, not as an end-of-session reconstruction.
4. Protect time for the poster and demo, which are 10% of the score and are what solo competitors most reliably run out of time for.

### Non-goals

- No feature code in the shared layer. `packages/*` and `apps/_template` stay generic: shared contracts and helpers, no project's features. Feature code lives only in `apps/NN-slug/`, pre-built before the event by the 2026-10-03 decision and disclosed (`docs/DISCLOSURE.md`). If the organizers disallow pre-built code, the entry starts from the shared layer alone.
- No deployment configuration. The demo is local.
- No runtime AI integration, no API keys, no server routes.
- No backend or database. State is client-side.

## 3. Repository layout

```
C:\RSCENE\
├─ CLAUDE.md              Scaffold inventory and rules of engagement
├─ README.md              What this repo is, quick start, the 20 apps
├─ package.json           Root scripts: typecheck, test, build, smoke
├─ pnpm-workspace.yaml    Workspace and catalog (every version pinned here)
├─ .gitignore
├─ .claude/
│  ├─ settings.json       Hooks (write scope, path guards) and env
│  └─ skills/             Project skills (gsap-motion, r3f-scenes, …)
├─ apps/
│  ├─ _template/          Generic starter, port 5100, no project feature code
│  └─ NN-slug/            20 single-feature apps, ports 5101–5120
│                         (each with AI-LOG.md, STATUS.md, NOTES.md, DEMO.md)
├─ packages/
│  ├─ config/             Shared Vite/TS config; serves /data/
│  ├─ data/               Data contracts and loaders; files/ (real), fixtures/ (fake)
│  ├─ geo/                Pure geometry: lookupHazards, nearest, …
│  ├─ store/              createSyncedStore: Zustand + localStorage, cross-window
│  ├─ i18n/               EN / Waray / Filipino strings and useLang
│  ├─ ui/                 shadcn/ui components, app shell, motion
│  └─ map/                MapLibre components
├─ scripts/               new-app, launch-worktrees.ps1, smoke, data/, hooks/
├─ docs/
│  ├─ PRD.md              Andam Catbalogan requirements
│  ├─ PROPOSALS.md        The 30 proposals and the decisions log
│  ├─ DISCLOSURE.md       What was pre-built, and how to verify it
│  ├─ PARALLEL.md         How to run the parallel build
│  ├─ SKILLS.md           Skills and plugins to use
│  ├─ projects/           projects.json manifest + one brief per app
│  ├─ event/              Challenge text
│  ├─ RUNBOOK.md          Minute-by-minute four-hour plan
│  ├─ ARCHETYPES.md       Likely topics mapped to pre-built apps
│  ├─ DEMO-SCRIPT.md      Presentation skeleton
│  └─ superpowers/specs/  This document
├─ poster/                Poster deliverable and content outline
└─ assets/event/          Event images
```

The single `app/` of the first design is replaced by a pnpm workspace: one folder per app, sharing the packages above. Pre-event build work happens in git worktrees on `proj/NN-slug` branches, one per app (`docs/PARALLEL.md`).

The ECC clone is no longer in the repository. A local copy, if kept, lives in `reference/` and is gitignored. It is 108 MB of reading material and is not part of the project; the installed plugin operates from its own cache at `~/.claude/plugins/marketplaces/ecc/` and does not depend on this clone.

## 4. Application scaffold

### 4.1 Stack

Vite + React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui, with a motion layer (Motion, GSAP, Lenis) and an optional 3D layer (three.js via React Three Fiber).

Vite is chosen over Next.js because the demo is local-only, so server-side rendering provides no benefit, while the Next server/client component boundary is a common source of hard-to-read errors under time pressure. Vite has a faster dev server and more legible failure modes.

Versions are pinned once, in the pnpm catalog (`pnpm-workspace.yaml`), and verified by an actual install and production build, not assumed from a template. The majors are the ones the coding model knows well: React 19.3, TypeScript 6.0, Vite 8, Tailwind 4.3, react-router 7.18, motion 12.43, TanStack Table 8, vitest 4.1, maplibre-gl 6.11 with react-map-gl 8.1, lucide-react 0.577. Newer majors exist and are deliberately avoided until after the event.

### 4.2 Modules

Shared modules live in seven workspace packages and stay generic: they hold contracts and helpers, never one project's features.

| Package | Holds |
|---|---|
| `@rcene/config` | Shared Vite and TypeScript config. Reads each app's port from `docs/projects/projects.json` and serves `/data/` |
| `@rcene/data` | Data contracts (hazards, levels, the three-state `HazardStatus`), layer loaders, seeded synthetic data |
| `@rcene/geo` | Pure geometry: `lookupHazards`, `nearest`, point-in-area, barangay at a point |
| `@rcene/store` | `createSyncedStore`: a Zustand store persisted under `rcene:<slug>:<store>` and synced across windows |
| `@rcene/i18n` | EN / Waray / Filipino string tables, `useLang` |
| `@rcene/ui` | shadcn/ui components, the app shell, loading and empty states, motion |
| `@rcene/map` | MapLibre components on the offline basemap |

Each app in `apps/NN-slug/` starts as a stub generated from `apps/_template` by `scripts/new-app.mjs`: a route table, empty `src/domain/` and `src/features/`, a string table, a `/sources` page, and only the extra libraries its `projects.json` row lists (charts, tables, 3D, deck.gl, PWA, in-browser AI, QR). The modules below are spread across packages and per-app extras.

| Module | Library | Rationale |
|---|---|---|
| Routing and layout shell | React Router | Nav, sidebar, page frame |
| Component library | shadcn/ui | Button, card, dialog, table, tabs, form, toast, select |
| Forms and validation | react-hook-form + zod | Most civic applications take user input |
| Data tables | TanStack Table | Sorting and filtering wrapper |
| Charts | Recharts (Apache ECharts when richer animation is needed) | Themed defaults for dashboard-shaped topics |
| Maps | MapLibre GL JS via `react-map-gl/maplibre` | Vector maps with pitch, 3D extrusion and terrain; no API token |
| Spatial analysis | `@turf/turf` | Point-in-polygon, nearest facility, buffers — hazard lookups with no backend |
| UI motion | `motion` (motion/react) | Hover/tap, layout reorders, modals, page transitions |
| Choreographed motion | `gsap` + `@gsap/react`, `lenis` | Scroll storytelling, text reveals, count-ups, scrubbable timelines (project skill `gsap-motion`) |
| 3D (only if the chosen proposal needs it) | `three` + `@react-three/fiber` + `@react-three/drei` | Terrain and water-level scenes (project skill `r3f-scenes`) |
| State and persistence | zustand + localStorage (`@rcene/store`) | No backend; survives refresh |
| Mock data | Seed helper (`@rcene/data`) | Demo data without a database |
| UI states | Loading, empty, error components | Carries the 15% UX score |
| Icons | lucide-react | Ships with shadcn/ui |

### 4.3 Bloat management

A fat scaffold is a liability if it must be rediscovered or if unused parts linger. Four mitigations, all required:

1. **CLAUDE.md carries a precise inventory** — every package, its path, and a usage snippet; each app adds its own `CLAUDE.md` pointing to its brief. Claude reads the map rather than exploring.
2. **Shared code is in packages, not copied into apps.** Each app installs only the extras its `projects.json` row lists, so an app that doesn't need 3D or in-browser AI doesn't carry it.
3. **A strip step in the first 15 minutes.** Once the app to continue is chosen, the routes its demo doesn't need are deleted outright from that app. The packages are left alone.
4. **Every feature hangs off a route** in the app's `routes.tsx`, with its code under `src/features/`, so deleting the route and its feature folder removes it completely and nothing is left half-wired.

### 4.4 Data

All apps share one data foundation. The **Andam Catbalogan** PRD (platform P1), `docs/PRD.md` §8, is the source of truth for which layers ship in `packages/data/files/`, their sources, and the data rules. The foundation is Catbalogan barangays, hazard layers and critical facilities.

Apps fetch `/data/<file>`. `@rcene/config` serves `packages/data/files/` (real data) first and falls back, file by file, to the fake fixtures committed in `packages/data/fixtures/`, so every app runs before the real data lands and shows a "Sample data" badge while it does.

Conversion happens before the event, never during the four hours, in the local data session (batch B0, `docs/projects/00-data.md`) on the user's PC: `mapshaper` (via `npx`) simplifies the unsimplified NOAH/NAMRIA GeoJSON and reprojects the UTM 51N CPDCO shapefiles to WGS84. Source data is read from `D:\lgu_portal - GIS`. Nothing is copied from `C:\lgu_portal`, which holds credential files.

## 5. Competition-day ECC configuration

The ECC plugin is installed at user scope with `hooks_enabled: true` and `hook_profile: standard`. During this session, the GateGuard fact-forcing hook blocked work three times — twice on Bash and once on Write — each time requiring a fact statement before proceeding. This is a reasonable guardrail for normal work and a measurable cost against a four-hour clock.

`ECC_GATEGUARD=off` is now set in the `env` block of the project's `.claude/settings.json`, so GateGuard is off for every session in this repo, the parallel build sessions included, while the rest of the standard profile stays on. `CLAUDE.md` documents the switch to the `minimal` hook profile as the further step if hooks still slow work on the day.

The same `.claude/settings.json` holds the project's own hooks (`scripts/hooks/`): they keep each parallel session inside its own app folder (the `writeScope` in `projects.json`) and away from `D:\monica` and `C:\lgu_portal`.

High-value ECC skills for this stack, to be listed in CLAUDE.md: `ecc:react-build`, `ecc:react-review`, `ecc:frontend-patterns`, `ecc:react-patterns`, `ecc:make-interfaces-feel-better`. The full skills and plugins recommendation is in `docs/SKILLS.md`.

## 6. Non-code deliverables

### 6.1 RUNBOOK.md

| Window | Duration | Activity |
|---|---|---|
| T+0:00–0:20 | 20 min | Topic intake. One-sentence problem statement, three user stories, MVP scope. Pick the pre-built app to continue (fallback: start from `apps/_template`). |
| T+0:20–0:35 | 15 min | Strip the chosen app's unneeded routes, commit baseline. |
| T+0:35–2:45 | 130 min | Extend the core loop toward its platform. Commit every working increment. |
| T+2:45 | — | **Hard feature freeze.** No new features after this point. |
| T+2:45–3:15 | 30 min | Polish: loading, empty and error states; responsive check; seed demo data. |
| T+3:15–3:45 | 30 min | Poster. |
| T+3:45–4:00 | 15 min | Demo rehearsal and buffer. |

The feature freeze is the single most important line in the document. A partially built feature at the demo scores worse than a smaller finished one across functionality, UX and impact simultaneously.

### 6.2 AI-LOG.md

Each app keeps its own `AI-LOG.md` (`apps/NN-slug/AI-LOG.md`): an append-as-you-go ledger, one entry per commit, before the event and on the day: what was asked, what Claude produced, what was kept or rejected and why. With no runtime AI in most apps, these per-app logs are the evidence base for the 20% "Effective use of AI technologies" criterion, together with the parallel build itself (briefs, sessions, hooks, verification screenshots; `docs/PRD.md` §10). They cannot be reconstructed credibly after the fact.

### 6.3 ARCHETYPES.md

A one-page cheat sheet mapping likely Smart LGU topic shapes — service request and tracking, geographic and mapping, dashboard and reporting, form-driven intake, directory and search — to the closest pre-built app and the routes each can delete.

### 6.4 DEMO-SCRIPT.md

A presentation skeleton: problem, solution, pre-build disclosure (`docs/DISCLOSURE.md`), live walkthrough, AI process narrative, impact. Sized to a short slot, with the AI process section explicitly present because it is separately scored.

### 6.5 poster/

Content outline covering problem statement, AI tools used, development process, and potential impact, per the stated competition poster requirements. The poster itself is produced on the day and carries the one-line disclosure from `docs/DISCLOSURE.md`.

## 7. Verification criteria

The scaffold, and each app, is not complete until all of the following pass from the repository root:

1. `pnpm install --frozen-lockfile` completes without errors.
2. `pnpm typecheck` reports no TypeScript errors.
3. `pnpm test` passes (packages, scripts and every app).
4. `pnpm build` produces a production build of every app without errors.
5. `node scripts/smoke.mjs --app <slug>` passes for each app: the app boots and every route renders offline without console errors.

A scaffold that does not build on the day is worse than no scaffold. These checks are run and their output confirmed before the work is called done.

## 8. Risks

| Risk | Mitigation |
|---|---|
| Scope creep leaves nothing working at demo time | Hard feature freeze at T+2:45 |
| Poster and demo neglected | Protected time blocks in the runbook |
| AI-use evidence not captured | Each app's AI-LOG.md written at every commit |
| Scaffold modules unused and in the way | Strip step at T+0:20: delete the chosen app's unneeded routes |
| ECC hooks slow work under time pressure | `ECC_GATEGUARD=off` in `.claude/settings.json`; documented switch to minimal profile |
| Dependency rot between now and October | Majors pinned in the pnpm catalog; re-run verification criteria before the event |
| Pre-built code ruled out or marked down | Organizers asked by Oct 4; `pre-event-freeze` tag; open disclosure; fallback to `apps/_template` + `packages/*` (`docs/PRD.md` §11) |
