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
    "app.title": "Serbisyo Catbalogan",
    "app.tagline": "One-stop citizen services in Waray, Filipino and English",
    "nav.start": "Start",
    "start.heading": "Choose a role",
    "start.hint": "Each role is one view of the same live data. For the demo, open each role in its own window and place the windows side by side.",
    "role.placeholder": "This view is not built yet. Its requirements are in docs/brief.md.",
    "role.resident.title": "Resident",
    "role.resident.summary": "Find a service in your own words, request it, get a ticket and track it.",
    "role.staff.title": "Frontline staff",
    "role.staff.summary": "Call the next ticket and move requests through their steps.",
    "role.display.title": "Now Serving display",
    "role.display.summary": "The queue board for the waiting area.",
  },
  war: {
    "nav.start": "Umpisa",
    "start.heading": "Pilia an papel",
    "start.hint": "Kada papel usa nga pagtan-aw han pareho nga buhi nga datos. Para ha demo, ablihi an kada papel ha kalugaringon nga window ngan ibutang an mga window nga magkatupad.",
    "role.placeholder": "Waray pa nahimo ini nga view. Aadi an mga kinahanglan hini ha docs/brief.md.",
    "role.resident.title": "Residente",
    "role.resident.summary": "Bilnga an serbisyo gamit an imo kalugaringon nga pulong, hangyoa ini, kumuha hin ticket ngan sunda ini.",
    "role.staff.title": "Staff ha atubangan",
    "role.staff.summary": "Tawaga an sunod nga ticket ngan isulong an mga hangyo ha ira mga lakang.",
    "role.display.title": "Display han ginsisilbihan",
    "role.display.summary": "An board han pila para ha hulatan.",
  },
  fil: {
    "nav.start": "Simula",
    "start.heading": "Pumili ng tungkulin",
    "start.hint": "Bawat tungkulin ay isang view ng parehong live na datos. Para sa demo, buksan ang bawat tungkulin sa sariling window at ilagay ang mga window nang magkatabi.",
    "role.placeholder": "Hindi pa nagagawa ang view na ito. Nasa docs/brief.md ang mga kinakailangan nito.",
    "role.resident.title": "Residente",
    "role.resident.summary": "Hanapin ang serbisyo sa sarili mong salita, hilingin ito, kumuha ng tiket at subaybayan ito.",
    "role.staff.title": "Kawani sa harapan",
    "role.staff.summary": "Tawagin ang susunod na tiket at isulong ang mga kahilingan sa kanilang mga hakbang.",
    "role.display.title": "Display ng pinagsisilbihan",
    "role.display.summary": "Ang board ng pila para sa hintayan.",
  },
});
