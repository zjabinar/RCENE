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
    "app.title": "Luntian Catbalogan",
    "app.tagline": "Waste, violations and coastal exposure for residents and planners",
    "nav.start": "Start",
    "start.heading": "Choose a role",
    "start.hint": "Each role is one view of the same live data. For the demo, open each role in its own window and place the windows side by side.",
    "role.placeholder": "This view is not built yet. Its requirements are in docs/brief.md.",
    "role.resident.title": "Resident",
    "role.resident.summary": "Your waste schedule, the segregation game and violation reports.",
    "role.enro.title": "ENRO",
    "role.enro.summary": "Incoming violation reports and their status.",
    "role.planner.title": "Planner",
    "role.planner.summary": "Sea-level-rise exposure and mangrove change by barangay.",
  },
  war: {
    "nav.start": "Umpisa",
    "start.heading": "Pilia an papel",
    "start.hint": "Kada papel usa nga pagtan-aw han pareho nga buhi nga datos. Para ha demo, ablihi an kada papel ha kalugaringon nga window ngan ibutang an mga window nga magkatupad.",
    "role.placeholder": "Waray pa nahimo ini nga view. Aadi an mga kinahanglan hini ha docs/brief.md.",
    "role.resident.title": "Residente",
    "role.resident.summary": "An imo iskedyul han basura, an dula han pagbulag ngan mga report han paglapas.",
    "role.enro.title": "ENRO",
    "role.enro.summary": "Mga inabot nga report han paglapas ngan an ira kahimtang.",
    "role.planner.title": "Planner",
    "role.planner.summary": "Kaladman han pagtaas han dagat ngan pagbag-o han bakhawan kada barangay.",
  },
  fil: {
    "nav.start": "Simula",
    "start.heading": "Pumili ng tungkulin",
    "start.hint": "Bawat tungkulin ay isang view ng parehong live na datos. Para sa demo, buksan ang bawat tungkulin sa sariling window at ilagay ang mga window nang magkatabi.",
    "role.placeholder": "Hindi pa nagagawa ang view na ito. Nasa docs/brief.md ang mga kinakailangan nito.",
    "role.resident.title": "Residente",
    "role.resident.summary": "Ang iyong iskedyul ng basura, ang laro ng paghihiwalay at mga ulat ng paglabag.",
    "role.enro.title": "ENRO",
    "role.enro.summary": "Mga dumating na ulat ng paglabag at ang kanilang katayuan.",
    "role.planner.title": "Tagaplano",
    "role.planner.summary": "Pagkakalantad sa pagtaas ng dagat at pagbabago ng bakawan bawat barangay.",
  },
});
