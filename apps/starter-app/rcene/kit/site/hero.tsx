import { useId, useRef, type ReactNode, type RefObject } from "react";
import { cn } from "@rcene/ui/lib/utils";
import { DURATION, EASE, STAGGER, SplitText, gsap, useGSAP, useReducedMotion } from "@rcene/ui/motion";

import { Surface } from "../surface.tsx";
import { SITE_CONTAINER } from "./site-link.tsx";

export type HeroVariant = "calm" | "showcase";

export interface HeroProps {
  /** A short label above the title ("Catbalogan City · Preparedness"). */
  eyebrow?: ReactNode;
  /** The page's h1. Plain text reads best; an <em> part is tinted in the calm variant. */
  title: ReactNode;
  lead?: ReactNode;
  /** Buttons or links, e.g. <Button asChild size="lg"><Link to="/map">…</Link></Button>. */
  actions?: ReactNode;
  /** An image, map preview or illustration shown beside the text (below it on phones). */
  media?: ReactNode;
  /** calm = Living Tapestry (cream, display serif, woven band); showcase = dark neon. Default "calm". */
  variant?: HeroVariant;
  className?: string;
}

/** Type shared by the showcase h1 and its glow layer, so both wrap identically. */
const SHOWCASE_TITLE =
  "font-showcase text-display-1 font-extrabold tracking-tight text-balance italic pr-[0.12em] pb-[0.12em]";
const SHOWCASE_GRADIENT = "bg-linear-to-r from-primary via-brand to-chart-3 bg-clip-text text-transparent";
/** While split, each word carries the gradient itself (background-clip: text skips transformed children). */
const SHOWCASE_WORD = `inline-block ${SHOWCASE_GRADIENT} pr-[0.12em] -mr-[0.12em] pb-[0.12em] -mb-[0.12em]`;

const GRID_LINES =
  "bg-[linear-gradient(to_right,color-mix(in_oklab,var(--primary)_16%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--primary)_16%,transparent)_1px,transparent_1px)] bg-size-[48px_48px]";
const GRID_CELL = 48;

/** Plain text of a title, for re-running the reveal when it changes (e.g. a language switch). */
function textKey(node: ReactNode): string {
  return typeof node === "string" || typeof node === "number" ? String(node) : "";
}

/**
 * The entrance: the title's words rise in (GSAP SplitText), then the eyebrow,
 * lead, actions and media fade up; the showcase backdrop drifts. Skipped
 * entirely under reduced motion. The split is reverted as soon as the words
 * land, so React owns plain text again; while split, SplitText's aria "auto"
 * labels the h1 with its full text and hides the word pieces.
 */
function useHeroReveal(
  root: RefObject<HTMLElement | null>,
  heading: RefObject<HTMLHeadingElement | null>,
  { showcase, reduced, revealKey }: { showcase: boolean; reduced: boolean; revealKey: string },
) {
  useGSAP(
    () => {
      const scope = root.current;
      const h1 = heading.current;
      if (reduced || !scope || !h1) return;
      const q = gsap.utils.selector(scope);
      const tl = gsap.timeline({ defaults: { ease: EASE.emphasis } });

      let split: SplitText | null = null;
      const unsplit = () => {
        if (split?.isSplit) split.revert();
        delete h1.dataset.split;
      };
      try {
        split = SplitText.create(h1, {
          type: "words",
          tag: "span",
          aria: "auto",
          wordsClass: showcase ? SHOWCASE_WORD : "inline-block",
        });
        if (showcase) {
          // Line each word's gradient up with the whole title, so the colours don't restart per word.
          const box = h1.getBoundingClientRect();
          const width = h1.clientWidth || box.width;
          for (const word of split.words as HTMLElement[]) {
            const r = word.getBoundingClientRect();
            word.style.backgroundSize = `${width}px 100%`;
            word.style.backgroundPosition = `${box.left - r.left}px 0`;
          }
          h1.dataset.split = "true";
        }
      } catch {
        // No layout (or an unusual title): show the title as is.
        unsplit();
        split = null;
      }

      if (split) {
        tl.from(split.words, {
          yPercent: 70,
          autoAlpha: 0,
          rotate: showcase ? -3 : 0,
          duration: DURATION.slow,
          stagger: STAGGER.base,
          onComplete: unsplit,
        });
      }
      const rest = q("[data-hero-reveal]");
      if (rest.length) {
        tl.from(
          rest,
          { y: 18, autoAlpha: 0, duration: DURATION.slow, stagger: STAGGER.base, ease: EASE.standard },
          split ? "-=0.35" : 0,
        );
      }
      const glow = q("[data-hero-glow]");
      if (glow.length) tl.from(glow, { autoAlpha: 0, duration: DURATION.story, ease: EASE.weave }, split ? "<" : 0);

      if (showcase) {
        // A slow drift of the grid and the light orbs; paused while the hero is off screen.
        const offscreen = { trigger: scope, start: "top bottom", end: "bottom top", toggleActions: "play pause resume pause" };
        gsap.to(q("[data-hero-grid]"), {
          x: GRID_CELL,
          y: GRID_CELL,
          duration: 20,
          ease: "none",
          repeat: -1,
          scrollTrigger: offscreen,
        });
        gsap.to(q("[data-hero-orb]"), {
          y: 36,
          scale: 1.08,
          duration: 9,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          stagger: 2.5,
          scrollTrigger: { ...offscreen },
        });
      }
      return unsplit;
    },
    { scope: root, dependencies: [reduced, showcase, revealKey], revertOnUpdate: true },
  );
}

/**
 * The page's opening: eyebrow, h1, lead, actions and optional media.
 * "calm" is the Living Tapestry look (cream, display serif, a woven band);
 * "showcase" is the dark neon look (Exo 2 italic, a glowing gradient title
 * over a drifting grid). The title reveals word by word on mount, except
 * under reduced motion, and is always real, readable heading text.
 */
export function Hero({ eyebrow, title, lead, actions, media, variant = "calm", className }: HeroProps) {
  const root = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const reduced = useReducedMotion();
  const showcase = variant === "showcase";
  const revealKey = textKey(title);
  useHeroReveal(root, heading, { showcase, reduced, revealKey });

  const layout = cn(
    SITE_CONTAINER,
    "relative grid items-center gap-12 py-16 sm:py-24 lg:gap-16 lg:py-28",
    media && "lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]",
  );

  const eyebrowEl = eyebrow && (
    <p
      data-hero-reveal
      className={cn(
        "inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium",
        showcase
          ? "border-primary/40 bg-primary/10 font-semibold tracking-wide text-primary uppercase glow-text"
          : "bg-card/80 text-foreground shadow-raised backdrop-blur",
      )}
    >
      {showcase ? (
        <span aria-hidden="true" className="size-1.5 rounded-full bg-primary shadow-glow" />
      ) : (
        <span aria-hidden="true" className="weave-check size-3 rounded-[3px]" />
      )}
      {eyebrow}
    </p>
  );

  const titleEl = showcase ? (
    <div className="relative isolate w-fit max-w-full">
      <span aria-hidden="true" data-hero-glow className={cn(SHOWCASE_TITLE, "absolute inset-0 -z-10 select-none text-transparent glow-text")}>
        {title}
      </span>
      <h1
        key={revealKey || undefined}
        ref={heading}
        id={titleId}
        className={cn(SHOWCASE_TITLE, SHOWCASE_GRADIENT, "data-[split]:bg-none")}
      >
        {title}
      </h1>
    </div>
  ) : (
    <h1
      key={revealKey || undefined}
      ref={heading}
      id={titleId}
      className="font-display text-display-1 font-semibold tracking-tight text-balance text-foreground [&_em]:text-primary [&_em]:not-italic"
    >
      {title}
    </h1>
  );

  const content = (
    <div className={layout}>
      <div className={cn("flex max-w-3xl flex-col gap-6", !media && "lg:max-w-4xl")}>
        {eyebrowEl}
        {titleEl}
        {lead && (
          <p data-hero-reveal className="max-w-2xl text-lg text-pretty text-muted-foreground sm:text-xl">
            {lead}
          </p>
        )}
        {actions && (
          <div data-hero-reveal className="flex flex-wrap items-center gap-3 pt-2">
            {actions}
          </div>
        )}
      </div>
      {media && (
        <div data-hero-reveal className="relative">
          {showcase ? (
            <div aria-hidden="true" className="absolute -inset-px -z-10 rounded-2xl bg-linear-to-br from-primary/60 via-brand/40 to-transparent blur-sm" />
          ) : (
            <div aria-hidden="true" className="weave-check absolute -inset-3 -z-10 rotate-2 rounded-3xl opacity-50 sm:-inset-4" />
          )}
          <div
            className={cn(
              "relative overflow-hidden rounded-2xl border bg-card",
              showcase ? "border-primary/30 shadow-glow" : "shadow-overlay",
            )}
          >
            {media}
          </div>
        </div>
      )}
    </div>
  );

  if (!showcase) {
    return (
      <section
        ref={root}
        aria-labelledby={titleId}
        data-slot="site-hero"
        data-variant="calm"
        className={cn("relative isolate overflow-hidden bg-background", className)}
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-40 -right-32 size-[34rem] rounded-full bg-highlight/70 blur-3xl" />
          <div className="absolute -bottom-48 -left-40 size-[30rem] rounded-full bg-accent/70 blur-3xl" />
        </div>
        {content}
        <div aria-hidden="true" className="weave-band" />
      </section>
    );
  }

  return (
    <Surface variant="showcase" data-slot="site-hero-surface" className={cn("relative isolate overflow-hidden", className)}>
      <section ref={root} aria-labelledby={titleId} data-slot="site-hero" data-variant="showcase" className="relative">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute inset-0 mask-radial-from-15% mask-radial-to-75% mask-radial-at-top">
            <div data-hero-grid className={cn("absolute -inset-16", GRID_LINES)} />
          </div>
          <div data-hero-orb className="absolute -top-48 left-[15%] size-[34rem] rounded-full bg-primary/20 blur-3xl" />
          <div data-hero-orb className="absolute -right-24 -bottom-56 size-[30rem] rounded-full bg-brand/20 blur-3xl" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-primary/70 to-transparent" />
        </div>
        {content}
        <div aria-hidden="true" className="weave-band opacity-70" />
      </section>
    </Surface>
  );
}
