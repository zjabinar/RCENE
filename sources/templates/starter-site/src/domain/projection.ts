/**
 * GeoJSON to SVG, for figures that must print (the poster) or stay light
 * (a hero picture, a before/after slider): WebGL maps do not print.
 *
 * The projection is equirectangular with longitude scaled by cos(latitude)
 * at the centre, which is accurate enough for one city (Catbalogan spans
 * about 0.2° of latitude). y grows downwards, as in SVG.
 */
import type { MultiPolygon, Polygon, Position } from "geojson";

/** [[west, south], [east, north]], as featureBounds from @rcene/geo returns. */
export type Bounds = [[number, number], [number, number]];

export interface Projection {
  /** viewBox width and height. */
  width: number;
  height: number;
  /** [lon, lat] to [x, y] in the viewBox. */
  project: (position: Position) => [number, number];
}

/**
 * Fits `bounds` into a viewBox `width` wide (minus `padding` on every side),
 * keeping the true shape; the height follows from the shape.
 */
export function fitProjection(bounds: Bounds, width: number, padding = 0): Projection {
  const [[west, south], [east, north]] = bounds;
  const kx = Math.cos((((south + north) / 2) * Math.PI) / 180);
  const spanX = Math.max((east - west) * kx, 1e-9);
  const spanY = Math.max(north - south, 1e-9);
  const inner = Math.max(width - 2 * padding, 1);
  const scale = inner / spanX;
  const height = spanY * scale + 2 * padding;
  return {
    width,
    height,
    project: ([lon = 0, lat = 0]) => [padding + (lon - west) * kx * scale, padding + (north - lat) * scale],
  };
}

const round = (n: number) => Math.round(n * 10) / 10;

/** One closed subpath per ring. Holes are rings too: draw with fill-rule="evenodd". */
export function areaPath(geometry: Polygon | MultiPolygon, project: Projection["project"]): string {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  const parts: string[] = [];
  for (const rings of polygons) {
    for (const ring of rings) {
      if (ring.length < 3) continue;
      const points = ring.map((position) => project(position).map(round).join(" "));
      parts.push(`M${points.join("L")}Z`);
    }
  }
  return parts.join("");
}
