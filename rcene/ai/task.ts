/**
 * An AI task: one job the app gives a model, with a typed input, a zod schema for the
 * answer and a deterministic demo() that returns the same shape with no network. The
 * same task runs on every provider; the demo rules are the offline fallback.
 *
 *   export const triage = defineAiTask({
 *     id: "triage",
 *     system: "You sort community reports for a barangay office.",
 *     prompt: (input: { text: string }) => `Report:\n${input.text}`,
 *     output: () => z.object({ category: z.string(), summary: z.string() }),
 *     demo: (input) => ({ category: "other", summary: input.text.slice(0, 120) }),
 *   });
 */
import { z } from "zod";
import type { Lang } from "@rcene/i18n";

export interface AiTask<I, O> {
  /** Letters, digits, "-" and "_": also the tool / response-format name sent to the provider. */
  id: string;
  /** What the model is and what it must do, in a few sentences (the system prompt, before the shared rules). */
  system: string;
  /** The user message: the data to work on, labelled. */
  prompt: (input: I) => string;
  /** The answer's schema. A function, so an answer can be limited to the input's options (z.enum of ids). */
  output: (input: I) => z.ZodType<O>;
  /** Deterministic, offline, instant: the demo provider and the fallback. Must satisfy output(input). */
  demo: (input: I, lang: Lang) => O;
  /** Repairs common model slips before validation (a label instead of an id, 0–100 instead of 0–1). */
  normalize?: (raw: Record<string, unknown>, input: I) => unknown;
  temperature?: number;
  maxTokens?: number;
}

export function defineAiTask<I, O>(task: AiTask<I, O>): AiTask<I, O> {
  return task;
}

export const LANGUAGE_NAMES: Record<Lang, string> = {
  en: "English",
  war: "Waray (Winaray, the language of Samar and Leyte)",
  fil: "Filipino (Tagalog)",
};

/** Rules every task shares: JSON only, the UI language, no invented facts, no private reasoning. */
export function sharedRules(lang: Lang, schema: unknown): string {
  return [
    "You work inside a local-government (LGU) web application in the Philippines. A staff member reviews every answer before anything is done with it.",
    "Answer with ONE JSON object and nothing else (no markdown, no code fence). It must match this JSON Schema:",
    JSON.stringify(schema),
    `Write every human-readable text value in ${LANGUAGE_NAMES[lang]}. Copy ids and option values exactly as given.`,
    "Be brief: a summary is at most two sentences; each list item is at most 18 words.",
    "Use only the information provided. Never invent names, numbers, dates, places or laws. When something is unknown, say so and lower the confidence (0 to 1).",
    "Do not reveal private step-by-step reasoning. Where the schema asks for a rationale, give short factual reasons that point at the input.",
    "Never add personal data that is not in the input.",
  ].join("\n");
}

/** The JSON Schema of a task's answer (what the provider is asked to fill). */
export function answerSchema<I, O>(task: AiTask<I, O>, input: I): Record<string, unknown> {
  const schema = z.toJSONSchema(task.output(input), { io: "output", unrepresentable: "any" }) as Record<string, unknown>;
  delete schema.$schema;
  return schema;
}

export interface TaskRequest {
  system: string;
  prompt: string;
  schema: Record<string, unknown>;
  schemaName: string;
  temperature?: number;
  maxTokens?: number;
}

/** Everything the relay needs for one run of `task` on `input`, answered in `lang`. */
export function buildTaskRequest<I, O>(task: AiTask<I, O>, input: I, lang: Lang): TaskRequest {
  const schema = answerSchema(task, input);
  return {
    system: `${task.system.trim()}\n\n${sharedRules(lang, schema)}`,
    prompt: task.prompt(input),
    schema,
    schemaName: task.id.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 64) || "result",
    ...(task.temperature !== undefined && { temperature: task.temperature }),
    ...(task.maxTokens !== undefined && { maxTokens: task.maxTokens }),
  };
}

/** A confidence from 0 to 1. Accepts 0–100 from models that answer in percent. */
export const confidenceSchema = z.preprocess(
  (v) => (typeof v === "number" && v > 1 && v <= 100 ? v / 100 : typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v)) ? Number(v) : v),
  z.number().min(0).max(1),
);

/** A list of short strings. Accepts a single string from models that forget the array. */
export const textListSchema = z.preprocess(
  (v) => (typeof v === "string" ? (v.trim() ? [v] : []) : v),
  z.array(z.string()),
);
