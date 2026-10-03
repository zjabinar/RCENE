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
    "app.title": "Kalinga Catbalogan",
    "app.tagline": "Vulnerability-aware social protection before the storm",
    "nav.start": "Start",
    "start.heading": "Choose a role",
    "start.hint": "Each role is one view of the same live data. For the demo, open each role in its own window and place the windows side by side.",
    "role.placeholder": "This view is not built yet. Its requirements are in docs/brief.md.",
    "role.planner.title": "CSWDO and BDRRMC",
    "role.planner.summary": "Rank barangays by vulnerability and build the pre-emptive evacuation priority list.",
    "role.field.title": "Tanod and BHW",
    "role.field.summary": "Work through the priority list and check households off as they move.",
  },
  war: {
    "nav.start": "Umpisa",
    "start.heading": "Pilia an papel",
    "start.hint": "Kada papel usa nga pagtan-aw han pareho nga buhi nga datos. Para ha demo, ablihi an kada papel ha kalugaringon nga window ngan ibutang an mga window nga magkatupad.",
    "role.placeholder": "Waray pa nahimo ini nga view. Aadi an mga kinahanglan hini ha docs/brief.md.",
    "role.planner.title": "CSWDO ngan BDRRMC",
    "role.planner.summary": "Ranggoha an mga barangay sumala ha kahuyang ngan himoa an listahan han prayoridad para ha pre-emptive nga pagbakwit.",
    "role.field.title": "Tanod ngan BHW",
    "role.field.summary": "Sundon an listahan han prayoridad ngan markahi an mga panimalay samtang nabalhin hira.",
  },
  fil: {
    "nav.start": "Simula",
    "start.heading": "Pumili ng tungkulin",
    "start.hint": "Bawat tungkulin ay isang view ng parehong live na datos. Para sa demo, buksan ang bawat tungkulin sa sariling window at ilagay ang mga window nang magkatabi.",
    "role.placeholder": "Hindi pa nagagawa ang view na ito. Nasa docs/brief.md ang mga kinakailangan nito.",
    "role.planner.title": "CSWDO at BDRRMC",
    "role.planner.summary": "Iranggo ang mga barangay ayon sa kahinaan at buuin ang listahan ng prayoridad para sa pre-emptive na paglikas.",
    "role.field.title": "Tanod at BHW",
    "role.field.summary": "Sundan ang listahan ng prayoridad at markahan ang mga sambahayan habang lumilipat sila.",
  },
});
