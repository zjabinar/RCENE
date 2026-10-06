// @vitest-environment node
import { EventEmitter } from "node:events";
import type { IncomingMessage, ServerResponse } from "node:http";
import { describe, expect, it, vi } from "vitest";
import type { CompleteRequest } from "../protocol.ts";
import { aiStatus, isConfigured, readAiConfig } from "./config.ts";
import { createAiHandler } from "./plugin.ts";
import { buildProviderCall, cleanSchema, readProviderError, readProviderText } from "./providers.ts";
import { complete, type FetchLike } from "./relay.ts";

const KEYS = {
  AI_PROVIDER: "openai",
  OPENAI_API_KEY: "sk-test-openai",
  ANTHROPIC_API_KEY: "sk-ant-test",
  GEMINI_API_KEY: "gm-test",
};

const REQ: CompleteRequest = {
  provider: "openai",
  system: "Answer in JSON.",
  prompt: "Classify: no water since Monday",
  schema: { $schema: "https://json-schema.org/draft/2020-12/schema", type: "object", properties: { category: { type: "string" } }, required: ["category"] },
  schemaName: "triage",
  temperature: 0.2,
};

describe("readAiConfig and aiStatus", () => {
  it("defaults to the demo rules and sensible models when nothing is set", () => {
    const config = readAiConfig({});
    expect(config.defaultProvider).toBe("demo");
    expect(config.timeoutMs).toBe(30_000);
    expect(config.openai.model).toBeTruthy();
    expect(config.local.baseUrl).toBe("http://localhost:11434/v1");
    expect(isConfigured(config, "openai")).toBe(false);
    expect(isConfigured(config, "local")).toBe(false);
  });

  it("reads keys, models, the default provider and a bounded timeout", () => {
    const config = readAiConfig({ ...KEYS, OPENAI_MODEL: " gpt-test ", AI_TIMEOUT_MS: "999999", LOCAL_AI_MODEL: "qwen" });
    expect(config.defaultProvider).toBe("openai");
    expect(config.openai.model).toBe("gpt-test");
    expect(config.timeoutMs).toBe(120_000);
    expect(isConfigured(config, "anthropic")).toBe(true);
    expect(isConfigured(config, "local")).toBe(true);
  });

  it("ignores an unknown AI_PROVIDER", () => {
    expect(readAiConfig({ AI_PROVIDER: "skynet" }).defaultProvider).toBe("demo");
  });

  it("never puts a key in the status the browser sees", () => {
    const status = aiStatus(readAiConfig(KEYS));
    const json = JSON.stringify(status);
    for (const key of Object.values(KEYS).slice(1)) expect(json).not.toContain(key);
    expect(status.providers.map((p) => [p.id, p.configured])).toEqual([
      ["openai", true],
      ["anthropic", true],
      ["gemini", true],
      ["local", false],
    ]);
  });
});

describe("buildProviderCall", () => {
  const config = readAiConfig({ ...KEYS, LOCAL_AI_BASE_URL: "http://localhost:1234/v1/", LOCAL_AI_JSON_MODE: "json_schema" });

  it("OpenAI: chat completions, bearer key, JSON object format, no temperature", () => {
    const call = buildProviderCall(config, REQ);
    expect(call.url).toBe("https://api.openai.com/v1/chat/completions");
    expect(call.headers.authorization).toBe("Bearer sk-test-openai");
    const body = JSON.parse(call.body);
    expect(body.model).toBe(config.openai.model);
    expect(body.messages).toEqual([
      { role: "system", content: REQ.system },
      { role: "user", content: REQ.prompt },
    ]);
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body).not.toHaveProperty("temperature");
  });

  it("Claude: messages API, forced tool with the schema (without $schema)", () => {
    const call = buildProviderCall(config, { ...REQ, provider: "anthropic", model: "claude-test" });
    expect(call.url).toBe("https://api.anthropic.com/v1/messages");
    expect(call.headers["x-api-key"]).toBe("sk-ant-test");
    expect(call.headers["anthropic-version"]).toBe("2023-06-01");
    const body = JSON.parse(call.body);
    expect(body.model).toBe("claude-test");
    expect(body.system).toBe(REQ.system);
    expect(body.tools[0].name).toBe("triage");
    expect(body.tools[0].input_schema).not.toHaveProperty("$schema");
    expect(body.tool_choice).toEqual({ type: "tool", name: "triage" });
    expect(body.max_tokens).toBeGreaterThan(0);
  });

  it("Gemini: generateContent with the model in the URL and a JSON response type", () => {
    const call = buildProviderCall(config, { ...REQ, provider: "gemini" });
    expect(call.url).toBe(`https://generativelanguage.googleapis.com/v1beta/models/${config.gemini.model}:generateContent`);
    expect(call.headers["x-goog-api-key"]).toBe("gm-test");
    const body = JSON.parse(call.body);
    expect(body.systemInstruction.parts[0].text).toBe(REQ.system);
    expect(body.contents[0].parts[0].text).toBe(REQ.prompt);
    expect(body.generationConfig.responseMimeType).toBe("application/json");
  });

  it("local: OpenAI-compatible at the configured URL, json_schema when asked, no auth header without a key", () => {
    const call = buildProviderCall(config, { ...REQ, provider: "local" });
    expect(call.url).toBe("http://localhost:1234/v1/chat/completions");
    expect(call.headers).not.toHaveProperty("authorization");
    const body = JSON.parse(call.body);
    expect(body.response_format.type).toBe("json_schema");
    expect(body.response_format.json_schema.schema.type).toBe("object");
    expect(body.temperature).toBe(0.2);
  });

  it("cleanSchema wraps a non-object schema", () => {
    expect(cleanSchema({ type: "string" })).toEqual({ type: "object", properties: { result: { type: "string" } }, required: ["result"] });
    expect(cleanSchema(undefined)).toEqual({ type: "object" });
  });
});

describe("readProviderText and readProviderError", () => {
  it("reads each provider's answer", () => {
    expect(readProviderText("openai", { choices: [{ message: { content: '{"a":1}' } }] })).toBe('{"a":1}');
    expect(readProviderText("anthropic", { content: [{ type: "tool_use", input: { a: 1 } }] })).toBe('{"a":1}');
    expect(readProviderText("anthropic", { content: [{ type: "text", text: '{"b":2}' }] })).toBe('{"b":2}');
    expect(readProviderText("gemini", { candidates: [{ content: { parts: [{ text: "thinking", thought: true }, { text: '{"c":3}' }] } }] })).toBe('{"c":3}');
  });

  it("returns null when there is no answer", () => {
    expect(readProviderText("openai", { choices: [{ message: { content: null, refusal: "no" } }] })).toBeNull();
    expect(readProviderText("gemini", { candidates: [] })).toBeNull();
    expect(readProviderText("anthropic", "nope")).toBeNull();
  });

  it("shortens provider errors", () => {
    expect(readProviderError(401, JSON.stringify({ error: { message: "Incorrect API key provided" } }))).toBe("HTTP 401: Incorrect API key provided");
    expect(readProviderError(500, "")).toBe("HTTP 500");
  });
});

function fakeFetch(status: number, body: unknown): FetchLike {
  return vi.fn(async () => ({ ok: status >= 200 && status < 300, status, text: async () => (typeof body === "string" ? body : JSON.stringify(body)) }));
}

describe("complete", () => {
  const config = readAiConfig(KEYS);

  it("says what to add when a provider has no key, without calling it", async () => {
    const fetchImpl = fakeFetch(200, {});
    const res = await complete(readAiConfig({}), REQ, fetchImpl);
    expect(res).toMatchObject({ ok: false, code: "not_configured" });
    expect(!res.ok && res.error).toContain("OPENAI_API_KEY");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("returns the answer text, model and latency", async () => {
    let t = 0;
    const res = await complete(config, REQ, fakeFetch(200, { choices: [{ message: { content: '{"category":"water"}' } }] }), () => (t += 250));
    expect(res).toEqual({ ok: true, text: '{"category":"water"}', provider: "openai", model: config.openai.model, latencyMs: 250 });
  });

  it("reports provider errors, empty answers and network failures", async () => {
    expect(await complete(config, REQ, fakeFetch(429, { error: { message: "Rate limit" } }))).toMatchObject({ ok: false, code: "provider_error" });
    expect(await complete(config, REQ, fakeFetch(200, { choices: [] }))).toMatchObject({ ok: false, code: "empty" });
    expect(await complete(config, REQ, fakeFetch(200, "<html>"))).toMatchObject({ ok: false, code: "provider_error" });
    const failing: FetchLike = async () => {
      throw new Error("getaddrinfo ENOTFOUND");
    };
    expect(await complete(config, REQ, failing)).toMatchObject({ ok: false, code: "network" });
  });

  it("times out", async () => {
    const slow: FetchLike = (_url, init) =>
      new Promise((_resolve, reject) => init.signal.addEventListener("abort", () => reject(new Error("aborted"))));
    const res = await complete({ ...config, timeoutMs: 20 }, REQ, slow);
    expect(res).toMatchObject({ ok: false, code: "timeout" });
  });
});

/** A minimal request/response pair for the middleware. */
function call(handler: ReturnType<typeof createAiHandler>, opts: { method: string; url: string; headers?: Record<string, string>; body?: string }) {
  const req = Object.assign(new EventEmitter(), { method: opts.method, url: opts.url, headers: { host: "localhost:5400", ...opts.headers }, destroy() {} }) as unknown as IncomingMessage;
  return new Promise<{ status: number; body: unknown; next: boolean }>((resolve) => {
    const res = {
      statusCode: 200,
      headersSent: false,
      setHeader() {},
      end(data: string) {
        resolve({ status: res.statusCode, body: JSON.parse(data), next: false });
      },
    } as unknown as ServerResponse;
    handler(req, res, () => resolve({ status: 0, body: null, next: true }));
    if (opts.body !== undefined) {
      queueMicrotask(() => {
        req.emit("data", Buffer.from(opts.body!));
        req.emit("end");
      });
    }
  });
}

describe("createAiHandler", () => {
  const config = readAiConfig(KEYS);
  const fetchImpl = fakeFetch(200, { choices: [{ message: { content: '{"ok":true}' } }] });
  const handler = createAiHandler(() => config, fetchImpl);

  it("passes other routes on", async () => {
    expect(await call(handler, { method: "GET", url: "/console" })).toMatchObject({ next: true });
  });

  it("serves the status without keys", async () => {
    const res = await call(handler, { method: "GET", url: "/api/ai/status" });
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toContain("sk-test-openai");
  });

  it("relays a valid request", async () => {
    const res = await call(handler, {
      method: "POST",
      url: "/api/ai/complete",
      headers: { "content-type": "application/json", origin: "http://localhost:5400" },
      body: JSON.stringify({ provider: "openai", system: "s", prompt: "p" }),
    });
    expect(res).toMatchObject({ status: 200, body: { ok: true, text: '{"ok":true}' } });
  });

  it("rejects other origins, non-JSON bodies and invalid requests", async () => {
    expect((await call(handler, { method: "GET", url: "/api/ai/status", headers: { origin: "https://evil.example" } })).status).toBe(403);
    expect((await call(handler, { method: "POST", url: "/api/ai/complete", headers: { "content-type": "text/plain" } })).status).toBe(415);
    const bad = await call(handler, { method: "POST", url: "/api/ai/complete", headers: { "content-type": "application/json" }, body: JSON.stringify({ provider: "skynet", prompt: "" }) });
    expect(bad.status).toBe(400);
    const broken = await call(handler, { method: "POST", url: "/api/ai/complete", headers: { "content-type": "application/json" }, body: "{" });
    expect(broken.status).toBe(400);
  });
});
