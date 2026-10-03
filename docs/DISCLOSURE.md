# Disclosure: what was built before the event

RSCENE 2026 AI Vibe Coding Challenge · October 7, 2026 · Tandaya Hall, Catbalogan City · Zaldy A. Jabiñar (solo)

Part of this entry was built before today. We say so up front, and the repository shows exactly which part.

## Prepared before October 7

- **Shared packages** (`packages/*`): data contracts and loaders, geometry helpers, a cross-window store, translations, UI and map components. They are generic and hold no project's features.
- **20 single-feature apps** (`apps/01-ligtas` … `apps/20-sumat`), one per proposal in `docs/PROPOSALS.md`, built as working apps.
- **Data conversion:** Catbalogan boundaries and barangays (OCHA/HDX), CDRRMO/CPDCO risk maps (used with LGU permission) and OpenStreetMap facilities, converted into `packages/data/files/`.
- **Briefs:** one written spec per app in `docs/projects/`.
- **Tooling:** Claude Code project skills, hooks, and the launcher `scripts/launch-worktrees.ps1`.

## How it was built

All of it was built with AI, using Claude Code. Each app was built from its brief in its own parallel session, in its own git worktree, five or so at a time. Hooks kept each session inside its own app folder. Every commit has an entry in that app's `AI-LOG.md`: what was asked, what the AI produced, and what a human kept, changed or rejected. Each app was checked by an automated smoke test with Playwright screenshots. The data conversion ran in a separate session on the builder's own PC, because the source files never leave it.

## Done on the day (the four hours)

- Picked **one** pre-built app to continue: `apps/________` *(filled in on the day)*.
- Extended it toward its platform: new features, integration, tests, polish.
- Made the poster and this demo.

Every on-the-day commit has an entry in the chosen app's `AI-LOG.md`.

## How to verify

The repository was tagged `pre-event-freeze` on October 6, and the tag was pushed to the remote that day.

```
git show --stat pre-event-freeze              # the frozen pre-event state
git log --oneline pre-event-freeze..HEAD      # every commit made on the day
git diff --stat pre-event-freeze..HEAD        # files changed on the day
git diff pre-event-freeze..HEAD               # the full change
```

## If pre-built code is not allowed

We asked the organizers by October 4 whether code built before the event may be used.

**Answer:** *(recorded here when received)*

If the answer is no, the entry starts from the generic template and the shared packages only (`apps/_template` and `packages/*`), which contain no project feature code. Every feature is then built during the four hours, and the 20 pre-built apps are not used. The same `git diff pre-event-freeze..HEAD` shows that work.

## Poster version

> **Built before today, with AI:** data, shared libraries and 20 single-feature apps (Claude Code, parallel sessions). **Built today:** everything after the `pre-event-freeze` tag, shown by `git diff pre-event-freeze..HEAD`.
