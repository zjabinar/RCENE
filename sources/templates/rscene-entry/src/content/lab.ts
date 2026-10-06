/**
 * Sample inputs for the AI lab (/admin/lab). Data, not UI copy: they stay in the
 * language a resident or an office would actually write. Re-skin them with the topic.
 * Places and people are generic (purok numbers, codes); no personal names.
 */
import type { AnswerDocument, ExtractField } from "@rcene/ai";

export const LAB_TRIAGE_TEXT =
  "Baha na ha Purok 2 kay barado an kanal. Mga 20 ka pamilya an diri makagawas, may-ada mga lagas ngan kabataan. Hangyo kami hin bulig dayon.";

export const LAB_EXTRACT_TEXT = `Good morning po. This is the purok leader of Purok 5, BRGY-07.
Households: 18 families were affected by the flooding last night.
Date of incident: 2026-10-05.
We need drinking water and sacks. Contact number: 0917-000-0000 (purok office).`;

export const LAB_EXTRACT_FIELDS: readonly ExtractField[] = [
  { id: "barangay", label: "Barangay", type: "text", required: true, description: "a code like BRGY-07" },
  { id: "households", label: "Households", type: "number", required: true },
  { id: "date", label: "Date of incident", type: "date" },
  { id: "kind", label: "Kind of incident", type: "choice", options: ["flood", "fire", "landslide", "outage", "other"] },
  { id: "needs", label: "Needs", type: "text" },
  { id: "contact", label: "Contact number", type: "text" },
];

export const LAB_DRAFT_PURPOSE = "tell the residents of Purok 2 that the clogged canal will be cleared tomorrow morning";

export const LAB_DRAFT_FACTS = ["Canal clearing: tomorrow, 7:00 to 11:00 AM", "Area: Purok 2, along the main canal", "Please keep garbage off the canal", "Questions: barangay hall desk"];

export const LAB_QUESTION = "Ano an kinahanglan para makakuha hin barangay clearance? (What do I need for a barangay clearance?)";

export const LAB_DOCUMENTS: readonly AnswerDocument[] = [
  {
    id: "DOC-01",
    title: "Barangay clearance: requirements",
    text: "Bring one valid ID and a community tax certificate (cedula). First-time applicants also bring proof of residence. The clearance is released within the day at the barangay hall desk, Monday to Friday, 8:00 AM to 5:00 PM.",
  },
  {
    id: "DOC-02",
    title: "Garbage collection schedule",
    text: "Biodegradable waste is collected on Mondays and Thursdays. Residual waste is collected on Tuesdays and Fridays. Do not leave bags on the canal side.",
  },
  {
    id: "DOC-03",
    title: "Water service interruption advisory",
    text: "The water district announced a service interruption in Puroks 3 and 4 on Wednesday from 9:00 AM to 3:00 PM for pipe repairs. Store water the night before.",
  },
];
