/**
 * @rcene/map — the shared offline map. See .claude/skills/maplibre-gis/SKILL.md.
 *
 *   <BaseMap onClick={select}>
 *     <ZoneLayer hazard="flood" zones={zones.flood} />
 *     {selected && <SelectedPoint lngLat={selected} />}
 *   </BaseMap>
 *   <Legend hazard="flood" />
 */
export { BaseMap, useMapTone, type BaseMapProps } from "./BaseMap.tsx";
export { ZoneLayer, type ZoneLayerProps } from "./ZoneLayer.tsx";
export { PointLayer, type PointLayerProps } from "./PointLayer.tsx";
export { SelectedPoint, type SelectedPointProps } from "./SelectedPoint.tsx";
export { Legend, type LegendProps } from "./Legend.tsx";
export { useFlyTo } from "./useFlyTo.ts";
export { hasWebGL2 } from "./webgl.ts";
export { loadMapLib } from "./maplib.ts";
export * from "./style.ts";

export {
  AttributionControl,
  Layer,
  MapProvider,
  Marker,
  NavigationControl,
  Popup,
  Source,
  useControl,
  useMap,
} from "react-map-gl/maplibre";
export type {
  CircleLayerSpecification,
  FillLayerSpecification,
  HeatmapLayerSpecification,
  LayerProps,
  LineLayerSpecification,
  MapGeoJSONFeature,
  MapLayerMouseEvent,
  MapRef,
  MarkerProps,
  PopupProps,
  SourceProps,
  ViewState,
} from "react-map-gl/maplibre";
export type { ExpressionSpecification, FilterSpecification, GeoJSONSource } from "maplibre-gl";
