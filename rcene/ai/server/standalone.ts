/**
 * The AI relay as a small production server (no Vite): GET /healthz, GET /api/ai/status,
 * POST /api/ai/complete. It serves no files: nginx serves the built app (dist/) and proxies
 * /api/ here. Configuration comes from the environment (systemd EnvironmentFile=):
 *
 *   PORT=8010  HOST=127.0.0.1           where to listen (behind nginx: loopback only)
 *   AI_RATE_LIMIT_PER_MIN=30            completions per minute for the whole server (0: none)
 *   AI_REQUIRE_ORIGIN=1                 refuse POSTs without an Origin header
 *   AI_PROVIDER, OPENAI_API_KEY, …      as in .env.example (config.ts)
 */
import { createServer, type Server } from "node:http";
import { readAiConfig, type Env } from "./config.ts";
import { createAiHandler, sendJson } from "./handler.ts";
import type { FetchLike } from "./relay.ts";

export interface StandaloneOptions {
  env: Env;
  fetch?: FetchLike;
}

export interface StandaloneSettings {
  port: number;
  host: string;
  perMinute: number;
  requireOrigin: boolean;
}

export function readStandaloneSettings(env: Env): StandaloneSettings {
  const port = Number(env.PORT);
  const perMinute = Number(env.AI_RATE_LIMIT_PER_MIN);
  return {
    port: Number.isInteger(port) && port > 0 ? port : 8010,
    host: env.HOST?.trim() || "127.0.0.1",
    perMinute: Number.isFinite(perMinute) && perMinute >= 0 ? perMinute : 30,
    requireOrigin: env.AI_REQUIRE_ORIGIN !== "0",
  };
}

/** Builds the server (not listening yet). */
export function createAiServer({ env, fetch }: StandaloneOptions): Server {
  const config = readAiConfig(env);
  const settings = readStandaloneSettings(env);
  const handler = createAiHandler(() => config, { fetch, perMinute: settings.perMinute, requireOrigin: settings.requireOrigin });
  return createServer((req, res) => {
    const path = (req.url ?? "").split("?")[0];
    if (path === "/healthz") return sendJson(res, 200, { ok: true, provider: config.defaultProvider });
    handler(req, res, () => sendJson(res, 404, { ok: false, code: "bad_request", error: "Not found." }));
  });
}
