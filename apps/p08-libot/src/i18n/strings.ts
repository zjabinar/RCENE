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
    "app.title": "Libot Catbalogan+",
    "app.tagline": "Heritage trails, a check-before-you-go advisory and local enterprises",
    "nav.start": "Start",
    "start.heading": "Choose a role",
    "start.hint": "Each role is one view of the same live data. For the demo, open each role in its own window and place the windows side by side.",
    "role.placeholder": "This view is not built yet. Its requirements are in docs/brief.md.",
    "role.visitor.title": "Visitor",
    "role.visitor.summary": "Explore the heritage story map, build a trail and check the hazards before you go.",
    "role.directory.title": "Local enterprises",
    "role.directory.summary": "Find local guides and pasalubong shops near your trail.",
    "role.enterprise.title": "Enterprise owner",
    "role.enterprise.summary": "Keep your listing current: hours, offers and whether you are open today.",
  },
  war: {
    "nav.start": "Umpisa",
    "start.heading": "Pilia an papel",
    "start.hint": "Kada papel usa nga pagtan-aw han pareho nga buhi nga datos. Para ha demo, ablihi an kada papel ha kalugaringon nga window ngan ibutang an mga window nga magkatupad.",
    "role.placeholder": "Waray pa nahimo ini nga view. Aadi an mga kinahanglan hini ha docs/brief.md.",
    "role.visitor.title": "Bisita",
    "role.visitor.summary": "Usisaa an mapa han istorya han kabilin, paghimo hin trail ngan tan-awa an mga peligro antes ka kumadto.",
    "role.directory.title": "Lokal nga mga negosyo",
    "role.directory.summary": "Bilnga an mga lokal nga giya ngan tindahan hin pasalubong harani ha imo trail.",
    "role.enterprise.title": "Tag-iya han negosyo",
    "role.enterprise.summary": "Ig-update an imo listahan: oras, alok ngan kun bukas ka yana nga adlaw.",
  },
  fil: {
    "nav.start": "Simula",
    "start.heading": "Pumili ng tungkulin",
    "start.hint": "Bawat tungkulin ay isang view ng parehong live na datos. Para sa demo, buksan ang bawat tungkulin sa sariling window at ilagay ang mga window nang magkatabi.",
    "role.placeholder": "Hindi pa nagagawa ang view na ito. Nasa docs/brief.md ang mga kinakailangan nito.",
    "role.visitor.title": "Bisita",
    "role.visitor.summary": "Galugarin ang mapa ng kuwento ng pamana, bumuo ng trail at tingnan ang mga panganib bago ka pumunta.",
    "role.directory.title": "Mga lokal na negosyo",
    "role.directory.summary": "Hanapin ang mga lokal na gabay at tindahan ng pasalubong malapit sa iyong trail.",
    "role.enterprise.title": "May-ari ng negosyo",
    "role.enterprise.summary": "Panatilihing bago ang iyong listahan: oras, alok at kung bukas ka ngayong araw.",
  },
});
