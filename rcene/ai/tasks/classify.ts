/**
 * Triage: classify a free-text report into one of the app's categories, set its
 * priority, summarise it and recommend next actions. The app passes its own
 * categories and priorities (ids, translated labels, keywords), so the same task
 * fits service requests, incident reports, complaints, applications or feedback.
 */
import { z } from "zod";
import { confidenceSchema, defineAiTask, textListSchema } from "../task.ts";
import { URGENT_KEYWORDS, clamp01, firstSentence, matchKeywords, normalizeText, round2 } from "./text.ts";

export interface ClassifyOption {
  id: string;
  label: string;
  description?: string;
  /** Words that point to this option (any language). Used by the demo rules and shown to the model. */
  keywords?: readonly string[];
  /** Default next actions for this option (the demo rules use them). */
  actions?: readonly string[];
}

export interface ClassifyInput {
  /** The report in the person's own words. */
  text: string;
  categories: readonly ClassifyOption[];
  /** Ordered from lowest to highest. Default: normal, urgent. */
  priorities?: readonly ClassifyOption[];
  /** What the text is ("barangay service request", "incident report"). */
  subject?: string;
  /** Extra facts the model may use: place, time, the office's rules. */
  context?: string;
}

export interface ClassifyOutput {
  category: string;
  priority: string;
  confidence: number;
  summary: string;
  key_findings: string[];
  recommended_actions: string[];
  rationale: string[];
}

export const DEFAULT_PRIORITIES: readonly ClassifyOption[] = [
  { id: "normal", label: "Normal" },
  { id: "urgent", label: "Urgent", keywords: URGENT_KEYWORDS },
];

const priorities = (input: ClassifyInput) => (input.priorities?.length ? input.priorities : DEFAULT_PRIORITIES);

const ids = (options: readonly ClassifyOption[]) => options.map((o) => o.id) as [string, ...string[]];

function describe(options: readonly ClassifyOption[]): string {
  return options
    .map((o) => {
      const extra = [o.description, o.keywords?.length ? `e.g. ${o.keywords.slice(0, 8).join(", ")}` : ""].filter(Boolean).join("; ");
      return `- ${o.id}: ${o.label}${extra ? ` (${extra})` : ""}`;
    })
    .join("\n");
}

/** Maps a label or a differently-cased id back to the option id. */
function toId(value: unknown, options: readonly ClassifyOption[]): unknown {
  if (typeof value !== "string") return value;
  const v = normalizeText(value);
  return options.find((o) => normalizeText(o.id) === v || normalizeText(o.label) === v)?.id ?? value;
}

const HOUSEHOLDS = /(\d{1,4})\s*(households?|families|family|pamilya|kabahayan|residents?|tawo|katawhan|katao|houses?|balay|bahay)/i;

export const classifyTask = defineAiTask<ClassifyInput, ClassifyOutput>({
  id: "triage",
  system:
    "You triage reports for a local-government office in the Philippines. Read the report, choose the single best category and a priority, summarise it for the officer on duty, list the key facts, and recommend concrete next actions the office can take. Reports may be in English, Filipino, Waray or a mix.",
  prompt: (input) =>
    [
      `Report type: ${input.subject ?? "community report"}`,
      `Categories (answer with the id):\n${describe(input.categories)}`,
      `Priorities, lowest to highest (answer with the id):\n${describe(priorities(input))}`,
      input.context ? `Context:\n${input.context}` : "",
      `Report:\n"""\n${input.text.trim()}\n"""`,
    ]
      .filter(Boolean)
      .join("\n\n"),
  output: (input) =>
    z.object({
      category: z.enum(ids(input.categories)),
      priority: z.enum(ids(priorities(input))),
      confidence: confidenceSchema,
      summary: z.string().min(1),
      key_findings: textListSchema,
      recommended_actions: textListSchema,
      rationale: textListSchema,
    }),
  normalize: (raw, input) => ({ ...raw, category: toId(raw.category, input.categories), priority: toId(raw.priority, priorities(input)) }),
  temperature: 0.2,
  demo: (input) => {
    const scored = input.categories.map((option, index) => {
      const words = [option.label, option.id, ...(option.keywords ?? [])];
      const hits = matchKeywords(input.text, words);
      return { option, hits, index };
    });
    const best = [...scored].sort((a, b) => b.hits.length - a.hits.length || a.index - b.index)[0]!;
    const runnerUp = [...scored].sort((a, b) => b.hits.length - a.hits.length || a.index - b.index)[1];
    const margin = best.hits.length - (runnerUp?.hits.length ?? 0);

    const levels = priorities(input);
    let priority = levels[0]!;
    let urgentHits: string[] = [];
    for (const level of [...levels].reverse()) {
      const hits = matchKeywords(input.text, level.keywords ?? []);
      if (hits.length) {
        priority = level;
        urgentHits = hits;
        break;
      }
    }

    const households = HOUSEHOLDS.exec(input.text);
    const confidence = best.hits.length ? clamp01(0.55 + 0.08 * best.hits.length + 0.06 * margin) : 0.35;
    const label = best.option.label;
    const findings = [
      ...best.hits.slice(0, 3).map((k) => `Mentions “${k}”`),
      ...(households ? [`About ${households[1]} ${households[2]!.toLowerCase()} affected`] : []),
      ...(urgentHits.length ? [`Urgency signal: “${urgentHits[0]}”`] : []),
    ];
    const actions = [
      ...(priority.id !== levels[0]!.id ? [`Treat as ${priority.label.toLowerCase()}: act today`] : []),
      ...(best.option.actions?.length ? best.option.actions : [`Assign to the ${label} team`, "Verify the report with the barangay focal person"]),
      "Send the reference code and next step to the person who reported it",
    ];
    return {
      category: best.option.id,
      priority: priority.id,
      confidence: round2(confidence),
      summary: `${label}: ${firstSentence(input.text, 140)}`,
      key_findings: findings.length ? findings : ["No clear keywords: a person should read the report"],
      recommended_actions: actions.slice(0, 4),
      rationale: [
        best.hits.length ? `Keyword match for ${label} (${best.hits.length})` : `No keyword matched; ${label} is the first category`,
        urgentHits.length ? `Priority raised by “${urgentHits.join("”, “")}”` : `No urgency words found`,
        "Demo rules (offline): a person confirms",
      ],
    };
  },
});
