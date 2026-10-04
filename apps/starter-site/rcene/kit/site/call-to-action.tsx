import { useId, type ReactNode } from "react";
import { cn } from "@rcene/ui/lib/utils";

import { Surface } from "../surface.tsx";
import { SITE_CONTAINER } from "./site-link.tsx";

export interface CallToActionProps {
  title: ReactNode;
  body?: ReactNode;
  /** One or two buttons. On the brand tone, `variant="secondary"` reads best for the main one. */
  actions: ReactNode;
  /** brand = a solid brand-colour panel with a woven edge; showcase = the dark neon look. Default "brand". */
  tone?: "brand" | "showcase";
  className?: string;
}

/** Nested banig diamonds in currentColor, for the panel's corner. Decorative. */
function Diamonds({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 200 200" fill="none" className={className}>
      {[96, 76, 56, 36, 16].map((r) => (
        <path key={r} d={`M100 ${100 - r} L${100 + r} 100 L100 ${100 + r} L${100 - r} 100 Z`} stroke="currentColor" strokeWidth="2" />
      ))}
      <path d="M100 92 L108 100 L100 108 L92 100 Z" fill="currentColor" />
    </svg>
  );
}

/**
 * A prominent closing band: a title, a line of copy and the next step.
 * Self-contained (its own section padding and container), so place it
 * directly in the page, not inside a Section.
 */
export function CallToAction({ title, body, actions, tone = "brand", className }: CallToActionProps) {
  const titleId = useId();
  const showcase = tone === "showcase";

  const content = (
    <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
      <div className="max-w-2xl">
        <h2
          id={titleId}
          className={cn(
            "text-display-3 font-semibold tracking-tight text-balance",
            showcase ? "font-showcase italic glow-text" : "font-display",
          )}
        >
          {title}
        </h2>
        {body && (
          <div
            className={cn(
              "mt-3 text-base leading-relaxed text-pretty sm:text-lg",
              showcase ? "text-muted-foreground" : "text-brand-foreground/90",
            )}
          >
            {body}
          </div>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>
    </div>
  );

  return (
    <section aria-labelledby={titleId} data-slot="site-cta" data-tone={tone} className={cn("py-12 sm:py-16", className)}>
      <div className={SITE_CONTAINER}>
        {showcase ? (
          <Surface
            variant="showcase"
            className="relative isolate overflow-hidden rounded-3xl border border-primary/30 px-6 py-12 shadow-glow sm:px-12 sm:py-16 lg:px-16"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,color-mix(in_oklab,var(--primary)_12%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--primary)_12%,transparent)_1px,transparent_1px)] bg-size-[40px_40px] mask-radial-from-0% mask-radial-to-70% mask-radial-at-right"
            />
            <div aria-hidden="true" className="pointer-events-none absolute -top-32 -right-24 -z-10 size-96 rounded-full bg-brand/25 blur-3xl" />
            <div aria-hidden="true" className="weave-band absolute inset-x-0 bottom-0 opacity-80" />
            {content}
          </Surface>
        ) : (
          <div className="relative isolate overflow-hidden rounded-3xl bg-brand px-6 py-12 text-brand-foreground shadow-overlay sm:px-12 sm:py-16 lg:px-16">
            <div aria-hidden="true" className="weave-band absolute inset-x-0 top-0" />
            <Diamonds className="pointer-events-none absolute -right-28 -bottom-36 -z-10 size-80 text-brand-foreground/10 sm:size-96 lg:-right-36 lg:-bottom-48" />
            {content}
          </div>
        )}
      </div>
    </section>
  );
}
