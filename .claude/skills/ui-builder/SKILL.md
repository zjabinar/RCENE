---
name: ui-builder
description: Building or changing a screen in this app the fast, consistent way - @rcene/kit blocks first (PageHeader, ConsoleLayout, KpiRow, DataTable, ChartCard, Wizard, StatusTimeline, CapacityMeter, QrDisplay, IllustratedState, BoardShell, AiInsightCard), theme tokens only, every string through useT, 390/1280 px. Use when adding or re-skinning a page, form, table, dashboard, board or AI result card during the four-hour build. For theme and palette depth use rcene-design.
---

# UI builder

UX/UI is 15% of the score. A page made from kit blocks already looks finished, works by keyboard, passes axe, follows the theme and speaks three languages. Writing custom UI is the slow path.

Deep reference: skill `rcene-design` and `docs/08-DESIGN-SYSTEM.md`. Props: `rcene/kit/<family>/README.md`.

## Order of preference

1. **Change an existing page** in `src/pages/` (copy its structure).
2. **Use a kit block** (`@rcene/kit/app`, `/site`, `/poster`, `/brand`) or a shared component from `@rcene/ui`.
3. **Compose shadcn primitives** from `@rcene/ui/components/<name>` with tokens, kept in `src/`.
4. Never add a UI library.

## Block per need

| Need | Block |
|---|---|
| page title, description, actions, breadcrumb | `PageHeader` |
| staff console with side nav | `ConsoleLayout` (see `src/features/console/ConsoleFrame.tsx`) |
| 3–4 headline numbers | `KpiRow` |
| list of records | `DataTable` (sort, search, paging, CSV) |
| chart readable as a table | `ChartCard` + `ChartContainer` |
| form / form in steps | form fields + `Wizard` + `useWizard`, react-hook-form + zod + `useKitZodErrors()` |
| progress of a record | `StatusTimeline` |
| capacity, slots, stock | `CapacityMeter` |
| code, ticket, claim stub | `QrDisplay` |
| empty / error / not found | `IllustratedState`, or `EmptyState`, `ErrorState`, `LoadingState`, `LoadGate` from `@rcene/ui` |
| public board / kiosk | `BoardShell` + `BoardRotator` in `malinaw` |
| AI result | `AiInsightCard` (provider, model, latency, fallback label, "a person confirms") |
| notifications | `toast` from `@rcene/ui` |
| status / priority chips | `src/features/requests/badges.tsx` (icon + word) |

## Every page has

- a `PageHeader` and one obvious primary action
- loading, empty and error states
- a layout that works at 390 px and looks deliberate at 1280 px
- strings only through `useT` (`src/i18n/strings.ts`: en, war, fil)

## Rules

- Colours only from tokens (`bg-card`, `text-muted-foreground`, `bg-brand`, `fill-chart-2`…). No hex, `rgb()`, Tailwind palette colours, `bg-white`, `text-black`, and no `dark:` to pick a colour.
- Colour + icon + text, never colour alone. Hazard `level-*`/`status-*` colours only for hazard levels.
- One showcase surface per page at most. Boards in `malinaw`.
- Icons from `lucide-react`. Nothing loaded from a CDN.
- Check: `npm run typecheck`, then `npm run smoke` and look at `docs/screenshots/` (light and `-dark`).
