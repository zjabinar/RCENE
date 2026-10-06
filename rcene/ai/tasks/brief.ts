/**
 * Executive briefing: turn the app's numbers and recent records into a short,
 * decision-ready brief for a head of office (headline, findings, risks, actions).
 * The app computes the facts (counts, overdue items) itself; the model only reads them,
 * so no number in the brief is invented.
 */
import { z } from "zod";
import { confidenceSchema, defineAiTask, textListSchema } from "../task.ts";

export interface BriefItem {
  id: string;
  /** One line about the record, e.g. "REC-0012 · water · urgent · BRGY-03 · no water for 3 days". */
  text: string;
  /** Short tags the demo rules count ("water", "urgent", "overdue"). */
  tags?: readonly string[];
}

export interface BriefInput {
  /** What is being briefed: "Barangay service requests, week of 30 Sep". */
  title: string;
  /** Who reads it: "Punong Barangay". */
  audience?: string;
  /** Numbers the app computed, by label: { "Open requests": 12, "Overdue": 3 }. */
  facts: Readonly<Record<string, string | number>>;
  /** The records behind the numbers (keep it under ~60). */
  items: readonly BriefItem[];
  /** A question to answer or an angle ("Which crews need help?"). */
  focus?: string;
  /** Tags that count as risks in the demo rules. Default: urgent, overdue. */
  riskTags?: readonly string[];
}

export interface BriefOutput {
  headline: string;
  summary: string;
  key_findings: string[];
  risks: string[];
  recommended_actions: string[];
  confidence: number;
}

export const briefTask = defineAiTask<BriefInput, BriefOutput>({
  id: "briefing",
  system:
    "You write short executive briefings for a head of office in a Philippine local government. Use only the facts and records given; quote their numbers exactly. Lead with what needs a decision.",
  prompt: (input) =>
    [
      `Briefing: ${input.title}`,
      input.audience ? `Reader: ${input.audience}` : "",
      input.focus ? `Focus: ${input.focus}` : "",
      `Facts:\n${Object.entries(input.facts)
        .map(([k, v]) => `- ${k}: ${v}`)
        .join("\n")}`,
      `Records (${input.items.length}):\n${input.items.map((i) => `- ${i.id}: ${i.text}`).join("\n")}`,
    ]
      .filter(Boolean)
      .join("\n\n"),
  output: () =>
    z.object({
      headline: z.string().min(1),
      summary: z.string().min(1),
      key_findings: textListSchema,
      risks: textListSchema,
      recommended_actions: textListSchema,
      confidence: confidenceSchema,
    }),
  temperature: 0.3,
  demo: (input) => {
    const facts = Object.entries(input.facts);
    const tagCounts = new Map<string, number>();
    for (const item of input.items) for (const tag of item.tags ?? []) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    const riskTags = input.riskTags ?? ["urgent", "overdue"];
    const topTags = [...tagCounts.entries()].filter(([tag]) => !riskTags.includes(tag)).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const risky = riskTags.map((tag) => [tag, input.items.filter((i) => i.tags?.includes(tag))] as const).filter(([, list]) => list.length > 0);
    const n = input.items.length;

    const findings = [
      ...facts.slice(0, 3).map(([k, v]) => `${k}: ${v}`),
      ...(topTags[0] ? [`Most common: ${topTags[0][0]} (${topTags[0][1]} of ${n})`] : []),
    ];
    const risks = risky.map(([tag, list]) => `${list.length} ${tag}: ${list.slice(0, 3).map((i) => i.id).join(", ")}${list.length > 3 ? "…" : ""}`);
    const actions = [
      ...risky.map(([tag, list]) => `Review the ${list.length} ${tag} item${list.length === 1 ? "" : "s"} first, starting with ${list[0]!.id}`),
      ...(topTags[0] ? [`Check whether the ${topTags[0][0]} team has enough people this week`] : []),
      "Share this briefing with the office heads at the next huddle",
    ];
    return {
      headline: risks.length ? `${input.title}: ${risks[0]} need attention` : `${input.title}: no urgent issues`,
      summary: `${n} record${n === 1 ? "" : "s"} reviewed. ${facts[0] ? `${facts[0][0]}: ${facts[0][1]}.` : ""}`.trim(),
      key_findings: findings.slice(0, 5),
      risks: risks.length ? risks : ["None flagged by the demo rules"],
      recommended_actions: actions.slice(0, 4),
      confidence: 0.7,
    };
  },
});
