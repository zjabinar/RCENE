/**
 * Lenient JSON reading for model output: models sometimes wrap the object in a
 * ```json fence or add a sentence around it. Validation (zod) happens after this.
 */

/** The first JSON object in `text`, parsed. Throws when there is none. */
export function parseJsonObject(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed);
  const candidates = [trimmed, fenced?.[1]?.trim()];
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) candidates.push(trimmed.slice(start, end + 1));

  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const value: unknown = JSON.parse(candidate);
      if (typeof value === "object" && value !== null && !Array.isArray(value)) return value as Record<string, unknown>;
    } catch {
      // try the next candidate
    }
  }
  throw new Error("The answer is not a JSON object.");
}
