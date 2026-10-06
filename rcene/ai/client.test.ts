import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { AiTaskError, runAiTask } from "./client.ts";
import { parseJsonObject } from "./json.ts";
import { buildTaskRequest, confidenceSchema, defineAiTask, textListSchema } from "./task.ts";

const task = defineAiTask<{ text: string; options: string[] }, { category: string; confidence: number; notes: string[] }>({
  id: "test-task",
  system: "Sort the text.",
  prompt: (input) => `Text: ${input.text}`,
  output: (input) => z.object({ category: z.enum(input.options as [string, ...string[]]), confidence: confidenceSchema, notes: textListSchema }),
  normalize: (raw) => ({ ...raw, category: typeof raw.category === "string" ? raw.category.toLowerCase() : raw.category }),
  demo: (input) => ({ category: input.options[0]!, confidence: 0.5, notes: ["demo"] }),
});

const INPUT = { text: "no water", options: ["water", "road"] };

function relay(status: number, payload: unknown) {
  return vi.fn(async () => new Response(JSON.stringify(payload), { status, headers: { "content-type": "application/json" } })) as unknown as typeof fetch;
}

describe("parseJsonObject", () => {
  it("reads plain, fenced and wrapped JSON objects", () => {
    expect(parseJsonObject('{"a":1}')).toEqual({ a: 1 });
    expect(parseJsonObject('```json\n{"a":2}\n```')).toEqual({ a: 2 });
    expect(parseJsonObject('Here you go: {"a":3} Thanks!')).toEqual({ a: 3 });
  });

  it("refuses arrays and prose", () => {
    expect(() => parseJsonObject("[1,2]")).toThrow();
    expect(() => parseJsonObject("no json here")).toThrow();
  });
});

describe("buildTaskRequest", () => {
  it("adds the shared rules, the JSON Schema and the answer language", () => {
    const req = buildTaskRequest(task, INPUT, "war");
    expect(req.system).toContain("Sort the text.");
    expect(req.system).toContain("Waray");
    expect(req.system).toContain('"enum":["water","road"]');
    expect(req.schema).not.toHaveProperty("$schema");
    expect(req.schemaName).toBe("test-task");
    expect(req.prompt).toBe("Text: no water");
  });

  it("accepts confidences in percent and single strings for lists", () => {
    expect(confidenceSchema.parse(85)).toBe(0.85);
    expect(confidenceSchema.parse("0.4")).toBe(0.4);
    expect(textListSchema.parse("one")).toEqual(["one"]);
  });
});

describe("runAiTask", () => {
  it("answers with the demo rules without any network", async () => {
    const fetchImpl = relay(200, {});
    const result = await runAiTask(task, INPUT, { provider: "demo", lang: "en", fetch: fetchImpl });
    expect(result).toMatchObject({ mode: "demo", provider: "demo", data: { category: "water" }, task: "test-task" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("validates and normalises a live answer", async () => {
    const fetchImpl = relay(200, { ok: true, text: '{"category":"ROAD","confidence":90,"notes":"pothole"}', provider: "openai", model: "gpt-x", latencyMs: 1234 });
    const result = await runAiTask(task, INPUT, { provider: "openai", lang: "en", fetch: fetchImpl });
    expect(result).toMatchObject({ mode: "live", provider: "openai", model: "gpt-x", latencyMs: 1234, data: { category: "road", confidence: 0.9, notes: ["pothole"] } });
    const body = JSON.parse((fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0]![1].body);
    expect(body).toMatchObject({ provider: "openai", schemaName: "test-task" });
  });

  it("falls back to the demo rules, with the reason, when the relay is missing", async () => {
    const result = await runAiTask(task, INPUT, { provider: "openai", lang: "en", fetch: relay(404, {}) });
    expect(result).toMatchObject({ mode: "fallback", provider: "demo", requested: "openai", data: { category: "water" } });
    expect(result.note).toContain("relay");
  });

  it("falls back when the provider fails or answers in the wrong shape", async () => {
    const failed = await runAiTask(task, INPUT, { provider: "anthropic", lang: "en", fetch: relay(200, { ok: false, code: "not_configured", error: "Claude is not set up" }) });
    expect(failed).toMatchObject({ mode: "fallback", note: "Claude is not set up" });
    const wrong = await runAiTask(task, INPUT, { provider: "gemini", lang: "en", fetch: relay(200, { ok: true, text: '{"category":"sky"}', provider: "gemini", model: "g", latencyMs: 1 }) });
    expect(wrong.mode).toBe("fallback");
    expect(wrong.note).toContain("category");
    const prose = await runAiTask(task, INPUT, { provider: "gemini", lang: "en", fetch: relay(200, { ok: true, text: "I cannot do that", provider: "gemini", model: "g", latencyMs: 1 }) });
    expect(prose.mode).toBe("fallback");
  });

  it("throws instead when fallback is off", async () => {
    await expect(runAiTask(task, INPUT, { provider: "openai", lang: "en", fallback: false, fetch: relay(404, {}) })).rejects.toBeInstanceOf(AiTaskError);
  });

  it("falls back when the network call throws", async () => {
    const broken = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof fetch;
    const result = await runAiTask(task, INPUT, { provider: "local", lang: "en", fetch: broken });
    expect(result).toMatchObject({ mode: "fallback", requested: "local" });
  });
});
