# @rcene/kit/site — website and storytelling

Blocks for landing and story pages: the page frame, hero, sections, feature cards, numbers, scrollytelling, a compare slider, a story timeline, a closing call to action, the footer and woven dividers. They follow the theme (5 palettes × light/dark, plus the `showcase` neon surface), work at 390 px and up, run offline, and respect reduced motion.

```tsx
import { SiteShell, Hero, Section, FeatureGrid, StatBand, ScrollyChapter, BeforeAfter,
         StoryTimeline, CallToAction, SiteFooter, WeaveDivider } from "@rcene/kit/site";
```

- **Content comes in through props, already translated** (`t("home.hero.title")`). The blocks only add chrome strings (menu button, step captions, slider name), from `rcene/kit/site/strings.ts` (`kit.site.*`, `kit.scrolly.*`, `kit.beforeAfter.*`) plus `common`'s `app.skipToContent`, `app.disclaimer` and `app.sources`. An app can reword any of them in its own table.
- **Motion** uses `@rcene/ui/motion` (GSAP + ScrollTrigger, SplitText, DrawSVG, CountUp, Lenis). Under `prefers-reduced-motion` every block renders its final state at once: the title is plain text, numbers are final, the timeline line is complete.
- **Links:** an `href`/`to` starting with `/` uses the router (no reload); `#section` and URLs are plain links. `SiteShell`, `SiteFooter` and route links need a router (`createBrowserRouter`).
- Section ids get `scroll-margin` for the 4 rem sticky header, so `#features` anchors land below it.

## Blocks

**`SiteShell`** `{ title: string; brand?; nav?: { to; label; end? }[]; actions?; footer?; smooth?: boolean; strings?: AppStrings; className?; children }` — the website frame (use it instead of `AppShell` on a landing or story page): skip link, a sticky top bar that is transparent at the top and turns solid (blur, border, shadow) once the page scrolls, the brand + title linking home, nav links (`aria-current="page"` on the active route; `#anchor` items are plain links), `actions`, then `ThemeMenu` and `LangToggle`. Below `md` the nav, actions and theme menu move into a menu sheet. Then `<main id="main" tabIndex={-1}>` and the footer: a default `SiteFooter` (brand + disclaimer), your own `footer`, or `null` for none. `smooth` turns on Lenis (native scrolling under reduced motion). Sets `document.title`, keeps `<html>` on the theme, provides `strings` like `AppShell`, and sets `--kit-sticky-top` so sticky panels (ScrollyChapter) sit below the bar.

```tsx
<SiteShell title={t("app.title")} brand={<AppMark />} strings={strings} smooth
  nav={[{ to: "/", label: t("nav.home") }, { to: "#story", label: t("nav.story") }]}
  actions={<Button asChild size="sm"><Link to="/app">{t("cta.open")}</Link></Button>}>
  <Hero … /> <Section … /> …
</SiteShell>
```

**`Hero`** `{ title; eyebrow?; lead?; actions?; media?; variant?: "calm" | "showcase"; className? }` — the page's h1 with eyebrow chip, lead, actions and optional media (beside the text on desktop, below it on phones). `calm` (default) is the Living Tapestry look: cream background, display serif, soft tints, a woven frame behind the media and a `weave-band` at the bottom; an `<em>` in the title is tinted. `showcase` is the dark neon surface: Exo 2 italic, a cyan→magenta gradient title with a `glow-text` halo, a slowly drifting grid and light orbs (static under reduced motion; paused off screen). On mount the title's words rise in with SplitText, then the rest fades up; while split the h1 carries `aria-label` with the full title, and the split is reverted as soon as the words land.

```tsx
<Hero variant="showcase" eyebrow="Catbalogan City" title={t("hero.title")} lead={t("hero.lead")}
  actions={<Button size="lg">{t("hero.cta")}</Button>} media={<img src="/hero.webp" alt={t("hero.alt")} className="w-full" />} />
```

**`Section`** `{ id?; eyebrow?; title?; lead?; align?: "start" | "center"; tone?: "default" | "muted" | "weave" | "showcase"; className?; containerClassName?; children? }` — consistent vertical rhythm (`py-16 sm:py-20 lg:py-24`) in the shared `max-w-7xl` container; the h2 is `font-display text-display-3` and names the region. `muted` = soft band, `weave` = faint `weave-bg`, `showcase` = wrapped in `<Surface variant="showcase">` (Exo 2 italic title, glowing eyebrow).

```tsx
<Section id="features" eyebrow={t("features.eyebrow")} title={t("features.title")} lead={t("features.lead")}>…</Section>
```

**`FeatureGrid`** `{ items: { icon?; title; description; href? }[]; columns?: 2 | 3 | 4; headingLevel?: 2 | 3 | 4; className? }` — cards with an icon tile, an h3 and a description (1 column on phones, 2 on tablets, `columns` on desktop). With `href` the whole card is one link named by its title, lifts on hover and shows an arrow; the focus ring wraps the card.

```tsx
<FeatureGrid items={[{ icon: <MapIcon />, title: t("f.map"), description: t("f.mapText"), href: "/map" }]} />
```

**`StatBand`** `{ items: { value: number; label: string; format?; suffix? }[]; tone?: "default" | "brand"; className? }` — big numbers in a `<dl>` band with hairline dividers (2 columns on phones). Each number counts up with `CountUp` the first time the band scrolls into view (IntersectionObserver); under reduced motion the final value shows at once, and screen readers always get the final value. Default format: `useFormat().number`, 0 decimals for integers, 1 otherwise; pass `format` for pesos (`fmt.currency`) or percent. `suffix` is drawn smaller ("%", "+").

```tsx
<StatBand items={[{ value: 57, label: t("stats.barangays") }, { value: 87.5, label: t("stats.checked"), suffix: "%" }]} />
```

**`ScrollyChapter`** `{ steps: { id; title: string; body }[]; visual: (activeStep: number) => ReactNode; onStepChange?: (i) => void; headingLevel?; className? }` — scrollytelling: a sticky visual panel (right column on desktop, full-height behind the cards on phones) and step cards. The card crossing the middle of the screen becomes active (IntersectionObserver, no pinning); the change is announced politely ("Step 2 of 4: …"). Cards are focusable (focus activates them; ↑/↓, Home, End move between them) and the dots on the panel jump to a step. Nothing depends on animation. On a Lenis page give a map inside `visual` `data-lenis-prevent`.

```tsx
<ScrollyChapter steps={steps} visual={(i) => <StoryMap chapter={steps[i].id} />} onStepChange={(i) => track(i)} />
```

**`BeforeAfter`** `{ before; after; beforeLabel: string; afterLabel: string; initial?: number; onChange?: (percent) => void; className? }` — a compare slider: `before` is revealed over `after` up to the divider with a clip-path, so images, maps or any node work (`after` sets the frame size; pass e.g. `className="aspect-video"`). The divider is the `slider` primitive named "Compare {before} and {after}": drag the grip (anywhere on the frame with a mouse), or use ←/→, Page Up/Down, Home/End. Label chips sit in both top corners; a caption explains the control.

```tsx
<BeforeAfter before={<img src="/2019.webp" alt="…" />} after={<img src="/2024.webp" alt="…" />}
  beforeLabel="2019" afterLabel="2024" className="aspect-video" />
```

**`StoryTimeline`** `{ items: { id; date: string; title; body?; icon? }[]; label?: string; headingLevel?; className? }` — a vertical timeline as an `<ol>`: marker (icon or dot), date, h3 title and body; on desktop the dates move into a column left of the line. The line draws itself as you scroll (DrawSVG scrubbed by ScrollTrigger) and each marker lights up when reached; under reduced motion the line is complete and every marker lit.

```tsx
<StoryTimeline items={[{ id: "1987", date: "1987", title: t("t.first"), body: <p>{t("t.firstText")}</p> }]} />
```

**`CallToAction`** `{ title; body?; actions; tone?: "brand" | "showcase"; className? }` — a prominent closing band with its own padding and container (place it in the page, not in a Section). `brand`: a brand-colour panel with a woven top edge and banig diamonds in the corner (use `variant="secondary"` for the main button). `showcase`: the neon surface with a glowing title.

```tsx
<CallToAction title={t("cta.title")} body={t("cta.body")} actions={<Button size="lg" variant="secondary">{t("cta.start")}</Button>} />
```

**`SiteFooter`** `{ brand?; columns?: { title; links: { to; label }[] }[]; note?; className? }` — a woven top edge, the brand and a note, link columns (each a labelled `<nav>`), then the disclaimer (`app.disclaimer`, so the app's override shows), the link to `/sources` and "Back to top" (scrolls up through Lenis when present and moves focus to `#main`). `SiteShell` renders one by default.

```tsx
<SiteFooter brand={<><AppMark /> Andam</>} note={t("footer.note")}
  columns={[{ title: t("footer.explore"), links: [{ to: "/map", label: t("nav.map") }] }]} />
```

**`WeaveDivider`** `{ variant?: "band" | "wave" | "diamond"; className? }` — a decorative divider inspired by banig weaving, an SVG pattern in `--weave-1..3`: `band` = a full-width herringbone strip, `wave` = two interlaced strands, `diamond` = a row of banig diamonds (both fade out at the ends). `aria-hidden`; hidden in forced-colours mode.

```tsx
<WeaveDivider variant="diamond" className="my-4" />
```

Also exported: `SiteLink` (`{ to, ...anchorProps }`: router `Link` for `/routes`, `<a>` otherwise), `SITE_CONTAINER` (the container classes the blocks share) and `siteStrings`.

## A page

```tsx
<SiteShell title={t("app.title")} brand={<AppMark />} nav={nav} strings={strings} smooth>
  <Hero eyebrow={t("hero.eyebrow")} title={t("hero.title")} lead={t("hero.lead")} actions={…} media={…} />
  <Section id="features" eyebrow={…} title={…}><FeatureGrid items={…} /></Section>
  <WeaveDivider variant="diamond" />
  <Section tone="muted" title={…} align="center"><StatBand items={…} /></Section>
  <Section id="story" title={…}><ScrollyChapter steps={…} visual={(i) => …} /></Section>
  <Section tone="weave" title={…}><BeforeAfter … /></Section>
  <Section title={…}><StoryTimeline items={…} /></Section>
  <CallToAction title={…} actions={…} />
</SiteShell>
```

## Tests

`npx vitest run rcene/kit/site` (jsdom: IntersectionObserver, ResizeObserver and matchMedia are stubbed in each test; `a11y.test.tsx` runs axe on a whole page in both hero variants, with motion on and off, and on the open menu sheet).
