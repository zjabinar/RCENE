/**
 * The AI relay as a Vite plugin: GET /api/ai/status and POST /api/ai/complete on the
 * dev server (npm run dev) and the preview server (npm run preview, the smoke test).
 * Keys are read on the Node side from .env.local (loadEnv, no VITE_ prefix), so they
 * never reach the browser bundle. A static build without this server answers 404 and
 * the app falls back to its demo rules. In production the same handler runs in the
 * standalone server (standalone.ts, server/api.ts) behind nginx.
 */
import { loadEnv, type Plugin, type ResolvedConfig } from "vite";
import { readAiConfig, type AiServerConfig, type Env } from "./config.ts";
import { createAiHandler } from "./handler.ts";
import type { FetchLike } from "./relay.ts";

export { createAiHandler, type AiHandler, type AiHandlerOptions } from "./handler.ts";

/** Reads the env for this mode: .env, .env.local, .env.<mode>, .env.<mode>.local and the shell. */
export function loadAiEnv(config: ResolvedConfig): Env {
  const dir = typeof config.envDir === "string" ? config.envDir : config.root;
  return { ...loadEnv(config.mode, dir, ""), ...process.env };
}

export function rceneAiRelay(options: { env?: Env; fetch?: FetchLike } = {}): Plugin {
  let config: AiServerConfig = readAiConfig(options.env ?? {});
  const handler = createAiHandler(() => config, { fetch: options.fetch });
  return {
    name: "rcene-ai-relay",
    configResolved(resolved) {
      config = readAiConfig(options.env ?? loadAiEnv(resolved));
    },
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}
