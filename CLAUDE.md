# RCENE monorepo — orchestrator notes

> **If your working directory is `apps/<slug>` (or a copied app folder), ignore this file and follow that folder's `CLAUDE.md`.** Everything below is for the orchestrator on `main` and for the 00-data session, both at the repo root.

20 pre-built React apps for Catbalogan City (RSCENE 2026 AI Vibe Coding Challenge, Oct 7). On the day one app is picked and continued for 4 hours; the demo runs **offline**, with no server and no runtime AI API. Every `apps/NN-slug/` is a **self-contained project** (own `package.json` and lockfile, its own copy of the shared code in `rcene/`, its own `data/`, `CLAUDE.md`, skills, hooks and smoke test), so it can be copied out and run with `npm ci`. There is no root `packages/` folder.

## Repo map

| Path | What |
|---|---|
| `apps/_template/` | The reference app: generator source, and the reference copy of the shared code (`rcene/`), app skills (`.claude/skills/`), hooks, scripts and app docs. Port 5100 |
| `apps/NN-slug/` | One app per proposal (ports 5101–5120; preview = port + 1000), generated from the template |
| `data/` | Canonical data: `files/` (real, from the 00-data session), `fixtures/` (fake), `README.md` (catalogue). Apps get a copy via `pnpm sync-data` |
| `docs/projects/` | `projects.json` (manifest) and one brief per project; each brief is copied into its app as `docs/brief.md` |
| `docs/` | `PRD.md`, `PROPOSALS.md`, `PARALLEL.md` (the build how-to), `SKILLS.md`, `DISCLOSURE.md` |
| `scripts/` | Root tooling (below), `launch-worktrees.ps1`, `data/*` (data tools), `hooks/*` (root sessions) |
| `stack.json` | The exact version table every app's `package.json` is generated from |
| `.claude/` | Root settings (they do **not** apply inside an app folder) and the root-only skill `geo-data-prep` |

## Tooling (repo root)

| Command | Does |
|---|---|
| `pnpm install` | Once per checkout or worktree: one install for every app |
| `pnpm --filter @rcene/<slug> dev` | Run one app (or `pnpm dev` inside its folder); the template is `@rcene/template` |
| `pnpm test` · `pnpm typecheck` · `pnpm build` | Whole repo |
| `pnpm new-app <slug>` | Generate `apps/<slug>` from the template and its `projects.json` row (`--all`, `--dry-run`; started apps only with `--force`) |
| `pnpm sync-shared --all` | Three-way push of the template's shared code, scripts, skills, config and docs (briefs included) into the apps. Files an app changed are skipped and reported unless `--force`; started apps only when named or with `--include-started`; `--dry-run`, `--only rcene,docs,…` |
| `pnpm sync-data` | Mirror root `data/` into every app's `data/` (started apps included) |
| `pnpm lockfiles` | Regenerate each app's `package-lock.json` (for standalone `npm ci`) |
| `pnpm check-standalone --all` | Check that no app references anything outside its folder; `--install <slug>` copies the app to a temp folder and runs `npm ci`, typecheck, test, build and smoke there |
| `pnpm stack:check` | Every app's versions against `stack.json` (`node scripts/stack.mjs --write` fixes them) |
| `node scripts/smoke.mjs --app <slug>` | Wrapper over the app's own `npm run smoke` (`--app template`, `--all`; other flags pass through) |
| `node scripts/fetch-models.mjs --app <slug>` | Fill an AI app's `models/` through a shared download cache (06, 10, 20) |

## The 00-data session

Runs **at the repo root** (its own worktree, branch `proj/00-data`), only on the user's PC, where the GIS archive is. Brief `docs/projects/00-data.md`, skill `geo-data-prep`. Write scope: `data/**` and `scripts/data/**`. It commits the root `data/files/` only; after the merge, run `pnpm sync-data` on main and commit the app copies. Never read `D:\monica`; never copy from `C:\lgu_portal`.

## Batches

```powershell
powershell -ExecutionPolicy Bypass -File scripts\launch-worktrees.ps1 -Batch 1 -DryRun   # look first
powershell -ExecutionPolicy Bypass -File scripts\launch-worktrees.ps1 -Batch 1
powershell -ExecutionPolicy Bypass -File scripts\launch-worktrees.ps1 -Status
```

Each session starts **inside** `<worktree>\apps\<slug>` with that app's `CLAUDE.md`, settings (guard hooks), skills and Playwright MCP, exactly as a copied folder would on Oct 7. `-Resume` reopens a session, `-Remove` drops a worktree (keep the branch). Details: `docs/PARALLEL.md`.

## Review and merge (main checkout)

1. `git switch proj/NN-slug`, then `/code-review` and `node scripts/smoke.mjs --app NN-slug`; look at `apps/NN-slug/docs/screenshots/`.
2. Read the app's `NOTES.md`: "Shared-code changes (for the template)", "Requests for the data session", "Dependencies added", decisions.
3. `git switch main`, `git merge --no-ff proj/NN-slug`. If `pnpm-lock.yaml` conflicts, run `pnpm install` and commit.

## Package window (on main, between batches)

1. Apply what the apps asked for **in the template**: `apps/_template/rcene/**`, its skills, scripts or docs. Carry back good shared-code changes from merged apps.
2. Check the template: `pnpm --filter @rcene/template test`, `typecheck`, `smoke`.
3. `pnpm sync-shared --all --dry-run`, then without `--dry-run` (name apps or add `--include-started` for apps already in progress; review the conflicts it reports).
4. `pnpm sync-data` if `data/` changed; `pnpm lockfiles` and `pnpm stack:check` if versions changed (edit `stack.json` first).
5. `pnpm check-standalone --all`, then `pnpm test; pnpm typecheck; pnpm build`, and commit. Later batches start from the updated main.

## Rules at the root

- Never read `D:\monica`. Never copy from `C:\lgu_portal`. Keep the repo private (permission-tier data in `data/files/`).
- Apps never import from outside their folder. Shared code changes go to the template first, then `pnpm sync-shared`.
- Briefs are the spec: edit `docs/projects/*.md`, then `pnpm sync-shared <slug> --only docs` (`docs/brief.md` is read-only in an app session).
- Before the event: `pnpm check-standalone --install <slug>` for the shortlist, smoke every shortlisted app with Wi-Fi off, then tag `pre-event-freeze` (see `docs/PARALLEL.md` and `docs/DISCLOSURE.md`).
