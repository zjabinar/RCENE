# S1 · Application starter

| | |
|---|---|
| **App** | `apps/starter-app` · dev port 5301 · preview 6301 |
| **Kind** | Reference project on `main` (not launched; `src/` maintained by hand) |
| **Built from** | `@rcene/kit/app` and `@rcene/ui`: RoleLauncher, ConsoleLayout, PageHeader, KpiRow, ChartCard, DataTable, Wizard + form fields, StatusTimeline, CapacityMeter, QrDisplay, BoardShell |

> A complete, generic role-based application to copy pages from: operator console, records, a wizard, a resident phone view and a public board.

## Routes

| Route | Shows |
|---|---|
| `/` | Role launcher |
| `/console` | ConsoleLayout with KPI row, ChartCard and a DataTable of synthetic records `REC-0001…` |
| `/console/new` | Wizard with form fields (react-hook-form + zod) |
| `/console/:id` | Record detail: StatusTimeline, CapacityMeter, QR |
| `/resident` | Phone-width view |
| `/board` | BoardShell in the `malinaw` palette |
| `/sources` | Sources page |

## How sessions use it

- App and platform sessions copy pages and patterns from `../starter-app/src` by reading only, the same way platforms lift modules. Record what you copied in `NOTES.md`.
- The synthetic records are seeded (`createRng`) and coded; they contain no names.
