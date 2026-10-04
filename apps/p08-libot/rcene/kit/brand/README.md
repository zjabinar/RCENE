# @rcene/kit/brand

The RCENE identity, **"The Living Tapestry"**: a map pin woven like a Basey banig (over-under strips on the diagonal, the mat's diamond look), Catbalogan's sea under it, and the palette's three weave colours. Calm and civic in the habi palette; neon on a `Surface variant="showcase"` or the gabi palette, like the event poster.

```tsx
import { AppMark, OgCard, SpotIllustration, WeavePattern, Wordmark } from "@rcene/kit/brand";
```

## Which asset when

| Need | Use |
|---|---|
| The icon before the app title in the header | `AppMark` (pass it to `AppShell brand`) |
| "RCENE" itself: poster header, about page, footer, presenter title slide | `Wordmark` (`full` where there is room, `compact` in a row) |
| A woven texture behind a hero, a section band, a poster border | `WeavePattern` (never with text straight on it) |
| An empty, search, offline, error or done state; a map, community or heritage section | `SpotIllustration` |
| The link-preview image `public/og.png`, or an app tile on the poster | `OgCard` (1200 x 630), or `scripts/brand-assets.mjs` |
| The favicon, install icons, maskable icon, default og.png | the static files in `public/` (below) |

## Blocks

**`Wordmark`** `{ variant?: "full" | "compact"; className? }`. The woven pin and "RCENE" in the palette's display face (Fraunces; Exo 2 on gabi and showcase). `full` (default) adds a woven rule and "Catbalogan City" in `text-brand`. One image to screen readers (`role="img"`, name from `kit.brand.name`), so it is never decorative. It sizes from the font size (default `text-2xl`) and takes its colour from `currentColor`.

```tsx
<Wordmark className="text-5xl" />                {/* poster header */}
<Wordmark variant="compact" className="text-lg" />
```

**`AppMark`** `{ size?: number; label?: string; detail?: "full" | "small"; className? }`. The square app icon: the woven pin on a `card` tile with a `border` hairline, the sea below. Default 40 px. Below 28 px it switches to a bolder 3 x 3 weave without the sea (`detail` overrides). Decorative (`aria-hidden`) unless you give a `label`, which makes it `role="img"`. Glows softly in dark mode and on showcase surfaces.

```tsx
<AppShell title={t("app.title")} brand={<AppMark />} …>
<AppMark size={96} label={t("about.logo")} />
```

**`WeavePattern`** `{ name: "banig" | "diamond" | "stripes" | "tikog"; className?; opacity?: number; scale?: number }`. A full-bleed SVG `<pattern>` (a unique id per instance via `useId`) in `--weave-1..3`, `aria-hidden`, absolutely filling the nearest positioned parent. Default opacity 0.16, a quiet texture; raise it (0.5-0.9) for borders and poster bands. Hidden under forced colours; prints in colour.
- `banig`: plain over-under weave on the diagonal, the same weave as the mark.
- `diamond`: the Basey motif, stepped concentric diamonds.
- `stripes`: the banded border of a mat.
- `tikog`: a twill of tikog grass, diagonal ridges.

```tsx
<section className="relative overflow-hidden rounded-xl">
  <WeavePattern name="diamond" opacity={0.2} />
  <div className="relative m-6 rounded-lg bg-card p-6 shadow-raised">…text on a solid panel…</div>
</section>
```

**`SpotIllustration`** `{ name: "empty" | "search" | "offline" | "error" | "done" | "map" | "community" | "heritage"; size?: number; className? }`. Calm line drawings on a `muted` disc (lines `--weave-1`, woven fills `--weave-2`, accents `--weave-3`), 4:3, default 160 px wide, `aria-hidden`: the state's text says what happened. `SPOT_NAMES` lists them. An empty basket (bayong), a magnifier on a mat, a phone with the signal crossed out, a torn mat with a loose strip, a woven ring with a check, a folded coastal map with a pin, neighbours on one mat, a bahay na bato.

```tsx
<EmptyState title={t("queue.empty")}>
  <SpotIllustration name="empty" size={140} className="mx-auto" />
</EmptyState>
```

**`OgCard`** `{ title: string; tagline?: string; appId?: string; className? }`. The 1200 x 630 social card: a woven border (`banig`), the title in the display face (smaller for titles over 30 characters), the tagline, an "App {id}" chip (`kit.brand.og.app`), "Catbalogan City", and a large `AppMark` on a `diamond` panel. Fixed size on purpose: render it alone on a route and screenshot it (below). Inside a `Surface variant="showcase"` it becomes the neon poster look.

```tsx
// a route only for the screenshot
{ path: "/og", element: <OgCard title={t("app.title")} tagline={t("app.tagline")} appId="07" /> }
```

**Geometry** (`markParts`, `markSvg`, `patternTile`, `patternSvg`, `patternTransform`, `TOKEN_COLORS`, `WEAVE_NAMES`): the shapes behind the mark and the patterns, as data with colour slots (`weave1`, `weave2`, `weave3`, `tile`, `edge`). The components fill the slots with tokens; `markSvg(colors)` / `patternSvg(name, colors, id)` return SVG strings for scripts (the poster kit or a canvas export can use them too). `rcene/kit/brand/geometry.ts` has no imports, so Node runs it directly.

## Colour notes

- Components use tokens only: `--weave-1..3` for the weave, `--card` / `--border` for the tile, `--muted` behind spot drawings, `--brand` for the place line, `--glow` for the dark-mode glow. The mark therefore follows every palette and mode: teal, abaca and violet in habi; sea blues in dagat; magenta and green in fiesta; cyan, magenta and indigo in gabi / showcase; black, blue and grey in malinaw.
- The weave strips are paint, not text: they carry no meaning, so they need no contrast pair. Text never sits on a pattern; put it on `bg-card` or `bg-background`.
- Static files can't follow the theme, so they use the habi light values: teal `#0f6b66` and abaca `#a0703f` strips, violet `#5b3a8c` hem, on cream `#f7f2e8`. The manifest's `theme_color` is the teal, `background_color` the cream.

## Static files (in `public/`)

| File | What |
|---|---|
| `favicon.svg` | The bold 3 x 3 mark on a cream tile; reads at 16 px on light and dark tab bars |
| `icons/icon-192.png`, `icons/icon-512.png` | Install icons: the rounded tile on transparent corners |
| `icons/maskable-512.png` | Full-bleed cream, the pin and sea inside the 80 % safe circle (Android masks) |
| `og.png` | 1200 x 630 link preview. The template ships a generic RCENE card |
| `manifest.webmanifest` | `name` `Libot Catbalogan+`, `short_name` `P8` (the generator fills both), standalone, the three icons |

`index.html` links the manifest, the apple-touch icon and the `og:` tags. If you add `vite-plugin-pwa`, point it at this manifest (`manifest: false`) rather than generating a second one.

### Regenerating them

`scripts/brand-assets.mjs` draws them from the same geometry as the components, in Playwright's Chromium (Edge on Windows), offline, with the fonts from `node_modules`. It runs only when you call it, never on install. PNGs are re-encoded small (RGB when opaque, adaptive filters, zlib 9): about 8 KB, 29 KB, 21 KB and 150 KB.

```bash
node scripts/brand-assets.mjs                     # all, og.png with this app's title, tagline and id (project.json)
node scripts/brand-assets.mjs --only og           # just the card (also: favicon, icons; comma-separated)
node scripts/brand-assets.mjs --generic           # og.png without an app title
npm run dev                                       # then, to use the <OgCard> on your own /og route (any theme):
node scripts/brand-assets.mjs --only og --url http://localhost:5107/og
```

Run it in an app once its title is final, so its `og.png` stops being the template's generic card. After changing `geometry.ts`, run it in the template and sync.

## Strings

`kit.brand.name` ("RCENE", the same in every language), `kit.brand.place` ("Catbalogan City"), `kit.brand.og.app` ("App {id}"). Override them in the app's table like any kit string.
