/**
 * The offline basemap every map app starts from: sea background, land, city
 * coverage and boundary, barangay outlines and labels — all from local GeoJSON,
 * so it works with Wi-Fi off. App layers go in as children.
 *
 *   <BaseMap onClick={select}>
 *     <ZoneLayer hazard="flood" zones={zones.flood} />
 *     {selected && <SelectedPoint lngLat={selected} />}
 *   </BaseMap>
 */
import "maplibre-gl/dist/maplibre-gl.css";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode, type Ref } from "react";
import {
  Layer,
  Map as MapGL,
  Marker,
  NavigationControl,
  Source,
  useMap,
  type ErrorEvent as MapErrorEvent,
  type FillLayerSpecification,
  type LineLayerSpecification,
  type MapGeoJSONFeature,
  type MapLayerMouseEvent,
  type MapProps,
  type MapRef,
  type RasterLayerSpecification,
} from "react-map-gl/maplibre";
import { area, pointOnFeature } from "@turf/turf";
import { useLayer, type BarangayCollection } from "@rcene/data";
import { featureBounds, type LngLat } from "@rcene/geo";
import { common, useT } from "@rcene/i18n";
import {
  BARANGAY_LINE_COLOR,
  BOUNDARY_COLOR,
  CATBALOGAN_VIEW,
  COVERAGE_COLOR,
  LAND_COLOR,
  OFFLINE_STYLE,
  OSM_ATTRIBUTION,
  OSM_SOURCE_ID,
  OSM_TILES,
  SEA_COLOR,
  SLOT,
} from "./style.ts";
import { hasWebGL2 } from "./webgl.ts";
import { loadMapLib } from "./maplib.ts";

type Bounds = [[number, number], [number, number]];

/** Other react-map-gl <Map> props pass straight through (onMove, minZoom, dragRotate, …). */
type MapPassThrough = Omit<
  MapProps,
  "children" | "onClick" | "mapStyle" | "mapLib" | "initialViewState" | "interactiveLayerIds" | "cursor"
>;

export type BaseMapProps = MapPassThrough & {
  children?: ReactNode;
  /** Defaults to CATBALOGAN_VIEW. When set, BaseMap does not re-fit to the boundary on load. */
  initialViewState?: MapProps["initialViewState"];
  /** Tap/click anywhere, as [lon, lat]. Not called when `onFeatureClick` handled the click. */
  onClick?: (lngLat: LngLat) => void;
  /** Click on a feature of `interactiveLayerIds` (topmost feature). Takes precedence over `onClick`. */
  onFeatureClick?: (feature: MapGeoJSONFeature, lngLat: LngLat) => void;
  /** Layer ids whose features are clickable/hoverable. Shows a pointer cursor over them. */
  interactiveLayerIds?: string[];
  /** Barangay outlines. Default true. */
  showBarangays?: boolean;
  /** Decorative barangay name labels (HTML markers, zoom ≥ 12.5). Default true. */
  showBarangayLabels?: boolean;
  /** Show the "Online basemap" toggle (OSM raster tiles, off by default). Default true. */
  allowOnlineBasemap?: boolean;
  /** Fit to the city boundary once it loads and keep the camera near it (maxBounds). Default true. */
  fitToBoundary?: boolean;
  /** Classes for the wrapper div. It fills its parent; give the parent a height. */
  className?: string;
  mapRef?: Ref<MapRef>;
  /** CSS cursor over the map canvas. */
  cursor?: string;
};

const LAND_PAINT = { "fill-color": LAND_COLOR } satisfies FillLayerSpecification["paint"];
const COVERAGE_PAINT = { "fill-color": COVERAGE_COLOR } satisfies FillLayerSpecification["paint"];
const BOUNDARY_PAINT = {
  "line-color": BOUNDARY_COLOR,
  "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1.25, 15, 2.5],
} satisfies LineLayerSpecification["paint"];
const BARANGAY_PAINT = {
  "line-color": BARANGAY_LINE_COLOR,
  "line-width": ["interpolate", ["linear"], ["zoom"], 11, 0.5, 15, 1.5],
  "line-dasharray": [3, 2],
} satisfies LineLayerSpecification["paint"];
const OSM_PAINT = { "raster-saturation": -0.3 } satisfies RasterLayerSpecification["paint"];

/** Padding in degrees around the boundary for maxBounds (~16 km). */
const MAX_BOUNDS_PAD = 0.15;

export function BaseMap({
  children,
  initialViewState,
  onClick,
  onFeatureClick,
  interactiveLayerIds,
  showBarangays = true,
  showBarangayLabels = true,
  allowOnlineBasemap = true,
  fitToBoundary = true,
  className,
  mapRef,
  cursor,
  ...rest
}: BaseMapProps) {
  const { onLoad, onError, onMouseEnter, onMouseLeave, maxBounds: maxBoundsProp, ...mapProps } = rest;
  const t = useT(common);
  const [webgl] = useState(hasWebGL2);
  const [loaded, setLoaded] = useState(false);
  const [online, setOnline] = useState(false);
  const [hovering, setHovering] = useState(false);

  const land = useLayer("land");
  const boundary = useLayer("boundary");
  const barangays = useLayer("barangays");

  const boundaryData = boundary.status === "ready" ? boundary.data : undefined;
  const bounds = useMemo(() => (boundaryData ? featureBounds(boundaryData) : undefined), [boundaryData]);
  const maxBounds = useMemo((): [number, number, number, number] | undefined => {
    if (maxBoundsProp) return maxBoundsProp;
    if (!bounds || !fitToBoundary) return undefined;
    const [[w, s], [e, n]] = bounds;
    return [w - MAX_BOUNDS_PAD, s - MAX_BOUNDS_PAD, e + MAX_BOUNDS_PAD, n + MAX_BOUNDS_PAD];
  }, [bounds, fitToBoundary, maxBoundsProp]);

  const handleClick = useCallback(
    (e: MapLayerMouseEvent) => {
      const lngLat: LngLat = [e.lngLat.lng, e.lngLat.lat];
      const feature = e.features?.[0];
      if (feature && onFeatureClick) onFeatureClick(feature, lngLat);
      else onClick?.(lngLat);
    },
    [onClick, onFeatureClick],
  );

  const trackHover = Boolean(interactiveLayerIds?.length && onFeatureClick);

  if (!webgl) {
    return (
      <div
        role="alert"
        className={cx("grid h-full w-full place-items-center p-6 text-center text-sm text-slate-700", className)}
        style={{ backgroundColor: SEA_COLOR }}
      >
        {t("map.noWebgl")}
      </div>
    );
  }

  return (
    <div
      data-lenis-prevent
      className={cx(
        "relative h-full w-full overflow-hidden",
        "[&_.maplibregl-canvas:focus-visible]:outline-2 [&_.maplibregl-canvas:focus-visible]:-outline-offset-2 [&_.maplibregl-canvas:focus-visible]:outline-blue-600",
        className,
      )}
      style={{ backgroundColor: SEA_COLOR }}
    >
      <MapGL
        {...mapProps}
        ref={mapRef}
        mapLib={loadMapLib()}
        mapStyle={OFFLINE_STYLE}
        initialViewState={initialViewState ?? CATBALOGAN_VIEW}
        maxBounds={maxBounds}
        interactiveLayerIds={interactiveLayerIds}
        cursor={cursor ?? (hovering ? "pointer" : undefined)}
        onClick={onClick || onFeatureClick ? handleClick : undefined}
        onMouseEnter={
          trackHover || onMouseEnter
            ? (e) => {
                if (trackHover) setHovering(true);
                onMouseEnter?.(e);
              }
            : undefined
        }
        onMouseLeave={
          trackHover || onMouseLeave
            ? (e) => {
                if (trackHover) setHovering(false);
                onMouseLeave?.(e);
              }
            : undefined
        }
        onLoad={(e) => {
          setLoaded(true);
          onLoad?.(e);
        }}
        onError={(e: MapErrorEvent) => {
          // OSM tiles fail when offline; that is expected and the GeoJSON basemap still shows.
          if ((e as MapErrorEvent & { sourceId?: string }).sourceId === OSM_SOURCE_ID) return;
          if (onError) onError(e);
          else console.error(e.error);
        }}
      >
        <NavigationControl position="top-right" visualizePitch={false} />

        {land.status === "ready" && (
          <Source id="rcene-land" type="geojson" data={land.data}>
            <Layer id="rcene-land" type="fill" paint={LAND_PAINT} beforeId={SLOT.land} />
          </Source>
        )}

        {boundaryData && (
          <Source id="rcene-boundary" type="geojson" data={boundaryData}>
            <Layer id="rcene-coverage" type="fill" paint={COVERAGE_PAINT} beforeId={SLOT.coverage} />
            <Layer id="rcene-boundary-line" type="line" paint={BOUNDARY_PAINT} beforeId={SLOT.boundary} />
          </Source>
        )}

        {online && (
          <Source
            id={OSM_SOURCE_ID}
            type="raster"
            tiles={[OSM_TILES]}
            tileSize={256}
            maxzoom={19}
            attribution={OSM_ATTRIBUTION}
          >
            <Layer id={OSM_SOURCE_ID} type="raster" paint={OSM_PAINT} beforeId={SLOT.basemap} />
          </Source>
        )}

        {showBarangays && barangays.status === "ready" && (
          <>
            <Source id="rcene-barangays" type="geojson" data={barangays.data}>
              <Layer id="rcene-barangays-line" type="line" paint={BARANGAY_PAINT} beforeId={SLOT.outlines} />
            </Source>
            {showBarangayLabels && <BarangayLabels data={barangays.data} />}
          </>
        )}

        {bounds && fitToBoundary && !initialViewState && <FitOnce bounds={bounds} />}

        {children}
      </MapGL>

      {allowOnlineBasemap && (
        <button
          type="button"
          aria-pressed={online}
          onClick={() => setOnline((on) => !on)}
          className="absolute top-2 left-2 z-10 inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white/90 px-2 py-1 text-xs font-medium text-slate-800 shadow-sm backdrop-blur-sm hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <span aria-hidden="true" className={cx("size-2 rounded-full", online ? "bg-emerald-500" : "bg-slate-400")} />
          {t("map.onlineBasemap")}
        </button>
      )}

      {!loaded && (
        <div
          role="status"
          className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-slate-600"
        >
          {t("map.loading")}
        </div>
      )}
    </div>
  );
}

/** Fits the camera to the boundary once, without animation. */
function FitOnce({ bounds }: { bounds: Bounds }) {
  const { current: map } = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (!map || done.current) return;
    done.current = true;
    map.fitBounds(bounds, { padding: 16, duration: 0 });
  }, [map, bounds]);
  return null;
}

/** Labels start at zoom 12.5; small barangays wait until their polygon is about this many pixels wide. */
const LABEL_MIN_ZOOM = 12.5;
const LABEL_WIDTH_PX = 64;
const EARTH_CIRCUMFERENCE_M = 40_075_016.686;
const LABEL_MARKER_STYLE = { pointerEvents: "none" } as const;
const LABEL_HALO = { textShadow: "0 0 2px #fff, 0 0 2px #fff, 0 0 3px #fff, 0 0 4px #fff" } as const;

interface BarangayLabel {
  key: string;
  name: string;
  longitude: number;
  latitude: number;
  minZoom: number;
}

/**
 * Barangay names as HTML markers (the offline style has no glyphs, so no
 * symbol text layers). Decorative and aria-hidden: lists in the UI carry the names.
 */
function BarangayLabels({ data }: { data: BarangayCollection }) {
  const labels = useMemo(
    () =>
      data.features.map((feature, i): BarangayLabel => {
        const [longitude = 0, latitude = 0] = pointOnFeature(feature).geometry.coordinates;
        const side = Math.sqrt(area(feature));
        const metresPerPx = (EARTH_CIRCUMFERENCE_M * Math.cos((latitude * Math.PI) / 180)) / 512;
        const fitZoom = side > 0 ? Math.log2((LABEL_WIDTH_PX * metresPerPx) / side) : Infinity;
        return {
          key: `${i}:${feature.properties.name}`,
          name: feature.properties.name,
          longitude,
          latitude,
          minZoom: Math.max(LABEL_MIN_ZOOM, fitZoom),
        };
      }),
    [data],
  );
  const zoom = useZoom();

  return labels
    .filter((label) => zoom >= label.minZoom)
    .map((label) => (
      <Marker key={label.key} longitude={label.longitude} latitude={label.latitude} style={LABEL_MARKER_STYLE}>
        <span
          aria-hidden="true"
          className="block text-[11px] leading-none font-medium whitespace-nowrap text-slate-700 select-none"
          style={LABEL_HALO}
        >
          {label.name}
        </span>
      </Marker>
    ));
}

/** Current zoom, rounded down to `step`, re-rendering only when the step changes. */
function useZoom(step = 0.25): number {
  const { current: map } = useMap();
  const subscribe = useCallback(
    (notify: () => void) => {
      if (!map) return () => {};
      map.on("zoom", notify);
      return () => {
        map.off("zoom", notify);
      };
    },
    [map],
  );
  const snapshot = useCallback(() => (map ? Math.floor(map.getZoom() / step) * step : 0), [map, step]);
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");
