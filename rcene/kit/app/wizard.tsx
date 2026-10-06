import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, InfoIcon } from "lucide-react";
import { useFormat, useT } from "@rcene/i18n";
import { Button } from "@rcene/ui/components/button";
import { cn } from "@rcene/ui/lib/utils";

import { useKitStrings } from "../i18n.ts";

export interface WizardStep {
  id: string;
  title: string;
  description?: string;
}

export interface WizardProps {
  steps: WizardStep[];
  /** Index of the step on screen (0-based). */
  current: number;
  /** Called with the step to show (Back, Next, or a finished step in the header). */
  onStepChange: (index: number) => void;
  /** The current step's content. */
  children: ReactNode;
  /** Called by "Finish" on the last step. */
  onFinish?: () => void;
  /** False keeps Next/Finish unavailable and shows why (default true). */
  canNext?: boolean;
  /** Why Next is unavailable (default "Fill in the required fields to continue."). */
  blockedReason?: string;
  /** Label of the last button (default "Finish"), e.g. "Submit report". */
  finishLabel?: string;
  /** Heading level of the step title (default 2). */
  headingLevel?: 2 | 3;
  className?: string;
}

export interface WizardState {
  current: number;
  /** Go to a step (clamped); pass as `onStepChange`. */
  goTo: (index: number) => void;
  next: () => void;
  back: () => void;
  reset: () => void;
  isFirst: boolean;
  isLast: boolean;
}

/** Step state for <Wizard>: `const w = useWizard(steps.length)` then `current={w.current} onStepChange={w.goTo}`. */
export function useWizard(count: number, initial = 0): WizardState {
  const clamp = useCallback((i: number) => Math.max(0, Math.min(count - 1, i)), [count]);
  const [current, setCurrent] = useState(() => clamp(initial));
  const goTo = useCallback((i: number) => setCurrent(clamp(i)), [clamp]);
  return useMemo(
    () => ({
      current,
      goTo,
      next: () => setCurrent((c) => clamp(c + 1)),
      back: () => setCurrent((c) => clamp(c - 1)),
      reset: () => setCurrent(clamp(initial)),
      isFirst: current === 0,
      isLast: current === count - 1,
    }),
    [current, goTo, clamp, initial, count],
  );
}

/**
 * A multi-step form frame: a numbered stepper (finished steps get a check
 * and can be revisited), the step title (focus moves to it on every step
 * change), the step content, and Back / Next / Finish. When `canNext` is
 * false, Next stays focusable but inert (aria-disabled) and says why.
 */
export function Wizard({
  steps,
  current,
  onStepChange,
  children,
  onFinish,
  canNext = true,
  blockedReason,
  finishLabel,
  headingLevel = 2,
  className,
}: WizardProps) {
  const t = useT(useKitStrings());
  const fmt = useFormat();
  const headingId = useId();
  const reasonId = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const total = steps.length;
  const index = Math.max(0, Math.min(total - 1, current));
  const step = steps[index];
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const Heading = `h${headingLevel}` as "h2" | "h3";

  // Move focus to the new step's title on every step change (not on mount).
  const shown = useRef(index);
  useEffect(() => {
    if (shown.current === index) return;
    shown.current = index;
    heading.current?.focus();
  }, [index]);

  if (!step) return null;

  const onPrimary = () => {
    if (!canNext) return;
    if (isLast) onFinish?.();
    else onStepChange(index + 1);
  };

  return (
    <div data-slot="wizard" className={cn("flex flex-col gap-6", className)}>
      <ol aria-label={t("kit.wizard.progress")} className="flex items-start">
        {steps.map((s, i) => {
          const state = i < index ? "done" : i === index ? "current" : "upcoming";
          const inner = (
            <>
              <span
                aria-hidden="true"
                className={cn(
                  "relative z-10 flex size-9 items-center justify-center rounded-full text-sm font-semibold tabular-nums transition-colors",
                  state === "done" &&
                    "bg-primary text-primary-foreground group-hover:ring-4 group-hover:ring-primary/25",
                  state === "current" && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                  state === "upcoming" && "border-2 border-border bg-card text-muted-foreground",
                )}
              >
                {state === "done" ? <CheckIcon className="size-4" strokeWidth={3} /> : fmt.number(i + 1)}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "hidden max-w-[12ch] text-xs leading-tight font-medium text-balance sm:block md:max-w-[16ch] md:text-sm",
                  state === "upcoming" ? "text-muted-foreground" : "text-foreground",
                )}
              >
                {s.title}
              </span>
              <span className="sr-only">
                {`${t("kit.wizard.step", { n: fmt.number(i + 1), total: fmt.number(total) })}: ${s.title}${
                  state === "done" ? ` ${t("kit.wizard.done")}` : ""
                }`}
              </span>
            </>
          );
          return (
            <li
              key={s.id}
              aria-current={state === "current" ? "step" : undefined}
              data-state={state}
              className="relative flex flex-1 flex-col items-center"
            >
              {i > 0 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute top-[1.0625rem] right-1/2 h-0.5 w-full rounded-full",
                    i <= index ? "bg-primary" : "bg-border",
                  )}
                />
              )}
              {state === "done" ? (
                <button
                  type="button"
                  onClick={() => onStepChange(i)}
                  className="group flex flex-col items-center gap-2 rounded-lg px-1 text-center"
                >
                  {inner}
                </button>
              ) : (
                <div className="flex flex-col items-center gap-2 px-1 text-center">{inner}</div>
              )}
            </li>
          );
        })}
      </ol>

      <section
        aria-labelledby={headingId}
        className="rounded-xl border bg-card p-5 text-card-foreground shadow-raised sm:p-8"
      >
        <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
          {t("kit.wizard.step", { n: fmt.number(index + 1), total: fmt.number(total) })}
        </p>
        <Heading
          ref={heading}
          id={headingId}
          tabIndex={-1}
          className="mt-1.5 font-display text-2xl leading-tight font-semibold tracking-tight outline-none"
        >
          {step.title}
        </Heading>
        {step.description && <p className="mt-2 max-w-prose text-muted-foreground">{step.description}</p>}

        <div
          key={step.id}
          data-slot="wizard-content"
          className="mt-6 motion-safe:animate-in motion-safe:duration-300 motion-safe:fade-in-0 motion-safe:slide-in-from-right-2"
        >
          {children}
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
          {isFirst ? (
            <span className="hidden sm:block" />
          ) : (
            <Button type="button" variant="outline" size="lg" onClick={() => onStepChange(index - 1)}>
              <ChevronLeftIcon aria-hidden="true" />
              {t("kit.wizard.back")}
            </Button>
          )}
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
            {!canNext && (
              <p id={reasonId} className="flex items-start gap-1.5 text-sm text-muted-foreground sm:text-right">
                <InfoIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                {blockedReason ?? t("kit.wizard.cannotNext")}
              </p>
            )}
            <Button
              type="button"
              size="lg"
              aria-disabled={!canNext || undefined}
              aria-describedby={!canNext ? reasonId : undefined}
              onClick={onPrimary}
              className="aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
            >
              {isLast ? (
                <>
                  <CheckIcon aria-hidden="true" />
                  {finishLabel ?? t("kit.wizard.finish")}
                </>
              ) : (
                <>
                  {t("kit.wizard.next")}
                  <ChevronRightIcon aria-hidden="true" />
                </>
              )}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
