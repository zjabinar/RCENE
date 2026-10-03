import { useLayoutEffect, useRef } from "react";
import { gsap, useGSAP } from "./gsap.ts";
import { useReducedMotion } from "./use-reduced-motion.ts";

export interface CountUpProps {
  /** Final value. Changing it tweens from the number currently shown. */
  value: number;
  /** Seconds. Default 1.2. */
  duration?: number;
  /** Formats every frame. Default: rounded, locale-grouped (e.g. 1,234). */
  format?: (n: number) => string;
  className?: string;
}

const defaultFormat = (n: number) => Math.round(n).toLocaleString();

/**
 * Animated number. Tweens a plain object and writes textContent through a ref
 * (no per-frame React state). Screen readers get only the final value;
 * reduced motion shows the final value immediately.
 */
export function CountUp({ value, duration = 1.2, format = defaultFormat, className }: CountUpProps) {
  const el = useRef<HTMLSpanElement>(null);
  const shown = useRef(0);
  const tween = useRef<gsap.core.Tween | null>(null);
  const formatRef = useRef(format);
  const reduced = useReducedMotion();

  // Keep the latest formatter; re-render the resting number when it changes (e.g. language switch).
  useLayoutEffect(() => {
    formatRef.current = format;
    if (el.current && !tween.current?.isActive()) el.current.textContent = format(shown.current);
  });

  useGSAP(
    () => {
      const write = (n: number) => {
        shown.current = n;
        if (el.current) el.current.textContent = formatRef.current(n);
      };
      tween.current = null;
      if (reduced || duration <= 0) {
        write(value);
        return;
      }
      const state = { v: shown.current };
      write(state.v);
      tween.current = gsap.to(state, {
        v: value,
        duration,
        ease: "power1.out",
        onUpdate: () => write(state.v),
        onComplete: () => write(value),
      });
    },
    { dependencies: [value, duration, reduced], revertOnUpdate: true },
  );

  return (
    <span className={className} data-slot="count-up">
      <span ref={el} aria-hidden="true" className="tabular-nums" />
      <span className="sr-only">{format(value)}</span>
    </span>
  );
}
