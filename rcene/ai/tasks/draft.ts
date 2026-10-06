/**
 * Drafting: write a message the office sends (an SMS update, a public notice, a reply
 * to a complaint, an email), from facts the app already holds. A person edits and sends
 * it; the app never sends it on its own.
 */
import { z } from "zod";
import { defineAiTask } from "../task.ts";

export type DraftKind = "sms" | "notice" | "reply" | "email";
export type DraftTone = "formal" | "friendly" | "urgent";

export interface DraftInput {
  kind: DraftKind;
  /** Who receives it: "the resident who filed REC-0012", "all residents of BRGY-03". */
  audience: string;
  /** What it must achieve: "tell them the crew is scheduled for Thursday". */
  purpose: string;
  /** The facts to use, one per line. Nothing else may be stated. */
  facts: readonly string[];
  tone?: DraftTone;
  /** Who signs it: "Barangay Service Desk". */
  sender?: string;
}

export interface DraftOutput {
  subject: string;
  body: string;
  /** The same message in one SMS (at most 160 characters). */
  sms: string;
}

export const SMS_LIMIT = 160;

export const draftTask = defineAiTask<DraftInput, DraftOutput>({
  id: "draft",
  system:
    "You draft short, clear messages for a Philippine local-government office to send to residents. Use plain words, state the facts given and nothing else, say what happens next, and keep a respectful tone. Never promise what the facts do not say.",
  prompt: (input) =>
    [
      `Kind: ${input.kind}`,
      `To: ${input.audience}`,
      `Purpose: ${input.purpose}`,
      `Tone: ${input.tone ?? "friendly"}`,
      input.sender ? `Sign as: ${input.sender}` : "",
      `Facts:\n${input.facts.map((f) => `- ${f}`).join("\n")}`,
      `"sms" must be at most ${SMS_LIMIT} characters.`,
    ]
      .filter(Boolean)
      .join("\n"),
  output: () =>
    z.object({
      subject: z.string().min(1),
      body: z.string().min(1),
      sms: z.string().min(1),
    }),
  /** An SMS longer than the limit is cut at a word, rather than failing the whole answer. */
  normalize: (raw) => ({ ...raw, sms: typeof raw.sms === "string" ? fitSms(raw.sms) : raw.sms }),
  temperature: 0.4,
  demo: (input) => {
    const sender = input.sender ?? "Service Desk";
    const greeting = input.tone === "formal" ? "Good day." : "Hello!";
    const facts = input.facts.map((f) => f.trim()).filter(Boolean);
    const subject = `${input.kind === "notice" ? "Notice" : "Update"}: ${input.purpose}`.slice(0, 90);
    const body = [greeting, `This is about: ${input.purpose}.`, ...facts.map((f) => `• ${f}`), "We will let you know when anything changes.", `— ${sender}`].join("\n");
    return { subject, body, sms: fitSms(`${sender}: ${facts.join("; ") || input.purpose}`) };
  },
});

/** Shortens a message to the SMS limit at a word boundary, with an ellipsis. */
export function fitSms(text: string, limit = SMS_LIMIT): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= limit) return clean;
  const cut = clean.slice(0, limit - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > limit * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}
