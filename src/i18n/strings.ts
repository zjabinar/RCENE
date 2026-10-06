/**
 * Every user-facing string for this platform. English is the source; Waray and
 * Filipino are AI drafts until a fluent reviewer checks them: list each drafted key
 * in NOTES.md under "Translations to review" (corrections go in rcene/i18n/REVIEW.md).
 * Hazard-answer strings go under status.*, level.*, answer.* or result.* (strings.test.ts
 * checks them for "safe" in every language). Lifted modules bring their own keys:
 * merge them here under the module's prefix.
 */
import { common, extendStrings } from "@rcene/i18n";

export const strings = extendStrings(common, {
  en: {
    "app.title": "Andam Catbalogan",
    "app.tagline": "Community preparedness: one warning, every role, live",
    "nav.start": "Start",
    "start.heading": "Choose a role",
    "start.hint": "Each role is one view of the same live data. For the demo, open each role in its own window and place the windows side by side.",
    "role.placeholder": "This view is not built yet. Its requirements are in docs/brief.md.",
    "role.console.title": "CDRRMO console",
    "role.console.summary": "Raise or lower a warning scenario and see which barangays and facilities are exposed.",
    "role.resident.title": "Resident",
    "role.resident.summary": "Check a place and find the nearest open evacuation center with room.",
    "role.center.title": "Evacuation center staff",
    "role.center.summary": "Log arrivals and departures, and open or close a center.",
    "role.board.title": "Public board",
    "role.board.summary": "The live warning, centers and capacity, readable from across the room.",
  },
  war: {
    "nav.start": "Umpisa",
    "start.heading": "Pilia an papel",
    "start.hint": "Kada papel usa nga pagtan-aw han pareho nga buhi nga datos. Para ha demo, ablihi an kada papel ha kalugaringon nga window ngan ibutang an mga window nga magkatupad.",
    "role.placeholder": "Waray pa nahimo ini nga view. Aadi an mga kinahanglan hini ha docs/brief.md.",
    "role.console.title": "Console han CDRRMO",
    "role.console.summary": "Ipataas o ipaubos an warning nga scenario ngan kitaa kon ano nga mga barangay ngan pasilidad an apektado.",
    "role.resident.title": "Residente",
    "role.resident.summary": "Tan-awa an usa nga lugar ngan bilnga an pinakaharani nga bukas nga evacuation center nga may lugar pa.",
    "role.center.title": "Staff han evacuation center",
    "role.center.summary": "Irekord an mga inabot ngan binaya, ngan ablihi o sirhi an center.",
    "role.board.title": "Publiko nga board",
    "role.board.summary": "An buhi nga warning, mga center ngan kapasidad, mababasa tikang ha harayo.",
  },
  fil: {
    "nav.start": "Simula",
    "start.heading": "Pumili ng tungkulin",
    "start.hint": "Bawat tungkulin ay isang view ng parehong live na datos. Para sa demo, buksan ang bawat tungkulin sa sariling window at ilagay ang mga window nang magkatabi.",
    "role.placeholder": "Hindi pa nagagawa ang view na ito. Nasa docs/brief.md ang mga kinakailangan nito.",
    "role.console.title": "Console ng CDRRMO",
    "role.console.summary": "Itaas o ibaba ang babala at tingnan kung aling mga barangay at pasilidad ang apektado.",
    "role.resident.title": "Residente",
    "role.resident.summary": "Suriin ang isang lugar at hanapin ang pinakamalapit na bukas na evacuation center na may puwang pa.",
    "role.center.title": "Kawani ng evacuation center",
    "role.center.summary": "Itala ang mga dumating at umalis, at buksan o isara ang center.",
    "role.board.title": "Pampublikong board",
    "role.board.summary": "Ang kasalukuyang babala, mga center at kapasidad, nababasa mula sa malayo.",
  },
});
