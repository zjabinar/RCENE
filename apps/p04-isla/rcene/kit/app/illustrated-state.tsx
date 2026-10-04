import type { ReactNode } from "react";
import { cn } from "@rcene/ui/lib/utils";

import { SpotIllustration, type SpotName } from "../brand/spot-illustration.tsx";

/** The spot drawings of @rcene/kit/brand (empty, search, offline, error, done, map, community, heritage). */
export type IllustrationSpot = SpotName;

export interface IllustratedStateProps {
  /** The little picture above the title (default "empty"). Decorative. */
  spot?: SpotName;
  title: string;
  description?: ReactNode;
  /** Buttons or links under the text. */
  actions?: ReactNode;
  /** "sm" for inside a card or a table, "md" (default) for a whole page section. */
  size?: "sm" | "md";
  className?: string;
}

/** Drawing width in px per size (the drawing is 4:3). */
const SPOT_WIDTH = { sm: 104, md: 148 } as const;

/**
 * An empty, no-results, offline, error, done or map-prompt state with a small
 * woven spot illustration (SpotIllustration from @rcene/kit/brand) drawn in the
 * palette's colours. Calm and centred.
 */
export function IllustratedState({
  spot = "empty",
  title,
  description,
  actions,
  size = "md",
  className,
}: IllustratedStateProps) {
  return (
    <div
      role={spot === "error" ? "alert" : "status"}
      data-slot="illustrated-state"
      data-spot={spot}
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-center",
        size === "md" ? "px-6 py-12" : "px-4 py-8",
        className,
      )}
    >
      <SpotIllustration
        name={spot}
        size={SPOT_WIDTH[size]}
        className="motion-safe:animate-in motion-safe:duration-500 motion-safe:fade-in-0 motion-safe:zoom-in-95"
      />
      <div className="flex max-w-sm flex-col gap-1.5">
        <p className={cn("font-display font-semibold text-balance", size === "md" ? "text-xl" : "text-lg")}>{title}</p>
        {description && <div className="text-sm text-pretty text-muted-foreground">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center justify-center gap-2 pt-1">{actions}</div>}
    </div>
  );
}
