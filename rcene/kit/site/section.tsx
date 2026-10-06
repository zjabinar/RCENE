import { useId, type ReactNode } from "react";
import { cn } from "@rcene/ui/lib/utils";

import { Surface } from "../surface.tsx";
import { SITE_CONTAINER } from "./site-link.tsx";

export type SectionTone = "default" | "muted" | "weave" | "showcase";

export interface SectionProps {
  /** Anchor for in-page links ("#features"). The sticky header is accounted for (scroll-margin). */
  id?: string;
  /** Small overline above the title, e.g. "How it works". */
  eyebrow?: ReactNode;
  /** The section's h2 (display face). Also names the section for screen readers. */
  title?: ReactNode;
  /** One or two sentences under the title. */
  lead?: ReactNode;
  /** Header alignment. Default "start". */
  align?: "start" | "center";
  /** default = page background; muted = soft band; weave = faint woven texture; showcase = dark neon surface. */
  tone?: SectionTone;
  className?: string;
  /** Classes for the inner container (e.g. "max-w-4xl" for a reading column). */
  containerClassName?: string;
  children?: ReactNode;
}

const TONE: Record<Exclude<SectionTone, "showcase">, string> = {
  default: "bg-background",
  muted: "bg-muted/60",
  weave: "weave-bg bg-background",
};

/**
 * A page section with the site's vertical rhythm: optional eyebrow, h2 title
 * and lead, then content, in the shared max-width container.
 */
export function Section({
  id,
  eyebrow,
  title,
  lead,
  align = "start",
  tone = "default",
  className,
  containerClassName,
  children,
}: SectionProps) {
  const titleId = useId();
  const centered = align === "center";
  const hasHeader = Boolean(eyebrow || title || lead);

  const section = (
    <section
      id={id}
      data-slot="site-section"
      data-tone={tone}
      aria-labelledby={title ? titleId : undefined}
      className={cn(
        "relative scroll-mt-16 py-16 sm:py-20 lg:py-24",
        tone === "showcase" ? "bg-transparent" : TONE[tone],
        className,
      )}
    >
      <div className={cn(SITE_CONTAINER, containerClassName)}>
        {hasHeader && (
          <header className={cn("flex max-w-3xl flex-col gap-3", centered && "mx-auto items-center text-center")}>
            {eyebrow && (
              <p
                className={cn(
                  "inline-flex items-center gap-2 text-sm font-semibold tracking-[0.14em] text-primary uppercase",
                  tone === "showcase" && "glow-text",
                )}
              >
                <span aria-hidden="true" className="h-px w-6 bg-current" />
                {eyebrow}
              </p>
            )}
            {title && (
              <h2
                id={titleId}
                className={cn(
                  "text-display-3 font-semibold tracking-tight text-balance text-foreground",
                  tone === "showcase" ? "font-showcase italic" : "font-display",
                )}
              >
                {title}
              </h2>
            )}
            {lead && <p className="text-base text-pretty text-muted-foreground sm:text-lg">{lead}</p>}
          </header>
        )}
        {children !== undefined && children !== null && (
          <div className={cn(hasHeader && "mt-10 sm:mt-12")}>{children}</div>
        )}
      </div>
    </section>
  );

  if (tone !== "showcase") return section;
  return (
    <Surface variant="showcase" data-slot="site-section-surface" className="relative isolate overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_15%_0%,color-mix(in_oklab,var(--primary)_16%,transparent),transparent),radial-gradient(50%_45%_at_90%_100%,color-mix(in_oklab,var(--brand)_14%,transparent),transparent)]"
      />
      {section}
    </Surface>
  );
}
