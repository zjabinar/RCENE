# PN · Title

| | |
|---|---|
| **App** | `apps/pNN-slug` · dev port 52NN · preview 62NN |
| **Batch** | 5 or 6. Run it after the batches of its module apps are merged into `main` |
| **Proposal** | `docs/proposal.md` (PN in the monorepo's `docs/PROPOSALS.md`) |
| **Modules** | `#NN Title` → which core or stretch (brief copied to `docs/modules/NN-slug.md`), one line per module app |
| **Roles** | Role → route → window, one per role in `project.json` `roles` (the scaffold already has these routes) |
| **Data** | real layers used · synthetic data (seeded) · tier |
| **AI in the app** | none / ★AI in-browser (skill `offline-ai`) |
| **Skills to use** | `maplibre-gis`, `gsap-motion`, … |

> One-sentence pitch a judge remembers: the workflow across roles, not a feature list.

## Problem

Two to four sentences grounded in `docs/proposal.md`: the documented gap, who suffers and why one connected workflow beats separate apps.

## Roles, routes and windows

| Role | Route | Window in the demo | Needs |
|---|---|---|---|

The generated scaffold already has: `/` (the role launcher: `RoleLauncher` cards with **Open** and **New window**), one placeholder page per role route, the nav, and `role.<id>.title` / `role.<id>.summary` strings in three languages (`src/roles.ts`, `src/pages/`, `src/i18n/strings.ts`). Replace each placeholder with the real view; keep the routes. Add routes with parameters (for example `/center/:id`) under the role's path, and add them to `smokeRoutes` in `project.json`.

## Lift, then wire

A platform is built from its module apps, not from scratch.

| Module app | Becomes | Lift (copy into `src/modules/<name>/`) | Change after lifting |
|---|---|---|---|
| `#NN Title` | Core 1 | `src/domain/*` (with tests), the components named here | Store merged into the spine; props instead of app globals |

1. **Check each module app** in this worktree: `../NN-slug/STATUS.md` says `Phase: done`, and its tests pass (`npm run test` in that folder).
2. **Lift** by copying (`cp -r ../NN-slug/src/domain src/modules/<name>/domain`, and so on). Reading other app folders is fine; never edit them. Fix the imports, merge its strings into `src/i18n/strings.ts` under the module's prefix, and make its tests pass here.
3. **If a module app isn't done**, build only the requirements this brief lists, from its brief in `docs/modules/NN-slug.md`. Domain first, test-first, exactly as that brief specifies, so a later lift can replace it.
4. **Record every lift** in `NOTES.md` under "Lifted modules": app, its commit (`git log -1 --format=%h -- ../NN-slug`), files and what you changed.

## Spine (one store, keyed by barangay)

`createSyncedStore("pNN-slug:spine", …, { version: 1 })`: the one store every role reads and writes. Give its shape (per-barangay records keyed by PSGC or barangay name), its actions, what is persisted and which role writes what. Each role usually runs in its own window, so the spine is what makes one role's action appear in another's window in under a second.

## MVP requirements

Build in this order. **R1 alone must be a finished, demoable single-feature app** (the platform degrades into its first module).

| ID | Requirement | Acceptance criteria (testable) |
|---|---|---|
| R1 | Core 1 | |
| R2 | Core 2 | |
| R3 | Core 3 | |
| R4 | The cross-role workflow | One action in role A's window changes role B's window in < 1 s; a reload restores it |
| R5 | Languages, `/sources`, disclaimer | |

## Domain functions (test-first in `src/domain/`)

The platform-level functions (the workflow across modules), with signatures and the cases each test must cover. Lifted module functions keep their own tests in `src/modules/<name>/`.

## Data

- Real layers via `@rcene/data` (`useLayer`, `useZones`, `useOptionalLayer`); fixtures until the data session lands. Pass `layers={[…]}` to `AppShell`.
- Synthetic data: schema, seed, size, where it lives. Codes, never personal names.
- Store keys: `pNN-slug:spine` (plus `pNN-slug:<other>` if needed). What is persisted.

## Experience

- The **signature**: what several windows side by side show that one app can't. Name the skill or recipe.
- The **wow moment**, and accessibility specifics (keyboard path, live regions, reduced motion).
- **Design:** the palette (`habi` unless the row sets `theme`) and the kit blocks per role (skill `rcene-design`): consoles on `ConsoleLayout`, boards on `BoardShell` in `malinaw`, the landing or story on the site blocks. Name the one showcase surface, if any.

## Golden-path demo (≤ 3 minutes)

Window layout first (which role in which window, at which size), then numbered steps. Each step names the role, the window and what changes in the other windows.

## Definition of done

- [ ] All MVP requirements meet their acceptance criteria
- [ ] Domain and lifted-module tests pass: `npm run test`
- [ ] `npm run typecheck` and `npm run build` pass
- [ ] `npm run smoke` passes for `/`, every role route and `/sources` (offline, no console errors, axe clean, screenshots at 390 and 1280)
- [ ] Every string comes from `src/i18n/strings.ts` (en + war + fil drafts); AI-drafted strings listed in `NOTES.md` under "Translations to review"
- [ ] `/sources` lists every dataset used; disclaimer footer on every view
- [ ] `NOTES.md` "Lifted modules" lists every lift; `STATUS.md`, `AI-LOG.md` and `DEMO.md` are current

## If time runs out

What to cut, in order, and which single-feature app (#NN) the platform falls back to.

## Out of scope

## Stretch (only after the definition of done is met)
