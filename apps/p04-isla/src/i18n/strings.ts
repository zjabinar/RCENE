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
    "app.title": "Isla Link",
    "app.tagline": "Island barangays, their needs and the boats that answer them",
    "nav.start": "Start",
    "start.heading": "Choose a role",
    "start.hint": "Each role is one view of the same live data. For the demo, open each role in its own window and place the windows side by side.",
    "role.placeholder": "This view is not built yet. Its requirements are in docs/brief.md.",
    "role.island.title": "Island barangay",
    "role.island.summary": "Post today's status and needs: water, rice, medicine, patients to transfer.",
    "role.ops.title": "CDRRMO and port office",
    "role.ops.summary": "Watch the needs board and dispatch boat runs.",
    "role.advisory.title": "Sea-travel advisory",
    "role.advisory.summary": "The public advisory, which follows the tropical-cyclone signal.",
  },
  war: {
    "nav.start": "Umpisa",
    "start.heading": "Pilia an papel",
    "start.hint": "Kada papel usa nga pagtan-aw han pareho nga buhi nga datos. Para ha demo, ablihi an kada papel ha kalugaringon nga window ngan ibutang an mga window nga magkatupad.",
    "role.placeholder": "Waray pa nahimo ini nga view. Aadi an mga kinahanglan hini ha docs/brief.md.",
    "role.island.title": "Barangay ha isla",
    "role.island.summary": "I-post an kahimtang ngan kinahanglan yana nga adlaw: tubig, bugas, bulong, pasyente nga ibabalhin.",
    "role.ops.title": "CDRRMO ngan opisina han pantalan",
    "role.ops.summary": "Bantayi an board han mga kinahanglan ngan magpadara hin biyahe han sakayan.",
    "role.advisory.title": "Advisory ha pagbiyahe ha dagat",
    "role.advisory.summary": "An publiko nga advisory, nasunod ha signal han bagyo.",
  },
  fil: {
    "nav.start": "Simula",
    "start.heading": "Pumili ng tungkulin",
    "start.hint": "Bawat tungkulin ay isang view ng parehong live na datos. Para sa demo, buksan ang bawat tungkulin sa sariling window at ilagay ang mga window nang magkatabi.",
    "role.placeholder": "Hindi pa nagagawa ang view na ito. Nasa docs/brief.md ang mga kinakailangan nito.",
    "role.island.title": "Barangay sa isla",
    "role.island.summary": "I-post ang kalagayan at pangangailangan ngayong araw: tubig, bigas, gamot, pasyenteng ililipat.",
    "role.ops.title": "CDRRMO at tanggapan ng pantalan",
    "role.ops.summary": "Bantayan ang board ng mga pangangailangan at magpadala ng biyahe ng bangka.",
    "role.advisory.title": "Abiso sa paglalakbay sa dagat",
    "role.advisory.summary": "Ang pampublikong abiso, na sumusunod sa signal ng bagyo.",
  },
});
