/**
 * The relay's configuration, read from the environment (.env.local through Vite's
 * loadEnv, or the shell). Keys stay here, on the Node side; aiStatus() is what the
 * browser may see (which providers are ready, never the keys).
 *
 *   AI_PROVIDER=openai            demo | openai | anthropic | gemini | local
 *   AI_TIMEOUT_MS=30000
 *   OPENAI_API_KEY=…              OPENAI_MODEL, OPENAI_BASE_URL, OPENAI_REASONING_EFFORT
 *   ANTHROPIC_API_KEY=…           ANTHROPIC_MODEL, ANTHROPIC_BASE_URL
 *   GEMINI_API_KEY=…              GEMINI_MODEL, GEMINI_BASE_URL (GOOGLE_API_KEY also works)
 *   LOCAL_AI_BASE_URL=http://localhost:11434/v1   LOCAL_AI_MODEL, LOCAL_AI_API_KEY, LOCAL_AI_JSON_MODE
 */
import {
  DEFAULT_MODELS,
  LIVE_PROVIDERS,
  isProvider,
  type AiProviderId,
  type AiStatus,
  type LiveProviderId,
} from "../protocol.ts";

export type Env = Record<string, string | undefined>;

/** How the local server is asked for JSON: LM Studio wants json_schema, Ollama accepts json_object. */
export type LocalJsonMode = "json_object" | "json_schema" | "none";

export interface ProviderConfig {
  apiKey?: string;
  model: string;
  baseUrl: string;
}

export interface AiServerConfig {
  defaultProvider: AiProviderId;
  timeoutMs: number;
  openai: ProviderConfig & { reasoningEffort?: string };
  anthropic: ProviderConfig;
  gemini: ProviderConfig;
  local: ProviderConfig & { jsonMode: LocalJsonMode; explicit: boolean };
}

const clean = (value: string | undefined) => {
  const v = value?.trim();
  return v ? v : undefined;
};

const trimSlash = (url: string) => url.replace(/\/+$/, "");

export function readAiConfig(env: Env): AiServerConfig {
  const provider = clean(env.AI_PROVIDER)?.toLowerCase() ?? "demo";
  const timeout = Number(clean(env.AI_TIMEOUT_MS));
  const jsonMode = clean(env.LOCAL_AI_JSON_MODE);
  return {
    defaultProvider: isProvider(provider) ? provider : "demo",
    timeoutMs: Number.isFinite(timeout) && timeout >= 1000 ? Math.min(timeout, 120_000) : 30_000,
    openai: {
      apiKey: clean(env.OPENAI_API_KEY),
      model: clean(env.OPENAI_MODEL) ?? DEFAULT_MODELS.openai,
      baseUrl: trimSlash(clean(env.OPENAI_BASE_URL) ?? "https://api.openai.com/v1"),
      reasoningEffort: clean(env.OPENAI_REASONING_EFFORT),
    },
    anthropic: {
      apiKey: clean(env.ANTHROPIC_API_KEY),
      model: clean(env.ANTHROPIC_MODEL) ?? DEFAULT_MODELS.anthropic,
      baseUrl: trimSlash(clean(env.ANTHROPIC_BASE_URL) ?? "https://api.anthropic.com"),
    },
    gemini: {
      apiKey: clean(env.GEMINI_API_KEY) ?? clean(env.GOOGLE_API_KEY),
      model: clean(env.GEMINI_MODEL) ?? DEFAULT_MODELS.gemini,
      baseUrl: trimSlash(clean(env.GEMINI_BASE_URL) ?? "https://generativelanguage.googleapis.com/v1beta"),
    },
    local: {
      apiKey: clean(env.LOCAL_AI_API_KEY),
      model: clean(env.LOCAL_AI_MODEL) ?? DEFAULT_MODELS.local,
      baseUrl: trimSlash(clean(env.LOCAL_AI_BASE_URL) ?? "http://localhost:11434/v1"),
      jsonMode: jsonMode === "json_schema" || jsonMode === "none" ? jsonMode : "json_object",
      explicit: Boolean(clean(env.LOCAL_AI_BASE_URL) ?? clean(env.LOCAL_AI_MODEL)),
    },
  };
}

/** True when the relay can call this provider: a key, or (local) a configured server. */
export function isConfigured(config: AiServerConfig, id: LiveProviderId): boolean {
  return id === "local" ? config.local.explicit : Boolean(config[id].apiKey);
}

/** What the browser may know: which providers are ready and their default models. No keys. */
export function aiStatus(config: AiServerConfig): AiStatus {
  return {
    defaultProvider: config.defaultProvider,
    timeoutMs: config.timeoutMs,
    providers: LIVE_PROVIDERS.map((id) => ({
      id,
      configured: isConfigured(config, id),
      model: config[id].model,
      ...(id === "local" && { baseUrl: config.local.baseUrl }),
    })),
  };
}
