import { useEffect, useRef, type ReactNode } from "react";
import { ReactLenis, useLenis, type LenisRef } from "lenis/react";
import "lenis/dist/lenis.css";
import { gsap, ScrollTrigger } from "./gsap.ts";
import { useReducedMotion } from "./use-reduced-motion.ts";

function ScrollTriggerSync() {
  useLenis(() => ScrollTrigger.update());
  return null;
}

function LenisOnGsapTicker({ children }: { children: ReactNode }) {
  const lenisRef = useRef<LenisRef>(null);

  useEffect(() => {
    const update = (time: number) => lenisRef.current?.lenis?.raf(time * 1000);
    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(update);
      gsap.ticker.lagSmoothing(500, 33);
    };
  }, []);

  return (
    <ReactLenis root options={{ autoRaf: false }} ref={lenisRef}>
      <ScrollTriggerSync />
      {children}
    </ReactLenis>
  );
}

/**
 * Lenis smooth scrolling driven by GSAP's ticker, kept in sync with
 * ScrollTrigger. For story/landing pages only — not dashboards or map screens
 * (add `data-lenis-prevent` to a map container on a Lenis page).
 * With reduced motion it renders children with native scrolling.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  if (reduced) return <>{children}</>;
  return <LenisOnGsapTicker>{children}</LenisOnGsapTicker>;
}
