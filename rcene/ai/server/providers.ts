/**
 * One adapter per provider: how to ask for a JSON answer, and where the answer is in
 * the reply. Pure functions (no fetch), so every request shape is unit-tested.
 *
 * - OpenAI and local servers (Ollama, LM Studio): Chat Completions with a JSON response format.
 * - Claude: Messages API with one forced tool whose input_schema is the expected answer.
 * - Gemini: generateContent with responseMimeType application/json.
 * The JSON Schema is also written into the system prompt by the client, so every
 * provider sees it even where the API has no schema field.
 */
import type { CompleteRequest, LiveProviderId } from "../protocol.ts";
import type { AiServerConfig } from "./config.ts";

export interface ProviderCall {
  url: string;
  method: "POST";
  headers: Record<string, string>;
  body: string;
  model: string;
}

/** A JSON Schema ready for a provider: no "$schema" key, an object at the root. */
export function cleanSchema(schema: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!schema) return { type: "object" };
  const rest: Record<string, unknown> = { ...schema };
  delete rest.$schema;
  return rest.type === "object" ? rest : { type: "object", properties: { result: rest }, required: ["result"] };
}

function chatCompletions(
  baseUrl: string,
  apiKey: string | undefined,
  model: string,
  req: CompleteRequest,
  extra: Record<string, unknown>,
): ProviderCall {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (apiKey) headers.authorization = `Bearer ${apiKey}`;
  return {
    url: `${baseUrl}/chat/completions`,
    method: "POST",
    headers,
    model,
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: req.system },
        { role: "user", content: req.prompt },
      ],
      ...extra,
    }),
  };
}

export function buildProviderCall(config: AiServerConfig, req: CompleteRequest): ProviderCall {
  const name = req.schemaName ?? "result";
  switch (req.provider) {
    case "openai": {
      const { apiKey, baseUrl, reasoningEffort } = config.openai;
      const model = req.model ?? config.openai.model;
      // No temperature or max tokens: reasoning models (GPT-5 family) reject a custom temperature.
      return chatCompletions(baseUrl, apiKey, model, req, {
        response_format: { type: "json_object" },
        ...(reasoningEffort && { reasoning_effort: reasoningEffort }),
      });
    }
    case "local": {
      const { apiKey, baseUrl, jsonMode } = config.local;
      const model = req.model ?? config.local.model;
      const format =
        jsonMode === "json_object"
          ? { response_format: { type: "json_object" } }
          : jsonMode === "json_schema"
            ? { response_format: { type: "json_schema", json_schema: { name, schema: cleanSchema(req.schema) } } }
            : {};
      return chatCompletions(baseUrl, apiKey, model, req, {
        ...format,
        ...(req.temperature !== undefined && { temperature: req.temperature }),
        stream: false,
      });
    }
    case "anthropic": {
      const { apiKey = "", baseUrl } = config.anthropic;
      const model = req.model ?? config.anthropic.model;
      const tool = {
        name,
        description: "Return the answer as structured data that matches the schema.",
        input_schema: cleanSchema(req.schema),
      };
      return {
        url: `${baseUrl}/v1/messages`,
        method: "POST",
        model,
        headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model,
          max_tokens: req.maxTokens ?? 2048,
          system: req.system,
          messages: [{ role: "user", content: req.prompt }],
          tools: [tool],
          tool_choice: { type: "tool", name },
        }),
      };
    }
    case "gemini": {
      const { apiKey = "", baseUrl } = config.gemini;
      const model = req.model ?? config.gemini.model;
      return {
        url: `${baseUrl}/models/${encodeURIComponent(model)}:generateContent`,
        method: "POST",
        model,
        headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: req.system }] },
          contents: [{ role: "user", parts: [{ text: req.prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            ...(req.temperature !== undefined && { temperature: req.temperature }),
          },
        }),
      };
    }
  }
}

type Json = Record<string, unknown>;
const isObject = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * The answer text from a provider's successful reply (a JSON object as text), or
 * null when the reply holds no answer (refusal, empty content, safety block).
 */
export function readProviderText(provider: LiveProviderId, reply: unknown): string | null {
  if (!isObject(reply)) return null;
  switch (provider) {
    case "openai":
    case "local": {
      const choices = reply.choices;
      const message = Array.isArray(choices) && isObject(choices[0]) ? choices[0].message : undefined;
      if (!isObject(message)) return null;
      return typeof message.content === "string" && message.content.trim() ? message.content : null;
    }
    case "anthropic": {
      const content = Array.isArray(reply.content) ? reply.content : [];
      const tool = content.find((b): b is Json => isObject(b) && b.type === "tool_use");
      if (tool && isObject(tool.input)) return JSON.stringify(tool.input);
      const text = content
        .filter((b): b is Json => isObject(b) && b.type === "text" && typeof b.text === "string")
        .map((b) => b.text as string)
        .join("");
      return text.trim() ? text : null;
    }
    case "gemini": {
      const candidates = Array.isArray(reply.candidates) ? reply.candidates : [];
      const first = isObject(candidates[0]) ? candidates[0] : undefined;
      const parts = first && isObject(first.content) && Array.isArray(first.content.parts) ? first.content.parts : [];
      const text = parts
        .filter((p): p is Json => isObject(p) && typeof p.text === "string" && p.thought !== true)
        .map((p) => p.text as string)
        .join("");
      return text.trim() ? text : null;
    }
  }
}

/** A short, safe error message from a provider's error reply (never echoes request headers). */
export function readProviderError(status: number, body: string): string {
  let message = "";
  try {
    const parsed: unknown = JSON.parse(body);
    if (isObject(parsed)) {
      const err = parsed.error;
      if (isObject(err) && typeof err.message === "string") message = err.message;
      else if (typeof err === "string") message = err;
      else if (typeof parsed.message === "string") message = parsed.message;
    }
  } catch {
    message = body;
  }
  const short = message.replace(/\s+/g, " ").trim().slice(0, 240);
  return short ? `HTTP ${status}: ${short}` : `HTTP ${status}`;
}
