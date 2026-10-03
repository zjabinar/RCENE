# geo-data-prep reference

## Include files (`scripts/data/include/*.txt`)

Mapshaper's `-include` reads a file whose whole content is one object literal. Expressions can use its keys and call its functions. A function can't see the object's other keys, so keep each lookup table inside its function. Commit these files, because they record the mapping exactly as it was applied.

### facility-kinds.txt

```js
{
  // FacilityKind for one OSM record; `layer` is the source file name without extension.
  kindOf: function (p, layer) {
    var byTag = { school: "school", kindergarten: "school", college: "school", university: "school",
      hospital: "hospital", clinic: "health", doctors: "health", health_post: "health", health_center: "health",
      police: "police", fire_station: "fire", townhall: "townhall" };
    var byLayer = { schools: "school", hospitals: "hospital", police: "police", fire: "fire", fire_stations: "fire" };
    return byTag[p.amenity] || byTag[p.healthcare] || byTag[p.office] || byLayer[layer] || "other";
  },
  // "node/123" style OSM id from whichever field the export used.
  osmIdOf: function (p) {
    if (p["@id"]) return String(p["@id"]);
    if (p.osm_id) return (p.osm_type ? p.osm_type + "/" : "") + p.osm_id;
    return "";
  },
  // Stable ids from OSM ids, so derived tables and app state survive a re-run.
  facilityId: function (osmId, index) {
    return osmId ? "F-" + osmId.replace("/", "-") : "F-x" + index;
  },
  nameOf: function (p, kind) {
    return p.name || p["name:en"] || "Unnamed " + kind;
  }
}
```
Adjust `byLayer` to the real file names in `critical_facilities\`, and adjust `byTag` to the tags that `-info` shows.

### levels-<hazard>.txt for a numeric class field (e.g. a NOAH layer)

```js
{
  HAZARD: "flood",
  SOURCE_LAYER: "UP NOAH flood hazard, 100-year",
  levelOf: function (p) {
    var LEVEL_OF = { "1": "low", "2": "moderate", "3": "high" };   // confirm against the layer's legend
    return LEVEL_OF[String(p["Var"])] || null;
  }
}
```

## Typical category patterns (always confirm against the layer's legend)

| Source values look like | Map to |
|---|---|
| Low / Moderate / High / Very High (risk or susceptibility) | `low` / `moderate` / `high` / `veryHigh` |
| Low / Medium / High, or 1 / 2 / 3 | `low` / `moderate` / `high` (no `veryHigh`) |
| "Not susceptible", "None", "No data", "Safe", 0 | `null`: dropped, the area becomes notInZone |
| Ground shaking as PEIS intensity (VII, VIII, ...) | an ordered mapping the user confirms; record it |
| Liquefaction "Generally susceptible" / "Highly susceptible" | ask the user and record the answer; don't guess |

## packages/data/README.md template

```markdown
# Shipped data layers (packages/data/files)

Converted on 2026-10-0X by the data session (docs/projects/00-data.md) from `D:\lgu_portal - GIS\`, read only.
Raw sources are not in this repo. Tools: mapshaper 0.6.121, scripts/data/kml-to-geojson.mjs, derive.mjs, validate.mjs.

## Canonical layer per hazard and level mapping

| Hazard | Source layer | Category field | Tier | Simplify |
|---|---|---|---|---|
| flood | Risk Map\Flood\Population to Flood Risk.shp | RiskLevel | permission (CDRRMO/CPDCO) | dp 5 m |
| landslide | ... | ... | ... | ... |

These layers map risk to people and assets, not the full hazard extent. That is why the UI says "mapped risk zone".

| Hazard | Source value | Level |
|---|---|---|
| flood | Low | low |
| flood | Very High | veryHigh |
| flood | Not at risk | (dropped: not a zone) |

Include files used: scripts/data/include/levels-*.txt, facility-kinds.txt.

## Other layers

- boundary, barangays (57), land: OCHA/HDX, fields kept: name, psgc.
- facilities: OSM `critical_facilities\*.geojson`, clipped to the boundary; kinds counted: school N, hospital N, ...
- heritage: CPDCO KML (heritage H-001..H-0NN, eco-tourism ...), descriptions reviewed for personal data.

## Checks

`node scripts/data/validate.mjs`: 0 errors, total N KB.
```

## sources.json template

```json
[
  { "file": "boundary.geojson", "title": "Catbalogan City boundary", "attribution": "Boundaries: OCHA/HDX", "tier": "open", "license": "CC BY-IGO (confirm on the HDX page)", "url": "https://data.humdata.org/dataset/cod-ab-phl" },
  { "file": "barangays.geojson", "title": "Catbalogan barangays (57)", "attribution": "Boundaries: OCHA/HDX", "tier": "open", "license": "CC BY-IGO (confirm on the HDX page)", "url": "https://data.humdata.org/dataset/cod-ab-phl" },
  { "file": "land.geojson", "title": "Samar land outline (simplified)", "attribution": "Boundaries: OCHA/HDX", "tier": "open", "license": "CC BY-IGO (confirm on the HDX page)", "notes": "Dissolved and simplified from the Region VIII boundaries." },
  { "file": "hazard-flood.geojson", "title": "Flood: mapped risk zones", "attribution": "Risk maps: Catbalogan City CDRRMO / CPDCO, used with permission", "tier": "permission", "notes": "Canonical layer: Population to Flood Risk. Levels mapped as in packages/data/README.md." },
  { "file": "facilities.geojson", "title": "Critical facilities", "attribution": "Facilities: © OpenStreetMap contributors (ODbL)", "tier": "open", "license": "ODbL-1.0", "url": "https://www.openstreetmap.org/copyright" },
  { "file": "heritage.geojson", "title": "Heritage and eco-tourism sites", "attribution": "Heritage and eco-tourism points: Catbalogan City CPDCO, used with permission", "tier": "permission" }
]
```
Add one entry for each of the five hazard files. A NOAH substitute gets `"tier": "open"`, `"attribution": "UP NOAH Center"`, the license from the NOAH download page, and a `notes` line saying which CDRRMO layer it replaces and why. `derived/*` needs no entry. Don't use a `"*"` entry here: that wildcard is only for fixtures.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `[proj] Unable to project -- source coordinate system is unknown` | `-proj wgs84 init=EPSG:32651` |
| validate: "coordinate(s) outside ... projected metres" | the file was never reprojected; same fix |
| validate: "[lat, lon] order" | hand-made file with swapped coordinates; GeoJSON is `[lon, lat]` |
| `ReferenceError: X is not defined` in `-each` | the field doesn't exist (check `-info`), or Windows quoting ate quotes: move literals to the include file |
| `[target] No layers were matched (pattern: * type: polygon)` | the input has no polygon layer; drop the `-target type=polygon -points inner -target '*'` part |
| A higher level shrank after dissolving | `allow-overlaps` is missing from `-dissolve2` |
| Garbled `ñ` | `-i "<file>.shp" encoding=latin1` |
| Out of memory on NOAH files | `pnpm exec mapshaper-xl 8gb ...` and `-clip bbox=...` first |
| Total over 3 MB | raise `interval=` on hazard layers, then simplify barangays; check with `validate.mjs` |
