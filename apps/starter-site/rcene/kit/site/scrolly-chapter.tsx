import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useT } from "@rcene/i18n";
import { cn } from "@rcene/ui/lib/utils";
import { useReducedMotion } from "@rcene/ui/motion";

import { useKitStrings } from "../i18n.ts";

export interface ScrollyStep {
  id: string;
  /** Already translated; also announced when the step becomes active. */
  title: string;
  body: ReactNode;
}

export interface ScrollyChapterProps {
  steps: ScrollyStep[];
  /** The sticky panel's content for the active step (0-based), e.g. a map that flies to a place. */
  visual: (activeStep: number) => ReactNode;
  /** Called when another step becomes active (scrolling, focus, the step dots). */
  onStepChange?: (index: number) => void;
  /** Heading level of each step title. Default 3 (under a Section's h2). */
  headingLevel?: 2 | 3 | 4;
  className?: string;
}

/**
 * Scrollytelling: a sticky visual panel beside the step cards (desktop) or
 * behind them (phone). The step crossing the middle of the screen is active
 * (IntersectionObserver, no pinning), and the change is announced politely.
 * Steps are focusable: Tab or the up/down arrow keys move between them, and
 * the dots on the panel jump to a step. Nothing depends on animation.
 *
 * The panel sticks below `--kit-sticky-top` (SiteShell sets it to its header
 * height). On a Lenis page, give a map in `visual` `data-lenis-prevent`.
 */
export function ScrollyChapter({ steps, visual, onStepChange, headingLevel = 3, className }: ScrollyChapterProps) {
  const t = useT(useKitStrings());
  const reduced = useReducedMotion();
  const uid = useId();
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const stepRefs = useRef<(HTMLElement | null)[]>([]);
  const onChangeRef = useRef(onStepChange);
  const Heading = `h${headingLevel}` as const;
  const total = steps.length;

  useEffect(() => {
    onChangeRef.current = onStepChange;
  });

  const activate = useCallback((index: number) => {
    if (index === activeRef.current) return;
    activeRef.current = index;
    setActive(index);
    onChangeRef.current?.(index);
  }, []);

  // The step crossing a thin band in the middle of the viewport is the active one.
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        let best: IntersectionObserverEntry | null = null;
        for (const entry of entries) {
          if (entry.isIntersecting && (!best || entry.intersectionRatio > best.intersectionRatio)) best = entry;
        }
        if (!best) return;
        const index = Number((best.target as HTMLElement).dataset.stepIndex);
        if (Number.isInteger(index)) activate(index);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.01] },
    );
    for (const el of stepRefs.current.slice(0, total)) if (el) io.observe(el);
    return () => io.disconnect();
  }, [activate, total]);

  const goTo = (index: number) => {
    const el = stepRefs.current[Math.min(Math.max(index, 0), total - 1)];
    if (!el) return;
    el.focus({ preventScroll: true });
    el.scrollIntoView?.({ block: "center", behavior: reduced ? "auto" : "smooth" });
  };

  const onKeyDown = (index: number) => (event: KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) return;
    const next =
      event.key === "ArrowDown" ? index + 1
      : event.key === "ArrowUp" ? index - 1
      : event.key === "Home" ? 0
      : event.key === "End" ? total - 1
      : null;
    if (next === null || next < 0 || next >= total) return;
    event.preventDefault();
    goTo(next);
  };

  const current = steps[active];

  return (
    <div
      data-slot="scrolly-chapter"
      className={cn("relative lg:grid lg:grid-cols-12 lg:gap-10 xl:gap-14", className)}
    >
      {/* Sticky visual: behind the cards on phones, the right-hand column on desktop. */}
      <div
        data-slot="scrolly-visual"
        className="sticky top-(--kit-sticky-top,0px) z-0 h-[calc(100svh-var(--kit-sticky-top,0px))] py-3 lg:col-span-7 lg:col-start-6 lg:row-start-1 lg:py-6"
      >
        <div className="relative size-full overflow-hidden rounded-2xl border bg-muted shadow-raised">
          {visual(active)}
          {total > 1 && (
            <nav
              aria-label={t("kit.scrolly.steps")}
              className="absolute top-3 left-3 z-10 flex items-center gap-3 rounded-full border bg-background/90 px-3 py-1.5 shadow-raised backdrop-blur lg:top-auto lg:bottom-3"
            >
              <span className="text-xs font-semibold text-foreground tabular-nums" aria-hidden="true">
                {active + 1}/{total}
              </span>
              <ol className="flex items-center gap-1">
                {steps.map((step, i) => (
                  <li key={step.id}>
                    <button
                      type="button"
                      aria-label={t("kit.scrolly.goTo", { n: i + 1, title: step.title })}
                      aria-current={i === active ? "step" : undefined}
                      onClick={() => goTo(i)}
                      className="group/dot flex size-6 items-center justify-center rounded-full"
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "block h-2 rounded-full transition-all duration-300 ease-weave",
                          i === active ? "w-5 bg-primary" : "w-2 bg-muted-foreground/50 group-hover/dot:bg-muted-foreground",
                        )}
                      />
                    </button>
                  </li>
                ))}
              </ol>
            </nav>
          )}
        </div>
      </div>

      <p id={`${uid}-hint`} className="sr-only">
        {t("kit.scrolly.hint")}
      </p>
      <p aria-live="polite" aria-atomic="true" className="sr-only" data-slot="scrolly-status">
        {current ? t("kit.scrolly.status", { n: active + 1, total, title: current.title }) : ""}
      </p>

      <ol
        role="list"
        aria-describedby={`${uid}-hint`}
        className="relative z-10 -mt-[calc(100svh-var(--kit-sticky-top,0px))] pt-[45svh] pb-[35svh] lg:col-span-5 lg:col-start-1 lg:row-start-1 lg:mt-0 lg:pt-[25svh] lg:pb-[40svh]"
      >
        {steps.map((step, i) => {
          const isActive = i === active;
          const titleId = `${uid}-step-${i}`;
          return (
            <li key={step.id} className="flex min-h-[80svh] items-center px-2 sm:px-6 lg:min-h-[70svh] lg:px-0">
              <article
                ref={(el) => {
                  stepRefs.current[i] = el;
                }}
                tabIndex={0}
                data-step-index={i}
                data-active={isActive}
                aria-labelledby={titleId}
                aria-current={isActive ? "step" : undefined}
                onFocus={() => activate(i)}
                onKeyDown={onKeyDown(i)}
                className={cn(
                  "relative w-full rounded-xl border bg-card/95 p-5 text-card-foreground shadow-overlay backdrop-blur outline-none sm:p-7 lg:bg-card lg:shadow-raised lg:backdrop-blur-none",
                  "transition-[border-color,box-shadow] duration-300 ease-weave focus-visible:ring-4 focus-visible:ring-ring/60",
                  "before:absolute before:inset-y-5 before:left-0 before:w-1 before:rounded-r-full before:bg-primary before:opacity-0 before:transition-opacity before:duration-300 data-[active=true]:before:opacity-100",
                  isActive && "border-primary/50 lg:shadow-overlay",
                )}
              >
                <p className={cn("text-xs font-semibold tracking-[0.14em] uppercase", isActive ? "text-primary" : "text-muted-foreground")}>
                  {t("kit.scrolly.progress", { n: i + 1, total })}
                </p>
                <Heading id={titleId} className="mt-2 font-display text-xl leading-snug font-semibold tracking-tight sm:text-2xl">
                  {step.title}
                </Heading>
                <div className="mt-3 text-base leading-relaxed text-pretty text-muted-foreground [&_p+p]:mt-3">{step.body}</div>
              </article>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
