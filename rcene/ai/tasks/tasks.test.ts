import { describe, expect, it } from "vitest";
import { LANGS } from "@rcene/i18n";
import { answerSchema, buildTaskRequest, type AiTask } from "../task.ts";
import { NOT_FOUND, answerTask, type AnswerInput } from "./answer.ts";
import { briefTask, type BriefInput } from "./brief.ts";
import { classifyTask, type ClassifyInput } from "./classify.ts";
import { SMS_LIMIT, draftTask, fitSms, type DraftInput } from "./draft.ts";
import { extractTask, findDate, type ExtractInput } from "./extract.ts";
import { pingTask } from "./ping.ts";
import { matchKeywords, normalizeText } from "./text.ts";

const CATEGORIES: ClassifyInput["categories"] = [
  { id: "water", label: "Water supply", keywords: ["tubig", "gripo", "no water", "leak", "pipe"] },
  { id: "road", label: "Roads", keywords: ["kalsada", "pothole", "lubak", "bridge"] },
  { id: "waste", label: "Garbage", keywords: ["basura", "garbage", "trash"] },
];

const CLASSIFY: ClassifyInput = { text: "Waray tubig ha amon purok tikang pa Lunes. Mga 40 households an apektado.", categories: CATEGORIES, subject: "service request" };
const BRIEF: BriefInput = {
  title: "Service requests this week",
  facts: { "Open requests": 12, Overdue: 2 },
  items: [
    { id: "REC-0001", text: "water · urgent", tags: ["water", "urgent"] },
    { id: "REC-0002", text: "road · overdue", tags: ["road", "overdue"] },
    { id: "REC-0003", text: "water", tags: ["water"] },
  ],
};
const EXTRACT: ExtractInput = {
  text: "Barangay: BRGY-05\nHouseholds: 25 families affected. Incident date 2026-10-05. Type flood.",
  fields: [
    { id: "barangay", label: "Barangay", type: "text", required: true },
    { id: "households", label: "Households", type: "number" },
    { id: "date", label: "Incident date", type: "date" },
    { id: "type", label: "Type", type: "choice", options: ["flood", "fire", "landslide"] },
    { id: "contact", label: "Contact number", type: "text", required: true },
  ],
};
const DRAFT: DraftInput = { kind: "sms", audience: "the resident who filed REC-0012", purpose: "the crew visit is scheduled", facts: ["REC-0012 is scheduled", "Crew visit: Thursday morning"], sender: "Barangay Service Desk" };
const ANSWER: AnswerInput = {
  question: "What do I need for a barangay clearance?",
  documents: [
    { id: "DOC-1", title: "Barangay clearance", text: "Bring one valid ID and a cedula. The barangay clearance fee is set by ordinance. Release is within the day." },
    { id: "DOC-2", title: "Garbage schedule", text: "Biodegradable waste is collected on Mondays." },
  ],
};

const CASES: [string, AiTask<never, unknown>, unknown][] = [
  ["triage", classifyTask as AiTask<never, unknown>, CLASSIFY],
  ["briefing", briefTask as AiTask<never, unknown>, BRIEF],
  ["extract", extractTask as AiTask<never, unknown>, EXTRACT],
  ["draft", draftTask as AiTask<never, unknown>, DRAFT],
  ["answer", answerTask as AiTask<never, unknown>, ANSWER],
  ["ping", pingTask as AiTask<never, unknown>, {}],
];

describe.each(CASES)("task %s", (_id, task, input) => {
  it("has a JSON Schema for the providers and a prompt", () => {
    const schema = answerSchema(task, input as never);
    expect(schema.type).toBe("object");
    const req = buildTaskRequest(task, input as never, "en");
    expect(req.prompt.length).toBeGreaterThan(0);
    expect(req.schemaName).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("answers with demo rules that pass its own schema, in every language", () => {
    for (const lang of LANGS) expect(() => task.output(input as never).parse(task.demo(input as never, lang))).not.toThrow();
  });
});

describe("text helpers", () => {
  it("matches whole words and phrases across accents and case", () => {
    expect(normalizeText("Walang  TUBIG!")).toBe("walang tubig");
    expect(matchKeywords("Walang tubig sa Purok 3", ["tubig", "walang tubig", "ubig"])).toEqual(["tubig", "walang tubig"]);
  });
});

describe("classify demo rules", () => {
  it("picks the category by keywords, raises priority on urgency words and reads households", () => {
    const out = classifyTask.demo(CLASSIFY, "en");
    expect(out.category).toBe("water");
    expect(out.priority).toBe("urgent"); // "waray tubig" is an urgency phrase
    expect(out.key_findings.join(" ")).toContain("40 households");
    expect(out.confidence).toBeGreaterThan(0.5);
  });

  it("stays low-confidence and normal when nothing matches", () => {
    const out = classifyTask.demo({ text: "Hello po, may tanong lang ako.", categories: CATEGORIES }, "en");
    expect(out).toMatchObject({ category: "water", priority: "normal" });
    expect(out.confidence).toBeLessThan(0.5);
  });

  it("maps a label answer from a model back to the id", () => {
    const fixed = classifyTask.normalize!({ category: "Garbage", priority: "URGENT" }, CLASSIFY) as Record<string, unknown>;
    expect(fixed).toMatchObject({ category: "waste", priority: "urgent" });
  });
});

describe("brief demo rules", () => {
  it("quotes the facts and names the risky records", () => {
    const out = briefTask.demo(BRIEF, "en");
    expect(out.key_findings).toContain("Open requests: 12");
    expect(out.risks.join(" ")).toContain("REC-0001");
    expect(out.recommended_actions[0]).toContain("urgent");
  });
});

describe("extract demo rules", () => {
  it("fills labelled values, numbers, dates and options, and lists missing required fields", () => {
    const out = extractTask.demo(EXTRACT, "en");
    expect(out.values).toMatchObject({ barangay: "BRGY-05", households: 25, date: "2026-10-05", type: "flood", contact: null });
    expect(out.missing).toEqual(["contact"]);
  });

  it("finds dates in several formats", () => {
    expect(findDate("on 7/10/2026")).toBe("2026-10-07");
    expect(findDate("Oct 7, 2026")).toBe("2026-10-07");
    expect(findDate("7 October 2026")).toBe("2026-10-07");
    expect(findDate("someday")).toBeNull();
  });

  it("counts a field the model left out as null", () => {
    const fixed = extractTask.normalize!({ values: { barangay: "BRGY-01" }, missing: [], confidence: 0.9, notes: [] }, EXTRACT) as { values: Record<string, unknown> };
    expect(fixed.values).toMatchObject({ barangay: "BRGY-01", households: null, contact: null });
  });
});

describe("draft demo rules", () => {
  it("writes a body with every fact and an SMS within the limit", () => {
    const out = draftTask.demo(DRAFT, "en");
    for (const fact of DRAFT.facts) expect(out.body).toContain(fact);
    expect(out.sms.length).toBeLessThanOrEqual(SMS_LIMIT);
  });

  it("fitSms cuts at a word", () => {
    const long = "word ".repeat(60);
    const sms = fitSms(long);
    expect(sms.length).toBeLessThanOrEqual(SMS_LIMIT);
    expect(sms.endsWith("…")).toBe(true);
  });
});

describe("answer demo rules", () => {
  it("answers from the best document and cites it", () => {
    const out = answerTask.demo(ANSWER, "en");
    expect(out.citations).toEqual(["DOC-1"]);
    expect(out.answer).toContain("valid ID");
  });

  it("says it does not know when no document matches", () => {
    expect(answerTask.demo({ ...ANSWER, question: "Who won the basketball league?" }, "en").answer).toBe(NOT_FOUND);
  });
});
