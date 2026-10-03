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
  /** Layer and source id. Default `zone-${hazard}`; the outline is `${id}-outline`. */
  id?: string;
  /** Insert below this layer. Default SLOT.data (above land, below barangay outlines). */
  beforeId?: string;
}

/** Hazard zones as a fill colored by `level` (LEVEL_HEX), plus an optional outline. */
export function ZoneLayer({
  hazard,
  zones,
  minLevel,
  opacity = 0.45,
  outline = true,
  id,
  beforeId = SLOT.data,
}: ZoneLayerProps) {
  const layerId = id ?? `zone-${hazard}`;
  const filter = useMemo(() => (minLevel ? minLevelFilter(minLevel) : undefined), [minLevel]);
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

  if (!zones) return null;

  // key: react-map-gl can't change a source or layer id in place, so a new id remounts.
  return (
    <Source key={layerId} id={layerId} type="geojson" data={zones}>
      <Layer id={layerId} type="fill" paint={fillPaint} filter={filter} beforeId={beforeId} />
      {outline && (
        <Layer id={`${layerId}-outline`} type="line" paint={linePaint} filter={filter} beforeId={beforeId} />
      )}
    </Source>
  );
}
