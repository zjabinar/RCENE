# Disclosure: what was built before the event

RSCENE 2026 AI Vibe Coding Challenge · October 7, 2026 · Tandaya Hall, Catbalogan City · Zaldy A. Jabiñar (solo)

Part of this entry was built before today. We say so up front, and the repository shows exactly which part.

## Prepared before October 7

All of this lives in the RCENE monorepo, frozen at the git tag `pre-event-freeze`:

- **Shared code** (reference copy in `apps/_template/rcene/`): data contracts and loaders, geometry helpers, a cross-window store, translations, UI and map components. It is generic and holds no project's features. Every app carries its own copy in `rcene/`, so each app folder works on its own.
- **Design kit** (in the same shared code, `apps/_template/rcene/kit` and `rcene/ui/theme`): five colour palettes in light and dark, and generic page blocks for application screens, websites, the poster, the demo and the brand. It holds no project's features. Three reference projects show it in use: `apps/kit-gallery`, `apps/starter-app` and `apps/starter-site`.
- **20 single-feature apps** (`apps/01-ligtas` … `apps/20-sumat`), one per proposal in `docs/PROPOSALS.md`, built as working apps. Each is a self-contained folder: its own `package.json` and lockfile, shared code, data, Claude Code instructions and smoke test.
- **Data conversion:** Catbalogan boundaries and barangays (OCHA/HDX), CDRRMO/CPDCO risk maps (used with LGU permission) and OpenStreetMap facilities, converted into the root `data/files/` and copied into each app's `data/`.
- **Briefs:** one written spec per app in `docs/projects/` (each app also has it as `docs/brief.md`).
- **Tooling:** Claude Code skills and hooks, the launcher `scripts/launch-worktrees.ps1`, the generator and sync scripts, and the smoke test.

## How it was built

All of it was built with AI, using Claude Code. Each app was built from its brief in its own parallel session, in its own git worktree, five or so at a time, with the session started inside the app's folder. Hooks kept each session inside that folder. Every commit has an entry in that app's `AI-LOG.md`: what was asked, what the AI produced, and what a human kept, changed or rejected. Each app was checked by an automated smoke test with Playwright screenshots. The data conversion ran in a separate session on the builder's own PC, because the source files never leave it.

## Done on the day (the four hours)

- Picked **one** pre-built app to continue: `apps/________` *(filled in on the day)*.
- Continued it in: *(one of the two, filled in on the day)*
  - the branch `entry/<slug>` of the monorepo, created from the tag `pre-event-freeze`; or
  - a copy of the app folder in its own repository (see "Provenance of a copied app folder" below).
- Extended it toward its platform: new features, integration, tests, polish.
- Made the poster and this demo.

Every on-the-day commit has an entry in the chosen app's `AI-LOG.md`.

## How to verify

The monorepo was tagged `pre-event-freeze` on October 6, and the tag was pushed to the remote that day.

On the `entry/<slug>` branch (the preferred way, because the history stays in one repository):

```
git show --stat pre-event-freeze              # the frozen pre-event state
git log --oneline pre-event-freeze..HEAD      # every commit made on the day
git diff --stat pre-event-freeze..HEAD        # files changed on the day
git diff pre-event-freeze..HEAD               # the full change
```

## Provenance of a copied app folder

Each app folder runs on its own (`npm ci`, then `npm run dev`), so on the day it may be copied out of the monorepo (for example to `C:\entry\<slug>`) and continued in a new repository. Provenance is then kept like this:

1. Copy the folder exactly as it is at `pre-event-freeze` (a clean checkout of the tag, without `node_modules/` or `models/`).
2. In the copy: `git init`, then commit everything as the **first commit**, before any change. Its message records where it came from:

   ```
   Import apps/<slug> from <monorepo URL> at pre-event-freeze (<full commit SHA>)
   ```

   (`git rev-parse pre-event-freeze` in the monorepo prints the SHA.)
3. Fill in the same three facts in the copy's `docs/DISCLOSURE.md` (this file):

   | | |
   |---|---|
   | Monorepo | *(URL)* |
   | Freeze commit | *(full SHA of `pre-event-freeze`)* |
   | Imported folder | `apps/<slug>` |

4. Every later commit is on-the-day work, with an `AI-LOG.md` row.

To verify a copy:

```
git rev-list --max-parents=0 HEAD             # in the copy: the import commit (the root commit)
git log -1 --format=%B <import commit>        # its message names the monorepo and the freeze SHA
git diff --stat <import commit>..HEAD         # everything changed on the day
```

To check that the import commit is the frozen folder, export both and compare them:

```
# PowerShell, in an empty scratch folder
mkdir frozen, imported
git -C <monorepo> archive -o "$PWD\frozen.tar" pre-event-freeze:apps/<slug>
git -C <copy> archive -o "$PWD\imported.tar" <import commit>
tar -xf frozen.tar -C frozen
tar -xf imported.tar -C imported
git diff --no-index --stat frozen imported      # no output: identical
```

## If pre-built code is not allowed

We asked the organizers by October 4 whether code built before the event may be used.

**Answer:** *(recorded here when received)*

If the answer is no, the entry starts from the generic template only (`apps/_template`, which includes the shared code in `rcene/` and contains no project feature code). Every feature is then built during the four hours, and the 20 pre-built apps are not used. The same `git diff pre-event-freeze..HEAD` (or, in a copied template folder, the diff from its import commit) shows that work.

## Poster version

> **Built before today, with AI:** data, shared libraries, the design kit and 20 single-feature apps (Claude Code, parallel sessions). **Built today:** everything after the `pre-event-freeze` tag, shown by `git diff pre-event-freeze..HEAD`.
