import { useMemo } from "react";
import { cn } from "@rcene/ui/lib/utils";
import { patternTile, patternTransform, type WeaveName } from "./geometry.ts";
import { renderShapes, useSvgId } from "./shapes.tsx";

export interface WeavePatternProps {
  /** banig (plain over-under), diamond (Basey motif), stripes (mat border bands), tikog (twill). */
  name: WeaveName;
  /** Default: absolutely fills the nearest positioned parent (give it `relative`). */
  className?: string;
  /** 0-1, default 0.16: a quiet texture. Raise it for borders and poster bands. */
  opacity?: number;
  /** Size of the weave, default 1. */
  scale?: number;
}

/**
 * A full-bleed woven texture in the palette's weave colours, for hero and
 * section backgrounds. Decorative only: never put text straight on it (use a
 * solid card or bg-background panel over it). Hidden in forced-colors mode.
 */
export function WeavePattern({ name, className, opacity = 0.16, scale = 1 }: WeavePatternProps) {
  const id = useSvgId(`weave-${name}`);
  const tile = useMemo(() => patternTile(name), [name]);
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      data-slot="weave-pattern"
      data-weave={name}
      className={cn(
        "pointer-events-none absolute inset-0 size-full select-none forced-colors:hidden print:[print-color-adjust:exact]",
        className,
      )}
      style={{ opacity }}
    >
      <defs>
        <pattern
          id={id}
          width={tile.width}
          height={tile.height}
          patternUnits="userSpaceOnUse"
          patternTransform={patternTransform(tile, scale)}
        >
          {renderShapes(tile.shapes)}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}
