# Gallery examples

One file per example: `src/examples/<family>/<slug>.example.tsx`, where `<family>` is `app`, `site`, `poster` or `brand` and `<slug>` is kebab-case (`data-table`, `hero-showcase`). The gallery finds it by the file name (`src/gallery/registry.ts`), shows it live with preview controls (palette, mode, 390 px frame, language), and shows its source with a Copy button. `registry.test.ts` fails when a public component of a kit family appears in no example's `meta.blocks`.

## Contract

```tsx
import { useT } from "@rcene/i18n";
import { PageHeader } from "@rcene/kit/app";
import type { ExampleMeta } from "../../gallery/registry.ts";

export const meta: ExampleMeta = {
  title: "PageHeader",
  summary: {
    en: "The top of every route: breadcrumbs, title, description and actions.",
    war: "…",
    fil: "…",
  },
  blocks: ["PageHeader"],
  order: 10,
};

const strings = {
  en: { title: "Requests", lead: "Every request filed in Barangay 5 this week." },
  war: { title: "Mga hangyo" },
  fil: { title: "Mga kahilingan" },
};

export function Example() {
  const t = useT(strings);
  return <PageHeader title={t("title")} description={t("lead")} />;
}
```

- **Exports:** exactly `meta` and `Example` (no default export). The gallery strips the `meta` block and its type import from the copyable code, so the rest must read like app code an app session can paste into `src/`.
- **Imports:** only `@rcene/*` aliases, `react`, `react-router`, `lucide-react`, `zod`, `react-hook-form`, `@hookform/resolvers/zod` and `recharts`. Never import another example or gallery code (except the `ExampleMeta` type).
- **Content:** in a small `strings` table read with `useT(strings)`. English is required; add Waray and Filipino drafts for short strings (`useT` falls back to English). Synthetic records use codes (`REC-0001`, `BRGY-05`), never personal names. Never "safe" (nor "luwas", "ligtas").
- **Data:** inline and deterministic (no `Math.random`, no `Date.now()` in rendered output; use fixed dates like `new Date("2026-10-07T09:00:00+08:00")`). Map examples may use `@rcene/data` layers (they load from `/data/`).
- **Size:** fit a card. A shell (`ConsoleLayout`, `SiteShell`, `BoardShell`, `PosterPage`) goes in a fixed-height box (`h-[28rem] overflow-hidden` or similar) or with `meta.bleed: true`. Set `meta.frameHeight` when the 390 px frame needs more than 640 px.
- **Routing:** `react-router` links work (the gallery is inside a router); point them at `#` paths or the example's own state, not at gallery routes.
- **Accessibility:** examples are checked by the gallery's smoke test (axe, no serious or critical issues, light and dark). Headings start at `h2` inside an example (the card's title is `h3`, but blocks that own an `h1`, like `PageHeader` or `Hero`, are fine).
- **One example per use**, not per prop: show the realistic default, then a variant only when it changes how the block is used (e.g. `Hero` calm and showcase).
