---
name: maplibre-gis
description: Maps for this app through its shared map code @rcene/map (in rcene/map/; MapLibre GL JS 6 via react-map-gl/maplibre, with an offline GeoJSON basemap) — hazard lookups with the three-state answer, zone layers, nearest-facility search, barangay choropleths, heatmaps, markers, popups, fly-to, fit bounds, hover highlights, animated routes and deck.gl overlays. Use this whenever writing or debugging map code: MapLibre, maplibre-gl, react-map-gl, <Source>/<Layer>, GeoJSON layers, paint or filter expressions, turf, map clicks, legends, map styling, map accessibility, or anything on a map that has to work with Wi-Fi off.
---

# Maps for the RCENE build

**The live demo runs with Wi-Fi off.** Every map starts from `<BaseMap>` in `@rcene/map`, which draws sea, land, the city boundary and barangays from local GeoJSON. Never point a map at a style URL, a tile server or a CDN. If it needs the network, it is broken on stage.

## The shared map code (`@rcene/map`)

This app owns its copy of the map code in `rcene/map/`; `@rcene/map` resolves there. Use it as-is. If you must change it, keep the change minimal and list it in `NOTES.md` under "Shared-code changes (for the template)".

```tsx
import { BaseMap, ZoneLayer, PointLayer, SelectedPoint, Legend, useFlyTo, SLOT } from "@rcene/map";
```

| Export | What it does |
|---|---|
| `<BaseMap>` | Offline map. Props: `onClick(lngLat)`, `onFeatureClick(feature, lngLat)` + `interactiveLayerIds`, `showBarangays`, `showBarangayLabels`, `allowOnlineBasemap`, `controls`, `fitToBoundary` (all default `true`), `initialViewState` (default `CATBALOGAN_VIEW`), `tone` (`"light"` default, `"dark"`, or `"auto"` to follow the app's theme), `mapRef`, `cursor`, `className`. Any other react-map-gl `<Map>` prop passes through (`onMouseMove`, `minZoom`, `dragRotate`, …). It fills its parent, so **give the parent a height**. |
| `<ZoneLayer hazard zones minLevel? opacity? outline? casing? id? beforeId?>` | Hazard zones filled by `level` (`LEVEL_HEX`). `casing` adds a light outline so the fills read on a dark basemap. Renders nothing while `zones` is undefined. Layer id `zone-${hazard}`. |
| `<PointLayer id data color? radius? strokeColor? promoteId? beforeId?>` | Circles for a point FeatureCollection (facilities, centers, reports). |
| `<SelectedPoint lngLat label?>` | Pin marker. Pass `label` for an accessible name. |
| `<Legend hazard? levels? showStates? opacity? tone? className?>` | Level swatches with text, plus "not in a mapped zone" and "outside coverage". Place it *outside* `<BaseMap>`, absolutely positioned. |
| `useFlyTo()` | `(lngLat, zoom?) => void`. Jumps instead of flying under reduced motion. Works inside `<BaseMap>` or under a `<MapProvider>`. |
| `hasWebGL2()` | MapLibre 6 needs WebGL2. BaseMap already checks it and shows `map.noWebgl`. |
| `loadMapLib()` | The `maplibre-gl` module with its worker URL set. Use it if you ever construct a map yourself. |
| `useMapTone(tone)` | Resolves `"auto"` against the app theme (`light` or `dark`). |
| `style.ts` helpers | `BASEMAP.light` / `BASEMAP.dark` (sea, land, coverage, boundary, labels), `SEA_COLOR`, `LAND_COLOR`, `COVERAGE_COLOR`, `levelColorExpression()`, `levelsAtOrAbove(min)`, `minLevelFilter(min)`, `SLOT`, `CATBALOGAN_VIEW` |
| Re-exports | `Source`, `Layer`, `Marker`, `Popup`, `useMap`, `useControl`, `MapProvider`, `NavigationControl`, `AttributionControl`, types `MapRef`, `MapLayerMouseEvent`, `MapGeoJSONFeature`, `ViewState`, `LayerProps`, `GeoJSONSource`, `ExpressionSpecification`, `FilterSpecification` |

Import map things from `@rcene/map`, not straight from `react-map-gl/maplibre`, so every app uses one set of versions.

### Minimal hazard-lookup screen

```tsx
import { useMemo } from "react";
import { BaseMap, Legend, SelectedPoint, ZoneLayer } from "@rcene/map";
import { HAZARDS, useLayer, useZones } from "@rcene/data";
import { lookupHazards, type LngLat } from "@rcene/geo";
import { useT } from "@rcene/i18n";
import { HazardStatusList, LoadGate } from "@rcene/ui";
import { strings } from "../i18n/strings.ts"; // extendStrings(common, { en: { "home.noPoint": …, "map.pin": … } })

export function Lookup({ selected, select }: { selected: LngLat | null; select: (pt: LngLat | null) => void }) {
  const t = useT(strings);
  const zones = useZones(HAZARDS);
  const boundary = useLayer("boundary");

  const status = useMemo(() => {
    if (!selected || zones.status !== "ready" || boundary.status !== "ready") return null;
    return lookupHazards(selected, zones.data.zones, boundary.data);
  }, [selected, zones, boundary]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
      <div className="relative h-[60vh] min-h-80 overflow-hidden rounded-xl border">
        <BaseMap onClick={select}>
          {zones.status === "ready" && <ZoneLayer hazard="flood" zones={zones.data.zones.flood} />}
          {selected && <SelectedPoint lngLat={selected} label={t("map.pin")} />}
        </BaseMap>
        <Legend className="absolute bottom-3 left-3" hazard="flood" />
      </div>
      <section aria-live="polite">
        <LoadGate state={zones}>
          {({ missing }) => (status ? <HazardStatusList status={status} missing={missing} /> : <p>{t("home.noPoint")}</p>)}
        </LoadGate>
      </section>
    </div>
  );
}
```

The template's `src/pages/Home.tsx` (every app starts with it) is this screen, already wired to the app store and i18n. Start from it. Map UI text (pin labels, popups, lists) goes through `t()` like everything else.

## The three-state rule (non-negotiable)

A hazard answer is exactly one of `inZone {level}`, `notInZone` or `outsideCoverage` (`HazardStatus` in `@rcene/data`). `lookupHazards` is the only thing that produces it.

- **Never display "safe"**, in any language (`FORBIDDEN_ANSWER_WORDS` lists them; tests enforce it on the shared `status.*` strings and on this app's `status.*`, `level.*`, `answer.*` and `result.*` keys in `src/i18n/strings.test.ts`, so keep hazard-answer strings under those prefixes). "Not in a mapped risk zone" means the risk maps don't cover that hazard there. It is not a safety guarantee, and it is never colored green.
- **Outside the boundary is `outsideCoverage`**, not `notInZone`. There is no data there.
- **A missing layer is not an answer.** `useZones` lists missing hazards in `missing`; show "not available", never a guess.
- **Distances are straight-line** (`nearest()` uses great-circle km). Always render them with `t("distance.straightLine", { km })`. Never say "walk", "minutes" or "route" unless you actually computed a route.
- **Theme colours on the map:** MapLibre can't read CSS variables, so for a non-hazard colour that follows the theme use `useTokenColor("--primary")` from `@rcene/ui/theme` (it re-reads on a palette or mode change). Hazard fills keep `LEVEL_HEX`.
- **Dark maps are opt-in.** The hazard fills were tuned on the light basemap, so maps stay light in a dark theme unless you pass `tone="auto"` or `"dark"`; then pass the same `tone` to `<Legend>` and `casing` to `<ZoneLayer>`. Map controls already use the theme tokens.
- Color is never the only signal: the Legend and HazardStatusList pair every color with text, and the list adds an icon.

## Offline rules

- **No glyphs and no sprite** in the style, so **no `symbol` layers with `text-field`**. MapLibre rejects them with a console validation error, and the layer silently never appears. Label things with HTML `<Marker>`s (fine up to about 100), or put the names in a side list. BaseMap's barangay labels are aria-hidden markers that appear at zoom 12.5 and above.
- Use `circle`, `fill`, `line` and `heatmap` layers. Avoid `icon-image` too (it needs a sprite or `map.addImage`). Use circles or a `<Marker>` with an inline SVG instead.
- **Data comes from `useLayer(...)` / `useZones(...)`** (served from `/data/`). Never fetch GeoJSON from the internet.
- The **"Online basemap"** toggle (OSM raster, off by default) is optional decoration. Offline, its tiles fail quietly (BaseMap swallows those errors) and the GeoJSON basemap still shows. Never make a feature depend on it.
- **Worker URL:** MapLibre 6 looks for `maplibre-gl-worker.mjs` next to its own module, and Vite moves the module, so the worker 404s and GeoJSON never renders (you see only the sea). BaseMap fixes this through `loadMapLib()`. If you build a raw `new maplibregl.Map`, get the module from `await loadMapLib()`.

## Layer order: slots

The offline style holds hidden anchor layers. Pass `beforeId={SLOT.x}` and your layer renders just below that anchor, whatever order the data loads in. Bottom to top:

| Below slot | What lives there |
|---|---|
| `SLOT.land` | land fill (outside coverage) |
| `SLOT.coverage` | city fill (inside coverage) |
| `SLOT.basemap` | optional OSM raster |
| `SLOT.data` | **ZoneLayer default**: hazard fills, choropleths, heatmaps |
| `SLOT.outlines` | barangay outlines |
| `SLOT.boundary` | city boundary line |
| `SLOT.points` | **PointLayer default**: routes, lines, circles |
| *(no beforeId)* | top: hover highlights, selection rings |

A `beforeId` that doesn't exist yet makes MapLibre refuse the layer ("Cannot add layer … before non-existing layer"). Point at a `SLOT`, never at another async layer.

## maplibre-gl 6 gotchas

**ESM only, no default export.**
```ts
import maplibregl from "maplibre-gl";                 // ✗ undefined — v6 has no default export
import { LngLatBounds } from "maplibre-gl";            // ✓ named
import type { GeoJSONSource } from "@rcene/map";       // ✓ types
```

**Filters are expressions.** The old `["==", "level", "high"]` syntax is deprecated. Mixed into an expression it only logs a console warning and then matches the wrong things, and operators like `!in` are hard errors. Write expressions only:
```ts
filter: ["==", "level", "high"]                                   // ✗ legacy
filter: ["in", "level", "high", "veryHigh"]                       // ✗ legacy (and means substring in expressions)
filter: ["==", ["get", "level"], "high"]                          // ✓
filter: ["in", ["get", "level"], ["literal", ["high", "veryHigh"]]] // ✓ — minLevelFilter("high")
filter: ["!", ["has", "closed"]]                                  // ✓ instead of ["!has", "closed"]
```

**`GeoJSONSource.setData(data)` now returns `Promise<void>`.** You can't chain it, and the old `waitForCompletion` argument is gone. Await it if you need the data applied.
```ts
map.getSource("route").setData(a).setData(b);                       // ✗ returns a Promise, not the source
await map.getSource<GeoJSONSource>("route")?.setData(part);           // ✓
```
`updateData(diff)` exists for big sources but needs feature ids (`promoteId`).

**WebGL2 is required.** `new Map` throws without it. BaseMap checks `hasWebGL2()` and renders a `role="alert"` message instead.

**`map.transform` is gone** (now private `_camera`). Old snippets and libraries that reach into it break. Use public getters: `getZoom()`, `getCenter()`, `getBounds()`, `project()`.

**react-map-gl specifics**
- A `<Source>`/`<Layer>` id can't change in place (assertion "source id changed"). Give it `key={id}` so React remounts it. ZoneLayer and PointLayer already do.
- `mapStyle` must be a stable object, or every render calls `setStyle` and wipes the layers. BaseMap handles this; don't pass `mapStyle`.
- `e.features` is only filled for layers listed in `interactiveLayerIds`.

## Recipes

### Choropleth by barangay (`derived/barangay-hazard.json`)

Join the precomputed shares onto the barangay polygons in a `useMemo`, then color by the new property:

```tsx
const barangays = useLayer("barangays");
const rows = useLayer("derived/barangay-hazard");

const data = useMemo(() => {
  if (barangays.status !== "ready" || rows.status !== "ready") return undefined;
  const byName = new Map(rows.data.map((r) => [r.barangay, r]));
  return {
    ...barangays.data,
    features: barangays.data.features.map((f) => {
      const shares = byName.get(f.properties.name)?.hazards.flood ?? {};
      const exposed = (shares.high ?? 0) + (shares.veryHigh ?? 0); // 0..1 of area
      return { ...f, properties: { ...f.properties, exposed } };
    }),
  };
}, [barangays, rows]);

const paint = useMemo(() => ({
  "fill-color": ["interpolate", ["linear"], ["get", "exposed"], 0, "#f8fafc", 0.25, "#fca5a5", 0.6, "#b91c1c"],
  "fill-opacity": 0.7,
}) satisfies FillLayerSpecification["paint"], []);

{data && (
  <Source id="choropleth" type="geojson" data={data} promoteId="name">
    <Layer id="choropleth" type="fill" paint={paint} beforeId={SLOT.data} />
  </Source>
)}
```

For a few categories, a `match` on the name works too: `["match", ["get", "name"], "Barangay 1", "#b91c1c", "Barangay 2", "#fca5a5", "#e5e7eb"]`. Use `showBarangays` to keep the outlines above it, and always add a ranked list next to the map.

### Hover highlight with feature-state

Feature-state needs feature ids: set `promoteId` on the source (or `generateId`).

```tsx
const mapRef = useRef<MapRef>(null);
const hovered = useRef<string | number | undefined>(undefined);

const onMouseMove = (e: MapLayerMouseEvent) => {
  const map = mapRef.current;
  const id = e.features?.[0]?.id;
  if (!map || id === hovered.current) return;
  if (hovered.current !== undefined) map.setFeatureState({ source: "choropleth", id: hovered.current }, { hover: false });
  if (id !== undefined) map.setFeatureState({ source: "choropleth", id }, { hover: true });
  hovered.current = id;
};

<BaseMap mapRef={mapRef} interactiveLayerIds={["choropleth"]} onMouseMove={onMouseMove} onFeatureClick={...}>
// paint: "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.9, 0.6]
```

Feature-state changes paint without re-rendering React. Never put hover in `useState`.

### Click → popup

```tsx
const [picked, setPicked] = useState<{ feature: MapGeoJSONFeature; lngLat: LngLat } | null>(null);

<BaseMap interactiveLayerIds={["facilities"]} onFeatureClick={(feature, lngLat) => setPicked({ feature, lngLat })} onClick={select}>
  {facilities.status === "ready" && <PointLayer id="facilities" data={facilities.data} />}
  {picked && (
    <Popup longitude={picked.lngLat[0]} latitude={picked.lngLat[1]} onClose={() => setPicked(null)} closeOnClick={false}>
      <p className="font-medium">{String(picked.feature.properties.name)}</p>
    </Popup>
  )}
</BaseMap>
```

`onFeatureClick` takes precedence over `onClick` when a feature is hit. Feature properties come back from the renderer, so treat them as `unknown`. Look the full record up by id in your own data.

### Fit bounds / fly to

```tsx
import { featureBounds } from "@rcene/geo";
mapRef.current?.fitBounds(featureBounds(barangayFeature), { padding: 40, duration: reduced ? 0 : 800 });
```

To drive the map from a side list, wrap both in `<MapProvider>` and call `useFlyTo()` in the list. Or put a tiny child inside `<BaseMap>` that reacts to store state:

```tsx
function FlyToSelected() {
  const selected = useAppStore((s) => s.selected);
  const flyTo = useFlyTo();
  useEffect(() => { if (selected) flyTo(selected, 15); }, [selected, flyTo]);
  return null;
}
```

### Nearest facilities

```tsx
import { nearest } from "@rcene/geo";
const fmt = useFormat();

const closest = useMemo(
  () => (selected && facilities.status === "ready"
    ? nearest(selected, facilities.data, { limit: 3, filter: (f) => f.properties.kind !== "other" })
    : []),
  [selected, facilities],
);

<ol>{closest.map(({ feature, km }) => (
  <li key={feature.properties.id}>
    <button onClick={() => flyTo(feature.geometry.coordinates as LngLat)}>{feature.properties.name}</button>
    {" · "}{t("distance.straightLine", { km: fmt.km(km) })}
  </li>
))}</ol>
```

To also show the nearest centers' hazard status (is the center itself in a zone?), use `derived/facility-hazard.json` or `classifyPoints`. Don't recompute it per render.

### Animating a route line (GSAP + turf)

Keep `data` stable on the `<Source>` and push frames with `setData` imperatively. Never send 60 frames per second through React state.

```tsx
import { length, lineSliceAlong } from "@turf/turf";

<Source id="route" type="geojson" data={EMPTY_FC}>
  <Layer id="route" type="line" paint={{ "line-color": "#1d4ed8", "line-width": 4 }} beforeId={SLOT.points} />
</Source>

useGSAP(() => {
  const map = mapRef.current;
  const source = map?.getSource<GeoJSONSource>("route");
  if (!source || !route) return;
  const total = length(route); // km
  const mm = gsap.matchMedia();
  mm.add("(prefers-reduced-motion: no-preference)", () => {
    const state = { p: 0 };
    gsap.to(state, {
      p: 1, duration: 2.5, ease: "power1.inOut",
      onUpdate: () => void source.setData(lineSliceAlong(route, 0, Math.max(state.p * total, 0.001))),
    });
  });
  mm.add("(prefers-reduced-motion: reduce)", () => void source.setData(route));
  return () => mm.revert();
}, { dependencies: [route, mapLoaded] });
```

Wait for the source to exist (track `onLoad` or check `getSource`) before animating. See the `gsap-motion` skill for GSAP setup.

### Heatmaps and deck.gl (app 06)

Try a **native heatmap layer** first. It needs no extra library:

```tsx
<Source id="reports" type="geojson" data={reports}>
  <Layer id="reports-heat" type="heatmap" beforeId={SLOT.data} paint={{
    "heatmap-weight": ["interpolate", ["linear"], ["get", "severity"], 0, 0, 3, 1],
    "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 11, 12, 16, 40],
    "heatmap-opacity": 0.75,
  }} />
</Source>
```

Use deck.gl only for what MapLibre lacks (hexagon bins, 3D columns, arcs). Every app already has `@deck.gl/core`, `@deck.gl/layers`, `@deck.gl/aggregation-layers` and `@deck.gl/maplibre` (9.4). Don't add the `deck.gl` meta-package (it drags in `@arcgis/core`, about 250 MB) or `@deck.gl/mapbox`.

Mount **`MapLibreOverlay`** from `@deck.gl/maplibre` as a control with `useControl`. It supports MapLibre 6. Keep the default `interleaved: false`: deck draws on its own canvas above the map, so it never touches MapLibre's internals (the removed `map.transform` broke `MapboxOverlay` in interleaved and terrain modes). Layers come from `@deck.gl/aggregation-layers` (`HexagonLayer`, `HeatmapLayer`, `GridLayer`, `ScreenGridLayer`) and `@deck.gl/layers` (`ScatterplotLayer`, `ArcLayer`, `PathLayer`, `GeoJsonLayer`, …).

```tsx
import { useControl } from "@rcene/map";
import { MapLibreOverlay, type MapLibreOverlayProps } from "@deck.gl/maplibre";
import { HexagonLayer } from "@deck.gl/aggregation-layers";

function DeckOverlay(props: MapLibreOverlayProps) {
  const overlay = useControl(() => new MapLibreOverlay(props));
  overlay.setProps(props);
  return null;
}

// inside <BaseMap>:
<DeckOverlay layers={[new HexagonLayer({ id: "hex", data: points, getPosition: (d) => d.lngLat, radius: 150, extruded: false })]} />
```

Memoize `layers`, keep layer `id`s stable, and give deck layers `pickable` plus a text alternative (a table or list) for whatever they show.

## Performance

- **Small data.** The data session simplifies geometry with mapshaper. Keep each layer to a few MB at most. Don't run `union`/`intersect` in the browser; use `derived/*.json`.
- **Memoize every FeatureCollection** you build (`useMemo` keyed on its inputs). `useLayer` data is already stable. A new object every render means react-map-gl deep-compares it and re-uploads it to the worker.
- **Paint, layout and filter objects**: module constants or `useMemo`. Never call a function that rebuilds a big expression on every render.
- **Clicks**: list layers in `interactiveLayerIds` instead of calling `queryRenderedFeatures` yourself. Hit-testing a tap against hazard zones is `lookupHazards` (bbox-prefiltered), not rendered-feature queries.
- **High-frequency updates** (hover, animation, live counters on the map) go through `setFeatureState` / `setData`, not React state.
- **HTML markers** cost a DOM node each and repaint on every move. Use them for up to about 100; past that, use a circle layer.

## Accessibility

- **The map is never the only way in.** Every map answer is also text (HazardStatusList, a ranked list, a table). Offer a barangay/address picker as an alternative to tapping.
- **Mirror selections**: tapping the map updates the list; picking from the list flies the map (`useFlyTo`) and moves the `SelectedPoint`. Announce results in an `aria-live="polite"` region, and don't steal focus into the map.
- **Keyboard**: the canvas is focusable (arrows pan, `+`/`-` zoom) and BaseMap gives it a visible focus ring. Keep MapLibre's `keyboard` handler on. `NavigationControl` adds zoom buttons.
- **Reduced motion**: `useFlyTo` jumps. Gate any map animation behind `prefers-reduced-motion: no-preference`.
- Give `SelectedPoint` a `label`. Decorative markers (labels) are `aria-hidden`.

## When the map looks wrong

| Symptom | Likely cause |
|---|---|
| Blank area, no map | Parent has no height. BaseMap is `h-full`. |
| Only blue sea, no land | Worker failed (console: "Failed to fetch worker"), or `/data/land.geojson` is missing. Check `useLayer` status. |
| A layer never appears | Console validation error: `text-field` without glyphs, legacy filter, `beforeId` pointing at a missing layer, or the `<Layer>` isn't inside a `<Source>`. |
| "source id changed" / "layer id changed" | Id derived from props without `key={id}`. |
| Clicks never reach `onFeatureClick` | Layer id missing from `interactiveLayerIds`, or the layer is under a `SLOT` you didn't expect. |
| Layers vanish after a re-render | Something passed a new `mapStyle`. Don't. |
