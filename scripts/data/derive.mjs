#!/usr/bin/env node
/**
 * Precomputes the derived tables apps read instead of running heavy overlays in
 * the browser:
 *
 *   derived/barangay-hazard.json  share (0..1) of each barangay inside zones of
 *                                 each hazard x level, plus exposed facilities
 *   derived/facility-hazard.json  three-state hazard status of every facility
 *
 * Usage:
 *   node scripts/data/derive.mjs              # reads and writes packages/data/files
 *   node scripts/data/derive.mjs --fixtures   # reads and writes packages/data/fixtures
 *
 * Levels can overlap in source layers, so a barangay's shares across levels can
 * sum to more than 1. Each share answers "how much of the barangay is inside a
 * zone of exactly this level".
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as turf from "@turf/turf";
// Single source of truth for hazards and levels (Node >= 22.18 strips the types).
import { HAZARDS, LEVELS } from "../../packages/data/src/types.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const dir = path.join(root, "packages/data", process.argv.includes("--fixtures") ? "fixtures" : "files");
const read = (file) => {
  const p = path.join(dir, file);
  return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null;
};

const boundary = read("boundary.geojson");
const barangays = read("barangays.geojson");
const facilities = read("facilities.geojson");
if (!boundary || !barangays) {
  console.error(`boundary.geojson and barangays.geojson are required in ${dir}`);
  process.exit(1);
}

const zonesByHazard = Object.fromEntries(
  HAZARDS.map((h) => [h, read(`hazard-${h}.geojson`)]).filter(([, layer]) => layer),
);

const round = (n) => Math.round(n * 1000) / 1000;

/** Dissolves all zones of one level into a single geometry (or null). */
function levelUnion(layer, level) {
  const parts = layer.features.filter((f) => f.properties.level === level);
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0];
  return turf.union(turf.featureCollection(parts));
}

function inside(pt, area) {
  return area.features.some((f) => turf.booleanPointInPolygon(pt, f));
}

/**
 * Same rule as @rcene/geo lookupHazards (max level of all containing zones). Kept
 * as plain JS here so the script runs without a build; the geo tests pin the rule.
 */
function statusAt(pt, layer) {
  if (!inside(pt, boundary)) return { kind: "outsideCoverage" };
  let best = -1;
  for (const f of layer.features) {
    if (turf.booleanPointInPolygon(pt, f)) best = Math.max(best, LEVELS.indexOf(f.properties.level));
  }
  return best < 0 ? { kind: "notInZone" } : { kind: "inZone", level: LEVELS[best] };
}

const unions = Object.fromEntries(
  Object.entries(zonesByHazard).map(([h, layer]) => [h, Object.fromEntries(LEVELS.map((l) => [l, levelUnion(layer, l)]))]),
);

const facilityRows = (facilities?.features ?? []).map((f) => ({
  id: f.properties.id,
  status: Object.fromEntries(Object.entries(zonesByHazard).map(([h, layer]) => [h, statusAt(f, layer)])),
}));

const barangayRows = barangays.features.map((b) => {
  const total = turf.area(b);
  const hazards = {};
  const exposedFacilities = {};
  const inBarangay = (facilities?.features ?? []).filter((f) => turf.booleanPointInPolygon(f, b));
  for (const [h, byLevel] of Object.entries(unions)) {
    hazards[h] = {};
    for (const [level, union] of Object.entries(byLevel)) {
      if (!union) continue;
      const overlap = turf.intersect(turf.featureCollection([b, union]));
      const share = overlap ? turf.area(overlap) / total : 0;
      if (share > 0) hazards[h][level] = round(share);
    }
    const counts = {};
    for (const f of inBarangay) {
      const status = statusAt(f, zonesByHazard[h]);
      if (status.kind === "inZone") counts[status.level] = (counts[status.level] ?? 0) + 1;
    }
    exposedFacilities[h] = counts;
  }
  return { barangay: b.properties.name, psgc: b.properties.psgc, hazards, exposedFacilities };
});

mkdirSync(path.join(dir, "derived"), { recursive: true });
writeFileSync(path.join(dir, "derived/barangay-hazard.json"), JSON.stringify(barangayRows, null, 1) + "\n");
writeFileSync(path.join(dir, "derived/facility-hazard.json"), JSON.stringify(facilityRows, null, 1) + "\n");
console.log(
  `Derived tables written to ${path.relative(root, dir)}/derived (${barangayRows.length} barangays, ${facilityRows.length} facilities, hazards: ${Object.keys(zonesByHazard).join(", ") || "none"})`,
);
