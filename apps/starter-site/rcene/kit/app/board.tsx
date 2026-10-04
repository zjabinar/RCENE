import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ChevronLeftIcon, ChevronRightIcon, PauseIcon, PlayIcon } from "lucide-react";
import { useFormat, useT } from "@rcene/i18n";
import { Button } from "@rcene/ui/components/button";
import { cn } from "@rcene/ui/lib/utils";
import { gsap, useReducedMotion } from "@rcene/ui/motion";

import { useKitStrings } from "../i18n.ts";

/** The current time, refreshed on each minute boundary (not every second: a board must not twitch). */
function useMinuteClock(enabled: boolean): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!enabled) return;
    let interval: ReturnType<typeof setInterval> | undefined;
    const tick = () => setNow(new Date());
    tick();
    const timeout = setTimeout(
      () => {
        tick();
        interval = setInterval(tick, 60_000);
      },
      60_000 - (Date.now() % 60_000),
    );
    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [enabled]);
  return now;
}

export interface BoardShellProps {
  /** The board's name, readable from across the room. */
  title: string;
  /** A line under the title, e.g. the place or the service. */
  subtitle?: ReactNode;
  /** Live status ("Now serving A-012", "Updated 2 min ago"). The only part announced to screen readers when it changes. */
  status?: ReactNode;
  /** Show a live clock (default true). */
  clock?: boolean;
  children: ReactNode;
  /** Small print at the bottom: source, disclaimer, a QR to the phone view. */
  footer?: ReactNode;
  className?: string;
}

/**
 * A public display or kiosk screen: huge type, high contrast, a live clock and
 * a polite live status line. Put it in `<AppShell width="full" palette="malinaw">`
 * (high contrast) and let it fill the screen.
 */
export function BoardShell({ title, subtitle, status, clock = true, children, footer, className }: BoardShellProps) {
  const t = useT(useKitStrings());
  const fmt = useFormat();
  const now = useMinuteClock(clock);
  const titleId = useId();

  return (
    <section
      data-slot="board-shell"
      aria-labelledby={titleId}
      className={cn("flex min-h-0 flex-1 flex-col gap-6 bg-background p-4 text-foreground sm:p-8 lg:gap-8 lg:p-12", className)}
    >
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-3">
          <div className="min-w-0 flex-1">
            <h1 id={titleId} className="font-display text-board-1 font-bold tracking-tight text-balance">
              {title}
            </h1>
            {subtitle && <p className="mt-2 text-board-3 font-medium text-muted-foreground">{subtitle}</p>}
          </div>
          {clock && (
            <p className="flex flex-col items-end text-right">
              <span className="text-sm font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                {t("kit.board.timeNow")}
              </span>
              <time dateTime={now.toISOString()} className="text-board-2 font-bold tabular-nums">
                {fmt.time(now)}
              </time>
            </p>
          )}
        </div>
        <div aria-hidden="true" className="weave-band rounded-full" />
        <div
          data-slot="board-status"
          aria-live="polite"
          aria-atomic="true"
          className="flex flex-wrap items-center gap-3 text-board-3 font-semibold"
        >
          {status}
        </div>
      </header>

      <div data-slot="board-content" className="flex min-h-0 flex-1 flex-col text-xl leading-snug lg:text-2xl">
        {children}
      </div>

      {footer && (
        <footer className="flex flex-wrap items-center justify-between gap-4 border-t-2 border-border pt-4 text-lg text-muted-foreground">
          {footer}
        </footer>
      )}
    </section>
  );
}

export interface BoardRotatorProps {
  /** One element per page. */
  items: ReactNode[];
  /** Time on each page (default 10 s). */
  intervalMs?: number;
  /** Hold the current page (e.g. while an alert shows). */
  paused?: boolean;
  /** Accessible name of the pages region (default "Board pages"). */
  label?: string;
  className?: string;
}

/**
 * Pages through `items` on a timer with a visible "Page n of N", a progress
 * line and Previous / Pause-Play / Next buttons. It holds still while the
 * pointer is over it or focus is inside it, and starts paused when the viewer
 * asked for reduced motion (Play still works).
 */
export function BoardRotator({ items, intervalMs = 10_000, paused = false, label, className }: BoardRotatorProps) {
  const t = useT(useKitStrings());
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [userPaused, setUserPaused] = useState(reduced);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const bar = useRef<HTMLDivElement>(null);
  const total = items.length;
  const current = total === 0 ? 0 : Math.min(index, total - 1);
  const holding = paused || userPaused || hovered || focused || total < 2;

  useEffect(() => {
    if (holding) return;
    const timer = setTimeout(() => setIndex((i) => (i + 1) % total), intervalMs);
    return () => clearTimeout(timer);
  }, [holding, current, total, intervalMs]);

  // The progress line runs once per page; it stays empty while paused and under reduced motion.
  useEffect(() => {
    const el = bar.current;
    if (!el) return;
    if (holding || reduced) {
      gsap.set(el, { scaleX: 0 });
      return;
    }
    const tween = gsap.fromTo(el, { scaleX: 0 }, { scaleX: 1, duration: intervalMs / 1000, ease: "none" });
    return () => {
      tween.kill();
    };
  }, [holding, reduced, current, intervalMs]);

  if (total === 0) return null;
  const go = (step: number) => setIndex((current + step + total) % total);

  return (
    <section
      data-slot="board-rotator"
      aria-label={label ?? t("kit.board.pages")}
      className={cn("flex min-h-0 flex-1 flex-col gap-4", className)}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}
    >
      <div
        role="group"
        aria-label={t("kit.board.page", { n: current + 1, total })}
        aria-live={holding ? "polite" : "off"}
        data-slot="board-page"
        className="flex min-h-0 flex-1 flex-col"
      >
        <div key={current} className="flex min-h-0 flex-1 flex-col motion-safe:animate-in motion-safe:duration-500 motion-safe:fade-in-0">
          {items[current]}
        </div>
      </div>

      {total > 1 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p data-slot="board-page-count" className="text-lg font-semibold tabular-nums">
            {t("kit.board.page", { n: current + 1, total })}
          </p>
          <div aria-hidden="true" className="flex min-w-24 flex-1 items-center gap-1.5">
            {items.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted",
                  i < current && "bg-primary/40",
                )}
              >
                {i === current && <span ref={bar} className="absolute inset-0 origin-left scale-x-0 bg-primary" />}
              </span>
            ))}
          </div>
          {userPaused && (
            <span className="text-sm font-medium text-muted-foreground">{t("kit.board.paused")}</span>
          )}
          <div className="flex items-center gap-1.5">
            <Button type="button" variant="outline" size="icon" onClick={() => go(-1)}>
              <ChevronLeftIcon aria-hidden="true" />
              <span className="sr-only">{t("kit.board.previous")}</span>
            </Button>
            <Button type="button" variant="outline" size="sm" className="h-9 min-w-24" onClick={() => setUserPaused((p) => !p)}>
              {userPaused ? <PlayIcon aria-hidden="true" /> : <PauseIcon aria-hidden="true" />}
              {userPaused ? t("kit.board.play") : t("kit.board.pause")}
            </Button>
            <Button type="button" variant="outline" size="icon" onClick={() => go(1)}>
              <ChevronRightIcon aria-hidden="true" />
              <span className="sr-only">{t("kit.board.next")}</span>
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
