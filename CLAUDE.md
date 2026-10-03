# RCENE — 20 civic apps for Catbalogan City (RSCENE 2026 AI Vibe Coding Challenge, Oct 7)

pnpm monorepo. 20 pre-built React apps (one per proposal in `docs/PROPOSALS.md`) share seven packages. On Oct 7 one app is picked and continued for 4 hours. The demo runs **offline** (Wi-Fi off), with **no server and no runtime AI API**.

## Repo map

| Path | What |
|---|---|
| `apps/NN-slug/` | One app per proposal (ports 5101–5120; preview = port + 1000). `apps/_template/` is the generator source |
| `packages/data` | Types (`Hazard`, `Level`, `HazardStatus`), layer loaders (`useLayer`, `useZones`), `createRng`, fixtures, real data in `files/` |
| `packages/geo` | `lookupHazards` (three states), `nearest`, `barangayAt`, `randomPointsIn` |
| `packages/store` | `createSyncedStore` — persisted Zustand, synced across windows |
| `packages/i18n` | `en`/`war`/`fil` tables, `useT`, `useLang`, `useFormat` |
| `packages/ui` | Tailwind v4 theme, shadcn primitives (`@rcene/ui/components/<name>`), `AppShell`, `LoadGate`, `HazardStatusList`, `StatTile`, `SourcesPage`; motion at `@rcene/ui/motion` |
| `packages/map` | Offline `BaseMap`, `ZoneLayer`, `PointLayer`, `Legend`, `useFlyTo` |
| `packages/config` | tsconfig bases, `rceneApp()` Vite preset, `/data/` static plugin |
| `docs/projects/` | `projects.json` (manifest) and one brief per project — **the brief is the spec** |
| `scripts/` | `launch-worktrees.ps1`, `smoke.mjs`, `new-app.mjs`, `data/*`, `hooks/*` |

Every package has a README with its API. Read the README, not the source.

## Commands

```bash
pnpm install                                  # once per worktree
pnpm --filter @rcene/01-ligtas dev            # or `pnpm dev` inside the app folder
pnpm test | pnpm typecheck | pnpm build       # whole repo (in an app folder: that app only)
node scripts/smoke.mjs --app 01-ligtas        # definition-of-done gate: offline, console, axe, screenshots
```

## Session protocol (on a `proj/NN-slug` branch)

The SessionStart hook tells you your project, brief, app folder, port and current `STATUS.md`.

1. **Read your brief** (`docs/projects/NN-slug.md`) and the READMEs of the packages it names. If `STATUS.md` shows earlier progress, continue from there.
2. **Plan:** write `apps/NN-slug/docs/plan.md` (requirements → files → tests), then start. Don't wait for approval.
3. **Domain first, test-first:** pure functions in `src/domain/` with `*.test.ts` beside them (`pnpm test`).
4. **Build requirement by requirement, in the brief's order.** After each one: typecheck, test, commit (`feat(NN): R1.2 nearest eligible center`), add a row to `AI-LOG.md`, update `STATUS.md`. The first requirement alone must be a finished app.
5. **Verify in a browser:** start `pnpm dev` in the background and use the Playwright MCP tools to click through the golden path at 390 px and 1280 px. Fix what you see.
6. **Polish:** empty/loading/error states, motion (`gsap-motion`), accessibility (keyboard path, contrast, reduced motion), copy in all three languages.
7. **Gate:** `node ../../scripts/smoke.mjs --app NN-slug` must pass. Write `DEMO.md` (golden path ≤ 2 min) and set `STATUS.md` to `Phase: done`. Then **stop**.

## Rules

- **Write only inside your app folder.** The guard hook blocks edits elsewhere. `packages/*` and `docs/` are frozen during a batch: put requests (new layer, new component, a bug in a package) in your app's `NOTES.md`, and work around them locally meanwhile.
- **No git push, merge, rebase, reset --hard, worktree or branch switching.** Commit only. The human reviews and merges.
- **Dependencies:** use what your `package.json` already has. If you truly need another catalog package, run `pnpm --filter @rcene/NN-slug add <pkg>` (catalog versions only) and justify it in `NOTES.md`. Never upgrade majors.
- **Data:** read layers through `@rcene/data`. Never read `D:\monica` or `C:\lgu_portal`. Synthetic records use codes (`HH-0001`, `T-042`), **never personal names**. Seed all randomness (`createRng(seed)`) so demos repeat.
- **Hazard answers have three states:** in a mapped zone (with level), not in a mapped zone, outside data coverage. **Never display "safe"**, in any language. Distances are straight-line and labelled so. OSM-derived evacuation sites are "Candidate — not verified by CDRRMO".
- **Every UI string goes through `src/i18n/strings.ts`** (`extendStrings(common, {en, war, fil})`). Draft Waray and Filipino, and list AI-drafted strings in `NOTES.md` under "Translations to review".
- **Offline:** no CDN fonts, scripts or tiles by default. The online OSM basemap is an opt-in toggle only.
- **Accessibility:** color + icon + text label, never color alone. Every action works by keyboard. Respect `prefers-reduced-motion`. WCAG AA contrast.
- **Credit sources** on `/sources` (`SourcesPage`). The disclaimer footer comes with `AppShell`.

## Autonomy (overrides plugin workflows such as Superpowers)

- The brief is the approved design. **Skip brainstorming and clarifying questions.** Make reasonable choices and record them in `NOTES.md` under "Decisions".
- You are already in an isolated worktree. Don't create another one.
- Don't run branch-finishing, merge or PR flows. Stop when the definition of done is met.
- Keep plans and notes in `apps/NN-slug/docs/`, not in the repo-level `docs/`.
- Prefer working inline over spawning many subagents. Five sessions share one usage budget.

## Code conventions

- TypeScript 6 strict with `erasableSyntaxOnly`: no `enum`, no parameter properties, no namespaces. Use `import type` for types. Include the `.ts`/`.tsx` extension on relative imports.
- React 19, function components, `react-router` **7** (`import … from "react-router"`, `createBrowserRouter`). Export the route table from `src/routes.tsx` so a platform can mount it later.
- Pinned majors (in the pnpm catalog): motion 12 (`motion/react`), TanStack Table 8, vitest 4, lucide-react 0.577, maplibre-gl 6 (expressions only, e.g. `["get","level"]`), zod 4, Tailwind 4 (CSS-first, no config file).
- In apps, `@/` maps to `src/`. Shared primitives come from `@rcene/ui/components/<name>`; app-only shadcn components go in `src/components/ui/`.
- Stores: `createSyncedStore("NN-slug:<name>", …)`. Persist state only, never layers.

## Skills

| Task | Skill |
|---|---|
| Any map or GeoJSON code | `maplibre-gis` |
| Motion, count-ups, scroll stories | `gsap-motion` (imports from `@rcene/ui/motion`) |
| 3D (02, 17 only) | `r3f-scenes` |
| In-browser AI (06, 10, 20) | `offline-ai` |
| Charts and dashboards | `dataviz` |
| Converting GIS data (00-data only) | `geo-data-prep` |
| UI direction, critique, copy, accessibility | `frontend-design`, Design plugin (`design-critique`, `ux-copy`, `accessibility-review`) |

## On `main` (orchestrator mode)

Launch batches with `powershell -ExecutionPolicy Bypass -File scripts\launch-worktrees.ps1 -Batch 1`, and monitor with `-Status`. Review each branch (`/code-review`, smoke test), merge with `git merge --no-ff proj/NN-slug`, and apply `NOTES.md` package requests between batches. See `docs/PARALLEL.md` and `docs/SKILLS.md`.
