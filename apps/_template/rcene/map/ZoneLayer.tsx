import { useMemo } from "react";
import {
  Layer,
  Source,
  type FillLayerSpecification,
  type LineLayerSpecification,
} from "react-map-gl/maplibre";
import type { Hazard, Level, ZoneCollection } from "@rcene/data";
import { levelColorExpression, minLevelFilter, SLOT } from "./style.ts";

export interface ZoneLayerProps {
  hazard: Hazard;
  /** The hazard's zones. Renders nothing while undefined (loading or missing layer). */
  zones?: ZoneCollection;
  /** Only draw zones at or above this level. */
  minLevel?: Level;
  /** Fill opacity. Default 0.45. */
  opacity?: number;
  /** Draw a thin outline in the level color. Default true. */
  outline?: boolean;
  /** A light casing line under the outline, so dark levels (very high) stay visible on a dark basemap. Default false. */
  casing?: boolean;
  /** Layer and source id. Default `zone-${hazard}`; the outline is `${id}-outline`. */
  id?: string;
  /** Insert below this layer. Default SLOT.data (above land, below barangay outlines). */
  beforeId?: string;
}

const CASING_PAINT = { "line-color": "#f8fafc", "line-width": 2.5, "line-opacity": 0.9 } satisfies LineLayerSpecification["paint"];

/** Hazard zones as a fill colored by `level` (LEVEL_HEX), plus an optional outline. */
export function ZoneLayer({
  hazard,
  zones,
  minLevel,
  opacity = 0.45,
  outline = true,
  casing = false,
  id,
  beforeId = SLOT.data,
}: ZoneLayerProps) {
  const layerId = id ?? `zone-${hazard}`;
  // Spread the filter only when set: maplibre 6 rejects `filter: undefined` ("array expected")
  // and then never adds the layer.
  const filterProps = useMemo(() => (minLevel ? { filter: minLevelFilter(minLevel) } : {}), [minLevel]);
  const fillPaint = useMemo(
    () => ({ "fill-color": levelColorExpression(), "fill-opacity": opacity }) satisfies FillLayerSpecification["paint"],
    [opacity],
  );
  const linePaint = useMemo(
    () =>
      ({
        "line-color": levelColorExpression(),
        "line-width": 1,
        "line-opacity": Math.min(1, opacity + 0.4),
      }) satisfies LineLayerSpecification["paint"],
    [opacity],
  );

  // The casing layer is always mounted and only shown or hidden: a layer added later would land above
  // the outline (react-map-gl inserts new layers right under beforeId) and hide the level colours.
  const casingLayout = useMemo(() => ({ visibility: casing ? "visible" : "none" }) as const, [casing]);

  if (!zones) return null;

  // key: react-map-gl can't change a source or layer id in place, so a new id remounts.
  return (
    <Source key={layerId} id={layerId} type="geojson" data={zones}>
      <Layer id={layerId} type="fill" paint={fillPaint} {...filterProps} beforeId={beforeId} />
      <Layer id={`${layerId}-casing`} type="line" paint={CASING_PAINT} layout={casingLayout} {...filterProps} beforeId={beforeId} />
      {outline && (
        <Layer id={`${layerId}-outline`} type="line" paint={linePaint} {...filterProps} beforeId={beforeId} />
      )}
    </Source>
  );
}
