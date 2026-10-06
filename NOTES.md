# Notes — Andam Catbalogan

## Shared-code changes

The shared code in `rcene/` is used as-is where possible. Each change: file, what changed, why.

- `rcene/config/vite.ts`: vitest `testTimeout` 30 s (the axe and guard-hook tests exceed 5 s on this laptop when the whole suite runs).
- `rcene/kit/README.md`: rules rewritten for the single app (no template or sync step).

## Data

Raw GIS is in `sources/gis/raw/` (local, gitignored). Converted layers go to `data/files/` with the skill `geo-data-prep`; until then every layer is a fixture.

- `scripts/data/include/*.txt` (the level-mapping and facility-kind include files the skill describes) do not exist yet: write them when converting.

## Dependencies added

- `mapshaper` 0.6.121, `@tmcw/togeojson` 7.1.2, `@xmldom/xmldom` 0.9.12, `fflate` 0.8.3 (devDependencies): the data tools in `scripts/data/`, previously installed at the monorepo root.

## Decisions and open questions

- 2026-10-07: the monorepo was collapsed into this single app, based on the P1 scaffold (`apps/p01-andam`). The other 29 scaffolds and the monorepo tooling were removed (they are in the history of `main`). Reference material moved to `sources/` (catalogue: `sources/README.md`).
- Slug `andam`: stores are `andam:<name>`, the launcher's window prefix is `andam`.
- Admin layer on top of the brief: users (demo accounts, no passwords, per-window session), audit log, settings, dashboard, CRUD for common information. It is outside the PRD's scope (which rules out real accounts), so sign-in is labelled demo-only.
- `scripts/hooks/guard.mjs`: fixed a hole where a write to a missing folder on a drive root (`C:\x\y`) was treated as inside the app.

## Translations to review

AI-drafted Waray and Filipino strings that a person should check (key, English, draft).

- (none yet)

## Modules

What each module brief in `docs/modules/` became (see "Lift, then wire" in `docs/brief.md`).

| Module | Built in | Notes |
|---|---|---|
| (none yet) | | |

## Copied from `sources/templates/`

| From | To | Changes |
|---|---|---|
| (none yet) | | |
