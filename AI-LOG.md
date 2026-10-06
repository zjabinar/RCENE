# AI log — Andam Catbalogan

Evidence for the "Effective use of AI" criterion (20%) and for the disclosure
(`docs/DISCLOSURE.md`). Add one row per commit, newest last. Keep it honest:
what was asked, what AI produced, what a human kept, changed or rejected, and why.

| When | Commit | Asked / goal | AI produced | Human decision |
|---|---|---|---|---|
| 2026-10-07 | `b97136b` | Turn the unfinished 30-app monorepo into one main app; move maps, GIS, templates and other material into a subfolder | Inventory of the repo (two explore agents), a plan (P1 Andam as the base, `sources/` catalogue), the restructure: P1 lifted to the root, tooling and 29 unused scaffolds removed, data tools repointed, raw GIS copied (gitignored), a guard-hook fix for drive-root paths, a longer test timeout | Chose P1 Andam plus an admin layer, restoring git on a branch, copying the raw GIS, deleting the junk |
| 2026-10-07 | (this commit) | Docs for the single app | Rewritten `CLAUDE.md`, `README.md`, `docs/DISCLOSURE.md` (corrected: the apps were never pre-built), `sources/README.md`, brief/PRD status, skills and data catalogue pointing at `sources/` and npm | Review pending |
