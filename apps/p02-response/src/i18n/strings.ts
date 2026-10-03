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
    "app.title": "Bayanihan Response",
    "app.tagline": "From field report to relief, with every step on the record",
    "nav.start": "Start",
    "start.heading": "Choose a role",
    "start.hint": "Each role is one view of the same live data. For the demo, open each role in its own window and place the windows side by side.",
    "role.placeholder": "This view is not built yet. Its requirements are in docs/brief.md.",
    "role.report.title": "Field report",
    "role.report.summary": "File a geotagged damage report. It waits in a queue while offline.",
    "role.triage.title": "CDRRMO triage",
    "role.triage.summary": "Verify reports, set priority and assign relief.",
    "role.relief.title": "Relief volunteer",
    "role.relief.summary": "Scan household QR codes and record what each household received.",
    "role.public.title": "Public dashboard",
    "role.public.summary": "What relief reached which barangay, updated live.",
  },
  war: {
    "nav.start": "Umpisa",
    "start.heading": "Pilia an papel",
    "start.hint": "Kada papel usa nga pagtan-aw han pareho nga buhi nga datos. Para ha demo, ablihi an kada papel ha kalugaringon nga window ngan ibutang an mga window nga magkatupad.",
    "role.placeholder": "Waray pa nahimo ini nga view. Aadi an mga kinahanglan hini ha docs/brief.md.",
    "role.report.title": "Report tikang ha uma",
    "role.report.summary": "Pag-file hin report han kadaot nga may lokasyon. Naghuhulat ini ha pila samtang offline.",
    "role.triage.title": "Triage han CDRRMO",
    "role.triage.summary": "Siguroha an mga report, ibutang an prayoridad ngan i-assign an bulig.",
    "role.relief.title": "Boluntaryo ha bulig",
    "role.relief.summary": "I-scan an QR code han panimalay ngan irekord kon ano an nakarawat han kada panimalay.",
    "role.public.title": "Publiko nga dashboard",
    "role.public.summary": "Ano nga bulig an inabot ha kada barangay, gin-a-update dayon.",
  },
  fil: {
    "nav.start": "Simula",
    "start.heading": "Pumili ng tungkulin",
    "start.hint": "Bawat tungkulin ay isang view ng parehong live na datos. Para sa demo, buksan ang bawat tungkulin sa sariling window at ilagay ang mga window nang magkatabi.",
    "role.placeholder": "Hindi pa nagagawa ang view na ito. Nasa docs/brief.md ang mga kinakailangan nito.",
    "role.report.title": "Ulat mula sa field",
    "role.report.summary": "Mag-file ng ulat ng pinsala na may lokasyon. Naghihintay ito sa pila habang offline.",
    "role.triage.title": "Triage ng CDRRMO",
    "role.triage.summary": "Beripikahin ang mga ulat, itakda ang prayoridad at magtalaga ng tulong.",
    "role.relief.title": "Boluntaryo sa relief",
    "role.relief.summary": "I-scan ang QR code ng sambahayan at itala kung ano ang natanggap ng bawat sambahayan.",
    "role.public.title": "Pampublikong dashboard",
    "role.public.summary": "Anong tulong ang nakarating sa bawat barangay, ina-update agad.",
  },
});
