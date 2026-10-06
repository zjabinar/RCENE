import { useRef, type ReactNode } from "react";
import { cn } from "@rcene/ui/lib/utils";
import { ScrollTrigger, gsap, useGSAP, useReducedMotion } from "@rcene/ui/motion";

export interface StoryTimelineItem {
  id: string;
  /** Already formatted for the reader ("1998", "8 Nov 2013", "Phase 2"). */
  date: string;
  title: ReactNode;
  body?: ReactNode;
  /** A small icon in the marker (decorative); a dot when omitted. */
  icon?: ReactNode;
}

export interface StoryTimelineProps {
  items: StoryTimelineItem[];
  /** Names the list for screen readers when no heading does. */
  label?: string;
  /** Heading level of each item title. Default 3 (under a Section's h2). */
  headingLevel?: 2 | 3 | 4;
  className?: string;
}

/**
 * A vertical story timeline as an ordered list. The connecting line draws
 * itself as the reader scrolls (GSAP DrawSVG scrubbed by ScrollTrigger) and
 * each marker lights up when the line reaches it. Under reduced motion the
 * line is complete and every marker is lit. On wide screens the date moves
 * into its own column left of the line.
 */
export function StoryTimeline({ items, label, headingLevel = 3, className }: StoryTimelineProps) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const Heading = `h${headingLevel}` as const;

  useGSAP(
    () => {
      const scope = root.current;
      if (reduced || !scope) return;
      const q = gsap.utils.selector(scope);
      // DrawSVG measures the path; skip the line (it stays complete) where there is no SVG layout, e.g. jsdom.
      const line = q("[data-timeline-progress]").filter((el) => typeof (el as Element as SVGPathElement).getTotalLength === "function");
      if (line.length) {
        gsap.fromTo(
          line,
          { drawSVG: "0%" },
          {
            drawSVG: "100%",
            ease: "none",
            scrollTrigger: { trigger: scope, start: "top 70%", end: "bottom 70%", scrub: 0.6 },
          },
        );
      }
      for (const item of q("[data-timeline-item]")) {
        item.setAttribute("data-reached", "false");
        ScrollTrigger.create({
          trigger: item,
          start: "top 70%",
          onEnter: () => item.setAttribute("data-reached", "true"),
          onLeaveBack: () => item.setAttribute("data-reached", "false"),
        });
      }
      return () => {
        for (const item of q("[data-timeline-item]")) item.setAttribute("data-reached", "true");
      };
    },
    { scope: root, dependencies: [reduced, items.length], revertOnUpdate: true },
  );

  return (
    <div ref={root} data-slot="story-timeline" className={cn("relative", className)}>
      {/* The line runs through the marker centres: 1.25rem in on phones, after the date column on wide screens. */}
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 4 100"
        preserveAspectRatio="none"
        className="pointer-events-none absolute top-5 left-5 h-[calc(100%-1.25rem)] w-1 -translate-x-1/2 overflow-visible mask-b-from-80% lg:left-[12.75rem]"
      >
        <path d="M2 0 V100" fill="none" strokeWidth="2" className="stroke-border" />
        <path data-timeline-progress d="M2 0 V100" fill="none" strokeWidth="2" className="stroke-primary" />
      </svg>

      <ol role="list" aria-label={label} className="relative flex flex-col gap-10 sm:gap-12">
        {items.map((item) => (
          <li
            key={item.id}
            data-timeline-item
            data-reached="true"
            className="group/item grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4 sm:gap-x-6 lg:grid-cols-[10rem_2.5rem_minmax(0,1fr)]"
          >
            <p className="col-start-2 row-start-1 pt-2 text-sm font-semibold tracking-[0.12em] text-primary uppercase lg:col-start-1 lg:text-right">
              {item.date}
            </p>
            <span
              aria-hidden="true"
              className={cn(
                "relative z-10 col-start-1 row-span-3 row-start-1 flex size-10 items-center justify-center self-start rounded-full border-2 bg-background shadow-raised lg:col-start-2",
                "border-border text-muted-foreground transition-[border-color,color,box-shadow,scale] duration-500 ease-weave",
                "group-data-[reached=true]/item:border-primary group-data-[reached=true]/item:text-primary group-data-[reached=true]/item:shadow-glow",
                "[&_svg:not([class*='size-'])]:size-4",
              )}
            >
              {item.icon ?? (
                <span className="size-2.5 rounded-full bg-current transition-transform duration-500 group-data-[reached=false]/item:scale-50" />
              )}
            </span>
            <div className="col-start-2 row-start-2 lg:col-start-3 lg:row-start-1">
              <Heading className="mt-1 font-display text-xl leading-snug font-semibold tracking-tight text-foreground sm:text-2xl lg:mt-1.5">
                {item.title}
              </Heading>
              {item.body && (
                <div className="mt-2 max-w-2xl text-base leading-relaxed text-pretty text-muted-foreground [&_p+p]:mt-3">{item.body}</div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
