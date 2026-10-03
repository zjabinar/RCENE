#!/usr/bin/env node
/**
 * Converts a KML or KMZ file of heritage / eco-tourism placemarks into the
 * heritage.geojson shape (HeritageProps in packages/data/src/types.ts):
 *
 *   FeatureCollection<Point, { id, name, category, description? }>
 *
 * - KMZ: unzipped in memory (fflate); doc.kml is used, else the first .kml.
 * - Only Point placemarks are kept (a MultiGeometry holding exactly one point
 *   counts as a point). Lines, polygons and empty placemarks are dropped and
 *   counted in the report. Styles, icons, ExtendedData and altitude are dropped.
 * - Descriptions are reduced to plain text (HTML tags and image links removed).
 * - Coordinates are rounded to 5 decimals (about 1 m).
 *
 * Usage:
 *   node scripts/data/kml-to-geojson.mjs <in.kml|in.kmz> <out.geojson> [options]
 *
 * Options:
 *   --id-prefix H-        id prefix; ids are <prefix>001, <prefix>002, ... (default "H-")
 *   --category heritage   heritage | eco-tourism | scenic | other (default "heritage")
 *   --append              add to an existing <out.geojson>, continuing its numbering
 *                         (use it to put heritage and eco-tourism points in one file)
 *   --no-description      drop descriptions (use when they hold names or phone numbers of people)
 *
 * Example (PowerShell, from the repo root):
 *   node scripts/data/kml-to-geojson.mjs "$GIS\...\heritage.kmz" packages/data/files/heritage.geojson --id-prefix H-
 *   node scripts/data/kml-to-geojson.mjs "$GIS\...\ecotourism.kml" packages/data/files/heritage.geojson --id-prefix H- --category eco-tourism --append
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { kml } from "@tmcw/togeojson";
import { DOMParser } from "@xmldom/xmldom";
import { strFromU8, unzipSync } from "fflate";

export const CATEGORIES = ["heritage", "eco-tourism", "scenic", "other"];

const round5 = (n) => Math.round(n * 1e5) / 1e5;

/** Returns the KML text of a .kml file or of the main document inside a .kmz. */
export function readKmlText(file) {
  const bytes = readFileSync(file);
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b; // "PK": a KMZ, whatever its extension
  if (!isZip) return stripBom(new TextDecoder("utf-8").decode(bytes));
  const entries = unzipSync(new Uint8Array(bytes), { filter: (f) => f.name.toLowerCase().endsWith(".kml") });
  const names = Object.keys(entries);
  if (names.length === 0) throw new Error(`${file}: the KMZ holds no .kml file`);
  const main = names.find((n) => n.toLowerCase() === "doc.kml") ?? names[0];
  return stripBom(strFromU8(entries[main]));
}

const stripBom = (s) => (s.charCodeAt(0) === 0xfeff ? s.slice(1) : s);

/** Plain text from a KML description, which is often HTML (Google Earth / My Maps balloons). */
export function plainText(value) {
  if (value == null) return undefined;
  const raw = typeof value === "object" ? String(value.value ?? "") : String(value);
  const text = raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h\d)>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (match, code) => {
      const n = Number(code);
      return n <= 0x10ffff ? String.fromCodePoint(n) : match;
    })
    // &amp; last, so "&amp;lt;" stays the literal text "&lt;" instead of becoming "<".
    .replace(/&amp;/gi, "&")
    .replace(/[ \t]+/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
  return text || undefined;
}

/** The single point of a geometry, or null when it is not exactly one point. */
function singlePoint(geometry) {
  if (!geometry) return null;
  if (geometry.type === "Point") return geometry.coordinates;
  if (geometry.type === "MultiPoint" && geometry.coordinates.length === 1) return geometry.coordinates[0];
  if (geometry.type === "GeometryCollection") {
    const points = geometry.geometries.map(singlePoint).filter(Boolean);
    const others = geometry.geometries.filter((g) => !["Point", "MultiPoint"].includes(g?.type));
    if (points.length === 1 && others.length === 0) return points[0];
  }
  return null;
}

/**
 * Converts KML text into heritage features.
 * @returns {{ features: object[], dropped: Record<string, number>, unnamed: number }}
 */
export function kmlToFeatures(kmlText, { idPrefix = "H-", category = "heritage", startAt = 1, description = true } = {}) {
  const errors = [];
  const doc = new DOMParser({
    onError: (level, message) => {
      if (level !== "warning") errors.push(message);
    },
  }).parseFromString(kmlText, "text/xml");
  if (errors.length) throw new Error(`Invalid KML: ${errors[0]}`);

  const collection = kml(doc);
  const features = [];
  const dropped = {};
  let unnamed = 0;
  let n = startAt;
  for (const f of collection.features) {
    const coords = singlePoint(f.geometry);
    if (!coords) {
      const type = f.geometry?.type ?? "no geometry";
      dropped[type] = (dropped[type] ?? 0) + 1;
      continue;
    }
    const id = `${idPrefix}${String(n++).padStart(3, "0")}`;
    let name = typeof f.properties?.name === "string" ? f.properties.name.trim() : "";
    if (!name) {
      name = `Unnamed site ${id}`;
      unnamed++;
    }
    const properties = { id, name, category };
    const text = description ? plainText(f.properties?.description) : undefined;
    if (text) properties.description = text;
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [round5(coords[0]), round5(coords[1])] },
      properties,
    });
  }
  return { features, dropped, unnamed };
}

/** One feature per line: small, readable and diff-friendly (same layout mapshaper writes). */
export function stringifyCollection(features) {
  const lines = features.map((f) => JSON.stringify(f));
  return `{"type":"FeatureCollection","features":[\n${lines.join(",\n")}\n]}\n`;
}

function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      "id-prefix": { type: "string", default: "H-" },
      category: { type: "string", default: "heritage" },
      append: { type: "boolean", default: false },
      "no-description": { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });
  if (values.help || positionals.length !== 2) {
    console.log("Usage: node scripts/data/kml-to-geojson.mjs <in.kml|in.kmz> <out.geojson> [--id-prefix H-] [--category heritage|eco-tourism|scenic|other] [--append] [--no-description]");
    process.exit(values.help ? 0 : 1);
  }
  const [input, output] = positionals;
  const category = values.category;
  if (!CATEGORIES.includes(category)) {
    console.error(`--category must be one of ${CATEGORIES.join(", ")} (got "${category}")`);
    process.exit(1);
  }
  if (!existsSync(input)) {
    console.error(`Input not found: ${input}`);
    process.exit(1);
  }

  let existing = [];
  if (values.append && existsSync(output)) {
    existing = JSON.parse(readFileSync(output, "utf8")).features ?? [];
  }
  const prefix = values["id-prefix"];
  const used = existing
    .map((f) => String(f.properties?.id ?? ""))
    .filter((id) => id.startsWith(prefix))
    .map((id) => Number(id.slice(prefix.length)))
    .filter(Number.isFinite);
  const startAt = used.length ? Math.max(...used) + 1 : 1;

  const { features, dropped, unnamed } = kmlToFeatures(readKmlText(input), {
    idPrefix: prefix,
    category,
    startAt,
    description: !values["no-description"],
  });

  const all = [...existing, ...features];
  const ids = new Set();
  for (const f of all) {
    if (ids.has(f.properties.id)) {
      console.error(`Duplicate id ${f.properties.id}: use a different --id-prefix or --append to the right file`);
      process.exit(1);
    }
    ids.add(f.properties.id);
  }

  mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
  writeFileSync(output, stringifyCollection(all));

  const droppedText = Object.entries(dropped).map(([type, count]) => `${count} ${type}`).join(", ") || "none";
  console.log(`${path.basename(input)}: ${features.length} points kept as "${category}" (${features[0]?.properties.id ?? "-"} .. ${features.at(-1)?.properties.id ?? "-"})`);
  console.log(`  dropped: ${droppedText}`);
  if (unnamed) console.log(`  ${unnamed} placemark(s) had no name and got "Unnamed site <id>": fix the names by hand`);
  if (existing.length) console.log(`  appended to ${existing.length} existing feature(s)`);
  console.log(`  wrote ${output} (${all.length} features)`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
