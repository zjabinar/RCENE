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
    "app.title": "Barangay 360",
    "app.tagline": "One screen per barangay for its officials and residents",
    "nav.start": "Start",
    "start.heading": "Choose a role",
    "start.hint": "Each role is one view of the same live data. For the demo, open each role in its own window and place the windows side by side.",
    "role.placeholder": "This view is not built yet. Its requirements are in docs/brief.md.",
    "role.captain.title": "Punong Barangay",
    "role.captain.summary": "Profile and trends, hazard exposure, open requests and announcements for one barangay.",
    "role.resident.title": "Resident",
    "role.resident.summary": "Your barangay's announcements, urgent first, in your own language.",
  },
  war: {
    "nav.start": "Umpisa",
    "start.heading": "Pilia an papel",
    "start.hint": "Kada papel usa nga pagtan-aw han pareho nga buhi nga datos. Para ha demo, ablihi an kada papel ha kalugaringon nga window ngan ibutang an mga window nga magkatupad.",
    "role.placeholder": "Waray pa nahimo ini nga view. Aadi an mga kinahanglan hini ha docs/brief.md.",
    "role.captain.title": "Punong Barangay",
    "role.captain.summary": "Profile ngan mga trend, kaladman ha peligro, bukas nga mga hangyo ngan anunsyo para ha usa nga barangay.",
    "role.resident.title": "Residente",
    "role.resident.summary": "Mga anunsyo han imo barangay, an dinalian anay, ha imo kalugaringon nga pinulongan.",
  },
  fil: {
    "nav.start": "Simula",
    "start.heading": "Pumili ng tungkulin",
    "start.hint": "Bawat tungkulin ay isang view ng parehong live na datos. Para sa demo, buksan ang bawat tungkulin sa sariling window at ilagay ang mga window nang magkatabi.",
    "role.placeholder": "Hindi pa nagagawa ang view na ito. Nasa docs/brief.md ang mga kinakailangan nito.",
    "role.captain.title": "Punong Barangay",
    "role.captain.summary": "Profile at mga trend, pagkakalantad sa panganib, bukas na kahilingan at anunsyo para sa isang barangay.",
    "role.resident.title": "Residente",
    "role.resident.summary": "Mga anunsyo ng iyong barangay, ang mga apurahan muna, sa sarili mong wika.",
  },
});
