/**
 * How this app's requests meet the generic AI tasks in @rcene/ai: the categories and
 * their keywords for triage, the facts for the briefing, the facts for a drafted
 * update. Pure functions (labels come in already translated), so a re-skin changes
 * the vocabulary here and the AI follows.
 */
import { URGENT_KEYWORDS, type AiResult, type BriefInput, type ClassifyInput, type ClassifyOutput, type DraftInput } from "@rcene/ai";
import { computeKpis, isOverdue } from "./kpis.ts";
import { CATEGORIES, PRIORITIES, newestFirst, type Category, type Priority, type RequestRecord, type Status, type TriageInfo } from "./records.ts";

/** Words residents use for each category (English, Filipino, Waray). The demo rules match them; models see them as hints. */
export const CATEGORY_KEYWORDS: Record<Category, readonly string[]> = {
  water: ["water", "tap", "pipe", "leak", "leaking", "faucet", "no water", "tubig", "gripo", "tagas", "walang tubig", "waray tubig"],
  road: ["road", "pothole", "bridge", "footbridge", "sidewalk", "kalsada", "daan", "dalan", "lubak", "tulay", "baha sa daan"],
  waste: ["garbage", "trash", "waste", "rubbish", "burning", "canal", "clogged", "drainage", "basura", "sukal", "kalat", "kanal", "barado", "sunog ng basura"],
  streetlight: ["streetlight", "light", "lamp", "post", "dark", "ilaw", "poste", "suga", "madulom", "madilim"],
  permit: ["permit", "clearance", "certificate", "business", "requirements", "negosyo", "sertipiko", "papeles", "lisensya"],
};

/** The office's first moves per category (the demo rules recommend them; English, as staff write them). */
export const CATEGORY_ACTIONS: Record<Category, readonly string[]> = {
  water: ["Ask the water district for the outage schedule", "Send the water truck if the outage passes one day"],
  road: ["Inspect the spot and put up a warning sign", "Schedule the road crew"],
  waste: ["Add the street to the next collection run", "Remind the purok leader about burning rules"],
  streetlight: ["Report the post number to the electric cooperative", "Schedule the barangay electrician"],
  permit: ["Send the list of requirements", "Set a release date at the desk"],
};

/** Ready-made reports for the demo ("Fill a sample report"): no typing on stage. */
export const SAMPLE_REPORTS: readonly string[] = [
  "Waray tubig ha Purok 4 tikang pa Lunes. Mga 35 ka pamilya an apektado, damu an kabataan ngan lagas.",
  "Malaking lubak sa kalsada papunta sa health center. May naaksidente nang motorsiklo kagabi.",
  "Garbage has not been collected on our street for two weeks and the canal is now blocked.",
  "The streetlight near the chapel has been out for a week; students walk home in the dark.",
];

export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}

export function isPriority(value: string): value is Priority {
  return (PRIORITIES as readonly string[]).includes(value);
}

/** The triage task's input for one report. */
export function triageInput(text: string, categoryLabel: (c: Category) => string, priorityLabel: (p: Priority) => string): ClassifyInput {
  return {
    text,
    subject: "barangay service request",
    categories: CATEGORIES.map((id) => ({ id, label: categoryLabel(id), keywords: CATEGORY_KEYWORDS[id], actions: CATEGORY_ACTIONS[id] })),
    priorities: PRIORITIES.map((id) => ({ id, label: priorityLabel(id), ...(id === "urgent" && { keywords: URGENT_KEYWORDS }) })),
    context: "The barangay office files the request, sends a crew and tells the resident the reference code. Urgent means people's health or safety is at risk, or many households are affected.",
  };
}

/** The suggestion as the wizard applies it, or null when the answer names an unknown category or priority. */
export function triageSuggestion(result: AiResult<ClassifyOutput>): Omit<TriageInfo, "decision"> | null {
  const { category, priority, confidence } = result.data;
  if (!isCategory(category) || !isPriority(priority)) return null;
  return { category, priority, confidence, mode: result.mode, provider: result.provider === "demo" && result.requested ? result.requested : result.provider, ...(result.model && { model: result.model }) };
}

/** What gets stored with the record: the suggestion and whether the staff kept it. */
export function triageDecision(suggestion: Omit<TriageInfo, "decision">, final: { category: Category; priority: Priority }): TriageInfo {
  const decision = suggestion.category === final.category && suggestion.priority === final.priority ? "accepted" : "changed";
  return { ...suggestion, decision };
}

export interface BriefLabels {
  title: string;
  audience: string;
  facts: { open: string; due: string; overdue: string; done: string; average: string };
  category: (c: Category) => string;
  priority: (p: Priority) => string;
  status: (s: Status) => string;
}

/** The briefing's input: the KPIs as facts, and the open requests (newest first) as one line each with tags. */
export function briefInput(records: readonly RequestRecord[], now: string, labels: BriefLabels, max = 40): BriefInput {
  const kpis = computeKpis(records, now);
  const open = newestFirst(records.filter((r) => r.status !== "done")).slice(0, max);
  return {
    title: labels.title,
    audience: labels.audience,
    facts: {
      [labels.facts.open]: kpis.open,
      [labels.facts.due]: kpis.dueThisWeek,
      [labels.facts.overdue]: kpis.overdue,
      [labels.facts.done]: kpis.done,
      ...(kpis.averageDays !== null && { [labels.facts.average]: Math.round(kpis.averageDays * 10) / 10 }),
    },
    items: open.map((r) => {
      const overdue = isOverdue(r, now);
      return {
        id: r.code,
        text: [labels.category(r.category), labels.priority(r.priority), r.barangay, labels.status(r.status), overdue ? "overdue" : "", r.details].filter(Boolean).join(" · "),
        tags: [labels.category(r.category), ...(r.priority === "urgent" ? ["urgent"] : []), ...(overdue ? ["overdue"] : [])],
      };
    }),
    riskTags: ["urgent", "overdue"],
  };
}

/** What the update to the resident should say, by the request's step. */
const PURPOSE: Record<Status, string> = {
  received: "confirm that the request was received and give the reference code",
  review: "say that the office is reviewing the request",
  scheduled: "say that a crew visit is scheduled and when the target date is",
  done: "say that the request is done and invite feedback",
};

export interface DraftLabels {
  category: string;
  status: string;
  due: string;
  sender: string;
}

/** The drafted SMS update for one request: only facts the record holds. */
export function draftInput(record: RequestRecord, labels: DraftLabels): DraftInput {
  return {
    kind: "sms",
    audience: `the resident who filed ${record.code}`,
    purpose: PURPOSE[record.status],
    tone: record.priority === "urgent" ? "urgent" : "friendly",
    sender: labels.sender,
    facts: [
      `Reference code: ${record.code}`,
      `Request: ${labels.category} in ${record.barangay}`,
      `Current step: ${labels.status}`,
      `Target date: ${labels.due}`,
    ],
  };
}
