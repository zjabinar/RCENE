/**
 * Every user-facing string for this app. English is the source; Waray and
 * Filipino are AI drafts until a fluent reviewer checks them: list each drafted key
 * in NOTES.md under "Translations to review" (corrections go in rcene/i18n/REVIEW.md).
 * Hazard-answer strings go under status.*, level.*, answer.* or result.* (strings.test.ts
 * checks them for "safe" in every language).
 */
import { common, extendStrings } from "@rcene/i18n";

export const strings = extendStrings(common, {
  en: {
    "app.title": "Proyekto Watch",
    "app.tagline": "Infrastructure project tracker",
    "nav.home": "Home",
    "home.heading": "Check a place",
    "home.hint": "Tap the map to see the mapped hazards at that point.",
    "home.noPoint": "No point selected yet.",
    "home.selectedPoint": "Selected point",
  },
  war: {
    "nav.home": "Puno",
    "home.heading": "Tan-awa an usa nga lugar",
    "home.hint": "Pindota an mapa basi makita an mga hazard nga aada ha mapa hito nga punto.",
    "home.noPoint": "Waray pa napili nga punto.",
    "home.selectedPoint": "An napili nga punto",
  },
  fil: {
    "nav.home": "Home",
    "home.heading": "Suriin ang isang lugar",
    "home.hint": "I-tap ang mapa para makita ang mga hazard na nakamapa sa puntong iyon.",
    "home.noPoint": "Wala pang napiling punto.",
    "home.selectedPoint": "Ang napiling punto",
  },
});
