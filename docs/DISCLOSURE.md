# Disclosure: what was built before the event

RSCENE 2026 AI Vibe Coding Challenge · October 7, 2026 · Tandaya Hall, Catbalogan City · Zaldy A. Jabiñar (solo)

Part of this entry was prepared before today. We say so up front, and the repository history shows exactly which part.

## Prepared before October 7

Everything on `main` up to commit `9b806eeae2e443b8b4520be1bb35c141b2077baa` (October 4, 2026), pushed to the private remote that day. At that commit the repository was a monorepo of app folders under `apps/`:

- **Shared code** (`rcene/`): data contracts and loaders, geometry helpers, a cross-window store, translations (English, Waray, Filipino), UI and map components. It is generic and holds no project's features.
- **Design kit** (`rcene/kit`, `rcene/ui/theme`): five colour palettes in light and dark, and generic page blocks for application screens, websites, the poster, the demo and the brand. Three reference projects showed it in use (`kit-gallery`, `starter-app`, `starter-site`); their source is now in `sources/templates/`.
- **Briefs:** a written spec for each of the 30 proposals (now in `sources/proposals/`). The Andam Catbalogan brief, PRD and module briefs are in `docs/`.
- **Scaffolds:** one generated folder per proposal. **None of the app features was built before the event:** every app folder still held only the generated scaffold (a role launcher and placeholder pages for the platforms).
- **Data:** fake sample fixtures in `data/fixtures/` and the conversion tools in `scripts/data/`. No real layer had been converted yet (`data/files/` was empty).
- **Tooling:** Claude Code skills and hooks, the smoke test, and the generator and sync scripts for the monorepo.

## How it was built

All of it was built with AI, using Claude Code, with the commits and their messages as the record.

## Done on the day (the four hours)

- `b97136b` and later: the monorepo was collapsed into this single app (Andam Catbalogan, the P1 scaffold), and the material it does not use moved into `sources/`. The monorepo tooling and the unused scaffolds were removed (still in the history of `main`).
- Everything after that: the features of Andam Catbalogan (resident hazard check, warning console, centers, public board) and the admin layer (users, audit log, settings, dashboard, common-information records), the data conversion, the poster and the demo.

Every on-the-day commit has a row in `AI-LOG.md`: what was asked, what the AI produced, and what a human kept, changed or rejected.

## How to verify

```
git show --stat 9b806ee                     # the pre-event state (the monorepo)
git log --oneline 9b806ee..HEAD             # every commit made on the day
git diff --stat 9b806ee..HEAD               # files changed on the day
git diff 9b806ee..HEAD -- src               # the app code written on the day
```

If a tag is wanted, `git tag pre-event-freeze 9b806ee` marks the same commit.

## If pre-built code is not allowed

We asked the organizers by October 4 whether code built before the event may be used.

**Answer:** *(recorded here when received)*

If the answer is no, only the generic parts are kept from before the event (the shared code in `rcene/` and the data tools), which hold no project feature code. Every feature is built during the four hours, as `git diff 9b806ee..HEAD -- src` shows.

## Poster version

> **Prepared before today, with AI:** the shared libraries, the design kit, the project briefs and the data tools (Claude Code). **Built today:** the app itself and everything after commit `9b806ee`, shown by `git diff 9b806ee..HEAD`.
