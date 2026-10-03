# @rcene/data

Data contracts, level colors, layer loaders, optional layers, CSV export and seeded synthetic data. No UI (render the load states with `LoadGate` from `@rcene/ui`).

> **This folder is the app's own copy of the shared code.** Use it as-is where you can. If you change it, keep the change minimal and list it in `NOTES.md` under "Shared-code changes (for the template)".

## Where the data files are

The files are not in this folder. They live in the app's `data/` folder and are served at `/data/`:

| Folder | What |
|---|---|
| `data/files/` | Real layers from the data session |
| `data/fixtures/` | **Fake** sample geometry (every name says "Sample"), used file by file where no real file exists |

The Vite plugin in `rcene/config` serves `data/files` first and falls back to `data/fixtures` **per file** (also in `vite preview` and the build), and `/data/manifest.json` lists every served file as `"real"` or `"fixture"`. `SampleDataBadge` in `@rcene/ui` shows "Sample data" while a layer the screen uses is a fixture. **`data/README.md` in the app root is the catalogue of the files** (sources, fields, level mapping). On a project branch `data/` is read-only: ask for new layers or fields in `NOTES.md` under "Requests for the data session".

```ts
import { … } from "@rcene/data";
import { zonesSchema, … } from "@rcene/data/schemas";   // zod; kept separate so zod loads only where needed
```

## Types and levels (`types.ts`, `levels.ts`)

| Export | What |
|---|---|
| `HAZARDS`, `type Hazard` | `flood`, `landslide`, `stormSurge`, `groundShaking`, `liquefaction` |
| `LEVELS`, `type Level` | `low < moderate < high < veryHigh` |
| `type HazardStatus` | `{ kind: "inZone"; level }` \| `{ kind: "notInZone" }` \| `{ kind: "outsideCoverage" }`. The only three answers; there is no "safe" |
| `levelRank(l)`, `atLeast(l, min)`, `maxLevel(levels)` | Compare levels; `maxLevel([])` is `null` |
| `LEVEL_HEX`, `STATUS_HEX` | Hex colors for map paint (`["get", "level"]` expressions). The CSS tokens in `@rcene/ui` match them (tested). Never use color alone |
| `FACILITY_KINDS`, `type FacilityKind` | `school`, `hospital`, `health`, `police`, `fire`, `townhall`, `other` |
| `ZoneProps`, `BarangayProps`, `FacilityProps`, `HeritageProps`, `BoundaryProps` | Feature properties (`ZoneProps { hazard, level, sourceLayer? }`, `FacilityProps { id, name, kind, barangay?, osmId? }`, …) |
| `ZoneCollection`, `BarangayCollection`, `FacilityCollection`, `HeritageCollection`, `BoundaryCollection`, `BarangayFeature`, `FacilityFeature`, `Area` | GeoJSON types |
| `ZonesByHazard` | `Partial<Record<Hazard, ZoneCollection>>` (a hazard is absent when its layer is not loaded) |
| `BarangayHazardRow`, `FacilityHazardRow` | Rows of the precomputed `derived/*.json` files (shares are 0..1 of the barangay's area) |
| `SourceEntry` | `{ file, title, attribution, tier: "open" \| "permission" \| "synthetic" \| "fixture", license?, url?, notes? }` |
| `DataManifest` | `{ files: Record<string, "real" \| "fixture"> }` |

## Layers (`layers.ts`)

`LAYER_FILES` maps each `LayerName` to its file; `LayerTypes[name]` is its type.

`boundary` · `barangays` · `land` (coastline for the offline basemap) · `hazard-flood` · `hazard-landslide` · `hazard-stormSurge` · `hazard-groundShaking` · `hazard-liquefaction` · `facilities` · `heritage` · `derived/barangay-hazard` · `derived/facility-hazard` · `sources`

- `layerUrl(name)` → `"/data/<file>"`. `hazardLayer("flood")` → `"hazard-flood"`.
- A file that is not one of these (and may not exist) is read with `useOptionalLayer`, below.

## Loaders (`load.ts`)

Every file is fetched **once per page load**; later calls share the promise. A failed fetch is not cached, so a retry fetches again.

| Export | What |
|---|---|
| `useLayer(name)` | `LoadState<LayerTypes[name]>`: `{ status: "loading" }` \| `{ status: "ready"; data }` \| `{ status: "missing"; error: LayerMissingError }` \| `{ status: "error"; error }`. Render with `<LoadGate state={…}>` |
| `useZones(hazards = HAZARDS)` | `LoadState<{ zones: ZonesByHazard; missing: Hazard[] }>`. Missing hazard layers are listed, never guessed |
| `useDataManifest()` | `DataManifest \| null` (null until loaded) |
| `usesFixtures(manifest, layers)` | True when any of `layers` is a fixture |
| `fetchLayer(name)`, `fetchManifest()` | Non-hook versions. `fetchManifest()` never rejects (no manifest → `{ files: {} }`) |
| `fetchDataFile(file)` | Any JSON file under `/data/` (cached). Rejects with `LayerMissingError` if not served. Prefer `useOptionalLayer` |
| `dataFileKey(file)` | `"/data/x.json"` or `"x.json"` → `"x.json"` (the manifest key) |
| `LayerMissingError` | `.layer` names the file. A 404 or `vite preview`'s HTML fallback counts as missing |

```tsx
const facilities = useLayer("facilities");
<LoadGate state={facilities}>{(fc) => <FacilityList features={fc.features} />}</LoadGate>
```

## Optional layers (`optional.ts`)

For files that may never exist (land cover, coastal lines, heightmap metadata, a layer the data session may not deliver). `useLayer` would request them and get a 404, which the browser logs as a console error and the smoke test fails on. `useOptionalLayer` reads the manifest first and **only fetches files the manifest lists**: an absent file costs no request.

```ts
useOptionalLayer<T>(file: string, schema?: SafeParser<T>): OptionalLayerState<T>
// { status: "loading" } | { status: "absent" } | { status: "invalid"; error: string } | { status: "ready"; data: T }

const coast = useOptionalLayer("coastal.geojson", boundarySchema);   // T inferred from the zod schema
if (coast.status === "ready") drawCoast(coast.data);
if (coast.status === "absent") /* hide the toggle; say "not available" if the user asked for it */;
```

- `file` is relative to `/data/` (a leading `/data/` is fine).
- `absent`: not in the manifest, or listed but not served. The app does without it.
- `invalid`: listed, but unreadable JSON, a failed request, or it failed `schema.safeParse` (`error` is a short reason such as `features.0.properties.level: Invalid option…`).
- `schema` is anything with zod's `safeParse` (`SafeParser<T>`): a schema from `@rcene/data/schemas` or your own `z.object(…)`. Without a schema, `data` is `unknown` unless you pass `T`.
- The schema is read when `file` changes; a new inline schema object does not refetch.
- `loadOptionalLayer(file, schema?)` is the non-hook version (a promise that never rejects).
- JSON only. For an optional image (e.g. a heightmap PNG), check `useDataManifest()?.files["heightmap.png"]` before using its URL.

## CSV (`csv.ts`)

```ts
toCsv<Row>(rows: readonly Row[], columns: readonly CsvColumn<Row>[], options?: { bom?: boolean; eol?: "\r\n" | "\n" }): string
type CsvColumn<Row> = { key: keyof Row | ((row: Row) => unknown); header: string };

const csv = toCsv(households, [
  { key: "code", header: t("col.code") },
  { key: (h) => h.members.length, header: t("col.members") },
  { key: (h) => h.status.flood?.kind ?? "", header: t("col.flood") },
], { bom: true });
downloadCsv("households.csv", csv);   // from @rcene/ui
```

- RFC 4180: a field is quoted when it contains a comma, a quote, CR or LF, and inner quotes are doubled. Records are joined with `eol` (default `"\r\n"`), with no trailing line break.
- Cells: `null`/`undefined` and `NaN`/`Infinity` → empty; numbers plain (`1728.75`, no ₱ or grouping, so spreadsheets read them as numbers); booleans `true`/`false`; dates ISO 8601; other objects JSON.
- `bom: true` adds a UTF-8 byte-order mark so Excel shows ₱, ñ and Waray place names correctly.
- `csvField(value)` formats one cell.
- Headers are UI text: translate them.

## Synthetic data (`synthetic.ts`)

- `createRng(seed)` → `{ next, int(min, max), float(min, max), pick(items), weighted([[item, weight], …]), bool(p = 0.5), shuffle(items) }` (mulberry32). Same seed, same data: a rehearsed demo is identical every run.
- `code("HH", 7)` → `"HH-0007"` (`width` defaults to 4).
- For random points inside the city, use `randomPointsIn(boundary, n, createRng(seed))` from `@rcene/geo`.
- Credit generated data on `/sources` with `SourcesPage extra={[{ tier: "synthetic", … }]}`.

## Schemas (`@rcene/data/schemas`)

zod 4 schemas for the shipped files: `hazardSchema`, `levelSchema`, `boundarySchema` (also fits `land`), `barangaysSchema`, `zonesSchema`, `facilitiesSchema`, `heritageSchema`, `sourcesSchema`. Feature properties are `.loose()` (extra fields pass). Use them with `useOptionalLayer`, in tests, or to validate a file before asking for it to be shipped.

## Rules

- Barangay- and facility-level data only. **No personal data, real or invented**: synthetic households use codes like `HH-0123`, never names.
- Never read from `D:\monica` or `C:\lgu_portal`.
- Never `fetch` a data file directly: `useLayer`, `useZones` or `useOptionalLayer` handle missing files without console errors.
- Every shipped file has a `sources.json` entry; `/sources` renders it, plus the app's `extra` sources.

## Tests

`npm run test -- rcene/data`: the fixtures exist for every layer and match the schemas, levels, `createRng`, the HTML-fallback rule, `toCsv`, and `useOptionalLayer` with a stubbed `fetch` (no request for an unlisted file).
