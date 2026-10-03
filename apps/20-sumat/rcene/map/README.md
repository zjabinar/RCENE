# @rcene/map

This app's offline map (MapLibre GL JS 6 via `react-map-gl/maplibre`). Recipes and gotchas: the `maplibre-gis` skill
(`.claude/skills/maplibre-gis/SKILL.md`).

```tsx
import { BaseMap, ZoneLayer, PointLayer, SelectedPoint, Legend, useFlyTo } from "@rcene/map";

<BaseMap onClick={(lngLat) => select(lngLat)}>
  <ZoneLayer hazard="flood" zones={zones.flood} minLevel="moderate" />
  <PointLayer id="centers" data={centers} />
  {selected && <SelectedPoint lngLat={selected} label="Selected point" />}
</BaseMap>
<Legend hazard="flood" />
```

| Export | What |
|---|---|
| `BaseMap` | Offline basemap: sea, land, coverage, barangays (HTML labels), city boundary from `/data/`. Props: `onClick(lngLat)`, `onFeatureClick(feature, lngLat)` + `interactiveLayerIds`, `showBarangays`, `showBarangayLabels`, `allowOnlineBasemap` (opt-in OSM toggle), `fitToBoundary`, `initialViewState`, `mapRef`, `cursor`, other `<Map>` props pass through. WebGL2 fallback built in |
| `ZoneLayer` | Hazard zones coloured by level (`LEVEL_HEX`); `minLevel`, `opacity`, `outline`, `id`, `beforeId` |
| `PointLayer` | Circle layer for point features; `color`, `radius`, `strokeColor`, `promoteId`, `beforeId` |
| `SelectedPoint` | Pin marker; `label` makes it accessible |
| `Legend` | Level swatches + "not in zone" / "outside coverage" states, translated |
| `useFlyTo()` | `(lngLat, zoom?)` → flies (jumps under reduced motion) |
| `hasWebGL2`, `loadMapLib` | WebGL check; the maplibre loader (sets the worker URL for Vite) |
| `style.ts` exports | `CATBALOGAN_VIEW`, colors, `SLOT` (fixed layer order: use `beforeId={SLOT.data}` etc.), `OFFLINE_STYLE`, `levelColorExpression()`, `levelsAtOrAbove()`, `minLevelFilter()` |
| Re-exports | `Source`, `Layer`, `Marker`, `Popup`, `useMap`, `useControl`, `NavigationControl`, `AttributionControl`, `MapProvider` and their types |

Rules: no `symbol` text layers (no glyphs offline; label with HTML markers or side lists); filters as expressions
(`["get", "level"]`); the map is never the only way to get information; distances are straight-line and labelled so.
deck.gl overlays: `MapLibreOverlay` from `@deck.gl/maplibre` mounted with `useControl` (see the skill).

This folder is the app's own copy of the shared code; keep changes minimal and list them in `NOTES.md` under
"Shared-code changes (for the template)".
