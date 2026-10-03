# @rcene/geo

Pure geometry helpers (no React). Coordinates are `[lon, lat]` (`LngLat`).

```ts
import { lookupHazards, nearest, barangayAt, featureAt, pointInArea, zoneLevelAt,
         classifyPoints, randomPointsIn, featureBounds, type LngLat } from "@rcene/geo";

lookupHazards(pt, zones, boundary)   // Partial<Record<Hazard, HazardStatus>>
nearest(pt, facilities, { limit: 3, filter: (f) => f.properties.kind === "school" }) // [{ feature, km }], straight-line
barangayAt(pt, barangays)            // Feature | null
classifyPoints(facilities, zones, boundary) // [{ feature, status }] — exposure counts
randomPointsIn(boundary, 50, createRng(1))  // deterministic synthetic points
featureBounds(boundary)              // [[w, s], [e, n]] for fitBounds/maxBounds
```

`lookupHazards` answers with exactly three states and nothing else:

| State | Meaning | UI wording (`@rcene/i18n` `status.*`) |
|---|---|---|
| `inZone` + level | inside at least one mapped zone; the most severe level wins | "In a mapped risk zone — High" |
| `notInZone` | inside the boundary, outside every mapped zone | "Not in a mapped risk zone" — **never "safe"** |
| `outsideCoverage` | outside the boundary: there is no data here | "Outside data coverage" |

Hazards whose layer wasn't loaded are absent from the result. Holes in polygons are honoured. Distances from `nearest` are great-circle ("straight-line") — label them so; there is no road network.

Domain rules (evacuation eligibility, scenario effects, scoring) belong in each app's `src/domain/`, not here.
