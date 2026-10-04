import { describe, expect, it } from "vitest";
import { areaPath, fitProjection, type Bounds } from "./projection.ts";

const BOUNDS: Bounds = [
  [124.8, 11.7],
  [125.0, 11.9],
];

describe("fitProjection", () => {
  it("maps the north-west corner to the padding and the south-east corner to the far edge", () => {
    const { project, width, height } = fitProjection(BOUNDS, 600, 20);
    expect(width).toBe(600);
    expect(project([124.8, 11.9])).toEqual([20, 20]);
    const [x, y] = project([125.0, 11.7]);
    expect(x).toBeCloseTo(580, 6);
    expect(y).toBeCloseTo(height - 20, 6);
  });

  it("keeps the true shape: a square in degrees is taller than wide near 12° N", () => {
    const { height } = fitProjection(BOUNDS, 600);
    // 1° of longitude is cos(11.8°) ≈ 0.979 of 1° of latitude.
    expect(height).toBeCloseTo(600 / Math.cos((11.8 * Math.PI) / 180), 3);
  });
});

describe("areaPath", () => {
  const project = ([x = 0, y = 0]: number[]): [number, number] => [x * 10, y * 10];

  it("draws each ring as a closed subpath, holes included", () => {
    const d = areaPath(
      {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [4, 0],
            [4, 4],
            [0, 0],
          ],
          [
            [1, 1],
            [2, 1],
            [2, 2],
            [1, 1],
          ],
        ],
      },
      project,
    );
    expect(d).toBe("M0 0L40 0L40 40L0 0ZM10 10L20 10L20 20L10 10Z");
  });

  it("draws every polygon of a MultiPolygon and skips broken rings", () => {
    const d = areaPath(
      {
        type: "MultiPolygon",
        coordinates: [
          [
            [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 0],
            ],
          ],
          [
            [
              [5, 5],
              [5, 5],
            ],
          ],
        ],
      },
      project,
    );
    expect(d).toBe("M0 0L10 0L10 10L0 0Z");
  });
});
