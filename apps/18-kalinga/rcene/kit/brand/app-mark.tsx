import { cn } from "@rcene/ui/lib/utils";
import type { MarkDetail } from "./geometry.ts";
import { MarkGraphic } from "./shapes.tsx";

export interface AppMarkProps {
  /** Width and height in px (default 40). Below 28 px the mark draws a bolder 3 x 3 weave. */
  size?: number;
  /** Accessible name (already translated). Without it the mark is decorative (aria-hidden). */
  label?: string;
  /** Override the level of detail: "full" (4 x 4 weave and the sea line) or "small". */
  detail?: MarkDetail;
  className?: string;
}

/**
 * The RCENE app icon: a map pin woven like a Basey banig (over-under strips on
 * the diagonal) on a square tile, in the palette's weave colours. Pass it to
 * AppShell `brand`. In dark mode and showcase surfaces it glows softly.
 */
export function AppMark({ size = 40, label, detail, className }: AppMarkProps) {
  return (
    <MarkGraphic
      data-slot="app-mark"
      detail={detail ?? (size < 28 ? "small" : "full")}
      tile
      width={size}
      height={size}
      role={label ? "img" : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
      focusable="false"
      className={cn("dark:drop-shadow-[0_0_10px_var(--glow)]", className)}
    />
  );
}
