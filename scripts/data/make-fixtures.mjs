#!/usr/bin/env node
/**
 * Writes the committed FAKE fixtures in packages/data/fixtures/.
 *
 * Fixtures let every app run before the real data (packages/data/files/, made
 * by the local data session) exists. The geometry is deliberately crude and
 * every name says "Sample", so nobody mistakes it for real hazard data.
 * Coverage the tests rely on:
 *   - every hazard and every level appears at least once
 *   - one zone has a hole (flood, moderate) — a point in the hole is "notInZone"
 *   - two zones overlap (flood moderate + high) — the lookup must return "high"
 *   - some facilities sit inside the storm-surge zone, some outside
 *
 * Usage: node scripts/data/make-fixtures.mjs   (then: node scripts/data/derive.mjs --fixtures)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const out = path.join(root, "packages/data/fixtures");
mkdirSync(path.join(out, "derived"), { recursive: true });

const ring = (...pts) => [...pts, pts[0]];
const poly = (...rings) => ({ type: "Polygon", coordinates: rings });
const fc = (features) => ({ type: "FeatureCollection", features });
const feature = (geometry, properties) => ({ type: "Feature", properties: { ...properties, fixture: true }, geometry });
const point = (lon, lat) => ({ type: "Point", coordinates: [lon, lat] });
const write = (file, data) => writeFileSync(path.join(out, file), JSON.stringify(data, null, 1) + "\n");

// City boundary: the west edge is the "coast".
const cityRing = ring([124.86, 11.72], [124.97, 11.72], [124.97, 11.84], [124.88, 11.84], [124.85, 11.8]);
write("boundary.geojson", fc([feature(poly(cityRing), { name: "Sample City (fixture)" })]));

// Land outline larger than the city, so the offline basemap shows sea to the west.
write(
  "land.geojson",
  fc([feature(poly(ring([124.84, 11.65], [125.1, 11.65], [125.1, 11.95], [124.86, 11.95], [124.83, 11.8])), { name: "Sample land (fixture)" })]),
);

const barangays = [
  ["Sample Barangay 1", true, ring([124.86, 11.72], [124.92, 11.72], [124.92, 11.76], [124.855, 11.76])],
  ["Sample Barangay 2", true, ring([124.855, 11.76], [124.92, 11.76], [124.92, 11.8], [124.85, 11.8])],
  ["Sample Barangay 3", true, ring([124.85, 11.8], [124.92, 11.8], [124.92, 11.84], [124.88, 11.84])],
  ["Sample Barangay 4", false, ring([124.92, 11.72], [124.97, 11.72], [124.97, 11.76], [124.92, 11.76])],
  ["Sample Barangay 5", false, ring([124.92, 11.76], [124.97, 11.76], [124.97, 11.8], [124.92, 11.8])],
  ["Sample Barangay 6", false, ring([124.92, 11.8], [124.97, 11.8], [124.97, 11.84], [124.92, 11.84])],
];
write(
  "barangays.geojson",
  fc(barangays.map(([name, coastal, r], i) => feature(poly(r), { name, psgc: `FIXTURE-${i + 1}`, coastal }))),
);

const zone = (hazard, level, geometry) => feature(geometry, { hazard, level, sourceLayer: "fixture" });
const rect = (w, s, e, n) => ring([w, s], [e, s], [e, n], [w, n]);

write(
  "hazard-stormSurge.geojson",
  fc([
    zone("stormSurge", "high", poly(ring([124.855, 11.74], [124.89, 11.74], [124.89, 11.82], [124.87, 11.82], [124.852, 11.79]))),
    zone("stormSurge", "moderate", poly(rect(124.89, 11.74, 124.91, 11.82))),
    zone("stormSurge", "veryHigh", poly(rect(124.856, 11.765, 124.868, 11.785))),
    zone("stormSurge", "low", poly(rect(124.91, 11.74, 124.915, 11.82))),
  ]),
);
write(
  "hazard-flood.geojson",
  fc([
    // Moderate zone with a hole (a hill): a point in the hole is NOT in this zone.
    zone("flood", "moderate", poly(rect(124.9, 11.76, 124.95, 11.8), rect(124.92, 11.775, 124.93, 11.785).reverse())),
    // Overlaps the moderate zone between 124.94 and 124.95: the lookup must answer "high" there.
    zone("flood", "high", poly(rect(124.94, 11.77, 124.96, 11.79))),
    zone("flood", "low", poly(rect(124.86, 11.725, 124.9, 11.74))),
    zone("flood", "veryHigh", poly(rect(124.955, 11.735, 124.965, 11.745))),
  ]),
);
write(
  "hazard-landslide.geojson",
  fc([
    zone("landslide", "veryHigh", poly(rect(124.955, 11.81, 124.968, 11.835))),
    zone("landslide", "high", poly(rect(124.93, 11.8, 124.955, 11.835))),
    zone("landslide", "moderate", {
      type: "MultiPolygon",
      coordinates: [[rect(124.93, 11.725, 124.945, 11.74)], [rect(124.95, 11.725, 124.965, 11.74)]],
    }),
    zone("landslide", "low", poly(rect(124.92, 11.82, 124.93, 11.835))),
  ]),
);
write(
  "hazard-groundShaking.geojson",
  fc([
    zone("groundShaking", "moderate", poly(rect(124.86, 11.725, 124.965, 11.835))),
    zone("groundShaking", "high", poly(rect(124.87, 11.77, 124.9, 11.8))),
  ]),
);
write(
  "hazard-liquefaction.geojson",
  fc([
    zone("liquefaction", "high", poly(rect(124.86, 11.77, 124.875, 11.8))),
    zone("liquefaction", "low", poly(rect(124.875, 11.75, 124.89, 11.8))),
  ]),
);

const facilities = [
  ["F-001", "Sample School A (in surge zone)", "school", 124.875, 11.78, "Sample Barangay 2"],
  ["F-002", "Sample School B", "school", 124.935, 11.75, "Sample Barangay 4"],
  ["F-003", "Sample School C", "school", 124.945, 11.815, "Sample Barangay 6"],
  ["F-004", "Sample School D", "school", 124.925, 11.79, "Sample Barangay 5"],
  ["F-005", "Sample School E (in surge zone)", "school", 124.88, 11.81, "Sample Barangay 3"],
  ["F-006", "Sample School F", "school", 124.96, 11.765, "Sample Barangay 5"],
  ["F-007", "Sample Hospital", "hospital", 124.905, 11.775, "Sample Barangay 2"],
  ["F-008", "Sample Health Station 1", "health", 124.9, 11.73, "Sample Barangay 1"],
  ["F-009", "Sample Health Station 2", "health", 124.95, 11.83, "Sample Barangay 6"],
  ["F-010", "Sample Police Station", "police", 124.895, 11.79, "Sample Barangay 2"],
  ["F-011", "Sample Fire Station", "fire", 124.915, 11.8, "Sample Barangay 3"],
  ["F-012", "Sample City Hall", "townhall", 124.885, 11.775, "Sample Barangay 2"],
];
write(
  "facilities.geojson",
  fc(facilities.map(([id, name, kind, lon, lat, barangay]) => feature(point(lon, lat), { id, name, kind, barangay }))),
);

const heritage = [
  ["H-001", "Sample Heritage Church", "heritage", 124.884, 11.776],
  ["H-002", "Sample Old Bridge", "heritage", 124.892, 11.782],
  ["H-003", "Sample Hill Viewpoint", "scenic", 124.94, 11.82],
  ["H-004", "Sample Mangrove Walk", "eco-tourism", 124.858, 11.79],
  ["H-005", "Sample Waterfall", "eco-tourism", 124.962, 11.79],
];
write(
  "heritage.geojson",
  fc(
    heritage.map(([id, name, category, lon, lat]) =>
      feature(point(lon, lat), { id, name, category, description: "Fixture point for development. Not a real site." }),
    ),
  ),
);

write("sources.json", [
  {
    file: "*",
    title: "Development fixtures",
    attribution: "Invented sample geometry generated by scripts/data/make-fixtures.mjs",
    tier: "fixture",
    notes: "Not real data. Replaced file by file when packages/data/files/ holds the real layers.",
  },
]);

console.log(`Fixtures written to ${path.relative(root, out)}`);
