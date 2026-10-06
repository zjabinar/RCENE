/**
 * Sample inputs for the AI lab (/admin/lab), for Catbalogan disaster preparedness.
 * Data, not UI copy: they stay in the language a resident or a barangay would actually
 * write. Places use codes (BRGY-07, Purok 2, CTR-03); no personal names.
 */
import { URGENT_KEYWORDS, type AnswerDocument, type BriefInput, type ClassifyOption, type ExtractField } from "@rcene/ai";

export const LAB_TRIAGE_TEXT =
  "Baha na ha Purok 2 kay nag-awas an suba. Mga 20 ka pamilya an diri makagawas, may-ada mga lagas ngan kabataan. Hangyo kami hin rescue dayon.";

/** Incident kinds a CDRRMO operator sorts reports into. Keywords in English, Filipino and Waray. */
export const LAB_INCIDENT_CATEGORIES: readonly ClassifyOption[] = [
  {
    id: "flood",
    label: "Flood",
    keywords: ["flood", "flooding", "water rising", "river", "overflow", "baha", "bumabaha", "suba", "nag-awas", "tubig"],
    actions: ["Send the rescue team with a boat", "Open the nearest evacuation center with room"],
  },
  {
    id: "landslide",
    label: "Landslide",
    keywords: ["landslide", "mudslide", "soil", "cracks", "pagguho", "guho", "pagdahili", "tuna"],
    actions: ["Close the road and keep people away from the slope", "Ask the MGB focal person to inspect"],
  },
  {
    id: "stormSurge",
    label: "Storm surge",
    keywords: ["storm surge", "waves", "sea", "coastal", "daluyong", "dagat", "balod", "baybayon"],
    actions: ["Evacuate coastal puroks now", "Keep boats ashore"],
  },
  {
    id: "rescue",
    label: "Trapped or injured people",
    keywords: ["trapped", "injured", "rescue", "stranded", "na-trap", "sugatan", "samaran", "bulig", "tulong"],
    actions: ["Dispatch the rescue team", "Alert the health office"],
  },
  {
    id: "other",
    label: "Other",
    keywords: ["power", "outage", "fallen tree", "road blocked", "kuryente", "punoan", "kahoy"],
    actions: ["Log the report and assign it to the duty officer"],
  },
];

export const LAB_PRIORITIES: readonly ClassifyOption[] = [
  { id: "normal", label: "Normal" },
  { id: "urgent", label: "Urgent", keywords: URGENT_KEYWORDS },
];

export const LAB_TRIAGE_CONTEXT =
  "Catbalogan City CDRRMO operations center during a typhoon warning. Urgent means people's lives or safety are at risk now, or many households are affected.";

/** Sample exposure facts for the briefing (synthetic, coded barangays). */
export const LAB_BRIEF: Omit<BriefInput, "title" | "audience"> = {
  facts: { "Barangays in a mapped flood zone": 18, "Barangays in a mapped storm-surge zone": 9, "Open evacuation centers": 6, "Centers above 80% capacity": 2 },
  items: [
    { id: "BRGY-03", text: "BRGY-03 · flood high · storm surge high · coastal", tags: ["flood", "high", "coastal"] },
    { id: "BRGY-07", text: "BRGY-07 · flood moderate · landslide high", tags: ["flood", "landslide", "high"] },
    { id: "BRGY-12", text: "BRGY-12 · storm surge very high · coastal", tags: ["stormSurge", "high", "coastal"] },
    { id: "CTR-02", text: "CTR-02 · evacuation center · 92% full", tags: ["capacity", "urgent"] },
    { id: "CTR-05", text: "CTR-05 · evacuation center · 85% full", tags: ["capacity"] },
  ],
  riskTags: ["high", "urgent"],
};

export const LAB_EXTRACT_TEXT = `Good morning po. This is the purok leader of Purok 5, BRGY-07.
Households: 18 families were affected by the flooding last night.
Date of incident: 2026-10-05.
We need drinking water and sacks. Contact number: 0917-000-0000 (purok office).`;

export const LAB_EXTRACT_FIELDS: readonly ExtractField[] = [
  { id: "barangay", label: "Barangay", type: "text", required: true, description: "a code like BRGY-07" },
  { id: "households", label: "Households", type: "number", required: true },
  { id: "date", label: "Date of incident", type: "date" },
  { id: "kind", label: "Kind of incident", type: "choice", options: ["flood", "landslide", "storm surge", "fire", "other"] },
  { id: "needs", label: "Needs", type: "text" },
  { id: "contact", label: "Contact number", type: "text" },
];

export const LAB_DRAFT_PURPOSE = "tell the residents of coastal puroks in BRGY-12 to move to the evacuation center now";

export const LAB_DRAFT_FACTS = [
  "Storm surge warning for the coast of Catbalogan",
  "Go to CTR-03 (the school gym); it is open and has room",
  "Bring water, medicine and documents",
  "Help: the barangay hall and the CDRRMO hotline",
];

export const LAB_QUESTION = "Diin ako makadto kon may storm surge warning? (Where do I go when there is a storm surge warning?)";

export const LAB_DOCUMENTS: readonly AnswerDocument[] = [
  {
    id: "DOC-01",
    title: "Storm surge warning: what to do",
    text: "When a storm surge warning is raised, residents of coastal puroks move inland to the nearest open evacuation center with room. Do not wait for the water. Bring water, medicine and documents.",
  },
  {
    id: "DOC-02",
    title: "Evacuation centers",
    text: "Evacuation centers open when the CDRRMO raises the warning. The public board and the resident view show which centers are open and how full they are. Sites from OpenStreetMap are candidates, not verified by the CDRRMO.",
  },
  {
    id: "DOC-03",
    title: "Hazard map answers",
    text: "The app answers in three ways: in a mapped hazard zone (with its level), not in a mapped zone, or outside data coverage. Not being in a mapped zone does not mean a place cannot be affected.",
  },
];
