---
name: gsap-motion
description: GSAP animation for this project's React 19 + Vite app — scroll storytelling (ScrollTrigger with Lenis smooth scroll), text reveals (SplitText), hero sequences, staggered reveals, number count-ups, self-drawing lines, and scrubbable timelines, with correct useGSAP cleanup and reduced-motion handling. Use this whenever writing or debugging anything involving gsap, ScrollTrigger, SplitText, DrawSVG, Lenis, scrollytelling, parallax, pinned sections, animated counters, or a request to make a screen "feel alive", and whenever deciding whether an animation should use GSAP or Motion (motion/react).
---

# GSAP motion for the RSCENE build

This app is built solo in a four-hour window. UX is 15% of the score and motion polish is one of the cheapest ways to earn it — but a working feature without animation always beats an animation on a broken feature. Most of this skill belongs in the polish window after the feature freeze, not in the first build hour.

## GSAP or Motion?

The project uses both libraries. They are good at different things:

| Use **Motion** (`motion/react`) for | Use **GSAP** for |
|---|---|
| Hover, tap, focus states | Hero sequences and multi-step choreography |
| Mount/unmount (`AnimatePresence`), modals | Scroll-driven anything (ScrollTrigger) |
| Layout reorders (`layout` prop) — re-ranking lists | Text reveals (SplitText) |
| Page transitions | Count-ups, self-drawing lines, scrubbable timelines |

**One element, one library.** Both libraries write inline `transform` and `opacity` on every frame. If both target the same element they overwrite each other, which shows up as jitter, and Motion's layout animations measure the DOM mid-flight and fight GSAP's values. If an element needs both kinds of motion, wrap it: Motion animates the outer element, GSAP the inner.

For Motion itself, use the ECC `motion-ui` / `motion-patterns` skills if they are installed.

## One-time setup

There is nothing to install or register. This app's `package.json` already has `gsap`, `@gsap/react` and `lenis`, and the shared UI code (`rcene/ui/motion/`, imported as `@rcene/ui/motion`) registers the plugins (`useGSAP`, ScrollTrigger, SplitText, DrawSVG) once. Import GSAP from there everywhere, never straight from `"gsap"`, and don't create a `src/lib/gsap.ts`:

```ts
import { gsap, ScrollTrigger, SplitText, useGSAP } from "@rcene/ui/motion";
```

`@rcene/ui/motion` also exports `CountUp` (an animated number), `SmoothScroll` (Lenis on GSAP's ticker, synced with ScrollTrigger) and `useReducedMotion()`. Use them before writing your own.

SplitText, DrawSVG, and the other plugins ship in the public `gsap` npm package. No account or token is needed.

## The core pattern: `useGSAP` with a scope

```tsx
import { useRef } from "react";
import { gsap, useGSAP } from "@rcene/ui/motion";

export function HazardCard({ result }: { result: HazardResult }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.from(".hazard-chip", {
        y: 16,
        autoAlpha: 0,
        stagger: 0.06,
        duration: 0.4,
        ease: "power2.out",
      });
    },
    { scope: root, dependencies: [result.id], revertOnUpdate: true },
  );

  return <div ref={root}>{/* .hazard-chip elements */}</div>;
}
```

Why each option matters:
- **`scope`** — selector text like `".hazard-chip"` only matches inside `root`, so two cards on the page don't animate each other's chips.
- **`dependencies`** — re-runs the animation when the data changes (a new map click).
- **`revertOnUpdate: true`** — reverts the previous run before replaying. Without it, a second click animates from a half-finished state.
- **Cleanup is automatic.** Tweens, ScrollTriggers, and SplitText instances created inside the hook are reverted on unmount. That is also what makes React StrictMode's double-invoked effects harmless — don't hand-roll `useEffect` + `gsap.context` instead.

## Animations started by events: `contextSafe`

Animations created later, in click handlers, are outside the hook's context unless you wrap them:

```tsx
const { contextSafe } = useGSAP({ scope: root });

const pulse = contextSafe(() => {
  gsap.fromTo(".badge", { scale: 1 }, { scale: 1.15, yoyo: true, repeat: 1, duration: 0.15 });
});
```

Only handlers that *create* tweens need this. Calling `timeline.progress(x)` on an existing timeline does not.

## Respect reduced motion

Some judges and citizens use reduced-motion settings, and accessibility counts toward UX. Branch with `gsap.matchMedia()`:

```tsx
useGSAP(
  () => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.from(".hero-line", { yPercent: 100, stagger: 0.08, duration: 0.7, ease: "power3.out" });
    });
    // reduce: do nothing — elements simply render in their final state
    return () => mm.revert();
  },
  { scope: root },
);
```

## Recipes

### Count-up numbers (stats, tallies, capacity)

Use `<CountUp value={n} />` from `@rcene/ui/motion`. It also handles reduced motion and screen readers. The pattern below is what it does inside, for a custom case: tween a plain object and write the text through a ref. Setting React state 60 times a second re-renders the whole component.

```tsx
const el = useRef<HTMLSpanElement>(null);

useGSAP(
  () => {
    const state = { v: 0 };
    gsap.to(state, {
      v: value,
      duration: 1.2,
      ease: "power1.out",
      onUpdate: () => {
        if (el.current) el.current.textContent = Math.round(state.v).toLocaleString();
      },
    });
  },
  { dependencies: [value] },
);

return <span ref={el}>0</span>;
```

### Headline text reveal (SplitText)

```tsx
useGSAP(
  () => {
    SplitText.create(".headline", {
      type: "words",
      mask: "words", // clip each word so it slides up from behind a mask
      autoSplit: true, // re-split if fonts load late or the width changes
      onSplit: (self) =>
        gsap.from(self.words, { yPercent: 100, stagger: 0.05, duration: 0.6, ease: "power3.out" }),
    });
  },
  { scope: root },
);
```

Return the tween from `onSplit` so it is cleaned up and rebuilt whenever SplitText re-splits.

### Smooth scroll wired to ScrollTrigger (Lenis)

Use this on story and landing pages only (see Gotchas). `@rcene/ui/motion` already exports it as `<SmoothScroll>`, which also falls back to native scrolling under reduced motion. Wrap the page with it; don't copy the code. The code below shows how it works: Lenis runs on GSAP's ticker, so both share one clock.

```tsx
// What @rcene/ui/motion's SmoothScroll does
import { useEffect, useRef, type ReactNode } from "react";
import { ReactLenis, useLenis, type LenisRef } from "lenis/react";
import "lenis/dist/lenis.css";
import { gsap, ScrollTrigger } from "@rcene/ui/motion";

function ScrollTriggerSync() {
  useLenis(() => ScrollTrigger.update());
  return null;
}

export function SmoothScroll({ children }: { children: ReactNode }) {
  const lenisRef = useRef<LenisRef>(null);

  useEffect(() => {
    const update = (time: number) => lenisRef.current?.lenis?.raf(time * 1000);
    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);
    return () => gsap.ticker.remove(update);
  }, []);

  return (
    <ReactLenis root options={{ autoRaf: false }} ref={lenisRef}>
      <ScrollTriggerSync />
      {children}
    </ReactLenis>
  );
}
```

### Scrollytelling with a pinned map

Pin the map with CSS `position: sticky`, not ScrollTrigger's `pin`. Sticky is one line, can't mis-measure, and leaves ScrollTrigger doing only what it's good at, which is detecting the active chapter:

```tsx
// layout: <div class="grid grid-cols-2"> <div class="sticky top-0 h-screen">{map}</div> <div>{chapters}</div> </div>
useGSAP(
  () => {
    gsap.utils.toArray<HTMLElement>(".chapter").forEach((el) => {
      ScrollTrigger.create({
        trigger: el,
        start: "top center",
        end: "bottom center",
        onToggle: (self) => {
          if (self.isActive) flyToChapter(el.dataset.chapter!);
        },
      });
    });
  },
  { scope: root, dependencies: [mapReady] },
);
```

`flyToChapter` calls MapLibre's `map.flyTo(...)`. Let the map animate its own camera. Don't tween map coordinates with GSAP.

### Self-drawing line

For an SVG path (a trail on an illustrated map, an underline):

```tsx
gsap.from(".trail-path", { drawSVG: 0, duration: 2, ease: "none" });
```

For a route on a MapLibre map, tween a progress value and slice the line with Turf:

```ts
const total = turf.length(trail); // km
const state = { p: 0 };
gsap.to(state, {
  p: 1,
  duration: 2.5,
  ease: "power1.inOut",
  onUpdate: () => {
    const part = turf.lineSliceAlong(trail, 0, Math.max(state.p * total, 0.001));
    (map.getSource("trail") as maplibregl.GeoJSONSource).setData(part);
  },
});
```

### Scrubbable timeline (scenario stepper, "T-24h → landfall → recovery")

Build the timeline once, paused, and drive it from a slider:

```tsx
const tl = useRef<gsap.core.Timeline | null>(null);

useGSAP(
  () => {
    tl.current = gsap
      .timeline({ paused: true })
      .addLabel("t-24")
      .to(".surge-layer", { autoAlpha: 1, duration: 1 })
      .addLabel("landfall")
      .to(".evac-bar", { scaleX: 1, transformOrigin: "left", duration: 1 })
      .addLabel("recovery");
  },
  { scope: root },
);

// <input type="range" min={0} max={1} step={0.01} onChange={(e) => tl.current?.progress(+e.target.value)} />
// jump to a step: tl.current?.tweenTo("landfall")
```

## Gotchas

- **Call `ScrollTrigger.refresh()` after anything changes page height**: a map finishing load, images, data arriving. Trigger positions are measured once, and stale measurements fire chapters at the wrong scroll position.
- **Lenis belongs on story pages, not dashboards.** Smooth scrolling fights nested scroll areas and the map's wheel-zoom. If a map lives on a Lenis page, add `data-lenis-prevent` to the map container so the wheel zooms the map instead of scrolling the page.
- **Selectors only see inside `scope`.** If an animation silently does nothing, check that the element is inside the scoped ref.
- **Prefer `autoAlpha` over `opacity`** for fade-ins. It also toggles `visibility`, so invisible elements can't catch clicks.
- **Animate `transform` and `opacity`, never layout properties** (`width`, `top`, `height`). Layout properties force reflow every frame and stutter on a mid-range laptop.
- **Test on the demo laptop, on battery.** Animation that is smooth on a desktop can drop frames on the competition machine.
