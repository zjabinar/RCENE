# Running the parallel build (Windows)

You'll pre-build 20 apps with about 5 Claude Code sessions at a time. Each session runs in its own **git worktree**, on its own **branch** (`proj/NN-slug`), on its own **port**. `docs/projects/projects.json` is the manifest, and each project's brief in `docs/projects/` is its spec.

```
main ──┬── proj/00-data      (batch 0, local data conversion — merge first)
       ├── proj/01-ligtas    C:\RSCENE-wt\01-ligtas   :5101
       ├── proj/03-likas     C:\RSCENE-wt\03-likas    :5103
       └── …                 one worktree + one Claude tab per project
```

## One-time setup

1. **Node ≥ 22.18 and pnpm 10:** `node -v`, then `npm i -g pnpm@10` (or `corepack enable`).
2. **Git:** `git config --global core.longpaths true`. Windows paths get long inside `node_modules`.
3. **Claude Code:** signed in. Install the user-scope plugins listed in `docs/SKILLS.md` (Superpowers, frontend-design, Design).
4. **Windows Terminal** (`wt.exe`). Optional, but each session then opens as a tab in one window.
5. **Short worktree root on the same drive as the pnpm store.** Default `C:\RSCENE-wt`. pnpm hard-links from its store only within one drive, so worktrees on `D:` copy every file instead.
6. **Microsoft Defender exclusions** for the repo folder, `C:\RSCENE-wt` and `%LOCALAPPDATA%\pnpm\store`. Without them, installs are slow and fail with EPERM/EBUSY.
7. **Merge this setup branch into `main`**, then `pnpm install` in the main checkout and check `pnpm test` passes.

## The flow

| Step | Command (from the main checkout, in PowerShell) | Notes |
|---|---|---|
| 0. Data | `powershell -ExecutionPolicy Bypass -File scripts\launch-worktrees.ps1 -Batch 0` | One session converts `D:\lgu_portal - GIS` into `packages/data/files/` (brief `00-data.md`). Review its output, then `git merge --no-ff proj/00-data`. Apps work on fixtures until then, with a "Sample data" badge |
| 1. Batch 1 | `… -Batch 1` | 01 Ligtas, 03 Likas, 04 Bantay, 16 Libot, 18 Kalinga. Start with `-Project 01,03,16` (3 sessions) and watch `/usage` before adding more |
| Watch | `… -Status` | Per project: commits ahead of main, last commit, files changed outside its folder (should be 0), first line of `STATUS.md` |
| Review | in the main checkout: `git switch proj/01-ligtas`, `/code-review`, `node scripts/smoke.mjs --app 01-ligtas`, open `apps/01-ligtas/docs/screenshots/` | Read the app's `NOTES.md` for package requests and decisions |
| Merge | `git switch main` then `git merge --no-ff proj/01-ligtas` | If `pnpm-lock.yaml` conflicts, run `pnpm install` and commit. That regenerates it |
| Package window | on main, between batches | Apply the requests collected in each app's `NOTES.md` to `packages/*`, run `pnpm typecheck; pnpm test; pnpm build`, commit. Later batches start from the updated main |
| Batches 2–4 | `… -Batch 2`, `… -Batch 3`, `… -Batch 4` | B4 (02 Tubig, 06 Snap, 15 Bakhaw, 17 Banig, 19 Ayuda) is the riskiest. Treat it as optional |
| Resume | `… -Project 05 -Resume` | Reopens the tab with `claude --continue`, e.g. after a usage limit or a reboot |
| Clean up | `… -Project 01 -Remove` | Removes the worktree and keeps the branch. Never delete a worktree folder by hand: pnpm uses junctions |

Useful flags:
- `-DryRun` prints every command and the tab script without running anything. **Run it first.**
- `-NoClaude` creates the worktrees and installs, but doesn't open sessions.
- `-Model <id>` runs cheaper batches on a smaller model.
- `-PermissionMode auto|default|plan` changes how much each session asks.
- `-StaggerSeconds 20` spaces out session starts.

## What happens in each tab

The launcher runs `claude --permission-mode acceptEdits "Begin project NN-slug …"` in the worktree:
- The **SessionStart hook** injects the project, brief, port, data status and `STATUS.md`.
- The session follows the **session protocol** in `CLAUDE.md`: plan, then domain tests, then features with per-requirement commits and `AI-LOG.md` rows, then Playwright verification, polish, and the smoke gate. Then it stops.
- The **guard hook** blocks edits outside `apps/NN-slug/`, any `git push`/`merge`/`rebase`, and anything touching `D:\monica`, `C:\lgu_portal` or credential files.

**The first time in each new worktree,** Claude Code asks you to trust the folder and to approve the project MCP server (Playwright). Click through once per tab. On Windows, "don't ask again" approvals stay in that worktree, so most permissions come from the committed `.claude/settings.json`.

Turn on a terminal bell or notification (`/config`) so a tab flags when it's waiting for you.

## Capacity planning

| Resource | Per session | 5 sessions |
|---|---|---|
| RAM | Claude Code + Vite dev server + a browser for Playwright: about 1.5–2.5 GB | 8–12 GB. Close other apps |
| Disk | Tens of MB per worktree; dependencies are hard-linked from the pnpm store | under 1 GB |
| Usage | Each session works for hours | Watch `/usage`. Stagger starts. Use `-Resume` after a limit |

Each app has a fixed port (5101–5120, preview +1000) and `strictPort`, so two sessions never steal each other's port.

## Merge order and conflicts

- Each branch only changes its own `apps/NN-slug/`, so merges are clean. The lockfile is the only shared file that can change; regenerate it with `pnpm install`.
- Don't keep worktrees open in VS Code while sessions run: its git polling locks the index.
- `git config gc.auto 0` is set during batches (no auto-gc while 5 sessions commit). Run `git gc` when you're done.

## Before the event (Oct 6)

1. Merge the finished apps. Run `pnpm install --frozen-lockfile; pnpm typecheck; pnpm test; pnpm build` on main.
2. Run `node scripts/smoke.mjs --app <slug>` for every shortlisted app, **with Wi-Fi off**, on the competition laptop.
3. `git tag pre-event-freeze` and push the tag (see `docs/DISCLOSURE.md`).
4. On Oct 7, branch from the tag for the chosen app (`git switch -c entry/<slug> pre-event-freeze`) and continue there.
