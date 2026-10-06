import { describe, expect, it } from "vitest";
import { briefTask, classifyTask, draftTask, type AiResult, type ClassifyOutput } from "@rcene/ai";
import { CATEGORIES, seedRecords } from "./records.ts";
import { SAMPLE_REPORTS, briefInput, draftInput, triageDecision, triageInput, triageSuggestion } from "./triage.ts";

const label = (s: string) => s.toUpperCase();
const NOW = "2026-10-07T10:00:00+08:00";

describe("triage", () => {
  it("offers every category with keywords and actions, and urgency words for 'urgent'", () => {
    const input = triageInput("x", label, label);
    expect(input.categories.map((c) => c.id)).toEqual([...CATEGORIES]);
    for (const c of input.categories) expect(c.keywords?.length).toBeGreaterThan(3);
    expect(input.priorities?.find((p) => p.id === "urgent")?.keywords?.length).toBeGreaterThan(10);
  });

  it("the demo rules sort the sample reports sensibly", () => {
    const answers = SAMPLE_REPORTS.map((text) => classifyTask.demo(triageInput(text, label, label), "en"));
    expect(answers.map((a) => a.category)).toEqual(["water", "road", "waste", "streetlight"]);
    expect(answers[0]!.priority).toBe("urgent");
    expect(answers[1]!.priority).toBe("urgent");
  });

  it("keeps the suggestion, and records whether the staff changed it", () => {
    const result: AiResult<ClassifyOutput> = {
      task: "triage",
      mode: "fallback",
      provider: "demo",
      requested: "openai",
      latencyMs: 3,
      at: NOW,
      data: { category: "water", priority: "urgent", confidence: 0.8, summary: "", key_findings: [], recommended_actions: [], rationale: [] },
    };
    const suggestion = triageSuggestion(result)!;
    expect(suggestion).toMatchObject({ category: "water", priority: "urgent", mode: "fallback", provider: "openai" });
    expect(triageDecision(suggestion, { category: "water", priority: "urgent" }).decision).toBe("accepted");
    expect(triageDecision(suggestion, { category: "road", priority: "urgent" }).decision).toBe("changed");
    expect(triageSuggestion({ ...result, data: { ...result.data, category: "sky" } })).toBeNull();
  });
});

describe("briefing and draft inputs", () => {
  const records = seedRecords();

  it("briefs on the KPIs and the open requests, tagging urgent and overdue ones", () => {
    const input = briefInput(records, NOW, {
      title: "Week",
      audience: "Punong Barangay",
      facts: { open: "Open", due: "Due", overdue: "Overdue", done: "Done", average: "Average" },
      category: label,
      priority: label,
      status: label,
    });
    expect(input.facts.Open).toBe(records.filter((r) => r.status !== "done").length);
    expect(input.items.length).toBe(records.filter((r) => r.status !== "done").length);
    expect(() => briefTask.output(input).parse(briefTask.demo(input, "en"))).not.toThrow();
  });

  it("drafts an update from the record's facts only", () => {
    const record = records[0]!;
    const input = draftInput(record, { category: "Water", status: "Received", due: "Oct 9", sender: "Barangay Service Desk" });
    expect(input.facts.join(" ")).toContain(record.code);
    expect(draftTask.demo(input, "en").sms.length).toBeLessThanOrEqual(160);
  });
});
