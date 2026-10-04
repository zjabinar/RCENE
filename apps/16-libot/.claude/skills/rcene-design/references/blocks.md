# Kit blocks: the short reference

One line per block. Full docs, examples and behaviour notes: `rcene/kit/<family>/README.md`. Live examples with copyable code: the gallery (`../kit-gallery`, port 5300) when working in the monorepo.

All content props take text that is **already translated** (`t("…")`); the blocks' own labels come from the kit strings in three languages.

## `@rcene/kit/app`: application screens

| Block | Props (main) | Use for |
|---|---|---|
| `PageHeader` | `title; description?; eyebrow?; actions?; breadcrumbs?: { label; to? }[]` | the top of every route (the page's only h1) |
| `ConsoleLayout` | `nav: { to; label; icon?; badge?; end?; onSelect?; active? }[]; aside?; asideLabel?; title?; children` | staff and operator consoles; the side nav becomes a sheet below `lg` |
| `BoardShell` | `title; subtitle?; status?; clock? (true); children; footer?` | public displays and kiosks (pair with `palette="malinaw"`) |
| `BoardRotator` | `items: ReactNode[]; intervalMs? (10000); paused?; defaultPaused?; label?` | several board panels in turn, with pause and previous/next |
| `KpiRow` | `items: StatTileProps[]; columns? (4); label?` | three or four headline numbers |
| `DataTable<T>` | `columns: ColumnDef<T>[]; data; caption; search?; pageSize? (10); onRowActivate?; exportCsv?: { filename; columns }; empty?; toolbar?` | any list of records: sort, search, paging, CSV |
| `ChartCard` | `title; description?; caveat?; table: { columns; rows }; children (the chart); defaultView?; actions?` | every chart: a Chart / Table switch so the data is readable |
| `StatusTimeline` | `items: { id; label; time?; state: "done" \| "current" \| "upcoming" \| "blocked"; note? }[]; orientation?` | a request's or case's progress |
| `CapacityMeter` | `value; max; label; thresholds? ({ warn: 0.75, full: 1 }); showNumbers?; size?` | capacity, stock, slots (never a hazard colour); `capacityState()` is the pure rule |
| `Wizard` + `useWizard` | `steps: { id; title; description? }[]; current; onStepChange; onFinish?; canNext?; blockedReason?` | a form in steps |
| `TextField`, `NumberField`, `SelectField`, `RadioField`, `CheckboxField`, `TextareaField`, `BarangayField` | `control; name; label; description?; required?` (+ type-specific: `options`, `unit`, `barangays`…) | react-hook-form + zod fields; `useKitZodErrors()` gives the messages in three languages |
| `QrDisplay` | `value; label; size? (192); download?; hint?` | a ticket, permit or claim code, with PNG/SVG download |
| `IllustratedState` | `spot? (SpotName); title; description?; actions?; size?: "sm" \| "md"` | empty, not found, offline, error, done |

## `@rcene/kit/site`: websites and data stories

| Block | Props (main) | Use for |
|---|---|---|
| `SiteShell` | `title; brand?; nav?; actions?; footer?; smooth?; strings?; children` | the frame of a landing or story page (instead of AppShell) |
| `Hero` | `title; eyebrow?; lead?; actions?; media?; variant?: "calm" \| "showcase"` | the page's h1 and first impression (showcase = the page's one bold surface) |
| `Section` | `id?; eyebrow?; title?; lead?; align?; tone?: "default" \| "muted" \| "weave" \| "showcase"; children` | consistent vertical rhythm for every page section |
| `FeatureGrid` | `items: { icon?; title; description; href? }[]; columns?: 2 \| 3 \| 4` | what the app does, in cards |
| `StatBand` | `items: { value: number; label; format?; suffix? }[]; tone?` | big numbers that count up once (compute them from the data, never type them) |
| `ScrollyChapter` | `steps: { id; title; body }[]; visual: (activeStep) => ReactNode; onStepChange?` | a sticky map or figure that changes as the steps scroll by |
| `BeforeAfter` | `before; after; beforeLabel; afterLabel; initial?; onChange?` | a compare slider (keyboard: arrows, Home, End) |
| `StoryTimeline` | `items: { id; date; title; body?; icon? }[]; label?` | dated events, a project's history |
| `CallToAction` | `title; body?; actions; tone?: "brand" \| "showcase"` | the closing band that sends people to the working view |
| `SiteFooter` | `brand?; columns?: { title; links }[]; note?` | links, the disclaimer and sources |
| `WeaveDivider` | `variant?: "band" \| "wave" \| "diamond"` | a woven break between sections (decorative) |

## `@rcene/kit/poster`: poster and live demo

| Block | Props (main) | Use for |
|---|---|---|
| `PosterPage` | `size?: "A3" \| "A2"; orientation?; printTone?: "light" \| "screen"; title?; fit?; toolbar?; children` | the printable sheet: `@page`, mm grid, fit-to-screen preview, size switch, overflow warning |
| `SixPanelPoster` | `title; subtitle?; panels: { problem, picture, different, ai, data, impact }; footer?; qr?` | the competition poster in six panels (PRD §14) |
| `PosterFigure` | `title; caption?; source?; downloadSvg?; children (an SVG)` | a figure that prints (no WebGL) with "Download SVG" |
| `AiBuiltPanel` | `tools: { name; role }[]; steps?; disclosure?` | "How AI built this", with the disclosure line |
| `QrToApp` | `url; label?; size?` | the QR on the poster that opens the app |
| `PrintButton` | `label?; variant?; size?` | print any printable page |
| `PresenterMode` | `steps: { id; caption; route?; notes?; seconds? }[]; open?; onOpenChange?; onNavigate?` | the demo: arrows or a clicker step through the script, T timer, Esc hides, P shows |
| `PresenterNotes` | `steps` | the second window with the speaker notes, in step with the first |

## `@rcene/kit/brand`

| Block | Props | Use for |
|---|---|---|
| `AppMark` | `size? (40); label?; detail?` | before the app title: `AppShell brand={<AppMark size={32} />}` |
| `Wordmark` | `variant?: "full" \| "compact"` | "RCENE" on the poster, about page, title slide |
| `WeavePattern` | `name: "banig" \| "diamond" \| "stripes" \| "tikog"; opacity?; scale?` | a woven texture behind a hero or band (never text straight on it) |
| `SpotIllustration` | `name: SpotName; size?` | the drawings behind `IllustratedState`, or a section's picture |
| `OgCard` | `title; tagline?; appId?` | the 1200 x 630 social card (`node scripts/brand-assets.mjs` regenerates `public/og.png`) |

## `@rcene/kit`

| Block | Props | Use for |
|---|---|---|
| `Surface` | `variant?: "showcase"; palette?; mode?` | one region in the showcase look or another palette (a light poster in a dark app) |
