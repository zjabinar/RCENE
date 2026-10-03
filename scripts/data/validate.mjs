#!/usr/bin/env node
/**
 * Checks the shipped data files before they are committed.
 *
 *   node scripts/data/validate.mjs              # packages/data/files (the real data)
 *   node scripts/data/validate.mjs --fixtures   # packages/data/fixtures
 *   node scripts/data/validate.mjs --dir <path> # any folder laid out like packages/data/files
 *
 * Errors (exit 1):
 *   - a file fails its zod schema in packages/data/src/schemas.ts
 *   - a coordinate falls outside lon 124..126 / lat 11..13 (Samar), e.g. UTM metres
 *     that were never reprojected, or [lat, lon] order
 *   - an unclosed polygon ring, a duplicate facility/heritage id, a zone whose
 *     `hazard` does not match its file name
 *   - a non-derived file with no sources.json entry (in fixtures, `"file": "*"` covers all)
 *   - raw GIS files (.shp, .kml, .kmz, ...) inside the data folder
 *   - derived tables that no longer match their inputs (re-run derive.mjs)
 * Warnings: total size over 3 MB, more than 5 decimals, properties that types.ts
 * does not define, unknown files, missing layers (the fixture is served instead).
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { LAYER_FILES } from "../../packages/data/src/layers.ts";
import {
  barangaysSchema,
  boundarySchema,
  facilitiesSchema,
  heritageSchema,
  sourcesSchema,
  zonesSchema,
} from "../../packages/data/src/schemas.ts";
import { HAZARDS, LEVELS } from "../../packages/data/src/types.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const { values } = parseArgs({
  options: {
    fixtures: { type: "boolean", default: false },
    dir: { type: "string" },
  },
});
const fixtures = values.fixtures;
const dir = values.dir
  ? path.resolve(values.dir)
  : path.join(root, "packages/data", fixtures ? "fixtures" : "files");

const MAX_TOTAL_BYTES = 3 * 1024 * 1024;
const BBOX = { minLon: 124, maxLon: 126, minLat: 11, maxLat: 13 };
const IGNORED = new Set([".gitkeep", "README.md", ".DS_Store", "Thumbs.db"]); // same as @rcene/config static.ts
const RAW_EXT = new Set([".shp", ".shx", ".dbf", ".prj", ".cpg", ".sbn", ".sbx", ".qix", ".kml", ".kmz", ".gpkg", ".tif", ".tiff", ".zip", ".qgz", ".qgs", ".xml"]);

/** Allowed property keys per layer kind, from types.ts. Anything else should have been dropped. */
const PROPS = {
  boundary: ["name", "fixture"],
  barangays: ["name", "psgc", "coastal", "fixture"],
  zones: ["hazard", "level", "sourceLayer", "fixture"],
  facilities: ["id", "name", "kind", "barangay", "osmId", "fixture"],
  heritage: ["id", "name", "category", "description", "barangay", "fixture"],
};
const SCHEMAS = {
  boundary: boundarySchema,
  barangays: barangaysSchema,
  zones: zonesSchema,
  facilities: facilitiesSchema,
  heritage: heritageSchema,
};
const HERITAGE_CATEGORIES = ["heritage", "eco-tourism", "scenic", "other"];

/** Layer kind for a file path relative to the data folder. */
function kindOf(rel) {
  if (rel === LAYER_FILES.boundary || rel === LAYER_FILES.land) return "boundary";
  if (rel === LAYER_FILES.barangays) return "barangays";
  if (/^hazard-[A-Za-z]+\.geojson$/.test(rel)) return "zones";
  if (rel === LAYER_FILES.facilities) return "facilities";
  if (rel === LAYER_FILES.heritage) return "heritage";
  if (rel === LAYER_FILES.sources) return "sources";
  if (rel === LAYER_FILES["derived/barangay-hazard"]) return "derived-barangay";
  if (rel === LAYER_FILES["derived/facility-hazard"]) return "derived-facility";
  return "unknown";
}

function listFiles(base) {
  const out = [];
  const walk = (abs, rel) => {
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      if (IGNORED.has(entry.name)) continue;
      const childRel = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(path.join(abs, entry.name), childRel);
      else out.push(childRel);
    }
  };
  walk(base, "");
  return out.sort();
}

function* positions(geometry) {
  if (!geometry) return;
  const { type, coordinates } = geometry;
  if (type === "Point") yield coordinates;
  else if (type === "MultiPoint" || type === "LineString") yield* coordinates;
  else if (type === "Polygon" || type === "MultiLineString") for (const r of coordinates) yield* r;
  else if (type === "MultiPolygon") for (const p of coordinates) for (const r of p) yield* r;
  else if (type === "GeometryCollection") for (const g of geometry.geometries) yield* positions(g);
}

function* rings(geometry) {
  if (geometry?.type === "Polygon") yield* geometry.coordinates;
  else if (geometry?.type === "MultiPolygon") for (const p of geometry.coordinates) yield* p;
}

const decimals = (n) => {
  const s = String(n);
  const dot = s.indexOf(".");
  return dot < 0 || s.includes("e") ? 0 : s.length - dot - 1;
};

const formatBytes = (n) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(2)} MB` : `${(n / 1024).toFixed(1)} KB`);

function zodMessage(error) {
  const issue = error.issues[0];
  const where = issue.path.join(".");
  return `schema: ${where ? `${where}: ` : ""}${issue.message}${error.issues.length > 1 ? ` (+${error.issues.length - 1} more)` : ""}`;
}

/** Checks one GeoJSON layer; pushes to errors/warnings. Returns the feature count. */
function checkGeojson(rel, kind, data, errors, warnings, infos) {
  const result = SCHEMAS[kind].safeParse(data);
  if (!result.success) errors.push(zodMessage(result.error));
  const features = Array.isArray(data?.features) ? data.features : [];
  if (features.length === 0) warnings.push("no features");

  let outside = 0;
  let projected = 0;
  let swapped = 0;
  let maxDecimals = 0;
  let openRings = 0;
  const extraKeys = new Set();
  const ids = new Map();

  for (const f of features) {
    for (const [lon, lat] of positions(f?.geometry)) {
      maxDecimals = Math.max(maxDecimals, decimals(lon), decimals(lat));
      if (lon >= BBOX.minLon && lon <= BBOX.maxLon && lat >= BBOX.minLat && lat <= BBOX.maxLat) continue;
      outside++;
      if (Math.abs(lon) > 180 || Math.abs(lat) > 90) projected++;
      else if (lat >= BBOX.minLon && lat <= BBOX.maxLon && lon >= BBOX.minLat && lon <= BBOX.maxLat) swapped++;
    }
    for (const ring of rings(f?.geometry)) {
      const a = ring[0];
      const b = ring[ring.length - 1];
      if (!a || !b || a[0] !== b[0] || a[1] !== b[1]) openRings++;
    }
    for (const key of Object.keys(f?.properties ?? {})) if (!PROPS[kind].includes(key)) extraKeys.add(key);
    const id = f?.properties?.id;
    if (id !== undefined) ids.set(id, (ids.get(id) ?? 0) + 1);
  }

  if (outside) {
    const hint = projected
      ? " (projected metres: reproject with -proj wgs84, add init=EPSG:32651 if the .prj is missing or wrong)"
      : swapped
        ? " (looks like [lat, lon] order: GeoJSON is [lon, lat])"
        : "";
    errors.push(`${outside} coordinate(s) outside lon ${BBOX.minLon}..${BBOX.maxLon} / lat ${BBOX.minLat}..${BBOX.maxLat}${hint}`);
  }
  if (openRings) errors.push(`${openRings} polygon ring(s) not closed`);
  if (maxDecimals > 5) warnings.push(`up to ${maxDecimals} decimals: export with precision=0.00001`);
  if (extraKeys.size) warnings.push(`properties not in types.ts: ${[...extraKeys].slice(0, 6).join(", ")}${extraKeys.size > 6 ? ", ..." : ""} (drop with -filter-fields)`);

  const dupes = [...ids].filter(([, count]) => count > 1).map(([id]) => id);
  if (dupes.length) errors.push(`duplicate id(s): ${dupes.slice(0, 5).join(", ")}`);

  if (kind === "zones") {
    const expected = rel.slice("hazard-".length, -".geojson".length);
    if (!HAZARDS.includes(expected)) errors.push(`"${expected}" is not a hazard in types.ts (${HAZARDS.join(", ")})`);
    const wrong = features.filter((f) => f?.properties?.hazard !== expected).length;
    if (wrong) errors.push(`${wrong} feature(s) with hazard other than "${expected}"`);
    const present = new Set(features.map((f) => f?.properties?.level));
    const missing = LEVELS.filter((l) => !present.has(l));
    if (missing.length && missing.length < LEVELS.length) infos.push(`no zones for level(s): ${missing.join(", ")} (fine if the source has no such category)`);
  }
  if (kind === "heritage") {
    const odd = features.filter((f) => !HERITAGE_CATEGORIES.includes(f?.properties?.category)).length;
    if (odd) warnings.push(`${odd} feature(s) with category outside ${HERITAGE_CATEGORIES.join("|")}`);
  }
  if (kind === "boundary" && features.length !== 1) warnings.push(`${features.length} features (expected 1)`);
  if (kind === "barangays" && !fixtures && features.length !== 57) warnings.push(`${features.length} barangays (Catbalogan has 57)`);
  return features.length;
}

// ---------------------------------------------------------------------------

if (!existsSync(dir)) {
  console.error(`Data folder not found: ${dir}`);
  process.exit(1);
}

const files = listFiles(dir);
if (files.length === 0) {
  console.log(`${path.relative(root, dir) || dir} holds no data files yet: apps are served the fixtures.`);
  process.exit(0);
}
const rows = [];
const parsed = new Map();
let totalBytes = 0;

for (const rel of files) {
  const abs = path.join(dir, rel);
  const size = statSync(abs).size;
  totalBytes += size;
  const errors = [];
  const warnings = [];
  const infos = [];
  const kind = kindOf(rel);
  let count = "";

  if (RAW_EXT.has(path.extname(rel).toLowerCase())) {
    errors.push("raw GIS source file: keep raw .shp/.kml/.kmz outside the repo, ship only converted GeoJSON");
  } else if (kind === "unknown") {
    warnings.push("not a layer in packages/data/src/layers.ts: not validated");
  } else {
    let data;
    try {
      data = JSON.parse(readFileSync(abs, "utf8"));
      parsed.set(rel, data);
    } catch (e) {
      errors.push(`not valid JSON: ${e.message}`);
    }
    if (data !== undefined) {
      if (kind === "sources") {
        const result = sourcesSchema.safeParse(data);
        if (!result.success) errors.push(zodMessage(result.error));
        count = Array.isArray(data) ? data.length : "";
      } else if (kind.startsWith("derived")) {
        count = Array.isArray(data) ? data.length : "";
        if (!Array.isArray(data)) errors.push("expected a JSON array");
      } else {
        count = checkGeojson(rel, kind, data, errors, warnings, infos);
      }
    }
  }
  rows.push({ rel, kind, count, size, errors, warnings, infos });
}

const row = (rel) => rows.find((r) => r.rel === rel);

// sources.json: every shipped, non-derived file needs an entry.
const sourcesRel = LAYER_FILES.sources;
const sources = Array.isArray(parsed.get(sourcesRel)) ? parsed.get(sourcesRel) : null;
if (!row(sourcesRel)) {
  rows.push({ rel: sourcesRel, kind: "sources", count: "", size: 0, errors: ["missing: every data folder ships a sources.json"], warnings: [], infos: [] });
} else if (sources) {
  const listed = new Set(sources.map((s) => s.file));
  const wildcard = fixtures && listed.has("*");
  for (const r of rows) {
    if (r.rel === sourcesRel || r.rel.startsWith("derived/")) continue;
    if (!wildcard && !listed.has(r.rel)) r.errors.push("no sources.json entry (credit every source)");
  }
  const sourcesRow = row(sourcesRel);
  for (const s of sources) {
    if (s.file !== "*" && !files.includes(s.file)) sourcesRow.warnings.push(`entry for missing file ${s.file}`);
    if (s.tier === "open" && !s.license) sourcesRow.warnings.push(`${s.file}: open source without license`);
  }
  const permission = sources.filter((s) => s.tier === "permission").map((s) => s.file);
  if (permission.length) sourcesRow.infos.push(`permission tier, private repo only: ${permission.join(", ")}`);
}

// Derived tables must match their inputs; otherwise derive.mjs was not re-run.
const barangays = parsed.get(LAYER_FILES.barangays);
const facilities = parsed.get(LAYER_FILES.facilities);
const derivedB = parsed.get(LAYER_FILES["derived/barangay-hazard"]);
const derivedF = parsed.get(LAYER_FILES["derived/facility-hazard"]);
const hazardsPresent = HAZARDS.filter((h) => parsed.has(`hazard-${h}.geojson`));
const stale = "out of date: run node scripts/data/derive.mjs" + (fixtures ? " --fixtures" : "");
if (Array.isArray(derivedB) && barangays?.features) {
  const names = barangays.features.map((f) => f.properties?.name).sort();
  const rowsNames = derivedB.map((r) => r.barangay).sort();
  const hazardKeys = new Set(derivedB.flatMap((r) => Object.keys(r.hazards ?? {})));
  const sameHazards = hazardsPresent.length === hazardKeys.size && hazardsPresent.every((h) => hazardKeys.has(h));
  if (JSON.stringify(names) !== JSON.stringify(rowsNames) || !sameHazards) row(LAYER_FILES["derived/barangay-hazard"]).errors.push(stale);
}
if (Array.isArray(derivedF) && facilities?.features) {
  const ids = facilities.features.map((f) => f.properties?.id).sort();
  const rowIds = derivedF.map((r) => r.id).sort();
  const badStatus = derivedF.some((r) =>
    Object.values(r.status ?? {}).some(
      (s) => !["inZone", "notInZone", "outsideCoverage"].includes(s?.kind) || (s.kind === "inZone" && !LEVELS.includes(s.level)),
    ),
  );
  if (JSON.stringify(ids) !== JSON.stringify(rowIds)) row(LAYER_FILES["derived/facility-hazard"]).errors.push(stale);
  if (badStatus) row(LAYER_FILES["derived/facility-hazard"]).errors.push("status values outside HazardStatus");
}
if ((barangays && !derivedB) || (facilities && !derivedF)) {
  rows.push({ rel: "derived/", kind: "derived", count: "", size: 0, errors: [], warnings: ["derived tables missing: run node scripts/data/derive.mjs"], infos: [] });
}

// Layers apps can request that this folder does not have.
const missingLayers = Object.values(LAYER_FILES).filter((f) => !files.includes(f));

// ---------------------------------------------------------------------------

const status = (r) => (r.errors.length ? "ERROR" : r.warnings.length ? "warn" : "ok");
const table = rows.map((r) => [r.rel, r.kind, String(r.count), r.size ? formatBytes(r.size) : "", status(r)]);
const header = ["File", "Type", "Items", "Size", "Status"];
const widths = header.map((h, i) => Math.max(h.length, ...table.map((t) => t[i].length)));
const line = (cells) =>
  cells
    .map((c, i) => (i === 2 || i === 3 ? c.padStart(widths[i]) : c.padEnd(widths[i])))
    .join("  ")
    .trimEnd();

const shown = path.relative(root, dir);
console.log(`Validating ${shown && !shown.startsWith("..") ? shown : dir}${fixtures ? " (fixtures)" : ""}\n`);
console.log(line(header));
console.log(widths.map((w) => "-".repeat(w)).join("  "));
for (const t of table) console.log(line(t));
console.log("");

let errorCount = 0;
let warnCount = 0;
for (const r of rows) {
  for (const e of r.errors) console.log(`  ERROR ${r.rel}: ${e}`);
  for (const w of r.warnings) console.log(`  warn  ${r.rel}: ${w}`);
  for (const i of r.infos) console.log(`  info  ${r.rel}: ${i}`);
  errorCount += r.errors.length;
  warnCount += r.warnings.length;
}
if (totalBytes > MAX_TOTAL_BYTES) {
  console.log(`  warn  total ${formatBytes(totalBytes)} is over the 3 MB budget: simplify more (-simplify 10% keep-shapes) or drop detail`);
  warnCount++;
}
if (missingLayers.length && !fixtures) {
  console.log(`  info  not in this folder, apps get the fixture instead: ${missingLayers.join(", ")}`);
}

console.log(`\nTotal ${formatBytes(totalBytes)} in ${files.length} file(s): ${errorCount} error(s), ${warnCount} warning(s)`);
process.exit(errorCount ? 1 : 0);
