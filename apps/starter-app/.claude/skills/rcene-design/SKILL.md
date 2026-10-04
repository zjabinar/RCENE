---
name: rcene-design
description: The RCENE design system for this app: the five theme palettes in light and dark (@rcene/ui/theme), the "showcase" surface, and the ready-made blocks in @rcene/kit (app system: page headers, consoles, boards, data tables, chart cards, form fields, wizards, timelines, meters, QR, empty states; website and story: hero, sections, stat bands, scrollytelling, before/after, timelines; poster and demo: A3/A2 poster pages, six-panel poster, presenter mode; brand: the RCENE mark, weave patterns, spot illustrations). Use this whenever building or polishing any screen, layout, landing page, dashboard, form, board, poster or demo flow, choosing colours, fonts or a theme, adding dark mode, making the app "look good", or preparing the poster and the presentation.
---

# Design for the RCENE build

UX/UI is 15% of the score and the poster and presentation another 10%. This app already carries a complete design system: five palettes in light and dark, a bold "showcase" look like the event poster, and about forty blocks in `@rcene/kit`. **Use the kit before writing your own UI**: a page built from kit blocks looks finished, works by keyboard, passes axe, reads in three languages and follows the theme, with no extra work.

The theme of the challenge is *The Living Tapestry: Weaving the Threads of Innovation and Heritage*. The design answers it: abaca cream and Samar sea teal with banig violet (`habi`), a woven band under every header, Fraunces for titles, and neon cyan and magenta on navy for the showcase moments.

## The two looks

| Look | Where | How |
|---|---|---|
| **Calm** (the palette, light or dark) | every working view: forms, consoles, lookups, maps | nothing to do: AppShell applies the user's choice or the app's default |
| **Showcase** (`gabi` dark: neon on navy, Exo 2 italic titles, glow) | the landing hero, the demo opener, a "how AI built this" panel, the poster header | `<AppShell surface="showcase">` for a whole view, `<Surface variant="showcase">` (`@rcene/kit`) or `<Hero variant="showcase">` for one region |
| **Board** (`malinaw`, 7:1 contrast, `text-board-*`) | public boards and kiosks read from 5 m | `<AppShell palette="malinaw">` or `<BoardShell>` (`@rcene/kit/app`) |

**One showcase surface per page.** It is the exclamation mark; two on one page cancel out.

## Theme: the five palettes

| Palette | For | Display font |
|---|---|---|
| `habi` (default, "Living Tapestry") | every app | Fraunces |
| `dagat` | coastal, storm surge, mangroves, islands | Fraunces |
| `fiesta` | heritage, tourism, participation | Fraunces |
| `gabi` | the showcase look (its light mode is for print) | Exo 2 |
| `malinaw` | boards, kiosks, low vision | Inter |

- **The app's default** is `project.json` `"theme": { "palette": "dagat", "mode": "system" }` (both optional; `mode` is `light`, `dark` or `system`). The orchestrator already set it for the apps that fit `dagat` or `fiesta`. A change takes effect on the next `npm run dev` (the boot script is in `index.html`).
- **The user's choice** comes from the **Theme** menu in the AppShell header (light / dark / device, then a palette), is persisted as `rcene:theme`, is synced across role windows and survives "Reset demo".
- **A view can force its colours** without touching the user's choice: AppShell `palette`, `mode`, `surface` props, or `useThemeOverride({ palette: "malinaw", mode: "dark" })` from `@rcene/ui/theme`. Boards and the poster page do this.
- `useTheme()` returns `{ effective: { palette, mode, surface }, choice, defaults, overridden, setPalette, setMode }` when a component must know (a chart that swaps a pattern, a map `tone="auto"`).
- Full reference: `rcene/ui/README.md`, section "Theme".

## Rules

1. **Colour only from tokens.** `bg-card`, `text-muted-foreground`, `border-input`, `bg-brand`, `text-highlight`, `fill-chart-2`, `bg-seq-3`… never a hex, `rgb()`, or a Tailwind palette colour (`bg-slate-100`, `text-teal-700`). The tokens change with the palette and mode; hard-coded colours break in four of the ten themes.
2. **Never `dark:` to pick a colour.** The tokens already change. `dark:` is only for things that are not colours (an image swap, a shadow you drop).
3. **Hazard colours are only for hazard levels.** `level-*` and `status-*` are identical in every theme; never use them for decoration, brand or success. Never use `primary`/`brand`/`chart-*` to show a hazard level.
4. **Colour + icon + text**, never colour alone (legends, badges, chart series, status chips).
5. **Text on a pattern is unreadable.** `weave-bg`, `weave-check` and `weave-band` are decorative; put text on `bg-card`/`bg-background` above them.
6. **Every string through `useT`.** The kit's own labels are already in en/war/fil; your content goes in `src/strings.ts`. Never "safe" (nor "luwas", "ligtas") as an answer. Example records use codes (`REC-0001`, `BRGY-01`), never personal names.
7. **Motion is polish, not a feature.** The kit animates with the shared tokens and turns animation off under reduced motion; do the same (`DURATION`, `EASE`, `useReducedMotion` from `@rcene/ui/motion`, skill `gsap-motion`).
8. **Offline.** Fonts, icons, illustrations and the brand mark are bundled. Never link a web font, an image CDN or a remote icon.
9. **Phone first.** Every page works at 390 px and looks deliberate at 1280 px.

## Which block for which screen

Import from the family sub-path so a page only bundles what it uses: `@rcene/kit/app`, `@rcene/kit/site`, `@rcene/kit/poster`, `@rcene/kit/brand` (`@rcene/kit` itself has `Surface` and the kit strings). The props of every block are in `rcene/kit/<family>/README.md`; the short list is in `references/blocks.md`.

| You are building | Use |
|---|---|
| Any page's title row | `PageHeader` (title, description, actions, breadcrumb) |
| A staff or role console with a side nav | `ConsoleLayout` (+ `KpiRow`, `DataTable`, `ChartCard`) |
| A table of records (sort, search, paging, CSV) | `DataTable` |
| A chart that judges can also read as a table | `ChartCard` around a `ChartContainer` from `@rcene/ui/components/chart` |
| A form | `TextField`, `SelectField`, `RadioField`, `CheckboxField`, `NumberField`, `BarangayField` with react-hook-form + zod (`kitZodErrors(t)` for messages) |
| A form in steps | `Wizard` + `useWizard` |
| A request's progress | `StatusTimeline` |
| Capacity, stock, slots | `CapacityMeter` (never a hazard colour) |
| A ticket, permit or claim code | `QrDisplay` |
| Empty, error or "nothing yet" | `IllustratedState` (or the `states` from `@rcene/ui`) |
| A public board or kiosk | `BoardShell` (+ `BoardRotator` for several panels) |
| A landing page or "about" | `SiteShell`, `Hero`, `Section`, `FeatureGrid`, `StatBand`, `CallToAction`, `SiteFooter`, `WeaveDivider` |
| A data story | `ScrollyChapter` (sticky map or figure, steps that scroll), `BeforeAfter`, `StoryTimeline` |
| The A3 poster | `PosterPage` + `SixPanelPoster`, `PosterFigure`, `AiBuiltPanel`, `QrToApp`, `PrintButton` |
| The live demo | `PresenterMode` (steps with notes; a second window shows the notes) |
| The app's mark, a favicon, a social card | `AppMark`, `Wordmark`, `WeavePattern`, `SpotIllustration`, `OgCard` |

Building something no block covers? Build it from the shadcn primitives in `@rcene/ui/components/*` with the same tokens, and keep it in `src/`. If it is generic and good, list it in `NOTES.md` under "Shared-code changes (for the template)". Do not edit `rcene/kit` for one app.

## Copy from the gallery and the starters

Three reference projects on `main` show every block in use. They sit next to this app in the monorepo (not in a copied-out folder):

| Folder | Port | What to take |
|---|---|---|
| `../kit-gallery` | 5300 | every block live in every palette and mode, with its source; `/themes` shows the 5 x 2 matrix |
| `../starter-app` | 5301 | a role launcher, a console with KPIs, chart and table, a form wizard, a record page with timeline, meter and QR, a phone view and a board |
| `../starter-site` | 5302 | a showcase landing page, a scrollytelling story with the map, an about page with the AI disclosure, an A3 poster and presenter mode |

Read them, copy the page you need into `src/`, then change the content. Never import from them (this app must stay self-contained), and note what you copied in `NOTES.md`. When working from a copied-out folder without the monorepo, the recipes below and `references/blocks.md` are enough.

## Recipes

### A role console page

```tsx
import { ChartCard, ConsoleLayout, DataTable, KpiRow, PageHeader } from "@rcene/kit/app";
```

`ConsoleLayout` takes the side nav and the page; `PageHeader` the title and actions; `KpiRow` three or four stats; a `ChartCard` and a `DataTable` below. Keep the record list as the page's main content: judges look for the real data first.

### A public board

```tsx
<AppShell title={t("board.title")} palette="malinaw" width="full" themeMenu={false} showReset={false}>
  <BoardShell …>{/* text-board-1..3, big icons, the time it was updated */}</BoardShell>
</AppShell>
```

### A landing page with a showcase hero

`SiteShell` → `Hero variant="showcase"` (the one showcase surface) → `StatBand` with numbers computed from the data layers (never typed in) → `FeatureGrid` → `CallToAction` to the working view → `SiteFooter` with the sources link.

### The poster

A `/poster` route with `PosterPage size="A3"` and `SixPanelPoster` (problem, the app in one picture, what is different, how AI built it, the data, impact). Use `PosterFigure` with an SVG figure (a WebGL map does not print) and `QrToApp`. `AiBuiltPanel` carries the disclosure line from `docs/DISCLOSURE.md`. Print from Chrome at 100% with background graphics on; check the PDF before the event.

### The demo

`PresenterMode` with the demo script's steps (`docs/brief.md` "Demo script"): arrow keys or the clicker move, `T` shows the timer, `Esc` hides it. Open the notes in a second window. Rehearse with Wi-Fi off.

## Checklist for the polish window

- [ ] `npm run smoke` passes in light **and** dark (`smokeSchemes` in `project.json`); look at the `-dark` screenshots, not only the light ones.
- [ ] Switch every palette once from the Theme menu on the main view: nothing hard-coded shows through.
- [ ] Every page at 390 px and at 1280 px.
- [ ] Keyboard only: skip link, menus, dialogs, the wizard, the table sort and paging.
- [ ] Reduced motion on (DevTools > Rendering): nothing moves, nothing is hidden.
- [ ] Waray and Filipino: no clipped buttons, no raw keys.
- [ ] One showcase surface per page; boards in `malinaw`.
- [ ] The poster prints to one A3 page; the presenter steps match the demo script.

## Gotchas

- **A colour looks wrong in dark mode only**: a hard-coded colour or a `bg-white`/`text-black`. Replace it with `bg-card`/`text-foreground`.
- **The theme flashes on load**: `index.html` lost the boot script. `rceneApp()` injects it; check that `vite.config.ts` still calls `rceneApp`.
- **A map turned dark and the hazard fills look muddy**: maps stay light unless you pass `tone`; with `tone="dark"` also pass `casing` to `ZoneLayer` and `tone` to `Legend` (skill `maplibre-gis`).
- **Recharts ignores the theme**: use `fill="var(--color-<key>)"` inside `ChartContainer`, or `var(--chart-n)`, never a hex.
- **Fonts in a print or screenshot fall back to serif**: the page must import nothing; the fonts come from `globals.css`. Wait for `document.fonts.ready` before a screenshot.
