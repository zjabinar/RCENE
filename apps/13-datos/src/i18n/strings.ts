/**
 * Every user-facing string for this app. English is the source; Waray and
 * Filipino were drafted by AI and need a fluent reviewer (log fixes in AI-LOG.md).
 */
import { common, extendStrings } from "@rcene/i18n";

export const strings = extendStrings(common, {
  en: {
    "app.title": "Bukas Datos",
    "app.tagline": "Catbalogan in Data, a scrollytelling open-data story",
    "nav.home": "Home",
    "home.heading": "Check a place",
    "home.hint": "Tap the map to see the mapped hazards at that point.",
    "home.noPoint": "No point selected yet.",
  },
  war: {
    "nav.home": "Puno",
    "home.heading": "Tan-awa an usa nga lugar",
    "home.hint": "Pindota an mapa basi makita an mga hazard nga aada ha mapa hito nga punto.",
    "home.noPoint": "Waray pa napili nga punto.",
  },
  fil: {
    "nav.home": "Home",
    "home.heading": "Suriin ang isang lugar",
    "home.hint": "I-tap ang mapa para makita ang mga hazard na nakamapa sa puntong iyon.",
    "home.noPoint": "Wala pang napiling punto.",
  },
});
