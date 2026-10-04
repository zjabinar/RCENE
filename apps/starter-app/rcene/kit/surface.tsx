import type { ComponentProps } from "react";
import { cn } from "../ui/lib/utils.ts";
import type { Mode, Palette } from "../ui/theme/palettes.ts";
import { useTheme } from "../ui/theme/sync.ts";

export interface SurfaceProps extends ComponentProps<"div"> {
  /** "showcase": the bold dark gabi look (neon, glow) for this region only. */
  variant?: "showcase";
  /** Or paint this region in another palette and/or mode (the other follows the app), e.g. a light poster inside a dark page. */
  palette?: Palette;
  mode?: Mode;
}

/**
 * A region in its own theme, without changing the user's choice: every token
 * (bg-background, text-foreground, primary, charts…) inside it follows the
 * region's palette. One showcase surface per page is plenty.
 */
export function Surface({ variant, palette, mode, className, ...props }: SurfaceProps) {
  const { effective } = useTheme();
  // The theme CSS needs both attributes on one element: fill the missing one from the current theme.
  const scoped = !variant && Boolean(palette || mode);
  return (
    <div
      data-slot="surface"
      data-surface={variant}
      data-palette={scoped ? (palette ?? effective.palette) : undefined}
      data-mode={scoped ? (mode ?? effective.mode) : undefined}
      className={cn("bg-background text-foreground", variant === "showcase" && "font-showcase", className)}
      {...props}
    />
  );
}
