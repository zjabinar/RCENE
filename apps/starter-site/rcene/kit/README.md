# `@rcene/kit`: the RCENE design blocks

Ready-made, themed, accessible blocks built on `@rcene/ui`. Use them before writing your own UI (skill `rcene-design`). Every block:
- takes its colours from the theme tokens, so it follows the palette (habi, dagat, fiesta, gabi, malinaw) and the mode (light or dark), and the showcase surface;
- works by keyboard, with visible focus and correct roles, and passes axe in jsdom (`*/a11y.test.tsx`);
- reads its own labels ("Next", "Search", "Print"…) in English, Waray and Filipino; you pass the content, already translated;
- respects reduced motion;
- needs no network.

## Import by family

| Import | What | Docs |
|---|---|---|
| `@rcene/kit/app` | Application screens: `PageHeader`, `ConsoleLayout`, `BoardShell`, `BoardRotator`, `KpiRow`, `DataTable`, `ChartCard`, form fields, `Wizard`, `StatusTimeline`, `CapacityMeter`, `QrDisplay`, `IllustratedState` | `app/README.md` |
| `@rcene/kit/site` | Websites and data stories: `SiteShell`, `Section`, `Hero`, `FeatureGrid`, `StatBand`, `ScrollyChapter`, `BeforeAfter`, `StoryTimeline`, `CallToAction`, `SiteFooter`, `WeaveDivider` | `site/README.md` |
| `@rcene/kit/poster` | The A3/A2 poster and the live demo: `PosterPage`, `SixPanelPoster`, `PosterFigure`, `AiBuiltPanel`, `QrToApp`, `PrintButton`, `PresenterMode` | `poster/README.md` |
| `@rcene/kit/brand` | The RCENE mark and decoration: `AppMark`, `Wordmark`, `WeavePattern`, `SpotIllustration`, `OgCard` | `brand/README.md` |
| `@rcene/kit` | `Surface` (a region in the showcase look or another palette), `kitStrings`, `useKitStrings` | below |

Import from the sub-path (`@rcene/kit/app`), not from `@rcene/kit`, so a page only bundles the family it uses (the app family pulls in TanStack Table and Recharts; the site family GSAP plugins).

## `Surface`

```tsx
import { Surface } from "@rcene/kit";

<Surface variant="showcase" className="rounded-2xl p-8">…</Surface>   // neon on navy, Exo 2, glow
<Surface palette="malinaw">…</Surface>                                // another palette, current mode
<Surface palette="habi" mode="light">…</Surface>                      // a light poster inside a dark page
```

Every token inside (`bg-background`, `text-foreground`, `bg-primary`, `chart-*`…) follows the region. It never changes the user's theme choice. Keep **one showcase surface per page**. For a whole view use AppShell `surface="showcase"` / `palette` / `mode` instead (`rcene/ui/README.md`, "Theme").

## Strings

The kit's labels live in `<family>/strings.ts` (keys `kit.<block>.<thing>`), merged into `kitStrings` (`i18n.ts`) on top of the ui strings. Blocks read them with `useT(useKitStrings())`, which layers the app's own table (AppShell `strings`) on top: to reword a kit label in one app, add the same key to `src/i18n/strings.ts`. Waray and Filipino are AI drafts listed in `rcene/i18n/REVIEW.md`.

## Rules for the kit itself

- Generic only: no project's feature code (no hazard lookup, queue or eligibility logic). That is what keeps it fair to prepare before the event (`docs/DISCLOSURE.md`).
- Layering: the kit may import `@rcene/ui`, `@rcene/i18n`, `@rcene/data`, `@rcene/map` and `@rcene/store`; `rcene/ui` never imports the kit.
- Changes go to the template first (`apps/_template/rcene/kit`), then `pnpm sync-shared`; an app that changes its copy lists the change in `NOTES.md` under "Shared-code changes (for the template)".
- The gallery (`apps/kit-gallery`) must have an example for every exported component; its `registry.test.tsx` checks that.
