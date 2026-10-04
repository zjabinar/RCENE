/**
 * The city as an SVG: barangays, the city boundary, one hazard's zones by
 * level and the facilities. Use it wherever a WebGL map is the wrong tool:
 * a poster figure (WebGL does not print), a hero picture, a before/after
 * slider. Colours are theme tokens (hazard levels use the level-* tokens),
 * so it follows the palette, light/dark and the showcase surface.
 */
import { useMemo, useRef } from "react";
import { LEVELS, type Hazard, type Level } from "@rcene/data";
import { featureBounds } from "@rcene/geo";
import { cn } from "@rcene/ui/lib/utils";
import { DURATION, EASE, STAGGER, gsap, useGSAP, useReducedMotion } from "@rcene/ui/motion";
import type { CityLayers, FacilitySplit } from "@/domain/city-stats.ts";
import { areaPath, fitProjection } from "@/domain/projection.ts";

/** Hazard levels keep their fixed hazard colours in every theme. */
const LEVEL_FILL: Record<Level, string> = {
  low: "fill-level-low stroke-level-low",
  moderate: "fill-level-moderate stroke-level-moderate",
  high: "fill-level-high stroke-level-high",
  veryHigh: "fill-level-veryHigh stroke-level-veryHigh",
};

/** The tapestry variant weaves the barangays in the palette's three weave colours. */
const WEAVE_FILL = ["fill-weave-1", "fill-weave-2", "fill-weave-3"] as const;
const WEAVE_OPACITY = [0.55, 0.32, 0.45, 0.25] as const;

export type CityMapVariant = "plain" | "tapestry";

export interface CityMapSvgProps {
  layers: CityLayers;
  /** The accessible description of the picture (role="img"). */
  label: string;
  /** Draw this hazard's zones, coloured by level. */
  hazard?: Hazard;
  /** "all": every facility alike; "split": the ones in `split.inZone` stand out. Default "none". */
  facilities?: "none" | "all" | "split";
  split?: FacilitySplit;
  /** "plain" (default) for figures; "tapestry" weaves the barangays in the palette's colours (hero art). */
  variant?: CityMapVariant;
  /** Draw the boundary and fade the barangays in on mount (skipped under reduced motion). */
  animate?: boolean;
  /** viewBox width; the height follows the city's shape. Default 640. */
  width?: number;
  className?: string;
}

export function CityMapSvg({
  layers,
  label,
  hazard,
  facilities = "none",
  split,
  variant = "plain",
  animate = false,
  width = 640,
  className,
}: CityMapSvgProps) {
  const root = useRef<SVGSVGElement>(null);
  const reduced = useReducedMotion();
  const tapestry = variant === "tapestry";

  const drawing = useMemo(() => {
    const { project, height } = fitProjection(featureBounds(layers.boundary), width, width * 0.04);
    const zones = hazard ? layers.zones[hazard] : undefined;
    const inZone = new Set(split?.inZone ?? []);
    return {
      height,
      barangays: layers.barangays.features.map((f, i) => ({ key: `${f.properties.name}-${i}`, d: areaPath(f.geometry, project) })),
      boundary: layers.boundary.features.map((f) => areaPath(f.geometry, project)).join(""),
      zones: zones
        ? LEVELS.map((level) => ({
            level,
            d: zones.features
              .filter((f) => f.properties.level === level)
              .map((f) => areaPath(f.geometry, project))
              .join(""),
          })).filter((z) => z.d)
        : [],
      points: layers.facilities.features.map((f, i) => {
        const [x, y] = project(f.geometry.coordinates);
        return { key: `${f.properties.id}-${i}`, x, y, inZone: inZone.has(f) };
      }),
    };
  }, [layers, hazard, split, width]);

  useGSAP(
    () => {
      if (!animate || reduced) return;
      const tl = gsap.timeline({ defaults: { ease: EASE.standard } });
      tl.from("[data-map-patch]", { autoAlpha: 0, scale: 0.96, transformOrigin: "50% 50%", duration: DURATION.slow, stagger: STAGGER.tight });
      tl.from("[data-map-boundary]", { drawSVG: "0%", duration: DURATION.story, ease: EASE.weave }, 0.2);
      tl.from("[data-map-point]", { autoAlpha: 0, duration: DURATION.base, stagger: STAGGER.tight }, "-=0.4");
    },
    { scope: root, dependencies: [animate, reduced, drawing], revertOnUpdate: true },
  );

  return (
    <svg
      ref={root}
      viewBox={`0 0 ${width} ${Math.round(drawing.height)}`}
      role="img"
      aria-label={label}
      preserveAspectRatio="xMidYMid meet"
      className={cn("block h-auto w-full", className)}
    >
      <g strokeLinejoin="round">
        {drawing.barangays.map((b, i) => (
          <path
            key={b.key}
            d={b.d}
            data-map-patch=""
            fillRule="evenodd"
            className={tapestry ? cn(WEAVE_FILL[i % 3], "stroke-background") : "fill-card stroke-border"}
            fillOpacity={tapestry ? WEAVE_OPACITY[i % WEAVE_OPACITY.length] : undefined}
            strokeWidth={tapestry ? 2 : 1}
            strokeDasharray={tapestry ? undefined : "4 3"}
          />
        ))}
      </g>

      {drawing.zones.map((z) => (
        <path key={z.level} d={z.d} fillRule="evenodd" className={LEVEL_FILL[z.level]} fillOpacity={0.55} strokeOpacity={0.9} strokeWidth={1} />
      ))}

      <path
        d={drawing.boundary}
        data-map-boundary=""
        fill="none"
        className={tapestry ? "stroke-primary" : "stroke-foreground/70"}
        strokeWidth={tapestry ? 2.5 : 1.5}
        strokeLinejoin="round"
      />

      {facilities !== "none" &&
        drawing.points.map((p) => {
          const strong = facilities === "split" && p.inZone;
          return (
            <circle
              key={p.key}
              data-map-point=""
              cx={p.x}
              cy={p.y}
              r={strong ? 6 : tapestry ? 3 : 4.5}
              className={cn(
                tapestry ? "fill-foreground" : strong ? "fill-brand" : "fill-primary",
                tapestry ? "stroke-none" : "stroke-card",
              )}
              strokeWidth={1.5}
            />
          );
        })}
    </svg>
  );
}
