import { useMemo } from "react";
import type { ExpressionSpecification } from "maplibre-gl";
import { Layer, Source, type CircleLayerSpecification } from "react-map-gl/maplibre";
import type { FeatureCollection, GeoJsonProperties, Point } from "geojson";
import { POINT_COLOR, SLOT } from "./style.ts";

export interface PointLayerProps<P extends GeoJsonProperties = GeoJsonProperties> {
  /** Layer and source id; also what you list in BaseMap's interactiveLayerIds. */
  id: string;
  /** Memoize it (useMemo or straight from useLayer) — a new object every render re-uploads the data. */
  data: FeatureCollection<Point, P>;
  /** A color or an expression, e.g. ["match", ["get", "kind"], "school", "#2563eb", "#0f766e"]. */
  color?: string | ExpressionSpecification;
  /** Circle radius in px. Default 6. */
  radius?: number;
  /** Default white. */
  strokeColor?: string;
  /** Property to use as the feature id, for feature-state hover/selection. */
  promoteId?: string;
  /** Insert below this layer. Default SLOT.points (above outlines and zones). */
  beforeId?: string;
}

/** Point features as circles. */
export function PointLayer<P extends GeoJsonProperties = GeoJsonProperties>({
  id,
  data,
  color = POINT_COLOR,
  radius = 6,
  strokeColor = "#ffffff",
  promoteId,
  beforeId = SLOT.points,
}: PointLayerProps<P>) {
  const paint = useMemo(
    () =>
      ({
        "circle-color": color,
        "circle-radius": radius,
        "circle-stroke-color": strokeColor,
        "circle-stroke-width": 1.5,
      }) satisfies CircleLayerSpecification["paint"],
    // react-map-gl deep-compares each paint key, so an inline expression literal is fine here.
    [color, radius, strokeColor],
  );

  return (
    <Source key={id} id={id} type="geojson" data={data} promoteId={promoteId}>
      <Layer id={id} type="circle" paint={paint} beforeId={beforeId} />
    </Source>
  );
}
