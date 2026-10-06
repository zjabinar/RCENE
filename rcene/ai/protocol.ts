/**
 * The wire contract between the browser and the AI relay (rcene/ai/server), shared by
 * both sides. No DOM, no React, no Node APIs: the Vite config (Node) and the app
 * (browser) both import it.
 *
 * The browser never sees an API key. It sends a prompt and the JSON Schema of the
 * answer it expects to /api/ai/complete; the relay, running inside the Vite dev or
 * preview server, adds the key from .env.local and calls the provider.
 */
import { z } from "zod";

/** Every provider the app can use. "demo" runs in the browser with deterministic rules. */
export const AI_PROVIDERS = ["demo", "openai", "anthropic", "gemini", "local"] as const;
export type AiProviderId = (typeof AI_PROVIDERS)[number];

/** The providers the relay calls over the network. */
export const LIVE_PROVIDERS = ["openai", "anthropic", "gemini", "local"] as const;
export type LiveProviderId = (typeof LIVE_PROVIDERS)[number];

export function isLiveProvider(id: string): id is LiveProviderId {
  return (LIVE_PROVIDERS as readonly string[]).includes(id);
}

export function isProvider(id: string): id is AiProviderId {
  return (AI_PROVIDERS as readonly string[]).includes(id);
}

/**
 * Default models, used when neither .env.local (OPENAI_MODEL, …) nor the settings
 * page names one. Fast, low-cost models: the demo needs answers in seconds.
 */
export const DEFAULT_MODELS: Record<LiveProviderId, string> = {
  openai: "gpt-5.4-mini",
  anthropic: "claude-haiku-4-5-20251001",
  gemini: "gemini-2.5-flash",
  local: "llama3.2",
};

/** Product names (not translated). */
export const PROVIDER_NAMES: Record<AiProviderId, string> = {
  demo: "Demo rules",
  openai: "OpenAI",
  anthropic: "Claude",
  gemini: "Gemini",
  local: "Local model",
};

/** The environment variable that holds each provider's key (shown on the settings page). */
export const PROVIDER_KEY_ENV: Record<LiveProviderId, string> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  gemini: "GEMINI_API_KEY",
  local: "LOCAL_AI_BASE_URL",
};

export const AI_ROUTES = {
  status: "/api/ai/status",
  complete: "/api/ai/complete",
} as const;

/** Upper bounds that keep a runaway prompt from reaching a paid API. */
export const LIMITS = { system: 20_000, prompt: 60_000, body: 256_000 } as const;

export const CompleteRequestSchema = z.object({
  provider: z.enum(LIVE_PROVIDERS),
  model: z.string().trim().min(1).max(120).optional(),
  system: z.string().max(LIMITS.system),
  prompt: z.string().min(1).max(LIMITS.prompt),
  /** JSON Schema (an object schema) of the expected answer. */
  schema: z.record(z.string(), z.unknown()).optional(),
  /** A short name for the schema (tool or response-format name): letters, digits, _ and -. */
  schemaName: z
    .string()
    .regex(/^[A-Za-z0-9_-]{1,64}$/)
    .optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.int().min(64).max(16_000).optional(),
});
export type CompleteRequest = z.infer<typeof CompleteRequestSchema>;

export type CompleteErrorCode = "not_configured" | "bad_request" | "provider_error" | "timeout" | "network" | "empty" | "rate_limited";

export interface CompleteSuccess {
  ok: true;
  /** The model's answer: a JSON object as text. */
  text: string;
  provider: LiveProviderId;
  model: string;
  latencyMs: number;
}

export interface CompleteFailure {
  ok: false;
  code: CompleteErrorCode;
  /** Plain-language reason, safe to show (never contains a key). */
  error: string;
  provider?: LiveProviderId;
  model?: string;
  latencyMs?: number;
}

export type CompleteResponse = CompleteSuccess | CompleteFailure;

export interface ProviderStatus {
  id: LiveProviderId;
  /** True when the relay has what it needs (a key, or a base URL for "local"). */
  configured: boolean;
  /** The model the relay uses when the request names none. */
  model: string;
  /** Only for "local": where the OpenAI-compatible server is expected. */
  baseUrl?: string;
}

export interface AiStatus {
  /** AI_PROVIDER in .env.local ("demo" when unset). Used when the settings say "auto". */
  defaultProvider: AiProviderId;
  providers: ProviderStatus[];
  timeoutMs: number;
}
