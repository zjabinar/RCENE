# NN · Title

| | |
|---|---|
| **App** | `apps/NN-slug` · dev port 51NN · preview 61NN |
| **Batch** | N |
| **Proposal** | `docs/proposal.md` (#NN in the monorepo's `docs/PROPOSALS.md`) |
| **Reused by platforms** | P# (which feature, see "Platform hooks") |
| **Data** | real layers used · synthetic data (seeded) · tier |
| **AI in the app** | none / ★AI in-browser (skill `offline-ai`) |
| **Skills to use** | `maplibre-gis`, `gsap-motion`, … |

> One-sentence pitch a judge remembers.

## Problem

Two to four sentences grounded in `docs/proposal.md` (documented gap, who suffers, why now).

## Users and routes

| Role | Route | Device in the demo | Needs |
|---|---|---|---|

## MVP requirements

Build in this order. The first requirement alone must be a finished, demoable app.

| ID | Requirement | Acceptance criteria (testable) |
|---|---|---|
| RN.1 | | |

## Domain functions (test-first in `src/domain/`)

Pure functions with signatures and the cases each test must cover.

## Data

- Real layers via `@rcene/data` (`useLayer`, `useZones`) — works on fixtures until the data session lands. Layers that may never arrive (land cover, coastal, heightmap) via `useOptionalLayer`, so a missing file is never requested.
- Synthetic data: schema, seed, size, where it lives (`src/domain/seed.ts`). No personal names.
- Store shape (`createSyncedStore("NN-slug:<name>")`), what is persisted.

## Experience

- Tone, layout (phone-first?), the **wow moment** and which skill/recipe makes it.
- **Design:** the palette (`habi` unless the row sets `theme`) and the kit blocks each route is built from (skill `rcene-design`), e.g. "`/` = `PageHeader` + map; `/board` = `BoardShell` in `malinaw`". Name the one showcase surface, if any.
- Accessibility specifics.

## Golden-path demo (≤ 2 minutes)

Numbered steps a presenter follows; each step names the window/route.

## Definition of done

- [ ] All MVP requirements meet their acceptance criteria
- [ ] Domain tests pass: `npm run test`
- [ ] `npm run typecheck` and `npm run build` pass
- [ ] `npm run smoke` passes (offline, no console errors, axe clean, screenshots at 390 and 1280)
- [ ] Every string comes from `src/i18n/strings.ts` (en + war + fil drafts); AI-drafted Waray/Filipino strings listed in `NOTES.md` under "Translations to review"
- [ ] `/sources` lists every dataset used; disclaimer footer on every view
- [ ] `STATUS.md`, `AI-LOG.md` (one row per commit) and `DEMO.md` are current

## Out of scope

## Stretch (only after the definition of done is met)

## Platform hooks

What to export or keep generic so platform P# can mount these routes/components later.
