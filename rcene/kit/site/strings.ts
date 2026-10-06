/**
 * Strings of the @rcene/kit/site blocks (keys "kit.site.*" or "kit.<block>.*").
 * English is the source; Waray and Filipino are AI drafts listed in
 * rcene/i18n/REVIEW.md. Merged into kitStrings by rcene/kit/i18n.ts.
 *
 * Only chrome lives here (menu buttons, step captions, slider names). Titles,
 * leads, step text and labels come in through props, already translated by
 * the app. The skip link, disclaimer and sources link reuse `common`
 * (app.skipToContent, app.disclaimer, app.sources).
 */
export const siteStrings = {
  en: {
    // SiteShell
    "kit.site.mainNav": "Main",
    "kit.site.openMenu": "Open menu",
    "kit.site.settings": "Display and language",
    // SiteFooter
    "kit.site.backToTop": "Back to top",
    // ScrollyChapter
    "kit.scrolly.steps": "Story steps",
    "kit.scrolly.progress": "Step {n} of {total}",
    "kit.scrolly.status": "Step {n} of {total}: {title}",
    "kit.scrolly.goTo": "Go to step {n}: {title}",
    "kit.scrolly.hint": "Use the up and down arrow keys to move between steps.",
    // BeforeAfter
    "kit.beforeAfter.slider": "Compare {before} and {after}",
    "kit.beforeAfter.hint": "Drag the handle or use the arrow keys to compare.",
  },
  war: {
    "kit.site.mainNav": "Panguna",
    "kit.site.openMenu": "Abrihi an menu",
    "kit.site.settings": "Hitsura ngan pinulongan",
    "kit.site.backToTop": "Balik ha igbaw",
    "kit.scrolly.steps": "Mga lakang han istorya",
    "kit.scrolly.progress": "Lakang {n} han {total}",
    "kit.scrolly.status": "Lakang {n} han {total}: {title}",
    "kit.scrolly.goTo": "Kadto ha lakang {n}: {title}",
    "kit.scrolly.hint": "Gamita an mga arrow key pataas ngan paubos para bumalhin ha kada lakang.",
    "kit.beforeAfter.slider": "Ikumpara an {before} ngan {after}",
    "kit.beforeAfter.hint": "I-drag an kaptanan o gamita an mga arrow key para magkumpara.",
  },
  fil: {
    "kit.site.mainNav": "Pangunahin",
    "kit.site.openMenu": "Buksan ang menu",
    "kit.site.settings": "Itsura at wika",
    "kit.site.backToTop": "Bumalik sa itaas",
    "kit.scrolly.steps": "Mga hakbang ng kuwento",
    "kit.scrolly.progress": "Hakbang {n} sa {total}",
    "kit.scrolly.status": "Hakbang {n} sa {total}: {title}",
    "kit.scrolly.goTo": "Pumunta sa hakbang {n}: {title}",
    "kit.scrolly.hint": "Gamitin ang mga arrow key pataas at pababa para lumipat sa bawat hakbang.",
    "kit.beforeAfter.slider": "Ihambing ang {before} at {after}",
    "kit.beforeAfter.hint": "I-drag ang hawakan o gamitin ang mga arrow key para maghambing.",
  },
} satisfies { en: Record<string, string>; war: Record<string, string>; fil: Record<string, string> };
