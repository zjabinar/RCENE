/**
 * Extraction: fill a form from free text (a letter, a chat message, a call note).
 * The app lists the fields it needs; the answer gives a value or null for each,
 * and names the required fields that are still missing, so a person completes them.
 */
import { z } from "zod";
import { confidenceSchema, defineAiTask, textListSchema } from "../task.ts";
import { hasKeyword, normalizeText } from "./text.ts";

export type ExtractFieldType = "text" | "number" | "date" | "boolean" | "choice";

export interface ExtractField {
  id: string;
  label: string;
  type: ExtractFieldType;
  /** For "choice": the allowed values. */
  options?: readonly string[];
  description?: string;
  required?: boolean;
}

export interface ExtractInput {
  text: string;
  fields: readonly ExtractField[];
  context?: string;
}

export type ExtractValue = string | number | boolean | null;

export interface ExtractOutput {
  values: Record<string, ExtractValue>;
  missing: string[];
  confidence: number;
  notes: string[];
}

function fieldSchema(field: ExtractField): z.ZodType<ExtractValue> {
  switch (field.type) {
    case "number":
      return z.preprocess((v) => (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v)) ? Number(v) : v), z.number().nullable());
    case "boolean":
      return z.boolean().nullable();
    case "choice":
      return field.options?.length ? z.enum(field.options as [string, ...string[]]).nullable() : z.string().nullable();
    case "date":
      return z.string().regex(/^\d{4}-\d{2}-\d{2}/).nullable();
    default:
      return z.string().nullable();
  }
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** A date in the text as YYYY-MM-DD: ISO, 7/10/2026 (day first), or "Oct 7, 2026" / "7 October 2026". */
export function findDate(text: string): string | null {
  const iso = /\b(\d{4})-(\d{2})-(\d{2})\b/.exec(text);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/.exec(text);
  if (dmy) return `${dmy[3]}-${dmy[2]!.padStart(2, "0")}-${dmy[1]!.padStart(2, "0")}`;
  const named = /\b(?:(\d{1,2})\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*(\d{1,2})?,?\s*(\d{4})\b/i.exec(text);
  if (named) {
    const day = named[1] ?? named[3];
    const month = MONTHS.indexOf(named[2]!.toLowerCase().slice(0, 3)) + 1;
    if (day) return `${named[4]}-${String(month).padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return null;
}

/** "Label: value" on its own line or before a comma, or null. */
function labelled(text: string, label: string): string | null {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`${escaped}\\s*[:=-]\\s*([^\\n,;]+)`, "i").exec(text);
  return match ? match[1]!.trim() : null;
}

function demoValue(text: string, field: ExtractField): ExtractValue {
  const near = labelled(text, field.label) ?? labelled(text, field.id);
  switch (field.type) {
    case "number": {
      const source = near ?? (hasKeyword(text, field.label) ? text.slice(normalizeText(text).indexOf(normalizeText(field.label))) : "");
      const n = /(-?\d+(?:\.\d+)?)/.exec(source);
      return n ? Number(n[1]) : null;
    }
    case "date":
      return findDate(near ?? text);
    case "boolean":
      if (!near && !hasKeyword(text, field.label)) return null;
      return near ? /^(yes|oo|true|meron|mayda|1)/i.test(near) : true;
    case "choice":
      return field.options?.find((o) => hasKeyword(text, o)) ?? null;
    default:
      return near;
  }
}

export const extractTask = defineAiTask<ExtractInput, ExtractOutput>({
  id: "extract",
  system:
    "You read free text sent to a Philippine local-government office (letters, chat messages, call notes in English, Filipino or Waray) and fill in a form. Fill a field only when the text states it; otherwise use null. Dates are YYYY-MM-DD.",
  prompt: (input) =>
    [
      `Fields:\n${input.fields
        .map((f) => `- ${f.id} (${f.type}${f.options ? `: one of ${f.options.join(" | ")}` : ""})${f.required ? " [required]" : ""}: ${f.label}${f.description ? `, ${f.description}` : ""}`)
        .join("\n")}`,
      input.context ? `Context:\n${input.context}` : "",
      `Text:\n"""\n${input.text.trim()}\n"""`,
      'Put each field id in "values"; list in "missing" the required field ids you could not fill.',
    ]
      .filter(Boolean)
      .join("\n\n"),
  output: (input) =>
    z.object({
      values: z.object(Object.fromEntries(input.fields.map((f) => [f.id, fieldSchema(f)]))),
      missing: textListSchema,
      confidence: confidenceSchema,
      notes: textListSchema,
    }),
  /** A field the model left out counts as null (not found). */
  normalize: (raw, input) => {
    const given = typeof raw.values === "object" && raw.values !== null ? (raw.values as Record<string, unknown>) : {};
    return { ...raw, values: Object.fromEntries(input.fields.map((f) => [f.id, given[f.id] ?? null])) };
  },
  temperature: 0,
  demo: (input) => {
    const values = Object.fromEntries(input.fields.map((f) => [f.id, demoValue(input.text, f)]));
    const missing = input.fields.filter((f) => f.required && values[f.id] === null).map((f) => f.id);
    const filled = input.fields.filter((f) => values[f.id] !== null).length;
    return {
      values,
      missing,
      confidence: input.fields.length ? Math.round((0.3 + (0.5 * filled) / input.fields.length) * 100) / 100 : 0.3,
      notes: ["Demo rules (offline): labelled values, numbers, dates and listed options only"],
    };
  },
});
