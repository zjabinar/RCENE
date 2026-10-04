# G1 · RCENE kit gallery

| | |
|---|---|
| **App** | `apps/kit-gallery` · dev port 5300 · preview 6300 |
| **Kind** | Reference project on `main` (not launched as a session; its `src/` is maintained by hand) |
| **Shows** | Every theme (5 palettes × light/dark) and every `@rcene/kit` block, live, with copyable usage |

> Open it before you design a screen: pick the palette, find the block, copy the example.

## What it is

A living catalogue of the RCENE design system:

- `/`: overview with links to every family.
- `/foundations`: the tokens (colours with their contrast ratios, type scale, radius, shadows, motion).
- `/themes`: the 5 × 2 matrix of palettes and modes.
- `/app`, `/site`, `/poster`, `/brand`: one page per block family, with `/:block` detail pages.
- `/present`: the presenter mode.
- `/sources`.

Each example renders live and shows its source. Preview controls set palette, mode, width (390 or 1280) and language (en, war, fil, or all three side by side with `LangOverride`).

## Rules

- Same as every app: offline, i18n, accessibility, and never "safe".
- `src/registry.ts` must list an example for every public export of `rcene/kit` (`registry.test.ts`).
- Smoke checks every route in light and dark.
- Run it with `pnpm --filter @rcene/kit-gallery dev` (http://localhost:5300).
