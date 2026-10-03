/**
 * @rcene/ui/motion — GSAP (plugins registered once), count-up numbers, Lenis
 * smooth scroll and a reduced-motion hook. See .claude/skills/gsap-motion.
 */
export { gsap, ScrollTrigger, SplitText, DrawSVGPlugin, useGSAP } from "./gsap.ts";
export { CountUp, type CountUpProps } from "./count-up.tsx";
export { SmoothScroll } from "./smooth-scroll.tsx";
export { useReducedMotion, prefersReducedMotion } from "./use-reduced-motion.ts";
