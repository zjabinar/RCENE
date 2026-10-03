/**
 * The one place GSAP plugins are registered. Import GSAP from here
 * (`@rcene/ui/motion`), never straight from "gsap", so plugins are always ready.
 */
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { useGSAP } from "@gsap/react";

/**
 * jsdom (vitest) has no window.matchMedia, and ScrollTrigger calls it while
 * registering, which would crash every test that imports @rcene/ui. Real
 * browsers always have it, so this only runs in test environments. The stub
 * reports "prefers-reduced-motion: reduce", so GSAP animations are skipped and
 * tests see final states (e.g. CountUp shows its value immediately).
 */
if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string): MediaQueryList => ({
      matches: /prefers-reduced-motion:\s*reduce/.test(query),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText, DrawSVGPlugin);

export { gsap, ScrollTrigger, SplitText, DrawSVGPlugin, useGSAP };
