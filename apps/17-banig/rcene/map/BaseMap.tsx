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
import { useAppStrings, useT } from "@rcene/i18n";
import { useTheme } from "@rcene/ui/theme";
import {
  BASEMAP,
  CATBALOGAN_VIEW,
  OFFLINE_STYLE,
  OSM_ATTRIBUTION,
  OSM_SOURCE_ID,
  OSM_TILES,
  SLOT,
  type BasemapColors,
  type MapTone,
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
  /** The zoom buttons and MapLibre's attribution button. False for a still figure map (credit the data on /sources). Default true. */
  controls?: boolean;
  /** Fit to the city boundary once it loads and keep the camera near it (maxBounds). Default true. */
  fitToBoundary?: boolean;
  /** Classes for the wrapper div. It fills its parent; give the parent a height. */
  className?: string;
  mapRef?: Ref<MapRef>;
  /** CSS cursor over the map canvas. */
  cursor?: string;
  /**
   * Basemap colours: "light" (default; the hazard fills were tuned on it), "dark",
   * or "auto" (follows the app's light/dark theme). Hazard colours never change.
   */
  tone?: MapTone | "auto";
};

/** The basemap tone to draw: "auto" follows the effective theme mode. */
export function useMapTone(tone: MapTone | "auto" = "light"): MapTone {
  const { effective } = useTheme();
  return tone === "auto" ? effective.mode : tone;
}

/** The basemap layers' paint for one tone (module-level, so a re-render never re-sets paint). */
function basemapPaint(colors: BasemapColors) {
  return {
    land: { "fill-color": colors.land } satisfies FillLayerSpecification["paint"],
    coverage: { "fill-color": colors.coverage } satisfies FillLayerSpecification["paint"],
    boundary: {
      "line-color": colors.boundary,
      "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1.25, 15, 2.5],
    } satisfies LineLayerSpecification["paint"],
    barangay: {
      "line-color": colors.barangayLine,
      "line-width": ["interpolate", ["linear"], ["zoom"], 11, 0.5, 15, 1.5],
      "line-dasharray": [3, 2],
    } satisfies LineLayerSpecification["paint"],
  };
}
const PAINT = { light: basemapPaint(BASEMAP.light), dark: basemapPaint(BASEMAP.dark) } as const;
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
  controls = true,
  fitToBoundary = true,
  className,
  mapRef,
  cursor,
  tone: toneProp,
  ...rest
}: BaseMapProps) {
  const tone = useMapTone(toneProp);
  const colors = BASEMAP[tone];
  const paint = PAINT[tone];
  const { onLoad, onError, onMouseEnter, onMouseLeave, maxBounds: maxBoundsProp, ...mapProps } = rest;
  const t = useT(useAppStrings());
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
        className={cx("grid h-full w-full place-items-center p-6 text-center text-sm", className)}
        style={{ backgroundColor: colors.sea, color: colors.label }}
      >
        {t("map.noWebgl")}
      </div>
    );
  }

  return (
    <div
      data-lenis-prevent
      data-map-tone={tone}
      className={cx(
        "relative h-full w-full overflow-hidden",
        "[&_.maplibregl-canvas:focus-visible]:outline-2 [&_.maplibregl-canvas:focus-visible]:-outline-offset-2 [&_.maplibregl-canvas:focus-visible]:outline-ring",
        className,
      )}
      style={{ backgroundColor: colors.sea }}
    >
      <MapGL
        attributionControl={controls ? undefined : false}
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
        {controls && <NavigationControl position="top-right" visualizePitch={false} />}
        <SeaColor color={colors.sea} />

        {land.status === "ready" && (
          <Source id="rcene-land" type="geojson" data={land.data}>
            <Layer id="rcene-land" type="fill" paint={paint.land} beforeId={SLOT.land} />
          </Source>
        )}

        {boundaryData && (
          <Source id="rcene-boundary" type="geojson" data={boundaryData}>
            <Layer id="rcene-coverage" type="fill" paint={paint.coverage} beforeId={SLOT.coverage} />
            <Layer id="rcene-boundary-line" type="line" paint={paint.boundary} beforeId={SLOT.boundary} />
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
              <Layer id="rcene-barangays-line" type="line" paint={paint.barangay} beforeId={SLOT.outlines} />
            </Source>
            {showBarangayLabels && <BarangayLabels data={barangays.data} colors={colors} />}
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
          className="absolute top-2 left-2 z-10 inline-flex items-center gap-1.5 rounded-md border bg-card/90 px-2 py-1 text-xs font-medium text-card-foreground shadow-sm backdrop-blur-sm hover:bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span aria-hidden="true" className={cx("size-2 rounded-full", online ? "bg-primary" : "bg-muted-foreground")} />
          {t("map.onlineBasemap")}
        </button>
      )}

      {!loaded && (
        <div
          role="status"
          className="pointer-events-none absolute inset-0 grid place-items-center text-sm"
          style={{ color: colors.label }}
        >
          {t("map.loading")}
        </div>
      )}
    </div>
  );
}

/** Sets the style's sea (background layer) colour; the offline style object itself never changes. */
function SeaColor({ color }: { color: string }) {
  const { current: map } = useMap();
  useEffect(() => {
    if (!map) return;
    const gl = map.getMap();
    const apply = () => {
      if (gl.getLayer("background")) gl.setPaintProperty("background", "background-color", color);
    };
    if (gl.isStyleLoaded()) apply();
    gl.on("styledata", apply);
    return () => {
      gl.off("styledata", apply);
    };
  }, [map, color]);
  return null;
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
const labelStyle = (colors: BasemapColors) => {
  const h = colors.labelHalo;
  return { color: colors.label, textShadow: `0 0 2px ${h}, 0 0 2px ${h}, 0 0 3px ${h}, 0 0 4px ${h}` } as const;
};

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
function BarangayLabels({ data, colors }: { data: BarangayCollection; colors: BasemapColors }) {
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
  const style = useMemo(() => labelStyle(colors), [colors]);

  return labels
    .filter((label) => zoom >= label.minZoom)
    .map((label) => (
      <Marker key={label.key} longitude={label.longitude} latitude={label.latitude} style={LABEL_MARKER_STYLE}>
        <span
          aria-hidden="true"
          className="block text-[11px] leading-none font-medium whitespace-nowrap select-none"
          style={style}
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
