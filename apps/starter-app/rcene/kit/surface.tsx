import type { ComponentProps } from "react";
import { cn } from "../ui/lib/utils.ts";
import type { Mode, Palette } from "../ui/theme/palettes.ts";

export interface SurfaceProps extends ComponentProps<"div"> {
  /** "showcase": the bold dark gabi look (neon, glow) for this region only. */
  variant?: "showcase";
  /** Or paint this region in another palette (and mode), e.g. a light poster inside a dark page. */
  palette?: Palette;
  mode?: Mode;
}

/**
 * A region in its own theme, without changing the user's choice: every token
 * (bg-background, text-foreground, primary, charts…) inside it follows the
 * region's palette. One showcase surface per page is plenty.
 */
export function Surface({ variant, palette, mode, className, ...props }: SurfaceProps) {
  return (
    <div
      data-slot="surface"
      data-surface={variant}
      data-palette={variant ? undefined : palette}
      data-mode={variant ? undefined : palette || mode ? (mode ?? "light") : undefined}
      className={cn("bg-background text-foreground", variant === "showcase" && "font-showcase", className)}
      {...props}
    />
  );
}
