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
    "app.title": "Bukas Catbalogan",
    "app.tagline": "See the city's data, follow its projects, vote on its budget",
    "nav.start": "Start",
    "start.heading": "Choose a role",
    "start.hint": "Each role is one view of the same live data. For the demo, open each role in its own window and place the windows side by side.",
    "role.placeholder": "This view is not built yet. Its requirements are in docs/brief.md.",
    "role.story.title": "Data story",
    "role.story.summary": "A scroll story that explains the city's data.",
    "role.projects.title": "Projects map",
    "role.projects.summary": "What is being built, where, and how far along it is.",
    "role.budget.title": "Budget vote",
    "role.budget.summary": "Allocate a virtual budget, vote and leave feedback.",
    "role.planning.title": "Planning office",
    "role.planning.summary": "Live results and feedback from residents.",
  },
  war: {
    "nav.start": "Umpisa",
    "start.heading": "Pilia an papel",
    "start.hint": "Kada papel usa nga pagtan-aw han pareho nga buhi nga datos. Para ha demo, ablihi an kada papel ha kalugaringon nga window ngan ibutang an mga window nga magkatupad.",
    "role.placeholder": "Waray pa nahimo ini nga view. Aadi an mga kinahanglan hini ha docs/brief.md.",
    "role.story.title": "Istorya han datos",
    "role.story.summary": "Usa nga scroll nga istorya nga nagpapasabot han datos han syudad.",
    "role.projects.title": "Mapa han mga proyekto",
    "role.projects.summary": "Ano an ginhihimo, diin, ngan kun tagpira na an kauswagan.",
    "role.budget.title": "Pagboto ha budget",
    "role.budget.summary": "Pag-allocate hin virtual nga budget, bumoto ngan magbilin hin feedback.",
    "role.planning.title": "Opisina han pagplano",
    "role.planning.summary": "Buhi nga resulta ngan feedback tikang ha mga residente.",
  },
  fil: {
    "nav.start": "Simula",
    "start.heading": "Pumili ng tungkulin",
    "start.hint": "Bawat tungkulin ay isang view ng parehong live na datos. Para sa demo, buksan ang bawat tungkulin sa sariling window at ilagay ang mga window nang magkatabi.",
    "role.placeholder": "Hindi pa nagagawa ang view na ito. Nasa docs/brief.md ang mga kinakailangan nito.",
    "role.story.title": "Kuwento ng datos",
    "role.story.summary": "Isang scroll na kuwento na nagpapaliwanag sa datos ng lungsod.",
    "role.projects.title": "Mapa ng mga proyekto",
    "role.projects.summary": "Ano ang itinatayo, saan, at gaano na kalayo ang usad.",
    "role.budget.title": "Pagboto sa budget",
    "role.budget.summary": "Maglaan ng virtual na budget, bumoto at mag-iwan ng feedback.",
    "role.planning.title": "Tanggapan ng pagpaplano",
    "role.planning.summary": "Kasalukuyang resulta at feedback mula sa mga residente.",
  },
});
