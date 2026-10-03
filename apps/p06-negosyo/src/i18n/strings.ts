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
    "app.title": "Negosyo Catbalogan",
    "app.tagline": "Hazard-aware business permits, from first question to appointment",
    "nav.start": "Start",
    "start.heading": "Choose a role",
    "start.hint": "Each role is one view of the same live data. For the demo, open each role in its own window and place the windows side by side.",
    "role.placeholder": "This view is not built yet. Its requirements are in docs/brief.md.",
    "role.applicant.title": "Applicant",
    "role.applicant.summary": "Requirements and fee estimate, a hazard check of the business location, then an appointment.",
    "role.bplo.title": "BPLO",
    "role.bplo.summary": "Today's appointments and the applications behind them.",
    "role.registry.title": "Public registry",
    "role.registry.summary": "Registered businesses and complaint lookup.",
  },
  war: {
    "nav.start": "Umpisa",
    "start.heading": "Pilia an papel",
    "start.hint": "Kada papel usa nga pagtan-aw han pareho nga buhi nga datos. Para ha demo, ablihi an kada papel ha kalugaringon nga window ngan ibutang an mga window nga magkatupad.",
    "role.placeholder": "Waray pa nahimo ini nga view. Aadi an mga kinahanglan hini ha docs/brief.md.",
    "role.applicant.title": "Aplikante",
    "role.applicant.summary": "Mga rekisito ngan banabana han bayad, pag-check han peligro ha lokasyon han negosyo, dayon appointment.",
    "role.bplo.title": "BPLO",
    "role.bplo.summary": "An mga appointment yana nga adlaw ngan an mga aplikasyon nga para hito.",
    "role.registry.title": "Publiko nga rehistro",
    "role.registry.summary": "Mga rehistrado nga negosyo ngan pagbiling han reklamo.",
  },
  fil: {
    "nav.start": "Simula",
    "start.heading": "Pumili ng tungkulin",
    "start.hint": "Bawat tungkulin ay isang view ng parehong live na datos. Para sa demo, buksan ang bawat tungkulin sa sariling window at ilagay ang mga window nang magkatabi.",
    "role.placeholder": "Hindi pa nagagawa ang view na ito. Nasa docs/brief.md ang mga kinakailangan nito.",
    "role.applicant.title": "Aplikante",
    "role.applicant.summary": "Mga kinakailangan at tantiya ng bayad, pagsuri ng panganib sa lokasyon ng negosyo, saka appointment.",
    "role.bplo.title": "BPLO",
    "role.bplo.summary": "Ang mga appointment ngayong araw at ang mga aplikasyong kaugnay nito.",
    "role.registry.title": "Pampublikong rehistro",
    "role.registry.summary": "Mga rehistradong negosyo at paghahanap ng reklamo.",
  },
});
