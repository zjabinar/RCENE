import { createElement, useId, type ComponentProps, type ReactElement } from "react";
import { cn } from "@rcene/ui/lib/utils";
import { markParts, MARK_VIEW, TOKEN_COLORS, type BrandColors, type BrandShape, type MarkDetail } from "./geometry.ts";

/** Geometry shapes as React elements, colour slots filled with theme tokens. */
export function renderShapes(shapes: readonly BrandShape[], colors: BrandColors = TOKEN_COLORS): ReactElement[] {
  return shapes.map((shape, i) =>
    createElement(shape.tag, {
      key: i,
      ...shape.attrs,
      ...(shape.fill ? { fill: colors[shape.fill] } : {}),
      ...(shape.stroke ? { stroke: colors[shape.stroke] } : {}),
    }),
  );
}

/** A unique id for url(#…) references: useId() output with only safe characters. */
export function useSvgId(prefix: string): string {
  const id = useId();
  return `${prefix}-${id.replace(/[^A-Za-z0-9_-]/g, "")}`;
}

export interface MarkGraphicProps extends Omit<ComponentProps<"svg">, "children"> {
  detail: MarkDetail;
  /** With the square tile (app icon) or the pin alone in a tight box (wordmark). */
  tile: boolean;
}

/** The woven pin as inline SVG in token colours. Callers set the accessibility attributes. */
export function MarkGraphic({ detail, tile, className, ...props }: MarkGraphicProps) {
  const clipId = useSvgId("rcene-pin");
  const parts = markParts(detail);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={tile ? `0 0 ${MARK_VIEW} ${MARK_VIEW}` : parts.pinBox.join(" ")}
      className={cn("block shrink-0 overflow-visible", className)}
      {...props}
    >
      <defs>
        <clipPath id={clipId}>
          <path d={parts.clip} clipRule="evenodd" />
        </clipPath>
      </defs>
      {tile && (
        <rect
          x={0.75}
          y={0.75}
          width={MARK_VIEW - 1.5}
          height={MARK_VIEW - 1.5}
          rx={parts.tileRadius}
          fill={TOKEN_COLORS.tile}
          stroke={TOKEN_COLORS.edge}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      )}
      <g transform={parts.pinTransform}>
        <g clipPath={`url(#${clipId})`}>{renderShapes(parts.weave)}</g>
        {renderShapes(parts.hem)}
      </g>
      {tile && renderShapes(parts.waves)}
    </svg>
  );
}
