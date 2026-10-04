import { useId } from "react";
import { cn } from "@rcene/ui/lib/utils";

export type WeaveDividerVariant = "band" | "wave" | "diamond";

export interface WeaveDividerProps {
  /** band = herringbone woven strip (full width); wave = two interlaced strands; diamond = banig diamonds. Default "band". */
  variant?: WeaveDividerVariant;
  className?: string;
}

/** Tile size (user units) and drawing of each motif. Colours are the palette's --weave-1..3. */
const TILE: Record<WeaveDividerVariant, { w: number; h: number }> = {
  band: { w: 24, h: 20 },
  wave: { w: 40, h: 20 },
  diamond: { w: 32, h: 24 },
};

function Motif({ variant }: { variant: WeaveDividerVariant }) {
  if (variant === "band") {
    return (
      <>
        {/* Herringbone: the top row slants one way, the bottom row the other, around a weft thread. */}
        <polygon points="0,8 6,0 12,0 6,8" className="fill-weave-1" />
        <polygon points="12,8 18,0 24,0 18,8" className="fill-weave-2" />
        <rect x="0" y="9" width="24" height="2" className="fill-weave-3" />
        <polygon points="0,12 6,12 12,20 6,20" className="fill-weave-2" />
        <polygon points="12,12 18,12 24,20 18,20" className="fill-weave-1" />
      </>
    );
  }
  if (variant === "wave") {
    return (
      <>
        <path d="M0 10 Q10 1 20 10 T40 10" fill="none" strokeWidth="2" strokeLinecap="round" className="stroke-weave-1" />
        <path d="M0 10 Q10 19 20 10 T40 10" fill="none" strokeWidth="2" strokeLinecap="round" className="stroke-weave-2" />
        <circle cx="20" cy="10" r="2.25" className="fill-weave-3" />
        <circle cx="0" cy="10" r="2.25" className="fill-weave-3" />
        <circle cx="40" cy="10" r="2.25" className="fill-weave-3" />
      </>
    );
  }
  return (
    <>
      <rect x="0" y="11.5" width="32" height="1" className="fill-weave-3" opacity="0.6" />
      <polygon points="16,3 25,12 16,21 7,12" fill="none" strokeWidth="1.5" strokeLinejoin="round" className="stroke-weave-1" />
      <polygon points="16,8 20,12 16,16 12,12" className="fill-weave-2" />
      <circle cx="0" cy="12" r="1.75" className="fill-weave-3" />
      <circle cx="32" cy="12" r="1.75" className="fill-weave-3" />
    </>
  );
}

/**
 * A decorative section divider inspired by banig weaving, drawn as a
 * repeating SVG pattern in the palette's weave colours. Hidden from
 * assistive technology; never carries meaning.
 */
export function WeaveDivider({ variant = "band", className }: WeaveDividerProps) {
  const patternId = `weave-${variant}-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const { w, h } = TILE[variant];
  return (
    <div
      aria-hidden="true"
      data-slot="weave-divider"
      data-variant={variant}
      className={cn(
        "pointer-events-none flex w-full items-center justify-center py-2 forced-colors:hidden",
        variant !== "band" && "mask-x-from-70%",
        className,
      )}
    >
      <svg
        aria-hidden="true"
        focusable="false"
        width="100%"
        height={h}
        className={cn("block", variant === "band" ? "opacity-90" : "max-w-3xl")}
      >
        <defs>
          <pattern id={patternId} width={w} height={h} patternUnits="userSpaceOnUse">
            <Motif variant={variant} />
          </pattern>
        </defs>
        <rect width="100%" height={h} fill={`url(#${patternId})`} />
      </svg>
    </div>
  );
}
