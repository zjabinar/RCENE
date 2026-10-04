import type { ReactNode } from "react";
import { ArrowRightIcon } from "lucide-react";
import { cn } from "@rcene/ui/lib/utils";

import { SiteLink } from "./site-link.tsx";

export interface FeatureItem {
  /** A lucide icon or small illustration; decorative (the title says what it is). */
  icon?: ReactNode;
  title: ReactNode;
  description: ReactNode;
  /** Makes the whole card a link: "/route" (router), "#section" or a URL. */
  href?: string;
}

export interface FeatureGridProps {
  items: FeatureItem[];
  /** Columns at full width (1 on phones, 2 on tablets). Default 3. */
  columns?: 2 | 3 | 4;
  /** Heading level of each card title. Default 3 (under a Section's h2). */
  headingLevel?: 2 | 3 | 4;
  className?: string;
}

const COLUMNS = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
} as const;

/**
 * Feature cards in a responsive grid: an icon tile, a title and a short
 * description. With `href` the whole card is one link (the title is the link
 * text) and lifts on hover; the lift is off under reduced motion.
 */
export function FeatureGrid({ items, columns = 3, headingLevel = 3, className }: FeatureGridProps) {
  const Heading = `h${headingLevel}` as const;
  return (
    <ul role="list" data-slot="feature-grid" className={cn("grid grid-cols-1 gap-4 sm:gap-6", COLUMNS[columns], className)}>
      {items.map((item, i) => {
        const linked = Boolean(item.href);
        return (
          <li
            key={i}
            data-slot="feature-card"
            className={cn(
              "group relative flex flex-col gap-4 rounded-xl border bg-card p-6 text-card-foreground shadow-raised",
              "transition-[translate,box-shadow,border-color] duration-300 ease-weave",
              linked &&
                "hover:-translate-y-1 hover:border-primary/40 hover:shadow-overlay has-[a:focus-visible]:-translate-y-1 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring motion-reduce:hover:translate-y-0 motion-reduce:has-[a:focus-visible]:translate-y-0",
            )}
          >
            {item.icon && (
              <span
                aria-hidden="true"
                className="relative inline-flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-highlight text-highlight-foreground ring-1 ring-primary/15 [&_svg:not([class*='size-'])]:size-6"
              >
                <span className="weave-bg absolute inset-0 opacity-60" />
                <span className="relative">{item.icon}</span>
              </span>
            )}
            <div className="flex flex-1 flex-col gap-2">
              <Heading className="font-display text-xl leading-snug font-semibold tracking-tight">
                {item.href ? (
                  <SiteLink
                    to={item.href}
                    className="rounded-sm outline-none after:absolute after:inset-0 after:rounded-xl after:content-[''] focus-visible:outline-none"
                  >
                    {item.title}
                  </SiteLink>
                ) : (
                  item.title
                )}
              </Heading>
              <p className="text-sm leading-relaxed text-pretty text-muted-foreground sm:text-base">{item.description}</p>
            </div>
            {linked && (
              <ArrowRightIcon
                aria-hidden="true"
                className="size-5 text-primary transition-transform duration-300 ease-weave group-hover:translate-x-1 motion-reduce:group-hover:translate-x-0"
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
