/**
 * Grounded answers: answer a resident's or a staff member's question using only the
 * documents the app provides (requirements, schedules, ordinances, FAQs), and cite them.
 * When the documents do not say, the answer says so instead of guessing.
 */
import { z } from "zod";
import { confidenceSchema, defineAiTask, textListSchema } from "../task.ts";
import { clamp01, contentWords, round2, sentences } from "./text.ts";

export interface AnswerDocument {
  id: string;
  title: string;
  text: string;
}

export interface AnswerInput {
  question: string;
  documents: readonly AnswerDocument[];
}

export interface AnswerOutput {
  answer: string;
  /** Ids of the documents the answer comes from. */
  citations: string[];
  confidence: number;
  follow_up: string[];
}

export const NOT_FOUND = "The documents provided do not answer this. Please ask the office directly.";

/** The documents ranked by how many of the question's content words they contain (best first). */
export function rankDocuments(question: string, documents: readonly AnswerDocument[]) {
  const words = new Set(contentWords(question));
  return documents
    .map((doc, index) => {
      const docWords = new Set(contentWords(`${doc.title} ${doc.text}`));
      const overlap = [...words].filter((w) => docWords.has(w)).length;
      return { doc, overlap, score: words.size ? overlap / words.size : 0, index };
    })
    .sort((a, b) => b.overlap - a.overlap || a.index - b.index);
}

export const answerTask = defineAiTask<AnswerInput, AnswerOutput>({
  id: "answer",
  system:
    "You answer questions for a Philippine local-government office using ONLY the documents given. Cite the ids of the documents you used. If the documents do not contain the answer, say so plainly and suggest who to ask. Never use outside knowledge about laws, fees or schedules.",
  prompt: (input) =>
    [
      `Documents:\n${input.documents.map((d) => `[${d.id}] ${d.title}\n${d.text.trim()}`).join("\n\n")}`,
      `Question: ${input.question.trim()}`,
    ].join("\n\n"),
  output: (input) =>
    z.object({
      answer: z.string().min(1),
      citations: z.array(z.enum(input.documents.length ? (input.documents.map((d) => d.id) as [string, ...string[]]) : ["none"])),
      confidence: confidenceSchema,
      follow_up: textListSchema,
    }),
  temperature: 0.2,
  demo: (input) => {
    const [best] = rankDocuments(input.question, input.documents);
    if (!best || best.overlap === 0) return { answer: NOT_FOUND, citations: [], confidence: 0.2, follow_up: ["Which office handles this?"] };
    // The document's opening sentence (usually the core rule) plus the sentences that share the most words with the question.
    const words = new Set(contentWords(input.question));
    const all = sentences(best.doc.text).map((s, i) => ({ s, i, hits: contentWords(s).filter((w) => words.has(w)).length }));
    const picked = [...all]
      .filter((x) => x.hits > 0)
      .sort((a, b) => b.hits - a.hits || a.i - b.i)
      .slice(0, 2);
    if (all[0] && !picked.includes(all[0])) picked.push(all[0]);
    return {
      answer: picked.length ? picked.sort((a, b) => a.i - b.i).map((x) => x.s).join(" ") : best.doc.text,
      citations: [best.doc.id],
      confidence: round2(clamp01(0.4 + 0.5 * best.score)),
      follow_up: [`More in “${best.doc.title}”`],
    };
  },
});
