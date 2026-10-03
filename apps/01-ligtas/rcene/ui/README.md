# @rcene/ui

Shared UI kit for every RCENE app: theme tokens, shadcn/ui primitives, app chrome, UI states, the hazard-answer components, toasts, downloads and the motion layer.

> **This folder is the app's own copy of the shared code.** Use it as-is where you can. If you change it, keep the change minimal and list it in `NOTES.md` under "Shared-code changes (for the template)", so it can be carried back to the template. Anything app-specific belongs in `src/` (see "App-local shadcn components" below).

## Setup (already done in the template)

```css
/* src/index.css */
@import "tailwindcss" source(none);
@import "../rcene/ui/styles/globals.css";

@source "./";
@source "../rcene";
@source "../index.html";
/* app-only styles below */
```

`globals.css` loads `tw-animate-css` and the self-hosted Inter font (the demo runs offline, so never add a font CDN). Tailwind scans only `src/`, `rcene/` and `index.html`. Dark mode is class-based: put `.dark` on `<html>`.

Import paths (Vite aliases and tsconfig `paths` map them to this app's `rcene/` folder):

| Path | What |
|---|---|
| `@rcene/ui` | `cn`, every custom component below, `Toaster`, `toast`, `downloadText` / `downloadCsv` / `downloadBlob` |
| `@rcene/ui/components/<name>` | one shadcn primitive, e.g. `@rcene/ui/components/card` (file `rcene/ui/components/ui/<name>.tsx`) |
| `@rcene/ui/lib/utils` | `cn` |
| `@rcene/ui/motion` | GSAP (with plugins registered), `CountUp`, `SmoothScroll`, `useReducedMotion` |

Inside `rcene/`, imports within a package are relative (with the `.ts`/`.tsx` extension) and other packages are imported as `@rcene/<pkg>`. `@/` means the app's `src/` and is for app code only.

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

The `--level-*` and `--status-*` hex values equal `LEVEL_HEX` / `STATUS_HEX` in `@rcene/data` (the map uses those), and `rcene/ui/tokens.test.ts` checks that they match.

## Theme tokens (Tailwind color names)

`background`, `foreground`, `card(-foreground)`, `popover(-foreground)`, `primary(-foreground)` (teal), `secondary(-foreground)`, `muted(-foreground)`, `accent(-foreground)`, `destructive(-foreground)`, `warning(-foreground)` (amber, for cautions, not hazards), `border`, `input`, `ring`, `chart-1`…`chart-5`.

Hazard colors are the same in light and dark mode: `level-low`, `level-moderate`, `level-high`, `level-veryHigh`, `status-not-in-zone`, `status-outside`. Each also has a `-foreground` color that meets WCAG AA on that fill, e.g. `bg-level-high text-level-high-foreground`. The radius scale is `rounded-sm|md|lg|xl`, and the font is `font-sans` (Inter Variable).

## Custom components (`@rcene/ui`)

All built-in text is translated and follows the language picker. Shared components read the **app's** string table with `useT(useAppStrings())` (`@rcene/i18n`), so when the app overrides a `common` key (e.g. `app.disclaimer`) in its `extendStrings(common, {...})` and passes `strings` to `AppShell`, the override shows up in the footer, `/sources`, the state views, the hazard badges and the map legend. Props marked `?` are optional. Every component also takes `className?` unless noted.

### Chrome

**`AppShell`**: `{ title: string; tagline?: string; nav?: NavItem[]; actions?: ReactNode; layers?: LayerName[]; width?: "phone" | "wide" | "full"; showReset?: boolean; strings?: AppStrings; disclaimer?: string; toaster?: boolean; children: ReactNode }`
- `NavItem = { to: string; label: string; end?: boolean }`. It renders a react-router `NavLink`, which sets `aria-current="page"`. Use `end: true` for `"/"`.
- Layout: a skip link (`app.skipToContent`) that moves focus to `<main id="main" tabIndex={-1}>`, then a sticky header. The header holds the title (links to `/`) and tagline, then `SampleDataBadge layers={layers}`, your `actions`, the optional **Reset demo** button and `LangToggle`. Below that comes a horizontally scrolling nav row, then main, then `DisclaimerFooter`, then the toast region.
- `width`: `"phone"` = `max-w-md` centered (resident views, designed at 390 px). `"wide"` (default) = `max-w-7xl`. `"full"` = full-bleed with no padding: `<main>` is `flex flex-col`, so a `flex-1` child fills it (boards, full-screen maps).
- `showReset`: calls `resetDemo({ keep: ["lang"] })` from `@rcene/store`, which clears every persisted store except the language and reloads every open window.
- `strings`: the app's table (`extendStrings(common, …)`, from `src/i18n/strings.ts`). AppShell wraps everything inside it in `<StringsProvider value={strings}>`. The template's `AppLayout` already passes it.
- `disclaimer`: an explicit, already-translated disclaimer (e.g. `t("app.myDisclaimer")`) for the footer and `/sources`. It wins over `strings`.
- `toaster` (default `true`): mounts the themed `Toaster` once. Don't mount a second one; pass `toaster={false}` if the app needs its own (e.g. `position="top-center"`).
- Sets `document.title = title`. Works down to 360 px wide and is fully keyboard operable.

```tsx
// src/AppLayout.tsx
const t = useT(strings);
<AppShell title={t("app.title")} nav={…} layers={["boundary", "hazard-flood"]} strings={strings}>
  <Outlet />
</AppShell>
```

Components rendered outside the shell (e.g. `RouteError` as a route `errorElement`) see `common` unless you also wrap the router in `<StringsProvider value={strings}>` in `main.tsx`.

**`LangToggle`**: `{ className? }`. A compact select for en / war / fil, labelled with `LANG_LABELS`, with the accessible name `app.language`. The choice persists and syncs across windows.

**`SampleDataBadge`**: `{ layers?: readonly LayerName[] }`. An amber "Sample data" badge (`app.sampleData`) with a tooltip (`app.sampleDataHint`). It shows when `usesFixtures(manifest, layers)` is true, or when any served file is a fixture if `layers` is omitted. Otherwise it renders `null`.

**`DisclaimerFooter`**: `{ className? }`. Shows `app.disclaimer` and a link to `/sources` (`app.sources`), from the app's strings. `className` styles the inner container.

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

For a layer that may not exist at all, use `useOptionalLayer` from `@rcene/data` instead (no 404, see its README).

### Hazard answers

**`HazardStatusBadge`**: `{ hazard: Hazard; status: HazardStatus; size?: "sm" | "md" }` (default `"md"`). Shows the color, the icon and "**Flood** · In a mapped risk zone — High". It sets `data-hazard`, `data-status` and `data-level` for tests.

**`HazardStatusList`**: `{ status: Partial<Record<Hazard, HazardStatus>>; missing?: readonly Hazard[]; order?: readonly Hazard[]; size?: "sm" | "md" }`
- Renders one badge per hazard that has a status, plus a "data not available" line for each `missing` hazard, in `HAZARDS` order or in `order` (which also filters).
- Items stagger in with GSAP when the answer changes. There is no animation under reduced motion. The list is `aria-live="polite"`.

**`LevelBadge`**: `{ level: Level; size?: "sm" | "md" }` (default `"sm"`). A bare level chip (color, icon and `level.<l>`) for tables and legends.

**`LEVEL_ICONS`**: `Record<Level, LucideIcon>`. **`STATUS_ICONS`**: `Record<"notInZone" | "outsideCoverage", LucideIcon>`. Use these for custom legends so the icons match.

### Sources

**`SourcesPage`**: `{ extra?: readonly SourceEntry[]; children?: ReactNode }`. This is the `/sources` route. It shows an h1 (`sources.title`), then the entries of `sources.json` (through `LoadGate`), then your `extra` entries with the same card, then your `children` as an app section, then the disclaimer.
- `extra`: the app's own sources. Use tier `"synthetic"` for data the app generates, and say how (seed, codes, no names). `extra` still shows when `sources.json` is missing.
- `children`: e.g. "How the sample households are made", model credits for the AI apps, a methods note.

```tsx
<SourcesPage
  extra={[{ file: "generated in the browser", title: "Sample households", tier: "synthetic",
            attribution: "createRng(7): 240 households coded HH-0001…, no names" }]}
>
  <h2 className="text-lg font-semibold">{t("sources.aboutModel")}</h2>
</SourcesPage>
```

**`SourceCard`**: `{ entry: SourceEntry }`. One source as a card: title (h2), tier badge (`sources.tier.<tier>`), attribution, file, license, URL link and notes. Use it for a custom sources layout.

### Toasts

**`toast`** (sonner's, re-exported) and **`Toaster`** (sonner's `Toaster`, themed with the tokens, every sonner prop passed through, region label translated). `AppShell` mounts the `Toaster` once, so just call:

```ts
import { toast } from "@rcene/ui";
toast.success(t("household.saved"));            // always pass translated text
toast.error(t("export.failed"), { description: String(error) });
```

### Downloads

Client-side, offline: a Blob, an object URL and a temporary `<a download>` (the URL is revoked after the click).

- **`downloadText(filename, text, mime = "text/plain;charset=utf-8")`**
- **`downloadCsv(filename, csv)`**: `text/csv;charset=utf-8`. Build the CSV with `toCsv(rows, columns, { bom: true })` from `@rcene/data` so Excel reads ₱ and ñ correctly.
- **`downloadBlob(filename, blob)`**: anything else (a PNG from a canvas, a JSON backup).

```ts
downloadCsv("households.csv", toCsv(rows, [{ key: "code", header: t("col.code") }], { bom: true }));
```

### Other

**`StatTile`**: `{ label: ReactNode; value: number | string; hint?: ReactNode; tone?: "default" | "warning" | "danger"; countUp?: boolean; format?: (n: number) => string }`. Shows a big number in a `<dl>`.
- Numbers are formatted for the current locale: 0 decimals for integers, 1 otherwise, or your own `format` (e.g. `useFormat().currency` for ₱).
- `countUp` animates numbers with `CountUp`.
- `warning` and `danger` add an icon as well as the color.

**`RouteError`**: no props. Use it as the route `errorElement`. It shows `ErrorState` for `useRouteError()` with a **Home** link to `/`, and a reload button unless the error is a 404.

**`ErrorBoundary`**: `{ fallback?: ReactNode; onError?: (error, info) => void; children }`. Catches render errors, for example around a map or a chart. By default it shows `ErrorState`, whose **Try again** re-mounts the children.

**`cn(...classes)`**: clsx + tailwind-merge.

## shadcn primitives (`@rcene/ui/components/<name>`)

These are hand-written in the shadcn **new-york v4** style: function components, `data-slot`, `cn()` and cva variants, on the unified `radix-ui` package. The exports match upstream shadcn.

| `<name>` | Exports |
|---|---|
| `button` | `Button` (`variant`: default, destructive, outline, secondary, ghost, link; `size`: default, sm, lg, icon, icon-sm, icon-lg; `asChild`), `buttonVariants` |
| `badge` | `Badge` (`variant`: default, secondary, destructive, outline, **warning**; `asChild`), `badgeVariants` |
| `card` | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter` |
| `alert` | `Alert` (`variant`: default, destructive, **warning**), `AlertTitle`, `AlertDescription` |
| `dialog` | `Dialog`, `DialogTrigger`, `DialogContent` (`showCloseButton?`, `closeLabel?`), `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription`, `DialogClose`, `DialogOverlay`, `DialogPortal` |
| `alert-dialog` | `AlertDialog`, `AlertDialogTrigger`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogFooter`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogAction` (`variant?`, e.g. destructive), `AlertDialogCancel`, `AlertDialogOverlay`, `AlertDialogPortal` |
| `sheet` | `Sheet`, `SheetTrigger`, `SheetContent` (`side?`: top, right, bottom, left; `showCloseButton?`; `closeLabel?`), `SheetHeader`, `SheetFooter`, `SheetTitle`, `SheetDescription`, `SheetClose` |
| `popover` | `Popover`, `PopoverTrigger`, `PopoverContent` (`align?` center, `sideOffset?` 4), `PopoverAnchor` |
| `accordion` | `Accordion` (`type`: single, multiple; `collapsible?`), `AccordionItem`, `AccordionTrigger`, `AccordionContent` |
| `collapsible` | `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` |
| `command` | `Command` (`label?`), `CommandDialog` (`title?`, `description?`, `showCloseButton?`, plus Dialog props), `CommandInput` (with a search icon), `CommandList` (`label?`), `CommandEmpty`, `CommandGroup` (`heading?`), `CommandItem` (`value?`, `keywords?`, `onSelect?`), `CommandSeparator`, `CommandShortcut` (cmdk 1.1) |
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

Built-in text in the primitives is translated (strings in `rcene/ui/i18n.ts`) and can be overridden with props or children:

| Where | Default (`en` / `fil`) |
|---|---|
| `DialogContent`, `SheetContent` close button (screen readers) | "Close" / "Isara" (Waray falls back to English for now) |
| `AlertDialogCancel` / `AlertDialogAction` without children | "Cancel" / "Kanselahin", "Confirm" / "Kumpirmahin" |
| `Command` / `CommandDialog` label and title, `CommandDialog` description | "Search" / "Maghanap", a "Type to search…" hint |
| `CommandList` label, `CommandEmpty` without children | "Suggestions" / "Mga mungkahi", "No results found." / "Walang nakitang resulta." |
| `Toaster` region | "Notifications" / "Mga abiso" |

Always give `AlertDialogContent` an `AlertDialogTitle` and an `AlertDialogDescription`, and give `AlertDialogAction` a specific verb ("Reset demo", "Delete report") when you can. `Command` needs no network: it filters in memory.

### App-local shadcn components

Need a component that isn't listed (e.g. `calendar`, `drawer`, `hover-card`)? Add it **in your app**, not in `rcene/`:

- Put it in `src/components/ui/<name>.tsx`. The app's `components.json` has `ui` = `@/components/ui` and `utils` = `@rcene/ui/lib/utils`.
- The shadcn registry isn't reachable offline, so write the component by hand in the same new-york v4 style. Import primitives from the unified package (`import { HoverCard as HoverCardPrimitive } from "radix-ui"`), and import `cn` from `@rcene/ui/lib/utils`.
- Import it as `@/components/ui/<name>`.

## Motion (`@rcene/ui/motion`)

Follow the `gsap-motion` skill. **Import GSAP from here, never from `"gsap"`**, so the plugins are registered.

- `gsap`, `ScrollTrigger`, `SplitText`, `DrawSVGPlugin`, `useGSAP`: registered once.
- **`CountUp`**: `{ value: number; duration?: number /* 1.2 s */; format?: (n: number) => string; className? }`. Tweens from the number currently shown to `value` and writes `textContent` through a ref, with no per-frame React state. Screen readers get the final value only. With reduced motion it shows the final value at once.
- **`SmoothScroll`**: `{ children }`. Lenis on GSAP's ticker, synced with ScrollTrigger. Use it on story and landing pages only (not dashboards or map screens), and add `data-lenis-prevent` to a map container on a Lenis page. With reduced motion it renders the children with native scrolling.
- **`useReducedMotion()`** returns a `boolean` that updates live. **`prefersReducedMotion()`** is the non-hook version.

**Tests (jsdom):** jsdom has no `window.matchMedia`, which ScrollTrigger needs. When it is missing, `@rcene/ui/motion` installs a stub that reports `prefers-reduced-motion: reduce`. In vitest, GSAP animations are therefore skipped, `CountUp` shows its final value and items are never left hidden mid-tween. Stub `matchMedia` yourself if a test needs motion. cmdk and floating-ui also need a `ResizeObserver` stub and `Element.prototype.scrollIntoView` in jsdom (see `components/ui/primitives.test.tsx`).

## Tests

`npm run test -- rcene/ui` (or `pnpm exec vitest run rcene/ui`) covers:

- the hazard tokens (they must match `LEVEL_HEX` / `STATUS_HEX`, and each foreground must reach WCAG AA);
- the hazard badges and list (order, missing layers, all three languages, no "safe");
- AppShell (strings override, `disclaimer`, toaster), LoadGate and StatTile;
- SourcesPage (`extra`, `children`, missing `sources.json`) and SourceCard;
- the accordion, collapsible, alert-dialog, popover and command primitives;
- `downloadCsv` / `downloadText`.
