# Running the parallel build (Windows)

You'll pre-build 20 single-feature apps and then 10 platforms (P1–P10), with about 5 Claude Code sessions at a time. Each session runs in its own **git worktree**, on its own **branch** (`proj/NN-slug`, `proj/pNN-slug`), on its own **port**, and **starts inside its app folder** (`<worktree>\apps\<slug>`). `docs/projects/projects.json` is the manifest, and each project's brief in `docs/projects/` is its spec (copied into the app as `docs/brief.md`).

Every app folder is a self-contained project: its own `package.json` and `package-lock.json`, its own copy of the shared code (`rcene/`), data (`data/`), `CLAUDE.md`, skills, hooks (`.claude/settings.json`) and Playwright MCP (`.mcp.json`). A session inside it works exactly like the copied folder will on Oct 7.

```
main ──┬── proj/00-data      (batch 0, at the repo root: local data conversion — merge first)
       ├── proj/01-ligtas    C:\RSCENE-wt\01-ligtas\apps\01-ligtas   :5101
       ├── proj/03-likas     C:\RSCENE-wt\03-likas\apps\03-likas     :5103
       ├── …                 one worktree + one Claude tab per project, started in its app folder
       └── proj/p01-andam    C:\RSCENE-wt\p01-andam\apps\p01-andam   :5201  (batch 5, after its modules are merged)
```

## One-time setup

1. **Node ≥ 22.18 and pnpm 10:** `node -v`, then `npm i -g pnpm@10` (or `corepack enable`).
2. **Git:** `git config --global core.longpaths true`. Windows paths get long inside `node_modules`.
3. **Claude Code:** signed in and current (`claude update`). The hooks use the exec form (`command` + `args`) that recent versions support.
4. **Plugins, once per machine, while online.** Each app's `.claude/settings.json` *enables* three plugins (and declares their marketplaces), but enabling doesn't download anything. Install them once:

   ```powershell
   claude plugin install frontend-design@claude-plugins-official
   claude plugin marketplace add anthropics/knowledge-work-plugins
   claude plugin install design@knowledge-work-plugins
   claude plugin marketplace add obra/superpowers-marketplace
   claude plugin install superpowers@superpowers-marketplace
   ```

   The Superpowers marketplace name is not verified: if that install fails, open `/plugin` → Discover, search "superpowers", and adjust the name (also in the template's `.claude/settings.json`, then `pnpm sync-shared --all --only claude`). The Design plugin lists remote connectors (Asana, Figma, Slack, Gmail, …): run `claude plugin details design@knowledge-work-plugins` and disable the connectors you don't need, so unattended sessions never reach for them.
5. **Windows Terminal** (`wt.exe`). Optional, but each session then opens as a tab in one window.
6. **Short worktree root on the same drive as the pnpm store.** Default `C:\RSCENE-wt`. pnpm hard-links from its store only within one drive, so worktrees on `D:` copy every file instead.
7. **Microsoft Defender exclusions** for the repo folder, `C:\RSCENE-wt` and `%LOCALAPPDATA%\pnpm\store`. Without them, installs are slow and fail with EPERM/EBUSY.
8. **Merge this setup branch into `main`**, then `pnpm install` in the main checkout and check that `pnpm test` passes.
9. **Trust the main checkout once:** run `claude` in it and accept the folder-trust prompt. Worktrees of the same repository share that trust in current Claude Code versions; if a new tab still asks (to trust the folder or to approve the app's Playwright MCP server), approve it once in that tab.

## The flow

| Step | Command (from the main checkout, in PowerShell) | Notes |
|---|---|---|
| 0. Data | `powershell -ExecutionPolicy Bypass -File scripts\launch-worktrees.ps1 -Batch 0` | The one session that runs **at the repo root** (brief `00-data.md`, skill `geo-data-prep`). It converts `D:\lgu_portal - GIS` into the root `data/files/`. Review its output, `git merge --no-ff proj/00-data`, then **`pnpm sync-data`** and commit the app copies. Apps work on fixtures until then, with a "Sample data" badge |
| 1. Batch 1 | `… -Batch 1` | 01 Ligtas, 03 Likas, 04 Bantay, 16 Libot, 18 Kalinga. Start with `-Project "01,03,16"` (3 sessions) and watch `/usage` before adding more. With `-File`, pass one batch per run and quote project lists |
| Watch | `… -Status` | Per project: commits ahead of main, last commit, files changed outside its app folder (should be 0), first line of `STATUS.md` |
| Review | in the main checkout: `git switch proj/01-ligtas`, `/code-review`, `node scripts/smoke.mjs --app 01-ligtas`, open `apps/01-ligtas/docs/screenshots/` | Read the app's `NOTES.md`: shared-code changes, data requests, dependencies added, decisions |
| Merge | `git switch main` then `git merge --no-ff proj/01-ligtas` | If `pnpm-lock.yaml` conflicts, run `pnpm install` and commit. That regenerates it |
| Package window | on main, between batches | See below |
| Batches 2–4 | `… -Batch 2`, `… -Batch 3`, `… -Batch 4` | B4 (02 Tubig, 06 Snap, 15 Bakhaw, 17 Banig, 19 Ayuda) is the riskiest. Treat it as optional |
| Batches 5–6 (platforms) | `… -Batch 5`, `… -Batch 6` | B5: P1 Andam, P3 Kalinga, P5 Serbisyo, P6 Negosyo, P10 Barangay 360. B6: P2 Response, P4 Isla Link, P7 Bukas, P8 Libot+, P9 Luntian. Start a platform **after its module apps are merged into main** (its row's `modules`; see "Platforms" below). A platform whose modules aren't done still runs: it builds those modules from their briefs, which costs more |
| Resume | `… -Project "05" -Resume` | Reopens the tab with `claude --continue`, e.g. after a usage limit or a reboot |
| Clean up | `… -Project "01" -Remove` | Removes the worktree and keeps the branch. Never delete a worktree folder by hand: pnpm uses junctions |

Useful flags:
- `-DryRun` prints every command and the tab script without running anything. **Run it first.**
- `-NoClaude` creates the worktrees and installs, but doesn't open sessions.
- `-Model <id>` runs cheaper batches on a smaller model.
- `-PermissionMode auto|default|plan` changes how much each session asks.
- `-StaggerSeconds 20` spaces out session starts.

### Package window (between batches)

Apps own their copy of the shared code, so a fix is made **once in the template** and pushed out:

1. Apply what the apps asked for in `apps/_template/`: `rcene/**` (carry back the good items from each app's "Shared-code changes (for the template)"), skills, scripts, docs. Check it with `pnpm --filter @rcene/template test`, `… typecheck` and `node scripts/smoke.mjs --app template`.
2. `pnpm sync-shared --all --dry-run`, then `pnpm sync-shared --all`. It is a three-way update: files an app has changed are skipped and reported (review them; `--force` overwrites). Started apps are only updated when named or with `--include-started`.
3. Data changed? `pnpm sync-data` mirrors root `data/` into every app, started ones included.
4. Versions changed? Edit `stack.json`, `node scripts/stack.mjs --write`, then `pnpm lockfiles`. `pnpm stack:check` must pass.
5. `pnpm check-standalone --all` (no app reaches outside its folder), then `pnpm typecheck; pnpm test; pnpm build`, and commit. Later batches start from the updated main.

## What happens in each tab

The launcher opens `claude --permission-mode acceptEdits "Begin project NN-slug …"` in `<worktree>\apps\<slug>`:
- Claude Code loads **that folder's** `CLAUDE.md`, `.claude/settings.json` (hooks, permissions, plugins), `.claude/skills/` and `.mcp.json`. The root `.claude/settings.json` does not apply there. The root `CLAUDE.md` is loaded too (Claude Code reads ancestor `CLAUDE.md` files), so it opens with a line telling app sessions to ignore it; root skills load as well, which is why the root keeps only `geo-data-prep`.
- The **SessionStart hook** injects the project, mode, brief, ports, data and model status and `STATUS.md`.
- The session follows the **session protocol** in the app's `CLAUDE.md`: plan, then domain tests, then features with per-requirement commits and `AI-LOG.md` rows, then Playwright verification, polish, and `npm run smoke`. Then it stops.
- The **guard hook** blocks edits outside the app folder, edits to `data/**`, `docs/brief.md`, `scripts/hooks/**` and `.claude/settings.json` on a `proj/` branch, any `git push`/`merge`/`rebase`/branch switch, dependency changes outside the app, and anything touching `D:\monica`, `C:\lgu_portal` or credential files.

Turn on a terminal bell or notification (`/config`) so a tab flags when it's waiting for you.

## Platforms (P1–P10)

A platform is one workflow across several roles (for example CDRRMO console → resident phone → evacuation staff → public board), built from finished single-feature apps. `apps/pNN-slug/` is generated like an app, with three additions:

- `docs/modules/NN-slug.md`: the briefs of its module apps (`modules` in its row), kept in step by `pnpm sync-shared` (group `docs`).
- A starting `src/`: the role launcher at `/` (`RoleLauncher`: each role opens here or in its own sized window), one placeholder page per role route, the nav, role strings in three languages (from the row's `roles`) and a spine store (`<slug>:spine`). `smokeRoutes` covers `/`, every role route and `/sources`.
- `project.json` has `kind: "platform"`, `modules` and `roles`; the session hook says which module apps are done in the worktree.

The session **lifts** each finished module (`../NN-slug`, `STATUS.md` at `Phase: done`) into `src/modules/<name>/` by copying, never by importing across folders, and records it in `NOTES.md` under "Lifted modules". So: merge a platform's module apps first, then launch it from the updated main. Its first requirement is its first module on its own, so a platform that runs out of time is still a finished single-feature entry.

Port 5201–5210 (preview +1000). The ★AI platforms are P2 (06's photo suggestion) and P5 (20's semantic search): fill their `models/` as for the AI apps.

## In-browser AI models (06, 10, 20)

Models are large (> 100 MB each), gitignored and never committed. Before the batch that needs them, while online, fill each AI app's own `models/` (also P2 and P5): inside the app, `npm run fetch-models -- --model e5|clip|all`, or from the root, `node scripts/fetch-models.mjs --app 20-sumat`. Every download also lands in a shared cache (`~/.cache/rcene-models`), so e5 is downloaded once for 10 and 20, and a worktree's app folder fills from the cache (`--from cache`) instead of the network.

## Capacity planning

| Resource | Per session | 5 sessions |
|---|---|---|
| RAM | Claude Code + Vite dev server + a browser for Playwright: about 1.5–2.5 GB | 8–12 GB. Close other apps |
| Disk | The monorepo with every app installed through pnpm: about 1–2 GB, mostly in the shared store; each worktree adds little because pnpm hard-links. A **standalone** app folder installed with `npm ci` takes about 1.0–1.2 GB on its own | Under ~2 GB for the worktrees; plan another ~1.2 GB per copied-out app, plus models (~0.3 GB per AI app) |
| Usage | Each session works for hours | Watch `/usage`. Stagger starts. Use `-Resume` after a limit |

Each app has a fixed port (5101–5120, platforms 5201–5210, preview +1000) and `strictPort`, so two sessions never steal each other's port.

## Merge order and conflicts

- Each branch only changes its own `apps/NN-slug/`, so merges are clean. The root `pnpm-lock.yaml` is the only shared file that can change; regenerate it with `pnpm install`. If an app added a dependency, run `pnpm lockfiles <slug>` after the merge so its `package-lock.json` matches.
- Don't keep worktrees open in VS Code while sessions run: its git polling locks the index.
- `git config gc.auto 0` is set during batches (no auto-gc while 5 sessions commit). Run `git gc` when you're done.

## Before the event (Oct 6)

1. Merge the finished apps. On main: `pnpm install --frozen-lockfile; pnpm typecheck; pnpm test; pnpm build`.
2. `pnpm lockfiles --check` and `pnpm check-standalone --all`. For each shortlisted app, `pnpm check-standalone --install <slug>`: it copies the app to a temp folder and runs `npm ci`, typecheck, test, build and smoke there, exactly as on the day.
3. Fill `models/` in the shortlisted AI apps (see above).
4. On the competition laptop, **with Wi-Fi off**: `node scripts/smoke.mjs --app <slug>` for every shortlisted app.
5. `git tag pre-event-freeze` and push the tag (see `docs/DISCLOSURE.md`).

## On Oct 7: continue the chosen app

Either way works offline, as long as the install happened while online. Pick one and record it in `docs/DISCLOSURE.md`.

**A. A branch of the monorepo (preferred: the history stays in one repository).**

```powershell
git switch -c entry/<slug> pre-event-freeze
pnpm install --frozen-lockfile        # the day before, while online (or already installed)
cd apps\<slug>
claude                                # the app's own CLAUDE.md, hooks and skills; npm run dev
```

On an `entry/*` branch the guard runs in monorepo mode: edits stay in the app folder, dependencies only through `pnpm add` inside it, and commits and pushes are allowed.

**B. A standalone copy of the app folder** (e.g. `C:\entry\<slug>`, no monorepo needed).

```powershell
git archive -o C:\entry\<slug>.zip --prefix=<slug>/ pre-event-freeze:apps/<slug>
Expand-Archive C:\entry\<slug>.zip C:\entry
cd C:\entry\<slug>
npm ci                                                # the day before, while online (fetch-models needs the installed packages)
npm run fetch-models -- --model e5 --from cache      # AI apps: models are gitignored; copy them from the shared cache
git init; git add -A
git commit -m "Import apps/<slug> from <monorepo URL> at pre-event-freeze (<full SHA>)"
npm run smoke                                         # with Wi-Fi off
claude
```

Then fill in the provenance table in the copy's `docs/DISCLOSURE.md`. In a standalone copy the guard runs in free mode: `npm install` and `git push` are allowed, edits stay inside the folder, and the forbidden-folder and credential rules still apply.
