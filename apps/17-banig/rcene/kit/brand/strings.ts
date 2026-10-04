/**
 * Strings of the @rcene/kit/brand blocks (keys "kit.brand.*" or "kit.<block>.*").
 * English is the source; Waray and Filipino are AI drafts listed in
 * rcene/i18n/REVIEW.md. Merged into kitStrings by rcene/kit/i18n.ts.
 *
 * "kit.brand.name" is the brand itself and is the same in every language.
 */
export const brandStrings = {
  en: {
    "kit.brand.name": "RCENE",
    "kit.brand.place": "Catbalogan City",
    "kit.brand.og.app": "App {id}",
  },
  war: {
    "kit.brand.name": "RCENE",
    "kit.brand.place": "Syudad han Catbalogan",
    "kit.brand.og.app": "App {id}",
  },
  fil: {
    "kit.brand.name": "RCENE",
    "kit.brand.place": "Lungsod ng Catbalogan",
    "kit.brand.og.app": "App {id}",
  },
} satisfies { en: Record<string, string>; war: Record<string, string>; fil: Record<string, string> };
