# Notes — S1 Application starter

## What to copy from here

A generic "barangay service requests" app: 24 seeded records (`REC-0001`…`REC-0024`, barangays `BRGY-01`…`BRGY-12`), one synced store, four roles' worth of screens. Read the file, copy it into your `src/`, then change the content. Note what you copied in your own `NOTES.md`.

| File | What it shows |
|---|---|
| `src/roles.ts` + `src/AppLayout.tsx` | A role table (path, AppShell `width`, forced `palette`) and one `AppShell` whose width and palette follow the route: `full` console, `phone` resident, `full` + `malinaw` board. `brand={<AppMark size={32} />}`, `showReset`, `layers`, `strings`, `<ScrollRestoration />` |
| `src/pages/Start.tsx` | `/`: `PageHeader` + `RoleLauncher` (icons, three columns from `lg`) + a numbered "how the demo flows" card |
| `src/features/console/ConsoleFrame.tsx` | `ConsoleLayout` with icon nav, a live count badge (with screen-reader text) and a per-page `aside` |
| `src/pages/console/Overview.tsx` | `/console`: `PageHeader` with an action, `KpiRow` (count-up, warning tone, hints), two `ChartCard`s, the `DataTable` |
| `src/features/requests/RequestCharts.tsx` | Recharts in `ChartContainer` inside `ChartCard` (table view, caveat), `var(--color-…)`, thin bars with value labels, no gridlines, animation off under reduced motion |
| `src/features/requests/RequestsTable.tsx` | `DataTable` columns: translated `accessorFn`s so search and sort use what people read, a step-order `sortingFn`, badges in cells, rows that open the record, CSV export with translated headers |
| `src/pages/console/Records.tsx` | `/console/records`: a status board (one column per step, cards as links, "and n earlier") |
| `src/pages/console/NewRequest.tsx` | `/console/new`: `Wizard` + `useWizard` + react-hook-form + zod + `useKitZodErrors`; Next validates only the step (`form.trigger`), Finish is gated with `canNext` + `blockedReason`, `BarangayField` fed from the barangays layer through `LoadGate`, a read-back summary, a console `aside`, then `toast` + `navigate` |
| `src/pages/console/RecordDetail.tsx` | `/console/:id`: `PageHeader` with breadcrumbs, chips and the "Move to …" action; `StatusTimeline`; `CapacityMeter` and `QrDisplay` (absolute URL to the resident view) in the aside; `IllustratedState` for an unknown code; a loose code (`rec-1`) redirects to `REC-0001` |
| `src/pages/Resident.tsx` | `/resident`: a phone view; lookup kept in `?code=` (so a QR opens it), a polite live region for status changes from other windows, empty / not-found states |
| `src/pages/Board.tsx` | `/board`: `BoardShell` + `BoardRotator` (big `CountUp` numbers, latest list, `CapacityMeter size="lg"`), live status line, QR in the footer |
| `src/pages/Sources.tsx` | `SourcesPage` with the synthetic records in `extra` and a "how they are made" section as `children` |
| `src/features/requests/badges.tsx` | Status, priority and overdue chips: icon + word, theme tokens only, never the hazard colours |
| `src/features/requests/RequestTimeline.tsx` | A domain object turned into `StatusTimeline` items (notes on the current step, the target date on "Done") |
| `src/i18n/fill.tsx` | Puts nodes into a translated sentence (`fill(t("…{code}…"), { code: <span …/> })`), e.g. a code that must not wrap |
| `src/domain/` | Pure, tested rules: `records.ts` (types, `seedRecords` with `createRng`, `nextCode`, `normalizeCode`, `createRecord`, `advanceRecord`), `kpis.ts` (KPIs, `countBy`, `crewLoad`, `progress`), `time.ts` (Philippine-time day maths, the pinned demo clock) |
| `src/store.ts` | `createSyncedStore("starter-app:records", …)` with `partialize` and `version`; the rules stay in the domain |
| `src/app.test.tsx` | Integration tests through the real route table (`createMemoryRouter`): ResizeObserver / scrollIntoView / fetch stubs, the wizard end to end, the resident lookup |

Multi-window demo: open `/console`, `/resident?code=REC-0022` and `/board` from the launcher's **New window** buttons; "Move to …" or a new request shows up in the other windows at once (checked with Playwright).

## Shared-code changes (for the template)

No file in `rcene/` was changed. Kit issues found while building it; the first five are now fixed in the template (2026-10-04) and synced here:

- **`rcene/ui/components/ui/chart.tsx` (ChartContainer)**: the axis selector `[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground` no longer matches Recharts 3.10 (tick labels sit in `.recharts-cartesian-axis-tick-label`, text class `.recharts-cartesian-axis-tick-value`), so axis labels keep Recharts' `#666`, about 3:1 on the dark palettes. **Fixed:** ChartContainer targets `.recharts-cartesian-axis-tick-value`, axis lines and labels.
- **`rcene/kit/app/console-layout.tsx`**: the default `--kit-console-top` (4.5rem) is the AppShell header without its nav row; with a nav row and the weave band the header is about 7.25rem (116 px), so the sticky sidebar and aside slide under it. **Fixed:** AppShell publishes its header height as `--app-header-h`, which ConsoleLayout uses by default.
- **`rcene/i18n` `useFormat().date/time`**: they use the device's time zone. Every app's data is Philippine time, and the smoke test's Chromium runs in the container's zone (UTC), so its screenshots show 08:30 PHT as "12:30 AM". Suggest `timeZone: "Asia/Manila"` in `useFormat` (StatusTimeline and the BoardShell clock use it). **Fixed for the smoke test:** its browser now runs in `Asia/Manila` (`en-PH`); the app itself still follows the device, which on the demo laptop is Philippine time.
- **`rcene/ui/components/ui/badge.tsx`**: the `destructive` variant uses `text-white` and `dark:bg-destructive/60`, against the tokens-only rule; **Fixed:** Badge and Button `destructive` use `text-destructive-foreground` and the solid token.
- **`rcene/kit/app/form-fields.tsx`**: `RadioField` has no column option (used `sm:[&_[role=radiogroup]]:grid-cols-2` for five category cards); a radio group's label sits about 4 px lower than a `SelectField` label beside it in the same row.
- **`rcene/kit/app/data-table.tsx`**: on phones the search box shares a row with "Download CSV" and is only about 130 px wide; **Fixed:** the search takes its own full-width row below `sm`.
- **`rcene/kit/app/zod-errors.ts`**: no message for a required confirmation (`z.literal(true)` / `refine`); the wizard gates Finish with `canNext` instead. A `kit.form.error.confirm` key would help.

## Requests for the data session

- (none) The app reads only `barangays.geojson` (names for the New request form).

## Dependencies added

- (none)

## Decisions and open questions

- **Clock pinned to the demo day.** `DEMO_DAY = 2026-10-07` (`src/domain/time.ts`); `demoNow()` keeps the real wall-clock time on that day, so new requests sort after the seeded ones and "due this week" / "overdue" read the same at every rehearsal. A live app uses `new Date()`.
- **Seed 171** (24 records filed 21 Sep – 6 Oct 2026) was chosen so every status and category appears, REC-0001 (the smoke route) is still open (a scheduled road job, overdue) and the road crew is exactly full (3 of 3): moving another road request to Scheduled shows "Over capacity".
- **Barangays:** seeded records use codes (`BRGY-05`) so the seed does not depend on a layer; new requests use the name chosen from the barangays layer. The table shows both.
- **"Records"** in the console nav is a status board at `/console/records`. It is not in `project.json` `smokeRoutes` (outside this task's write scope); it passes `npm run smoke -- --route /console/records`.
- **Households** stay out of the table (it then fits at 1280 px beside the sidebar); they are on the record page and in the CSV.
- **Crew load** = requests in "Scheduled" for a category against `CREW_SLOTS` per week.
- **Wizard:** Next validates the current step and shows the errors (instead of a disabled Next); only Finish is disabled, until the read-back is confirmed.

## Translations to review

All app keys in `src/i18n/strings.ts` have Waray and Filipino AI drafts (`strings.test.ts` checks that none is missing). Least certain, Waray:

- `record.status.review` "In review" → "Ha pagsusi"; `detail.note.review` "The office is checking the details and the place." → "Ha pagsusi han opisina an mga detalye ngan an lugar."
- `priority.urgent` "Urgent" → "Dinalian"
- `kpi.due` / `board.due` "Due this week" → "Takna ini nga semana"; `col.due` "Due" → "Takna"; `records.due` → "Takna {date}"
- `kpi.average` "Average days to close" → "Promedyo nga adlaw tubtob mahuman"
- `start.step3.body`, `detail.crewHint` ("nag-iiginbahin") and `sources.how.*` (long sentences)

Filipino: `kpi.due` "Takdang ngayong linggo" and `col.channel` "Naitala sa pamamagitan ng" read stiffly.
