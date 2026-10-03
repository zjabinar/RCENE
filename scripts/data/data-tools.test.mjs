/**
 * Tests for the data-prep tooling the geo-data-prep skill documents:
 *   - the mapshaper recipes (run exactly as written in .claude/skills/geo-data-prep/SKILL.md)
 *   - scripts/data/kml-to-geojson.mjs
 *   - scripts/data/validate.mjs
 *
 * Run: pnpm exec vitest run --project scripts scripts/data
 *
 * Mapshaper runs as `node node_modules/mapshaper/bin/mapshaper` through
 * execFile/spawn with argument arrays, so no shell quoting is involved and the
 * same test passes on Windows and Linux.
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as turf from "@turf/turf";
import { strToU8, zipSync } from "fflate";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { boundarySchema, facilitiesSchema, heritageSchema, zonesSchema } from "../../packages/data/src/schemas.ts";
import { LEVELS } from "../../packages/data/src/types.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const MAPSHAPER = path.join(root, "node_modules/mapshaper/bin/mapshaper");
const KML_TO_GEOJSON = path.join(root, "scripts/data/kml-to-geojson.mjs");
const VALIDATE = path.join(root, "scripts/data/validate.mjs");
const fixture = (file) => path.join(root, "packages/data/fixtures", file);

/** Runs a Node script with an argument array; returns { status, stdout, stderr }. */
function node(script, args) {
  const r = spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: "utf8" });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr, output: `${r.stdout}\n${r.stderr}` };
}
function mapshaper(...args) {
  const r = node(MAPSHAPER, args);
  if (r.status !== 0) throw new Error(`mapshaper ${args.join(" ")}\n${r.output}`);
  return r;
}

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
function* positions(geometry) {
  const { type, coordinates } = geometry;
  if (type === "Point") yield coordinates;
  else if (type === "Polygon") for (const r of coordinates) yield* r;
  else if (type === "MultiPolygon") for (const p of coordinates) for (const r of p) yield* r;
}
const decimals = (n) => (String(n).split(".")[1] ?? "").length;
function expectLonLat(collection) {
  for (const f of collection.features) {
    for (const [lon, lat] of positions(f.geometry)) {
      expect(lon).toBeGreaterThan(124);
      expect(lon).toBeLessThan(126);
      expect(lat).toBeGreaterThan(11);
      expect(lat).toBeLessThan(13);
      expect(decimals(lon)).toBeLessThanOrEqual(5);
      expect(decimals(lat)).toBeLessThanOrEqual(5);
    }
  }
}
const areaByLevel = (collection) =>
  Object.fromEntries(
    LEVELS.map((level) => [
      level,
      collection.features.filter((f) => f.properties.level === level).reduce((sum, f) => sum + turf.area(f), 0),
    ]),
  );

let tmp;
beforeAll(() => {
  tmp = mkdtempSync(path.join(tmpdir(), "rcene-data-tools-"));
});
afterAll(() => {
  rmSync(tmp, { recursive: true, force: true });
});

// Same text as the include files shown in the skill (scripts/data/include/*.txt: an object
// literal, not a module, so it is .txt to keep oxlint from parsing it).
const LEVELS_FLOOD_JS = `{
  // Canonical flood layer: "Population to Flood Risk" (CDRRMO/CPDCO). Category field: RiskLevel.
  HAZARD: "flood",
  SOURCE_LAYER: "Population to Flood Risk",
  levelOf: function (p) {
    var LEVEL_OF = { "Low": "low", "Moderate": "moderate", "High": "high", "Very High": "veryHigh" };
    return LEVEL_OF[String(p["RiskLevel"]).trim()] || null;
  }
}
`;
const FACILITY_KINDS_JS = `{
  kindOf: function (p, layer) {
    var byTag = { school: "school", kindergarten: "school", college: "school", university: "school",
      hospital: "hospital", clinic: "health", doctors: "health", health_post: "health", health_center: "health",
      police: "police", fire_station: "fire", townhall: "townhall" };
    var byLayer = { schools: "school", hospitals: "hospital", police: "police", fire: "fire", fire_stations: "fire" };
    return byTag[p.amenity] || byTag[p.healthcare] || byTag[p.office] || byLayer[layer] || "other";
  },
  osmIdOf: function (p) {
    if (p["@id"]) return String(p["@id"]);
    if (p.osm_id) return (p.osm_type ? p.osm_type + "/" : "") + p.osm_id;
    return "";
  },
  facilityId: function (osmId, index) {
    return osmId ? "F-" + osmId.replace("/", "-") : "F-x" + index;
  },
  nameOf: function (p, kind) {
    return p.name || p["name:en"] || "Unnamed " + kind;
  }
}
`;

describe("geo-data-prep mapshaper recipes", { timeout: 60_000 }, () => {
  let source; // a CDRRMO-like risk shapefile: UTM 51N metres, category field "RiskLevel", no hazard/level fields
  let levelsFile;
  let boundary;

  beforeAll(() => {
    const raw = path.join(tmp, "raw", "Risk Map", "Flood");
    mkdirSync(raw, { recursive: true });
    source = path.join(raw, "Population to Flood Risk.shp");
    mapshaper(
      fixture("hazard-flood.geojson"),
      "-each",
      'RiskLevel = ({ low: "Low", moderate: "Moderate", high: "High", veryHigh: "Very High" })[level], OBJECTID = this.id + 1',
      "-filter-fields",
      "OBJECTID,RiskLevel",
      "-proj",
      "EPSG:32651",
      "-o",
      source,
    );
    levelsFile = path.join(tmp, "levels-flood.txt");
    writeFileSync(levelsFile, LEVELS_FLOOD_JS);
    boundary = fixture("boundary.geojson");
  });

  it("starts from a UTM 51N shapefile in metres", () => {
    expect(readFileSync(source.replace(/\.shp$/, ".prj"), "utf8")).toMatch(/UTM zone 51N/);
    const asIs = JSON.parse(mapshaper(source, "-o", "format=geojson", "-").stdout);
    const [x, y] = asIs.features[0].geometry.coordinates[0][0];
    expect(x).toBeGreaterThan(100_000);
    expect(y).toBeGreaterThan(1_000_000);
  });

  it("hazard recipe: reproject, map categories to levels, clip, dissolve, simplify, filter fields, 5 decimals", () => {
    const out = path.join(tmp, "files", "hazard-flood.geojson");
    const r = mapshaper(
      source,
      "-include", levelsFile,
      "-proj", "wgs84",
      "-each", "level = levelOf($.properties), hazard = HAZARD, sourceLayer = SOURCE_LAYER",
      "-calc", "count()", "where=level === null",
      "-filter", "level !== null",
      "-clip", boundary, "remove-slivers",
      "-dissolve2", "level", "copy-fields=hazard,sourceLayer", "allow-overlaps",
      "-simplify", "dp", "interval=5", "keep-shapes",
      "-filter-fields", "hazard,level,sourceLayer",
      "-o", out, "format=geojson", "precision=0.00001",
    );
    expect(r.output).toMatch(/count\(\) where level === null:\s+0/);

    const layer = readJson(out);
    expect(zonesSchema.safeParse(layer).success).toBe(true);
    expectLonLat(layer);
    expect(new Set(layer.features.map((f) => f.properties.level))).toEqual(new Set(LEVELS));
    for (const f of layer.features) {
      expect(f.properties.hazard).toBe("flood");
      expect(Object.keys(f.properties).sort()).toEqual(["hazard", "level", "sourceLayer"]);
    }
    // allow-overlaps keeps the moderate/high overlap in both levels (the lookup takes the max),
    // and the moderate zone keeps its hole. Areas match the fixture after the UTM round trip.
    const got = areaByLevel(layer);
    const want = areaByLevel(readJson(fixture("hazard-flood.geojson")));
    for (const level of LEVELS) expect(got[level]).toBeCloseTo(want[level], -4); // within ~5000 m2
  });

  it("plain -dissolve2 would hand an overlap to one level: the recipe needs allow-overlaps", () => {
    const out = path.join(tmp, "no-overlaps.geojson");
    mapshaper(
      source,
      "-include", levelsFile,
      "-proj", "wgs84",
      "-each", "level = levelOf($.properties), hazard = HAZARD",
      "-dissolve2", "level", "copy-fields=hazard",
      "-o", out, "format=geojson", "precision=0.00001",
    );
    const got = areaByLevel(readJson(out));
    const want = areaByLevel(readJson(fixture("hazard-flood.geojson")));
    expect(got.high).toBeLessThan(want.high * 0.9);
  });

  it("missing .prj: -proj wgs84 fails, init=EPSG:32651 sets the source CRS", () => {
    const dir = path.join(tmp, "noprj");
    mkdirSync(dir, { recursive: true });
    for (const ext of [".shp", ".shx", ".dbf"]) copyFileSync(source.replace(/\.shp$/, ext), path.join(dir, `flood${ext}`));
    const shp = path.join(dir, "flood.shp");

    const fail = node(MAPSHAPER, [shp, "-proj", "wgs84", "-o", path.join(dir, "x.geojson")]);
    expect(fail.status).not.toBe(0);
    expect(fail.output).toMatch(/source coordinate system is unknown/);

    const out = path.join(dir, "flood.geojson");
    mapshaper(shp, "-proj", "wgs84", "init=EPSG:32651", "-o", out, "precision=0.00001");
    expectLonLat(readJson(out));
  });

  it("wrong .prj (says geographic, data is UTM): init=EPSG:32651 overrides it", () => {
    const dir = path.join(tmp, "badprj");
    mkdirSync(dir, { recursive: true });
    for (const ext of [".shp", ".shx", ".dbf"]) copyFileSync(source.replace(/\.shp$/, ext), path.join(dir, `flood${ext}`));
    writeFileSync(
      path.join(dir, "flood.prj"),
      'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]',
    );
    const out = path.join(dir, "flood.geojson");
    mapshaper(path.join(dir, "flood.shp"), "-proj", "wgs84", "init=EPSG:32651", "-o", out, "precision=0.00001");
    expectLonLat(readJson(out));
  });

  it("facilities recipe: merge OSM files, polygons to points, clip to the city, normalize kind and ids", () => {
    const dir = path.join(tmp, "critical_facilities");
    mkdirSync(dir, { recursive: true });
    const point = (lon, lat) => ({ type: "Point", coordinates: [lon, lat] });
    writeFileSync(
      path.join(dir, "schools.geojson"),
      JSON.stringify({
        type: "FeatureCollection",
        features: [
          { type: "Feature", properties: { "@id": "node/1001", amenity: "school", name: "Inside School" }, geometry: point(124.9, 11.78) },
          { type: "Feature", properties: { "@id": "node/1002", amenity: "school", name: "Outside School" }, geometry: point(125.3, 11.5) },
          { type: "Feature", properties: { "@id": "node/1003", amenity: "kindergarten" }, geometry: point(124.93, 11.75) },
        ],
      }),
    );
    writeFileSync(
      path.join(dir, "hospitals.geojson"),
      JSON.stringify({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: { osm_type: "way", osm_id: "555", amenity: "hospital", name: "Sample Hospital" },
            geometry: { type: "Polygon", coordinates: [[[124.91, 11.79], [124.912, 11.79], [124.912, 11.792], [124.91, 11.792], [124.91, 11.79]]] },
          },
          { type: "Feature", properties: { osm_type: "node", osm_id: "556", healthcare: "clinic", name: "Sample Clinic" }, geometry: point(124.92, 11.8) },
        ],
      }),
    );
    const kinds = path.join(tmp, "facility-kinds.txt");
    writeFileSync(kinds, FACILITY_KINDS_JS);
    const out = path.join(tmp, "files", "facilities.geojson");
    mapshaper(
      "-i", path.join(dir, "schools.geojson"), path.join(dir, "hospitals.geojson"), "combine-files",
      "-include", kinds,
      "-each", "kind = kindOf($.properties, this.layer_name)",
      "-target", "type=polygon", "-points", "inner", "-target", "*",
      "-merge-layers", "force", "name=facilities",
      "-clip", boundary,
      "-each", "osmId = osmIdOf($.properties), id = facilityId(osmId, this.id), name = nameOf($.properties, kind)",
      "-uniq", "id",
      "-filter-fields", "id,name,kind,osmId",
      "-o", out, "format=geojson", "precision=0.00001",
    );
    const layer = readJson(out);
    expect(facilitiesSchema.safeParse(layer).success).toBe(true);
    expectLonLat(layer);
    const byId = Object.fromEntries(layer.features.map((f) => [f.properties.id, f.properties]));
    expect(Object.keys(byId).sort()).toEqual(["F-node-1001", "F-node-1003", "F-node-556", "F-way-555"]);
    expect(byId["F-node-1003"]).toMatchObject({ kind: "school", name: "Unnamed school" });
    expect(byId["F-way-555"]).toMatchObject({ kind: "hospital", osmId: "way/555" });
    expect(byId["F-node-556"].kind).toBe("health");
  });

  it("land recipe: clip region boundaries to a box around the city, dissolve, simplify, name", () => {
    const out = path.join(tmp, "files", "land.geojson");
    mapshaper(
      fixture("barangays.geojson"),
      "-clip", "bbox=124.55,11.45,125.35,12.15",
      "-dissolve2",
      "-simplify", "15%", "keep-shapes",
      "-filter-islands", "min-area=0.5km2", "remove-empty",
      "-each", "name='Samar (land)'",
      "-filter-fields", "name",
      "-o", out, "format=geojson", "precision=0.00001",
    );
    const layer = readJson(out);
    expect(boundarySchema.safeParse(layer).success).toBe(true);
    expect(layer.features).toHaveLength(1);
    expect(layer.features[0].properties).toEqual({ name: "Samar (land)" });
    expectLonLat(layer);
  });
});

const KML = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
  <name>Heritage sites</name>
  <Style id="icon-1"><IconStyle><Icon><href>images/icon-1.png</href></Icon></IconStyle></Style>
  <Folder>
    <name>Sites</name>
    <Placemark>
      <name>Sample Cathedral</name>
      <description><![CDATA[<img src="https://example.com/a.jpg" /><br><br>Built in the <b>1600s</b> &amp; rebuilt later.]]></description>
      <styleUrl>#icon-1</styleUrl>
      <ExtendedData><Data name="gx_media_links"><value>https://example.com/a.jpg</value></Data></ExtendedData>
      <Point><coordinates>124.8845678,11.7761234,12</coordinates></Point>
    </Placemark>
    <Placemark>
      <name>Sample River Walk</name>
      <LineString><coordinates>124.88,11.77,0 124.89,11.78,0</coordinates></LineString>
    </Placemark>
    <Placemark>
      <name>Sample Plaza Zone</name>
      <Polygon><outerBoundaryIs><LinearRing><coordinates>124.88,11.77 124.89,11.77 124.89,11.78 124.88,11.77</coordinates></LinearRing></outerBoundaryIs></Polygon>
    </Placemark>
    <Placemark>
      <name>Sample Viewpoint</name>
      <MultiGeometry><Point><coordinates>124.95,11.81</coordinates></Point></MultiGeometry>
    </Placemark>
    <Placemark><name>No geometry</name></Placemark>
  </Folder>
</Document>
</kml>
`;

describe("kml-to-geojson.mjs", { timeout: 30_000 }, () => {
  let kmlFile;
  let kmzFile;
  beforeAll(() => {
    kmlFile = path.join(tmp, "heritage.kml");
    writeFileSync(kmlFile, KML);
    kmzFile = path.join(tmp, "eco tourism.kmz");
    writeFileSync(kmzFile, zipSync({ "images/icon-1.png": new Uint8Array([137, 80, 78, 71]), "doc.kml": strToU8(KML) }));
  });

  it("keeps only points, numbers them and reduces descriptions to text", () => {
    const out = path.join(tmp, "heritage-from-kml.geojson");
    const r = node(KML_TO_GEOJSON, [kmlFile, out, "--id-prefix", "H-"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/2 points kept/);
    expect(r.stdout).toMatch(/dropped: 1 LineString, 1 Polygon, 1 no geometry/);

    const layer = readJson(out);
    expect(heritageSchema.safeParse(layer).success).toBe(true);
    expect(layer.features.map((f) => f.properties)).toEqual([
      { id: "H-001", name: "Sample Cathedral", category: "heritage", description: "Built in the 1600s & rebuilt later." },
      { id: "H-002", name: "Sample Viewpoint", category: "heritage" },
    ]);
    expect(layer.features[0].geometry).toEqual({ type: "Point", coordinates: [124.88457, 11.77612] });
  });

  it("reads a KMZ (zipped doc.kml) with another category and prefix", () => {
    const out = path.join(tmp, "eco.geojson");
    const r = node(KML_TO_GEOJSON, [kmzFile, out, "--category", "eco-tourism", "--id-prefix", "E-", "--no-description"]);
    expect(r.status).toBe(0);
    const layer = readJson(out);
    expect(heritageSchema.safeParse(layer).success).toBe(true);
    expect(layer.features.map((f) => f.properties)).toEqual([
      { id: "E-001", name: "Sample Cathedral", category: "eco-tourism" },
      { id: "E-002", name: "Sample Viewpoint", category: "eco-tourism" },
    ]);
  });

  it("--append adds to an existing file and continues the numbering", () => {
    const out = path.join(tmp, "merged.geojson");
    expect(node(KML_TO_GEOJSON, [kmlFile, out]).status).toBe(0);
    expect(node(KML_TO_GEOJSON, [kmzFile, out, "--category", "eco-tourism", "--append"]).status).toBe(0);
    const ids = readJson(out).features.map((f) => `${f.properties.id}:${f.properties.category}`);
    expect(ids).toEqual(["H-001:heritage", "H-002:heritage", "H-003:eco-tourism", "H-004:eco-tourism"]);
  });

  it("rejects an unknown category", () => {
    const r = node(KML_TO_GEOJSON, [kmlFile, path.join(tmp, "x.geojson"), "--category", "museum"]);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/--category must be one of/);
  });
});

describe("validate.mjs", { timeout: 30_000 }, () => {
  it("passes on the committed fixtures", () => {
    const r = node(VALIDATE, ["--fixtures"]);
    expect(r.status, r.output).toBe(0);
    expect(r.stdout).toMatch(/0 error\(s\)/);
  });

  it("fails on unprojected coordinates, extra fields and a missing sources entry", () => {
    const dir = path.join(tmp, "bad-data");
    mkdirSync(dir, { recursive: true });
    copyFileSync(fixture("boundary.geojson"), path.join(dir, "boundary.geojson"));
    const utm = mapshaper(fixture("hazard-flood.geojson"), "-proj", "EPSG:32651", "-o", "format=geojson", "-").stdout;
    writeFileSync(path.join(dir, "hazard-flood.geojson"), utm);
    writeFileSync(
      path.join(dir, "sources.json"),
      JSON.stringify([{ file: "boundary.geojson", title: "Boundary", attribution: "OCHA/HDX", tier: "open", license: "CC BY-IGO" }]),
    );
    const r = node(VALIDATE, ["--dir", dir]);
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(/hazard-flood\.geojson: \d+ coordinate\(s\) outside .*projected metres/);
    expect(r.stdout).toMatch(/hazard-flood\.geojson: no sources\.json entry/);
  });
});
