# 08 — Design System

The design system already exists: `@rcene/ui` (AppShell, primitives, themes) and `@rcene/kit` (about forty blocks). Full guide: skill `rcene-design`; block props: `rcene/kit/<family>/README.md`. This page maps the kit's generic component list onto the real blocks and lists the rules.

## Principle

One visual language. Build from blocks; never let each page invent a style.

## Component map

| Generic component | Real block | Import | Example in this app |
|---|---|---|---|
| AppShell | `AppShell` (header with theme menu, language, Reset demo; footer disclaimer) | `@rcene/ui` | `src/AppLayout.tsx` |
| Sidebar | `ConsoleLayout` side nav | `@rcene/kit/app` | `src/features/console/ConsoleFrame.tsx` |
| Topbar | the AppShell header | `@rcene/ui` | — |
| Role home | `RoleLauncher` | `@rcene/ui` | `/` |
| PageHeader | `PageHeader` | `@rcene/kit/app` | every page |
| StatCard | `KpiRow` (or `StatTile`) | `@rcene/kit/app` | `/console` |
| DataTable | `DataTable` (sort, search, paging, CSV) | `@rcene/kit/app` | `src/features/requests/RequestsTable.tsx` |
| ChartCard | `ChartCard` + `ChartContainer` | `@rcene/kit/app`, `@rcene/ui/components/chart` | `src/features/requests/RequestCharts.tsx` |
| Form | `TextField`, `TextareaField`, `SelectField`, `RadioField`, `CheckboxField`, `NumberField`, `BarangayField` + `useKitZodErrors()` | `@rcene/kit/app` | `/admin/lab` |
| Wizard | `Wizard` + `useWizard` | `@rcene/kit/app` | `/admin/lab` |
| Timeline | `StatusTimeline` | `@rcene/kit/app` | `src/features/requests/RequestTimeline.tsx` |
| Capacity | `CapacityMeter` | `@rcene/kit/app` | `/console/:id`, `/board` |
| QR | `QrDisplay` | `@rcene/kit/app` | `/console/:id` |
| StatusBadge | status and priority chips (icon + word) | `src/features/requests/badges.tsx` | tables, record page |
| EmptyState / ErrorState | `IllustratedState`, `EmptyState`, `ErrorState`, `DataMissing` | `@rcene/kit/app`, `@rcene/ui` | unknown record code |
| LoadingState | `LoadingState`, `LoadGate` | `@rcene/ui` | layers in the form |
| Modal / Dialog | `dialog`, `alert-dialog`, `sheet` | `@rcene/ui/components/<name>` | — |
| Toast | `toast` | `@rcene/ui` | after creating a record |
| Public board | `BoardShell` + `BoardRotator` (`malinaw`) | `@rcene/kit/app` | `/board` |
| AIInsightCard | `AiInsightCard` (result, provider, model, latency, fallback label, "a person confirms") | `rcene/ai` | `/console`, `/admin/lab`, `/console/:id` |
| Landing / about | `SiteShell`, `Hero`, `Section`, `FeatureGrid`, `StatBand`, `CallToAction`, `SiteFooter` | `@rcene/kit/site` | — |
| Poster | `PosterPage` + `SixPanelPoster`, `PosterFigure`, `AiBuiltPanel`, `QrToApp` | `@rcene/kit/poster` | `/poster` |
| Presenter | `PresenterMode`, `PresenterNotes` | `@rcene/kit/poster` | `/?present`, `/presenter` |
| Brand | `AppMark`, `Wordmark`, `WeavePattern`, `SpotIllustration` | `@rcene/kit/brand` | header, poster |
| Sources | `SourcesPage`, `SourceCard` | `@rcene/ui` | `/sources` |

Nothing fits? Compose shadcn primitives from `@rcene/ui/components/*` with tokens, in `src/`.

## Palettes (5 × light/dark)

| Palette | For | Display font |
|---|---|---|
| `habi` (default, "Living Tapestry") | any civic app | Fraunces |
| `dagat` | coastal, disaster, environment | Fraunces |
| `fiesta` | tourism, heritage, culture, participation | Fraunces |
| `gabi` | the showcase look: neon on navy, one surface per page | Exo 2 |
| `malinaw` | boards and kiosks, 7:1 contrast | Inter |

Set the app default in `project.json` `"theme": { "palette": "…", "mode": "system" }`. Users switch with the Theme menu; `/admin/appearance` sets theme and language. Boards and the poster force their own palette.

## Rules

1. Colours only from tokens (`bg-card`, `text-muted-foreground`, `bg-brand`, `fill-chart-2`…). No hex, `rgb()`, Tailwind palette colours, `bg-white`, `text-black`.
2. Never `dark:` to pick a colour; tokens already switch.
3. Hazard `level-*` / `status-*` colours only for hazard levels.
4. Colour + icon + text, never colour alone.
5. Every string through `useT` (`src/i18n/strings.ts`: English, Waray, Filipino).
6. Offline: bundled fonts and icons (`lucide-react`); no CDN.
7. Phone first: works at 390 px, deliberate at 1280 px.
8. One primary action per screen; one showcase surface per page at most.
9. Motion is polish; off under reduced motion.

## UX rules

- Tables have empty, loading and error states. Forms show validation per field.
- AI results are scannable and never the last word: a person confirms.
- Status never depends on colour alone.

## AI result pattern (`AiInsightCard`)

```text
┌───────────────────────────────────────────────┐
│ AI SUGGESTION        Priority: URGENT  (icon) │
│ OpenAI · gpt-… · 1.2 s          [fallback?]   │
├───────────────────────────────────────────────┤
│ Summary                                       │
│ Category · Office                             │
│ Why: "…quoted evidence…"                      │
│ Suggested actions                             │
│ • …                                           │
│ AI suggestion — a person confirms             │
│ [ Accept ]  [ Edit ]  [ Reject ]              │
└───────────────────────────────────────────────┘
```

## Polish checklist

`npm run smoke` passes in light and dark · every palette once from the Theme menu · 390 and 1280 px · keyboard only · reduced motion · Waray and Filipino do not clip · poster prints to one A3 page.
