import type { MouseEvent } from "react";

import { cn } from "../lib/utils.ts";

/**
 * Moves focus to the target without changing the URL hash (which the router
 * would see as a navigation), then scrolls to the top so a sticky header never
 * hides the start of the content.
 */
function skipTo(targetId: string) {
  return (event: MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById(targetId);
    if (!target) return;
    event.preventDefault();
    target.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  };
}

export interface SkipLinkProps {
  /** Already translated, e.g. t("app.skipToContent"). */
  label: string;
  /** id of the element to focus (it needs tabIndex={-1}). Default "main". */
  targetId?: string;
  className?: string;
}

/** "Skip to content": hidden until focused by keyboard, then shown top-left. AppShell and SiteShell include one. */
export function SkipLink({ label, targetId = "main", className }: SkipLinkProps) {
  return (
    <a
      href={`#${targetId}`}
      onClick={skipTo(targetId)}
      className={cn(
        "sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg",
        className,
      )}
    >
      {label}
    </a>
  );
}
