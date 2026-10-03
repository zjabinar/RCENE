# @rcene/data

Data contracts, level colors, loaders and synthetic-data helpers shared by every app.

## Where the files come from

| Folder | What | Committed |
|---|---|---|
| `files/` | Real layers made by the **local data session** (`docs/projects/00-data.md`, skill `geo-data-prep`) from `D:\lgu_portal - GIS` | Yes (private repo only — some layers are permission-tier) |
| `fixtures/` | **Fake** sample geometry (`node scripts/data/make-fixtures.mjs`, then `node scripts/data/derive.mjs --fixtures`). Every name says "Sample". | Yes |

Apps fetch `/data/<file>`. `@rcene/config`'s static plugin serves `files/` first and falls back to `fixtures/` **per file**, and `/data/manifest.json` says which is which — `SampleDataBadge` in `@rcene/ui` shows a "Sample data" badge while any used layer is a fixture.

## Layers (`LAYER_FILES`)

`boundary` · `barangays` · `land` (coastline for the offline basemap) · `hazard-flood` · `hazard-landslide` · `hazard-stormSurge` · `hazard-groundShaking` · `hazard-liquefaction` · `facilities` · `heritage` · `derived/barangay-hazard` · `derived/facility-hazard` · `sources`

Property shapes are in `src/types.ts` (`ZoneProps { hazard, level }`, `FacilityProps { id, name, kind }`, …). Levels: `low < moderate < high < veryHigh`.

<!-- The data session fills in this section. -->
## Canonical layer per hazard and level mapping

_Not filled in yet — the data session records, per hazard, which CDRRMO/NOAH layer was chosen and how its categories map to `Level`._

## API

```ts
import {
  HAZARDS, LEVELS, type Hazard, type Level, type HazardStatus,   // three states: inZone | notInZone | outsideCoverage
  LEVEL_HEX, STATUS_HEX, atLeast, maxLevel, levelRank,             // colors for map paint; comparisons
  LAYER_FILES, layerUrl, hazardLayer, type LayerName,
  useLayer, useZones, useDataManifest, usesFixtures, fetchLayer, LayerMissingError, type LoadState,
  createRng, code,                                                 // seeded synthetic data: code("HH", 7) → "HH-0007"
} from "@rcene/data";
import { zonesSchema, facilitiesSchema /* … */ } from "@rcene/data/schemas"; // zod, for validation
```

- `useLayer("facilities")` → `{ status: "loading" | "ready" | "missing" | "error", data? }`. Render it with `<LoadGate state={...}>` from `@rcene/ui`.
- `useZones(hazards?)` → `{ zones: ZonesByHazard, missing: Hazard[] }`. Missing hazard layers are listed, never guessed.
- `createRng(seed)` → `next, int, float, pick, weighted, bool, shuffle`. Same seed → same demo every rehearsal.

## Rules

- Barangay- and facility-level data only. **No personal data, real or invented** — synthetic households use codes like `HH-0123`, never names.
- Never read from `D:\monica` or `C:\lgu_portal`.
- Every shipped file has a `sources.json` entry; `/sources` renders it.
- Frozen during a batch: request new layers or fields in your app's `NOTES.md`.
