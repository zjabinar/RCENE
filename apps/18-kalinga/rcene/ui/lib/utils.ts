import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge only knows Tailwind's default theme. Teach it the RCENE tokens
 * from globals.css, or it reads `text-display-1` as a colour and drops it next to
 * `text-foreground` (and `shadow-raised` next to `shadow-sm`, and so on).
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["display-1", "display-2", "display-3", "board-1", "board-2", "board-3"],
      shadow: ["raised", "overlay", "glow"],
      ease: ["weave"],
      font: ["display", "showcase"],
    },
  },
});

/** Merges class names, letting later Tailwind utilities override earlier ones. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
