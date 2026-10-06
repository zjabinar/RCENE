/**
 * Calls one provider for one request, with a timeout, and returns a CompleteResponse
 * the browser can show. Never throws, never returns a key.
 */
import { PROVIDER_KEY_ENV, PROVIDER_NAMES, type CompleteRequest, type CompleteResponse } from "../protocol.ts";
import { isConfigured, type AiServerConfig } from "./config.ts";
import { buildProviderCall, readProviderError, readProviderText } from "./providers.ts";

export type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: string; signal: AbortSignal }) => Promise<{
  ok: boolean;
  status: number;
  text: () => Promise<string>;
}>;

export async function complete(
  config: AiServerConfig,
  req: CompleteRequest,
  fetchImpl: FetchLike = fetch as unknown as FetchLike,
  now: () => number = () => performance.now(),
): Promise<CompleteResponse> {
  const provider = req.provider;
  const name = PROVIDER_NAMES[provider];
  if (!isConfigured(config, provider)) {
    const what = provider === "local" ? `LOCAL_AI_BASE_URL (and LOCAL_AI_MODEL)` : PROVIDER_KEY_ENV[provider];
    return {
      ok: false,
      code: "not_configured",
      provider,
      error: `${name} is not set up: add ${what} to the env file (.env.local on the laptop, /srv/rscene/.env on the server) and restart.`,
    };
  }

  const call = buildProviderCall(config, req);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  const started = now();
  const base = { provider, model: call.model };
  try {
    const res = await fetchImpl(call.url, { method: call.method, headers: call.headers, body: call.body, signal: controller.signal });
    const body = await res.text();
    const latencyMs = Math.round(now() - started);
    if (!res.ok) return { ok: false, code: "provider_error", error: `${name} answered ${readProviderError(res.status, body)}`, latencyMs, ...base };
    let reply: unknown;
    try {
      reply = JSON.parse(body);
    } catch {
      return { ok: false, code: "provider_error", error: `${name} sent a reply that is not JSON.`, latencyMs, ...base };
    }
    const text = readProviderText(provider, reply);
    if (!text) return { ok: false, code: "empty", error: `${name} returned no answer (empty, refused or blocked).`, latencyMs, ...base };
    return { ok: true, text, latencyMs, ...base };
  } catch (error) {
    const latencyMs = Math.round(now() - started);
    if (controller.signal.aborted) {
      return { ok: false, code: "timeout", error: `${name} did not answer within ${Math.round(config.timeoutMs / 1000)} s.`, latencyMs, ...base };
    }
    const reason = error instanceof Error ? error.message : String(error);
    return { ok: false, code: "network", error: `Could not reach ${name}: ${reason.slice(0, 160)}`, latencyMs, ...base };
  } finally {
    clearTimeout(timer);
  }
}
