# P5 · Serbisyo Catbalogan

One-stop citizen services in Waray, Filipino and English

One of the RCENE civic apps for Catbalogan City (RSCENE 2026 AI Vibe Coding Challenge, Oct 7). **This folder is a complete, standalone project**: its own dependencies, shared code (`rcene/`), data (`data/`), skills, hooks, Playwright MCP and smoke test. Nothing outside it is needed. The demo runs **offline** (Wi-Fi off), with **no server and no runtime AI API**.

**The brief is the approved spec: `docs/brief.md`.** Read it first.

## Two contexts

The SessionStart hook prints which one you are in (mode `project`, `monorepo` or `free`), plus the brief, ports, data and model status and the current `STATUS.md`.

| | In the monorepo worktree (branch `proj/p05-serbisyo`) | Standalone (copied folder, Oct 7) |
|---|---|---|
| Install | done by the launcher (`pnpm install` at the repo root) | `npm ci` in this folder (`.npmrc` sets `ignore-scripts=true`) |
| Commands | `npm run …` or the pnpm equivalents (`pnpm dev`, `pnpm test`, `pnpm run smoke`) | `npm run …` |
| Git | **commit only**: no push, merge, rebase, cherry-pick, `reset --hard`, worktree or branch switching. The human reviews and merges | commit and push allowed; keep provenance as `docs/DISCLOSURE.md` describes |
| Dependencies | `pnpm add <pkg>` inside this folder, then `npm install --package-lock-only` to refresh `package-lock.json`. Never `-w`/`-r`, never a plain `npm install`/`npm ci` (npm breaks pnpm's `node_modules`) | `npm install <pkg>` (exact pins via `.npmrc`) |
| Read-only | `data/**`, `docs/brief.md`, `docs/modules/**` (synced from the repo), `scripts/hooks/**`, `.claude/settings.json` | nothing, but keep the hooks |

## Folder map

| Path | What |
|---|---|
| `docs/brief.md` | The spec. Also `docs/proposal.md` (the proposal), `docs/PRD.md` (01, 03, 05 and P1 only), `docs/DISCLOSURE.md`, and for a platform `docs/modules/` (its module apps' briefs) |
| `docs/plan.md` | Your plan (you write it) · `docs/screenshots/` is written by the smoke test |
| `src/` | App code: `domain/` (pure functions + tests), `features/`, `pages/`, `i18n/strings.ts`, `routes.tsx`, `store.ts`, `components/ui/` (app-only shadcn) |
| `rcene/` | **This app's own copy of the shared code**: `data`, `geo`, `i18n`, `store`, `ui`, `map`, `config`, imported as `@rcene/<pkg>`. Read the `README.md` in each (the map API is in the `maplibre-gis` skill), not the source |
| `data/files`, `data/fixtures` | Layers served at `/data/` (real files first, fake fixtures as a per-file fallback). `data/README.md` is the catalogue |
| `models/` | In-browser AI models (gitignored, never committed), filled by `npm run fetch-models` |
| `scripts/` | `smoke.mjs`, `fetch-models.mjs`, `hooks/` (guard and session context) |
| `project.json` | id, slug, title, port, `ai`, brief, branch, `smokeRoutes`; a platform also has `kind`, `modules` and `roles` |
| `STATUS.md` · `AI-LOG.md` · `NOTES.md` · `DEMO.md` | Where you are · one row per commit · decisions and requests · the demo script |

## Commands (in this folder)

```bash
npm run dev                                  # dev server on project.json "port"; preview = port + 1000
npm run test                                 # vitest: src/, rcene/, scripts/
npm run typecheck
npm run build
npm run smoke                                # definition-of-done gate: build, preview offline, console, axe, screenshots at 390/1280
npm run smoke -- --route /x --route /y       # only these routes; the default list is "smokeRoutes" in project.json
npm run fetch-models -- --model e5|clip|all  # ★AI apps only: once, while online, into models/ (--from <dir>|cache copies instead)
```

## Session protocol

1. **Read the brief** (`docs/brief.md`) and the READMEs in `rcene/<pkg>/` of the packages it names. If `STATUS.md` shows earlier progress, continue from there.
2. **Plan:** write `docs/plan.md` (requirements → files → tests), then start. Don't wait for approval.
3. **Domain first, test-first:** pure functions in `src/domain/` with `*.test.ts` beside them (`npm run test`).
4. **Build requirement by requirement, in the brief's order.** After each one: typecheck, test, commit (`feat(P5): R1.2 nearest eligible center`), add a row to `AI-LOG.md`, update `STATUS.md`. The first requirement alone must be a finished app.
5. **Verify in a browser:** start `npm run dev` in the background and use the Playwright MCP tools (`.mcp.json`, isolated profile) to click through the golden path at 390 px and 1280 px. Fix what you see.
6. **Polish:** empty/loading/error states, motion (`gsap-motion`), accessibility (keyboard path, contrast, reduced motion), copy in all three languages.
7. **Gate:** `npm run smoke` must pass. Write `DEMO.md` (golden path ≤ 2 min) and set `STATUS.md` to `Phase: done`. Then **stop**.

## Rules

- **Write only inside this folder.** Plans and notes go in `docs/` and `NOTES.md` here.
- **Shared code:** this app owns its copy in `rcene/`. Prefer using it as-is. If you change it, keep the change minimal and list each change in `NOTES.md` under "Shared-code changes (for the template)", so it can be carried back to the template.
- **Use the shared APIs before writing your own:** `toast` from `@rcene/ui` (`AppShell` mounts the Toaster); `AppShell strings={strings}` so the footer, `/sources` and other shared components use your string overrides (e.g. `app.disclaimer`); `SourcesPage({ extra, children })` + `SourceCard`; `useFormat().currency(n)` / `formatCurrency` for ₱; `toCsv(rows, columns)` from `@rcene/data` with `downloadCsv` / `downloadText` from `@rcene/ui`; `useOptionalLayer(file, schema)` for layers that may not exist.
- **Data:** read layers through `@rcene/data` (`useLayer`, `useZones`, `useOptionalLayer`), never with a bare `fetch` that can 404. On a project branch `data/` is read-only: put requests in `NOTES.md` under "Requests for the data session" and work around them meanwhile. Never read `D:\monica` or `C:\lgu_portal`. Synthetic records use codes (`HH-0001`, `T-042`), **never personal names**. Seed all randomness (`createRng(seed)`) so demos repeat.
- **Hazard answers have three states:** in a mapped zone (with level), not in a mapped zone, outside data coverage. **Never display "safe"**, in any language. Distances are straight-line and labelled so. OSM-derived evacuation sites are "Candidate — not verified by CDRRMO".
- **Every UI string goes through `src/i18n/strings.ts`** (`extendStrings(common, {en, war, fil})`). Draft Waray and Filipino, and list AI-drafted strings in `NOTES.md` under "Translations to review".
- **Offline:** no CDN fonts, scripts, tiles or models. The online OSM basemap is an opt-in toggle only. AI models load from `/models/` (this app's `models/`), lazily, with a deterministic fallback that always works.
- **Accessibility:** color + icon + text label, never color alone. Every action works by keyboard. Respect `prefers-reduced-motion`. WCAG AA contrast.
- **Credit sources** on `/sources` (`SourcesPage`, with the app's own synthetic data and models in `extra` or `children`). The disclaimer footer comes with `AppShell`.
- **Dependencies:** the full stack is already in `package.json` (exact pins). Add a package only if truly needed (see "Two contexts" for how), justify it in `NOTES.md` under "Dependencies added", and never change a major version.

## Guard hooks (`.claude/settings.json`)

A PreToolUse guard (`scripts/hooks/guard.mjs`) blocks, and tells you why:
- always: any path or command touching `D:\monica` or `C:\lgu_portal`; reading or editing credential files (`.env*` except `.env.example`, `*.pem`, `*service-account*.json`, API-key files); edits outside this folder (your scratchpad, `~/.claude` and the OS temp folder are fine) or under `node_modules/` and `dist/`;
- on a `proj/` branch: edits while checked out on another branch; edits to `data/**`, `docs/brief.md`, `docs/modules/**`, `scripts/hooks/**`, `.claude/settings{,.local}.json` and `~/.claude/settings*.json`; git push, pull, merge, rebase, cherry-pick, am, worktree, `reset --hard`, branch delete/rename or switching branches;
- in the monorepo: dependency changes outside this app, `-w`/`-r`, and `npm`/`yarn`/`bun` installs.

Don't try to work around a block. If it stops real work, write it in `STATUS.md` under Blockers.

## Autonomy (overrides plugin workflows such as Superpowers)

- The brief is the approved design. **Skip brainstorming and clarifying questions.** Make reasonable choices and record them in `NOTES.md` under "Decisions and open questions".
- In the monorepo you are already in an isolated worktree. Don't create another one.
- Don't run branch-finishing, merge or PR flows. Stop when the definition of done is met.
- Prefer working inline over spawning many subagents. Parallel sessions share one usage budget.

## Code conventions

- TypeScript 6 strict with `erasableSyntaxOnly`: no `enum`, no parameter properties, no namespaces. Use `import type` for types. Include the `.ts`/`.tsx` extension on relative imports.
- React 19, function components, `react-router` **7** (`import … from "react-router"`, `createBrowserRouter`). Export the route table from `src/routes.tsx` so a platform can mount it later.
- Pinned majors (exact versions in `package.json`): motion 12 (`motion/react`), TanStack Table 8, vitest 4, lucide-react 0.577, maplibre-gl 6 (expressions only, e.g. `["get","level"]`), deck.gl 9.4 as `@deck.gl/*` packages (never the `deck.gl` meta-package), zod 4, Tailwind 4 (CSS-first, no config file).
- `@/` maps to `src/`. Shared primitives come from `@rcene/ui/components/<name>`; app-only shadcn components go in `src/components/ui/`.
- Stores: `createSyncedStore("p05-serbisyo:<name>", …)`. Persist state only, never layers.
- `vite.config.ts` calls `rceneApp()` from `rcene/config/vite.ts`; pass Vite plugins via `plugins` and anything else via `overrides` (deep-merged).

## Platforms (when `project.json` has `"kind": "platform"`)

A platform (P1–P10) is one workflow across several roles, built from single-feature apps (its `modules`). Everything above applies, plus:

- **Scaffold.** `/` is the role launcher (`RoleLauncher` from `@rcene/ui`). Each role in `project.json` `roles` has a route, a placeholder page and `role.<id>.title` / `role.<id>.summary` strings (`src/roles.ts`, `src/pages/`, `src/i18n/strings.ts`). Replace the placeholders; keep the routes.
- **Modules.** The briefs of the module apps are in `docs/modules/NN-slug.md`. Your brief's "Lift, then wire" section says what each one becomes.
- **Lift, don't rebuild.** In the monorepo, a finished module app sits next to this folder (`../NN-slug`, `STATUS.md` says `Phase: done`). Copy its domain code and components into `src/modules/<name>/` (reading other folders is fine, editing them is not), fix the imports and make its tests pass here. If it isn't done, build only what your brief lists, from `docs/modules/NN-slug.md`. Record every lift in `NOTES.md` under "Lifted modules": app, commit, files, changes.
- **One spine.** All roles read and write one store, `createSyncedStore("p05-serbisyo:spine", …)`, keyed by barangay where it holds per-barangay records. Each role usually runs in its own window (**New window** on `/`), and the synced store is what makes one role's action appear in the others.
- **R1 stands alone.** The first requirement must be a finished single-feature app before anything cross-role is built.

## Skills and plugins

| Task | Use |
|---|---|
| Any map or GeoJSON code | skill `maplibre-gis` |
| Motion, count-ups, scroll stories | skill `gsap-motion` (imports from `@rcene/ui/motion`) |
| 3D (02, 17 only) | skill `r3f-scenes` |
| In-browser AI (06, 10, 20) | skill `offline-ai` |
| Charts and dashboards | built-in skill `dataviz` |
| UI direction, critique, copy, accessibility | plugins `frontend-design` and Design (`design-critique`, `ux-copy`, `accessibility-review`) |
| TDD, debugging, verification | plugin Superpowers (skip its brainstorming, worktree and branch-finishing steps) |

The four app skills live in `.claude/skills/`. The plugins are enabled in `.claude/settings.json`; if one is missing, it was never installed on this machine (see `docs/SKILLS.md` in the monorepo) — carry on without it.
