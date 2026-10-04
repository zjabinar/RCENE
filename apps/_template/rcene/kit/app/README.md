# @rcene/kit/app — the app system

Ready-made screen parts for every RCENE app: page header, operator console, public board, KPI row, data table, chart card, wizard, status timeline, capacity meter, form fields, QR code and illustrated states. They follow the theme (5 palettes × light/dark), translate their own chrome (`kit.*` keys in `strings.ts`, en / fil / war drafts), work by keyboard, never use colour alone, and respect reduced motion. Titles, labels and data come in through props, **already translated by the app**.

```tsx
import { PageHeader, DataTable, ChartCard, CapacityMeter } from "@rcene/kit/app";
```

Every block takes `className?`. Reword any chrome string by overriding its key in the app's table (`AppShell strings`).

## Layout

### PageHeader
`{ title: string; description?: ReactNode; eyebrow?: ReactNode; actions?: ReactNode; breadcrumbs?: { label: string; to?: string }[] }` — the page's h1 in the display face, a kicker, a description, actions (right on wide screens, wrapped under on phones) and breadcrumbs (`nav` "You are here", the last crumb `aria-current="page"`).

```tsx
<PageHeader eyebrow={t("ops")} title={t("centres.title")} description={t("centres.lead")}
  breadcrumbs={[{ label: t("nav.home"), to: "/" }, { label: t("centres.title") }]}
  actions={<Button><PlusIcon aria-hidden="true" />{t("centres.add")}</Button>} />
```

### ConsoleLayout
`{ nav: { to; label; icon?; badge?; end? }[]; aside?: ReactNode; asideLabel?: string; title?: string; children }` — the operator console: a sticky sidebar of `NavLink`s (active row `aria-current="page"`, count badges) from `lg`; below `lg` a **Menu** button opens the same nav in a left sheet (closes on navigation). `aside` is a right panel from `xl`, stacked under the content below. Put it in `<AppShell width="full">`; set `--kit-console-top` if your header is taller than 4.5rem.

```tsx
<AppShell width="full" …>
  <ConsoleLayout title={t("console")} nav={[{ to: "/ops", label: t("nav.queue"), icon: <ListIcon aria-hidden="true" />, badge: waiting, end: true }]}
    aside={<RecordPanel id={selected} />}>
    <PageHeader title={t("nav.queue")} />
    <DataTable … />
  </ConsoleLayout>
</AppShell>
```

### BoardShell + BoardRotator
`BoardShell { title: string; subtitle?: ReactNode; status?: ReactNode; clock?: boolean (true); children; footer?: ReactNode }` — a public display / kiosk: `text-board-*` type, a woven rule, a live clock (`<time>`, refreshed on the minute, `useFormat().time`) and a status line that is the **only** `aria-live="polite"` part. Use `<AppShell width="full" palette="malinaw">` (high contrast) for boards.
`BoardRotator { items: ReactNode[]; intervalMs?: number (10 000); paused?: boolean; label?: string }` — pages through `items` with a visible "Page n of N", a progress line, Previous / Pause-Play / Next. It holds while hovered or focused, and starts paused under reduced motion (Play still works).

```tsx
<BoardShell title={t("board.title")} status={<>{t("board.nowServing")} <strong>A-012</strong></>} footer={<QrDisplay value="/phone" label={t("board.phone")} size={96} />}>
  <BoardRotator items={pages} intervalMs={8000} paused={alertShowing} />
</BoardShell>
```

### KpiRow
`{ items: (StatTileProps & { id?: string })[]; columns?: 2 | 3 | 4 (4); label?: string }` — a list of `StatTile`s (from `@rcene/ui`): two columns on phones (a lone last tile spans both), `columns` from `lg`.

```tsx
<KpiRow label={t("today")} items={[{ id: "open", label: t("kpi.open"), value: 18, countUp: true }, { id: "full", label: t("kpi.full"), value: 2, tone: "danger" }]} />
```

## Data

### DataTable
`DataTable<T> { columns: ColumnDef<T>[]; data: T[]; caption: string; search?: boolean | { placeholder?; columns?: string[] }; pageSize?: number (10); onRowActivate?: (row: T) => void; exportCsv?: { filename; columns: CsvColumn<T>[] }; empty?: ReactNode; toolbar?: ReactNode; getRowId? }` — TanStack Table 8 with sortable headers (buttons in `th`, `aria-sort` on the sorted column, text and numbers both sort ascending first), a text filter (accents ignored: "canaveral" finds "Cañaveral"; limit it with `search.columns`), "Showing a–b of n" (polite), "Page n of N" with Previous / Next, rows that open on click, Enter or Space, a **Download CSV** of the filtered, sorted rows (all pages; `toCsv` with BOM and its formula guard, then `downloadCsv`), an empty state and a no-match state. Set `meta: { align: "end" }` on number columns. Phones scroll it sideways.

```tsx
const columns: ColumnDef<Centre>[] = [
  { accessorKey: "code", header: t("col.code") },
  { accessorKey: "capacity", header: t("col.capacity"), meta: { align: "end" } },
];
<DataTable columns={columns} data={centres} caption={t("centres.title")} search pageSize={8}
  onRowActivate={(c) => navigate(`/centres/${c.code}`)}
  exportCsv={{ filename: "centres", columns: [{ key: "code", header: t("col.code") }, { key: "capacity", header: t("col.capacity") }] }} />
```

### ChartCard
`{ title: string; description?: ReactNode; caveat?: ReactNode; table: { columns: string[]; rows: (string | number)[][] }; children; defaultView?: "chart" | "table"; headingLevel?: 2 | 3 | 4 (2); actions?: ReactNode }` — a chart in a card with a **Chart / Table** switch (a ToggleGroup: arrow keys, Space). The table is always rendered — visually hidden while the chart shows — so the numbers reach screen readers ("data as a table too"). Numbers are formatted for the language and right-aligned; the first column is the row header. `caveat` is the honesty note ("Sample data", "Counts under 5 hidden").

```tsx
<ChartCard title={t("chart.evacuees")} caveat={t("chart.sample")}
  table={{ columns: [t("col.barangay"), t("col.evacuees")], rows: rows.map((r) => [r.barangay, r.evacuees]) }}>
  <ChartContainer config={config} className="aspect-auto h-64"><BarChart data={rows} accessibilityLayer>…</BarChart></ChartContainer>
</ChartCard>
```

### StatusTimeline
`{ items: { id; label; time?: Date | string; state: "done" | "current" | "upcoming" | "blocked"; note? }[]; orientation?: "vertical" | "horizontal"; label?: string }` — an ordered list; each step has an icon **and** a state word (Done, In progress, Upcoming, Blocked); the current step is `aria-current="step"`. Dates and ISO strings become `<time>`; other strings ("Day 2") show as is. Horizontal from `sm`, a column on phones.

```tsx
<StatusTimeline items={[{ id: "filed", label: t("st.filed"), state: "done", time: report.filedAt }, { id: "fix", label: t("st.fix"), state: "current" }]} />
```

### CapacityMeter
`{ value: number; max: number; label: string; thresholds?: { warn; full } (0.75, 1); showNumbers?: boolean (true); size?: "default" | "lg" }` — `role="meter"` with `aria-valuenow/min/max` and `aria-valuetext` "{value} of {max} — Nearly full"; the bar goes primary → warning → destructive (hatched when over), with an icon + word chip (OPEN, NEARLY FULL, FULL, OVER CAPACITY) and "n left" / "n over". `capacityState(value, max, thresholds?)` gives the state for your own logic.

```tsx
<CapacityMeter label={centre.name} value={centre.evacuees} max={centre.capacity} />
```

## Forms (react-hook-form + zod 4)

`TextField`, `NumberField`, `SelectField`, `RadioField`, `CheckboxField`, `TextareaField`, `BarangayField` — all `{ control; name; label: string; description?: ReactNode; required?: boolean; disabled?: boolean; className? }` on `@rcene/ui/components/form`: the label says "**(required)**" in words (plus `aria-required`), the description sits under the label and is linked by `aria-describedby`, errors are announced (`role="alert"`) and linked too.
- `TextField` `+ { type?: "text" | "email" | "tel" | "url" | "password" | "search"; placeholder?; autoComplete?; inputMode?; maxLength? }`
- `NumberField` `+ { min?; max?; step?; placeholder?; unit?: string }` — the value is a `number` (or `undefined` when empty), so `z.number()` / `z.int()` work without coercion.
- `SelectField` / `RadioField` `+ { options: { value; label; hint? }[] }` (`SelectField placeholder?`; `RadioField variant?: "cards" | "inline"`).
- `CheckboxField` — one boolean (consent, "I checked…").
- `TextareaField` `+ { placeholder?; rows?; maxLength? }` — shows "n of max characters".
- `BarangayField` `+ { barangays: string[]; placeholder? }` — a searchable picker (popover + command list); stores the name.

`useKitZodErrors()` (or `kitZodErrors(t, format?)`) returns `{ map, required(), tooShort(n), tooLong(n), invalidNumber(), min(n), max(n), choose() }`: `map` is a zod 4 error map that turns the common issues (missing / empty, too short / long, not a number, not a whole number, min / max, above / below, steps, email, format, enum, array size) into the kit strings. A message written in the schema still wins.

```tsx
const errors = useKitZodErrors();
const schema = z.object({ code: z.string().min(1), people: z.int().min(1), brgy: z.string().min(1), ok: z.boolean() });
const form = useForm({ resolver: zodResolver(schema, { error: errors.map }), defaultValues: { code: "", brgy: "", ok: false } });
<Form {...form}>
  <form onSubmit={form.handleSubmit(save)} noValidate className="grid gap-5">
    <TextField control={form.control} name="code" label={t("f.code")} description={t("f.codeHint")} required />
    <NumberField control={form.control} name="people" label={t("f.people")} unit={t("f.peopleUnit")} required />
    <BarangayField control={form.control} name="brgy" label={t("f.barangay")} barangays={names} required />
    <CheckboxField control={form.control} name="ok" label={t("f.confirm")} />
  </form>
</Form>
```

### Wizard + useWizard
`Wizard { steps: { id; title; description? }[]; current: number; onStepChange: (i) => void; children; onFinish?; canNext?: boolean (true); blockedReason?: string; finishLabel?: string; headingLevel?: 2 | 3 }` — a numbered stepper (`ol`, current step `aria-current="step"`, finished steps get a check and can be revisited), the step title (focus moves to it on every step change), the content, Back / Next / Finish. When `canNext` is false, Next stays focusable but inert (`aria-disabled`) and says why (`aria-describedby`). `useWizard(count, initial?)` → `{ current, goTo, next, back, reset, isFirst, isLast }`.

```tsx
const w = useWizard(steps.length);
<Wizard steps={steps} current={w.current} onStepChange={w.goTo} canNext={stepValid} onFinish={submit} finishLabel={t("report.send")}>
  {w.current === 0 ? <HouseholdStep /> : w.current === 1 ? <PlaceStep /> : <Review />}
</Wizard>
```

## Misc

### QrDisplay
`{ value: string; label: string; size?: number (192); download?: string; hint?: ReactNode }` — a QR code made offline with `qrcode` (SVG) in a `figure` with its label (`role="img"`, "QR code: {label}"), and **Download PNG / SVG** buttons when `download` names the file. The modules are always black on a white quiet zone, in every palette and in dark mode, because phone scanners need dark-on-light.

```tsx
<QrDisplay value={`REC-${n}`} label={t("ticket.label", { n })} download={`ticket-REC-${n}`} />
```

### IllustratedState
`{ spot?: "empty" | "search" | "offline" | "error" | "done" | "map"; title: string; description?: ReactNode; actions?: ReactNode; size?: "sm" | "md" }` — a calm, centred state with a small woven spot illustration drawn in the palette's colours (decorative). `role="status"` (`"alert"` for `error`). Use it for empty lists, no results, offline, done screens and "pick a place on the map" prompts.

```tsx
<IllustratedState spot="search" title={t("search.none", { q })} actions={<Button variant="outline" onClick={clear}>{t("search.clear")}</Button>} />
```

## Tests

`npx vitest run rcene/kit/app`: one test file per block, plus `a11y.test.tsx` (axe-core on every block, colour contrast excluded in jsdom).
