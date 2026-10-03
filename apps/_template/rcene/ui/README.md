# @rcene/ui

Shared UI kit for every RCENE app: theme tokens, shadcn/ui primitives, app chrome, UI states, the hazard-answer components and the motion layer.

> **Frozen during a batch.** Don't edit `packages/ui` from an app session. If you need a change, write it in your app's `NOTES.md`. For anything app-specific, build it in your app (see "App-local shadcn components" below).

## Setup (already done in `apps/_template`)

```css
/* apps/<slug>/src/index.css */
@import "@rcene/ui/globals.css";
/* app-only styles below */
```

`globals.css` loads Tailwind v4, `tw-animate-css` and the self-hosted Inter font (the demo runs offline, so never add a font CDN). It also tells Tailwind to scan `packages/ui` and `packages/map`. Dark mode is class-based: put `.dark` on `<html>`.

Import paths:

| Path | What |
|---|---|
| `@rcene/ui` | `cn` and every custom component below, plus `Toaster` |
| `@rcene/ui/components/<name>` | one shadcn primitive, e.g. `@rcene/ui/components/card` |
| `@rcene/ui/lib/utils` | `cn` |
| `@rcene/ui/motion` | GSAP (with plugins registered), `CountUp`, `SmoothScroll`, `useReducedMotion` |
| `@rcene/ui/globals.css` | the theme |

## The hazard rules

- **Color + icon + label, always together.** Never show a hazard level or status by color alone. Use the components here, or `LEVEL_ICONS` / `STATUS_ICONS` and the `level-*` / `status-*` colors together with the translated text.
- **There are exactly three answers** (`HazardStatus` from `@rcene/data`). There is no "safe" state, and the word never appears in an answer, in any language.

| `status.kind` | Text (`common`) | Color | Icon (lucide) |
|---|---|---|---|
| `inZone`, level `low` | `status.inZone` with `{level}` = `level.low` | `level-low` fill | `CircleAlert` |
| `inZone`, level `moderate` | … `level.moderate` | `level-moderate` fill | `TriangleAlert` |
| `inZone`, level `high` | … `level.high` | `level-high` fill | `OctagonAlert` |
| `inZone`, level `veryHigh` | … `level.veryHigh` | `level-veryHigh` fill | `Siren` |
| `notInZone` | `status.notInZone` | neutral slate `status-not-in-zone` (never green) | `CircleMinus` |
| `outsideCoverage` | `status.outsideCoverage` | gray `status-outside`, dashed border | `MapPinOff` |
| layer missing | `state.dataMissing` | muted, dotted border | `FileQuestionMark` |

The `--level-*` and `--status-*` hex values equal `LEVEL_HEX` / `STATUS_HEX` in `@rcene/data` (the map uses those), and `src/tokens.test.ts` checks that they match.

## Theme tokens (Tailwind color names)

`background`, `foreground`, `card(-foreground)`, `popover(-foreground)`, `primary(-foreground)` (teal), `secondary(-foreground)`, `muted(-foreground)`, `accent(-foreground)`, `destructive(-foreground)`, `warning(-foreground)` (amber, for cautions, not hazards), `border`, `input`, `ring`, `chart-1`…`chart-5`.

Hazard colors are the same in light and dark mode: `level-low`, `level-moderate`, `level-high`, `level-veryHigh`, `status-not-in-zone`, `status-outside`. Each also has a `-foreground` color that meets WCAG AA on that fill, e.g. `bg-level-high text-level-high-foreground`. The radius scale is `rounded-sm|md|lg|xl`, and the font is `font-sans` (Inter Variable).

## Custom components (`@rcene/ui`)

All built-in text comes from `useT(common)` (`@rcene/i18n`), so it follows the language picker. Props marked `?` are optional. Every component also takes `className?` unless noted.

### Chrome

**`AppShell`**: `{ title: string; tagline?: string; nav?: NavItem[]; actions?: ReactNode; layers?: LayerName[]; width?: "phone" | "wide" | "full"; showReset?: boolean; children: ReactNode }`
- `NavItem = { to: string; label: string; end?: boolean }`. It renders a react-router `NavLink`, which sets `aria-current="page"`. Use `end: true` for `"/"`.
- Layout: a skip link (`app.skipToContent`) that moves focus to `<main id="main" tabIndex={-1}>`, then a sticky header. The header holds the title (links to `/`) and tagline, then `SampleDataBadge layers={layers}`, your `actions`, the optional **Reset demo** button and `LangToggle`. Below that comes a horizontally scrolling nav row, then main, then `DisclaimerFooter`.
- `width`: `"phone"` = `max-w-md` centered (resident views, designed at 390 px). `"wide"` (default) = `max-w-7xl`. `"full"` = full-bleed with no padding: `<main>` is `flex flex-col`, so a `flex-1` child fills it (boards, full-screen maps).
- `showReset`: calls `resetDemo({ keep: ["lang"] })` from `@rcene/store`, which clears every persisted store except the language and reloads every open window.
- Sets `document.title = title`. Works down to 360 px wide and is fully keyboard operable.

**`LangToggle`**: `{ className? }`. A compact select for en / war / fil, labelled with `LANG_LABELS`, with the accessible name `app.language`. The choice persists and syncs across windows.

**`SampleDataBadge`**: `{ layers?: readonly LayerName[] }`. An amber "Sample data" badge (`app.sampleData`) with a tooltip (`app.sampleDataHint`). It shows when `usesFixtures(manifest, layers)` is true, or when any served file is a fixture if `layers` is omitted. Otherwise it renders `null`.

**`DisclaimerFooter`**: `{ className? }`. Shows `app.disclaimer` and a link to `/sources` (`app.sources`). `className` styles the inner container.

### States

**`LoadingState`**: `{ label?: string }`. A spinner plus `state.loading`, with `role="status"`.

**`EmptyState`**: `{ title?: string; children?: ReactNode }`. An icon plus `title` (default `state.empty`), then `children` (a description or actions), with `role="status"`.

**`ErrorState`**: `{ error?: unknown; onRetry?: () => void; children?: ReactNode }`. Shows `state.error`, a small detail line (the `Error.message` or the string), and a **Try again** button (`state.retry`) when you pass `onRetry`. `children` adds extra actions. Uses `role="alert"`.

**`DataMissing`**: `{ layer?: string }`. Shows `state.dataMissing`, plus the layer name as a code label, with `role="status"`.

**`LoadGate<T>`**: `{ state: LoadState<T>; children: (data: T) => ReactNode; loading?: ReactNode; onRetry?: () => void }`. Renders `LoadingState` (or `loading`; pass `null` for nothing), `DataMissing` (for `status: "missing"`), `ErrorState` or `children(data)`.

```tsx
const zones = useZones(HAZARDS);
<LoadGate state={zones}>{({ zones, missing }) => <HazardStatusList status={lookup(zones)} missing={missing} />}</LoadGate>
```

### Hazard answers

**`HazardStatusBadge`**: `{ hazard: Hazard; status: HazardStatus; size?: "sm" | "md" }` (default `"md"`). Shows the color, the icon and "**Flood** · In a mapped risk zone — High". It sets `data-hazard`, `data-status` and `data-level` for tests.

**`HazardStatusList`**: `{ status: Partial<Record<Hazard, HazardStatus>>; missing?: readonly Hazard[]; order?: readonly Hazard[]; size?: "sm" | "md" }`
- Renders one badge per hazard that has a status, plus a "data not available" line for each `missing` hazard, in `HAZARDS` order or in `order` (which also filters).
- Items stagger in with GSAP when the answer changes. There is no animation under reduced motion. The list is `aria-live="polite"`.

**`LevelBadge`**: `{ level: Level; size?: "sm" | "md" }` (default `"sm"`). A bare level chip (color, icon and `level.<l>`) for tables and legends.

**`LEVEL_ICONS`**: `Record<Level, LucideIcon>`. **`STATUS_ICONS`**: `Record<"notInZone" | "outsideCoverage", LucideIcon>`. Use these for custom legends so the icons match.

### Other

**`StatTile`**: `{ label: ReactNode; value: number | string; hint?: ReactNode; tone?: "default" | "warning" | "danger"; countUp?: boolean; format?: (n: number) => string }`. Shows a big number in a `<dl>`.
- Numbers are formatted for the current locale: 0 decimals for integers, 1 otherwise, or your own `format`.
- `countUp` animates numbers with `CountUp`.
- `warning` and `danger` add an icon as well as the color.

**`SourcesPage`**: no props. This is the `/sources` route. It shows an h1 (`sources.title`) and loads `useLayer("sources")` through `LoadGate`. Each `SourceEntry` is shown with its title, a tier badge (`sources.tier.<tier>`), the attribution, the file, the license, a URL link and notes. The disclaimer comes last.

**`RouteError`**: no props. Use it as the route `errorElement`. It shows `ErrorState` for `useRouteError()` with a **Home** link to `/`, and a reload button unless the error is a 404.

**`ErrorBoundary`**: `{ fallback?: ReactNode; onError?: (error, info) => void; children }`. Catches render errors, for example around a map or a chart. By default it shows `ErrorState`, whose **Try again** re-mounts the children.

**`Toaster`**: sonner's `Toaster`, themed with the tokens, with every sonner prop passed through. Mount it once (e.g. in `AppLayout`) and call `toast("…")` from `"sonner"`.

**`cn(...classes)`**: clsx + tailwind-merge.

## shadcn primitives (`@rcene/ui/components/<name>`)

These are hand-written in the shadcn **new-york v4** style: function components, `data-slot`, `cn()` and cva variants. The exports match upstream shadcn.

| `<name>` | Exports |
|---|---|
| `button` | `Button` (`variant`: default, destructive, outline, secondary, ghost, link; `size`: default, sm, lg, icon, icon-sm, icon-lg; `asChild`), `buttonVariants` |
| `badge` | `Badge` (`variant`: default, secondary, destructive, outline, **warning**; `asChild`), `badgeVariants` |
| `card` | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter` |
| `alert` | `Alert` (`variant`: default, destructive, **warning**), `AlertTitle`, `AlertDescription` |
| `dialog` | `Dialog`, `DialogTrigger`, `DialogContent` (`showCloseButton?`, `closeLabel?`), `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription`, `DialogClose`, `DialogOverlay`, `DialogPortal` |
| `sheet` | `Sheet`, `SheetTrigger`, `SheetContent` (`side?`: top, right, bottom, left; `showCloseButton?`; `closeLabel?`), `SheetHeader`, `SheetFooter`, `SheetTitle`, `SheetDescription`, `SheetClose` |
| `tabs` | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` |
| `input` / `textarea` / `label` | `Input` / `Textarea` / `Label` |
| `select` | `Select`, `SelectTrigger` (`size?`: sm, default), `SelectValue`, `SelectContent`, `SelectItem`, `SelectGroup`, `SelectLabel`, `SelectSeparator`, `SelectScrollUpButton`, `SelectScrollDownButton` |
| `checkbox` / `switch` | `Checkbox` / `Switch` |
| `radio-group` | `RadioGroup`, `RadioGroupItem` |
| `slider` | `Slider`. `aria-label` / `aria-labelledby` are forwarded to each thumb, so always pass one |
| `progress` / `separator` / `skeleton` | `Progress` / `Separator` / `Skeleton` |
| `tooltip` | `Tooltip` (includes its own provider), `TooltipTrigger`, `TooltipContent`, `TooltipProvider` |
| `dropdown-menu` | `DropdownMenu`, `…Trigger`, `…Content`, `…Item` (`inset?`, `variant?`: default, destructive), `…CheckboxItem`, `…RadioGroup`, `…RadioItem`, `…Label`, `…Separator`, `…Shortcut`, `…Group`, `…Portal`, `…Sub`, `…SubTrigger`, `…SubContent` |
| `toggle` | `Toggle` (`variant`: default, outline; `size`: default, sm, lg), `toggleVariants` |
| `toggle-group` | `ToggleGroup`, `ToggleGroupItem` |
| `table` | `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableRow`, `TableHead`, `TableCell`, `TableCaption` |
| `scroll-area` | `ScrollArea`, `ScrollBar` |
| `sonner` | `Toaster`, `type ToasterProps` |

The close button's screen-reader label in `DialogContent` and `SheetContent` is translated: "Close" in English, "Isara" in Filipino. Waray falls back to English for now.

### App-local shadcn components

Need a component that isn't listed (e.g. `accordion`, `popover`, `calendar`, `command`)? Add it **in your app**, not here:

- Put it in `apps/<slug>/src/components/ui/<name>.tsx`. Each app has its own `components.json`, whose `ui` alias is `@/components/ui` and whose `utils` alias is `@rcene/ui/lib/utils`.
- The shadcn registry isn't reachable from the build machine, so write the component by hand in the same new-york v4 style. Import primitives from the unified package (`import { Popover as PopoverPrimitive } from "radix-ui"`), and import `cn` from `@rcene/ui/lib/utils`.
- Import it as `@/components/ui/<name>`. Inside `packages/*`, imports are always relative; `@/` belongs to the app.

## Motion (`@rcene/ui/motion`)

Follow `.claude/skills/gsap-motion/SKILL.md`. **Import GSAP from here, never from `"gsap"`**, so the plugins are registered.

- `gsap`, `ScrollTrigger`, `SplitText`, `DrawSVGPlugin`, `useGSAP`: registered once.
- **`CountUp`**: `{ value: number; duration?: number /* 1.2 s */; format?: (n: number) => string; className? }`. Tweens from the number currently shown to `value` and writes `textContent` through a ref, with no per-frame React state. Screen readers get the final value only. With reduced motion it shows the final value at once.
- **`SmoothScroll`**: `{ children }`. Lenis on GSAP's ticker, synced with ScrollTrigger. Use it on story and landing pages only (not dashboards or map screens), and add `data-lenis-prevent` to a map container on a Lenis page. With reduced motion it renders the children with native scrolling.
- **`useReducedMotion()`** returns a `boolean` that updates live. **`prefersReducedMotion()`** is the non-hook version.

**Tests (jsdom):** jsdom has no `window.matchMedia`, which ScrollTrigger needs. When it is missing, `@rcene/ui/motion` installs a stub that reports `prefers-reduced-motion: reduce`. In vitest, GSAP animations are therefore skipped, `CountUp` shows its final value and items are never left hidden mid-tween. Stub `matchMedia` yourself if a test needs motion.

## Package tests

`pnpm exec vitest run --project packages packages/ui` covers:

- the hazard tokens (they must match `LEVEL_HEX` / `STATUS_HEX`, and each foreground must reach WCAG AA);
- the hazard badges and list (order, missing layers, all three languages, no "safe");
- AppShell, LoadGate and StatTile smoke tests.
