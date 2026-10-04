import { useEffect, useEffectEvent, useId, useRef, useState, type RefObject } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, Timer, TimerReset, TriangleAlert, X } from "lucide-react";
import { useInRouterContext, useLocation, useNavigate } from "react-router";
import { useT } from "@rcene/i18n";
import { Button } from "@rcene/ui/components/button";
import { cn } from "@rcene/ui/lib/utils";
import { useReducedMotion } from "@rcene/ui/motion";

import { useKitStrings } from "../i18n.ts";
import { formatClock, NOTES_ORIGIN, presenterElapsed, usePresenterStore, WINDOW_ID } from "./presenter-store.ts";

export interface PresenterStep {
  id: string;
  /** What the audience should notice, shown large in the bar (already translated). */
  caption: string;
  /** Route to open when the step starts, e.g. "/console". */
  route?: string;
  /** Speaker notes, shown only in the PresenterNotes window. */
  notes?: string;
  /** Time budget for the step; the bar counts it down. */
  seconds?: number;
}

export type PresenterAction = "next" | "back" | "timer" | "hide" | "toggle";

/** Focus inside these means the key belongs to the app (typing, sliders, tabs, maps, dialogs). */
const KEYS_BELONG_TO_TARGET = [
  "input",
  "textarea",
  "select",
  "canvas",
  '[contenteditable]:not([contenteditable="false"])',
  '[role="textbox"]',
  '[role="searchbox"]',
  '[role="combobox"]',
  '[role="slider"]',
  '[role="spinbutton"]',
  '[role="listbox"]',
  '[role="menu"]',
  '[role="menubar"]',
  '[role="tablist"]',
  '[role="radiogroup"]',
  '[role="grid"]',
  '[role="tree"]',
  '[role="application"]',
  '[role="dialog"]',
  '[role="alertdialog"]',
  '[data-presenter-keys="off"]',
].join(", ");

/** Space activates these, so Space is theirs. */
const SPACE_ACTIVATES = 'button, a[href], summary, label, [role="button"], [role="link"], [role="checkbox"], [role="switch"], [role="tab"], [role="option"], [role="menuitem"]';

/** The presenter action for a key press, or null when the key belongs to the page. */
export function presenterKeyAction(event: KeyboardEvent): PresenterAction | null {
  if (event.defaultPrevented || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return null;
  const target = event.target instanceof Element ? event.target : null;
  if (target?.closest(KEYS_BELONG_TO_TARGET)) return null;
  if (target instanceof HTMLElement && target.isContentEditable) return null;
  switch (event.key) {
    case "ArrowRight":
    case "PageDown":
      return "next";
    case " ":
      return target?.closest(SPACE_ACTIVATES) ? null : "next";
    case "ArrowLeft":
    case "PageUp":
      return "back";
    case "t":
    case "T":
      return "timer";
    case "p":
    case "P":
      return "toggle";
    case "Escape":
      return "hide";
    default:
      return null;
  }
}

/** Listens for presenter keys on the window; `onAction` returns true when it used the key. */
function usePresenterKeys(onAction: (action: PresenterAction) => boolean) {
  const handle = useEffectEvent((event: KeyboardEvent) => {
    const action = presenterKeyAction(event);
    if (action && onAction(action)) event.preventDefault();
  });
  useEffect(() => {
    const listener = (event: KeyboardEvent) => handle(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
}

function clampIndex(index: number, length: number): number {
  return Math.min(Math.max(index, 0), Math.max(length - 1, 0));
}

/** Re-renders every half second while the timer runs. */
function useNow(running: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setNow(Date.now());
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [running]);
  return now;
}

/** Shared by the bar and the notes window: step, actions and a polite announcement of changes. */
function usePresenter(steps: PresenterStep[], origin: string) {
  const t = useT(useKitStrings());
  const rawIndex = usePresenterStore((s) => s.index);
  const nonce = usePresenterStore((s) => s.nonce);
  const go = usePresenterStore((s) => s.go);
  const index = clampIndex(rawIndex, steps.length);
  const total = steps.length;
  const step = steps[index];
  const [firstNonce] = useState(nonce);
  return {
    index,
    total,
    step,
    nonce,
    next: () => {
      if (index < total - 1) go(index + 1, origin);
    },
    back: () => {
      if (index > 0) go(index - 1, origin);
    },
    // Nothing is announced on load, only when the step changes.
    announcement:
      step && nonce !== firstNonce ? t("kit.presenter.announce", { n: index + 1, total, caption: step.caption }) : "",
  };
}

function TimerReadout({ steps, index, large = false }: { steps: PresenterStep[]; index: number; large?: boolean }) {
  const t = useT(useKitStrings());
  const running = usePresenterStore((s) => s.running);
  const startedAt = usePresenterStore((s) => s.startedAt);
  const banked = usePresenterStore((s) => s.banked);
  const stepMark = usePresenterStore((s) => s.stepMark);
  const now = useNow(running);
  const elapsed = presenterElapsed({ running, startedAt, banked }, now);
  const budget = steps.reduce((sum, s) => sum + (s.seconds ?? 0), 0) * 1000;
  const stepSeconds = steps[index]?.seconds;
  const left = stepSeconds ? stepSeconds * 1000 - (elapsed - stepMark) : null;
  return (
    <div
      role="timer"
      aria-label={t("kit.presenter.elapsed")}
      data-running={running ? "" : undefined}
      className="flex flex-col items-end gap-0.5 leading-tight tabular-nums"
    >
      <span className={cn("flex items-center gap-1.5 font-semibold", large ? "text-3xl" : "text-lg")}>
        <Timer aria-hidden="true" className={cn("text-muted-foreground", large ? "size-6" : "size-4")} />
        <span data-testid="presenter-elapsed">{formatClock(elapsed)}</span>
        {budget > 0 && (
          <span className={cn("font-normal text-muted-foreground", large ? "text-xl" : "text-sm")}>/ {formatClock(budget)}</span>
        )}
      </span>
      {left !== null &&
        (left >= 0 ? (
          <span className={cn("text-muted-foreground", large ? "text-base" : "text-xs")}>
            {t("kit.presenter.left", { time: formatClock(left) })}
          </span>
        ) : (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded bg-warning px-1.5 font-semibold text-warning-foreground",
              large ? "text-base" : "text-xs",
            )}
          >
            <TriangleAlert aria-hidden="true" className="size-3" />
            {t("kit.presenter.over", { time: formatClock(-left) })}
          </span>
        ))}
    </div>
  );
}

function StepProgress({ steps, index, className }: { steps: PresenterStep[]; index: number; className?: string }) {
  return (
    <div aria-hidden="true" className={cn("flex gap-1", className)}>
      {steps.map((s, i) => (
        <span
          key={s.id}
          className={cn("h-1 flex-1 rounded-full transition-colors duration-300", i <= index ? "bg-primary" : "bg-muted")}
        />
      ))}
    </div>
  );
}

/** Hands react-router's navigate to PresenterMode, only when it is rendered inside a router. */
function RouterBridge({ target }: { target: RefObject<((to: string) => void) | null> }) {
  const navigate = useNavigate();
  const location = useLocation();
  const here = location.pathname + location.search + location.hash;
  useEffect(() => {
    target.current = (to) => {
      if (to !== here) void navigate(to);
    };
    return () => {
      target.current = null;
    };
  }, [navigate, here, target]);
  return null;
}

export interface PresenterModeProps {
  /** The demo script, in order (DEMO.md as data). */
  steps: PresenterStep[];
  /** Whether the bar shows (controlled); uncontrolled it starts shown. Keys keep working: P brings it back. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Opens a step's route. Default: react-router's navigate when inside a router, else nothing. */
  onNavigate?: (route: string) => void;
  className?: string;
}

/**
 * The live-demo bar: "Step n of N", the step's caption in large type, a timer
 * and back / next, fixed at the bottom of the screen and never printed.
 * Keys: → Space PageDown next, ← PageUp back, T timer, Esc hide, P show/hide
 * (only P works while hidden, so the app gets its keys back). The step lives
 * in a synced store: a PresenterNotes window shows the same step with notes,
 * and can drive the demo too.
 */
export function PresenterMode({ steps, open, onOpenChange, onNavigate, className }: PresenterModeProps) {
  const t = useT(useKitStrings());
  const reduced = useReducedMotion();
  const { index, total, step, nonce, next, back, announcement } = usePresenter(steps, WINDOW_ID);
  const running = usePresenterStore((s) => s.running);
  const toggleTimer = usePresenterStore((s) => s.toggleTimer);

  const [innerOpen, setInnerOpen] = useState(true);
  const isOpen = open ?? innerOpen;
  const barRef = useRef<HTMLDivElement>(null);
  const setOpen = (next: boolean) => {
    if (!next && barRef.current?.contains(document.activeElement)) {
      document.getElementById("main")?.focus({ preventScroll: true });
    }
    if (open === undefined) setInnerOpen(next);
    onOpenChange?.(next);
  };

  // Open the new step's route: in the window that changed the step, or, for a
  // change made in the notes window, in the window that last drove the demo.
  const inRouter = useInRouterContext();
  const routerNavigate = useRef<((to: string) => void) | null>(null);
  const seenNonce = useRef(nonce);
  const follow = useEffectEvent(() => {
    const state = usePresenterStore.getState();
    const mine =
      state.origin === WINDOW_ID || (state.origin === NOTES_ORIGIN && (state.stage === null || state.stage === WINDOW_ID));
    const route = steps[clampIndex(state.index, steps.length)]?.route;
    if (mine && route) (onNavigate ?? routerNavigate.current)?.(route);
  });
  useEffect(() => {
    if (nonce === seenNonce.current) return;
    seenNonce.current = nonce;
    follow();
  }, [nonce]);

  usePresenterKeys((action) => {
    if (total === 0) return false;
    if (!isOpen) {
      if (action !== "toggle") return false;
      setOpen(true);
      return true;
    }
    if (action === "next") next();
    else if (action === "back") back();
    else if (action === "timer") toggleTimer();
    else setOpen(false);
    return true;
  });

  if (!step) return null;
  const atStart = index === 0;
  const atEnd = index >= total - 1;

  return (
    <>
      {inRouter && <RouterBridge target={routerNavigate} />}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
      {isOpen && (
        <section
          aria-label={t("kit.presenter.region")}
          data-slot="presenter-bar"
          className={cn(
            "pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-3 sm:px-6 sm:pb-5 print:hidden",
            className,
          )}
        >
          <div
            ref={barRef}
            className={cn(
              "pointer-events-auto w-full max-w-4xl overflow-hidden rounded-2xl border bg-card/95 text-card-foreground shadow-overlay backdrop-blur-md",
              !reduced && "animate-in duration-300 fade-in slide-in-from-bottom-4",
            )}
          >
            <div aria-hidden="true" className="weave-band h-1.5" />
            <div className="flex items-center gap-2 p-3 sm:gap-4 sm:px-5 sm:py-4">
              <Button
                type="button"
                variant="ghost"
                size="icon-lg"
                aria-label={t("kit.presenter.back")}
                aria-disabled={atStart || undefined}
                className="aria-disabled:opacity-40"
                onClick={back}
              >
                <ChevronLeft aria-hidden="true" className="size-6" />
              </Button>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  {t("kit.presenter.step", { n: index + 1, total })}
                </p>
                <p
                  key={step.id}
                  className={cn(
                    "font-display text-lg leading-tight font-semibold text-balance sm:text-2xl lg:text-3xl",
                    !reduced && "animate-in duration-300 fade-in slide-in-from-bottom-1",
                  )}
                >
                  {step.caption}
                </p>
                <StepProgress steps={steps} index={index} className="mt-2" />
              </div>
              <div className="hidden items-center gap-1 sm:flex">
                <TimerReadout steps={steps} index={index} />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={running ? t("kit.presenter.timerPause") : t("kit.presenter.timerStart")}
                  onClick={toggleTimer}
                >
                  {running ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
                </Button>
              </div>
              <Button
                type="button"
                size="icon-lg"
                aria-label={t("kit.presenter.next")}
                aria-disabled={atEnd || undefined}
                className="aria-disabled:opacity-40"
                onClick={next}
              >
                <ChevronRight aria-hidden="true" className="size-6" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t("kit.presenter.hide")}
                onClick={() => setOpen(false)}
              >
                <X aria-hidden="true" />
              </Button>
            </div>
            <p className="hidden border-t px-5 py-1.5 text-xs text-muted-foreground md:block">{t("kit.presenter.keys")}</p>
          </div>
        </section>
      )}
    </>
  );
}

export interface PresenterNotesProps {
  /** The same steps as the PresenterMode in the app window. */
  steps: PresenterStep[];
  className?: string;
}

/**
 * The presenter's own window (a `/presenter` route opened in a second window):
 * the step, its speaker notes, what comes next and the timer. Its buttons and
 * keys (→ ← Space PageUp PageDown T) drive the app window through the synced store.
 */
export function PresenterNotes({ steps, className }: PresenterNotesProps) {
  const t = useT(useKitStrings());
  const reduced = useReducedMotion();
  const { index, total, step, next, back, announcement } = usePresenter(steps, NOTES_ORIGIN);
  const running = usePresenterStore((s) => s.running);
  const toggleTimer = usePresenterStore((s) => s.toggleTimer);
  const resetTimer = usePresenterStore((s) => s.resetTimer);
  const currentId = useId();
  const nextId = useId();

  usePresenterKeys((action) => {
    if (total === 0) return false;
    if (action === "next") next();
    else if (action === "back") back();
    else if (action === "timer") toggleTimer();
    else return false;
    return true;
  });

  if (!step) return null;
  const upcoming = steps[index + 1];

  return (
    <div data-slot="presenter-notes" className={cn("mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-6 p-4 sm:p-8", className)}>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">{t("kit.presenter.notesTitle")}</p>
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">{t("kit.presenter.step", { n: index + 1, total })}</h1>
        </div>
        <div className="flex items-center gap-2">
          <TimerReadout steps={steps} index={index} large />
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            aria-label={running ? t("kit.presenter.timerPause") : t("kit.presenter.timerStart")}
            onClick={toggleTimer}
          >
            {running ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
          </Button>
          <Button type="button" variant="ghost" size="icon-lg" aria-label={t("kit.presenter.timerReset")} onClick={resetTimer}>
            <TimerReset aria-hidden="true" />
          </Button>
        </div>
      </header>
      <div aria-hidden="true" className="weave-band rounded-full" />
      <StepProgress steps={steps} index={index} />

      <section aria-labelledby={currentId} className="flex flex-col gap-4">
        <h2
          id={currentId}
          key={step.id}
          className={cn(
            "font-display text-display-3 leading-tight font-semibold text-balance",
            !reduced && "animate-in duration-300 fade-in slide-in-from-bottom-1",
          )}
        >
          {step.caption}
        </h2>
        {step.route && <p className="font-mono text-sm text-muted-foreground">{step.route}</p>}
        <div className="rounded-xl border bg-card p-5 text-card-foreground shadow-raised sm:p-6">
          <h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">{t("kit.presenter.notes")}</h3>
          <p className="mt-2 text-xl leading-relaxed whitespace-pre-line sm:text-2xl">{step.notes ?? t("kit.presenter.noNotes")}</p>
        </div>
      </section>

      <section aria-labelledby={nextId} className="rounded-xl border border-dashed p-5">
        <h2 id={nextId} className="font-sans text-sm font-semibold tracking-wider text-muted-foreground uppercase">
          {t("kit.presenter.upNext")}
        </h2>
        <p className="mt-1 text-xl font-semibold">{upcoming?.caption ?? t("kit.presenter.end")}</p>
      </section>

      <div className="mt-auto flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          size="lg"
          aria-disabled={index === 0 || undefined}
          className="aria-disabled:opacity-40"
          onClick={back}
        >
          <ChevronLeft aria-hidden="true" />
          {t("kit.presenter.back")}
        </Button>
        <p className="hidden text-sm text-muted-foreground sm:block">{t("kit.presenter.notesKeys")}</p>
        <Button
          type="button"
          size="lg"
          aria-disabled={index >= total - 1 || undefined}
          className="aria-disabled:opacity-40"
          onClick={next}
        >
          {t("kit.presenter.next")}
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
