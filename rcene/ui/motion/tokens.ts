/**
 * Motion tokens for GSAP and Motion, mirroring --ease-weave in globals.css.
 * Durations are in seconds (GSAP); multiply by 1000 for CSS or Motion `ms`.
 * Under prefers-reduced-motion, skip the animation (useReducedMotion) instead
 * of shortening it.
 */
export const DURATION = { instant: 0.12, fast: 0.2, base: 0.35, slow: 0.6, story: 1.1 } as const;

/** GSAP ease strings; WEAVE_BEZIER is the same curve for CSS and Motion. */
export const EASE = { standard: "power2.out", emphasis: "power3.out", weave: "power2.inOut", exit: "power2.in" } as const;
export const WEAVE_BEZIER = [0.65, 0, 0.35, 1] as const;

/** Seconds between items in a staggered reveal (lists, chips, cards). */
export const STAGGER = { tight: 0.04, base: 0.07, loose: 0.12 } as const;
