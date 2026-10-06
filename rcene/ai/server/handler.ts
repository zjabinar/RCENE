/**
 * The relay's HTTP handler, independent of Vite: GET /api/ai/status and
 * POST /api/ai/complete. The Vite plugin (plugin.ts) mounts it on the dev and preview
 * servers; the standalone server (standalone.ts) runs it in production behind nginx.
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import { AI_ROUTES, CompleteRequestSchema, LIMITS } from "../protocol.ts";
import { aiStatus, type AiServerConfig } from "./config.ts";
import { complete, type FetchLike } from "./relay.ts";

type Next = (err?: unknown) => void;
export type AiHandler = (req: IncomingMessage, res: ServerResponse, next: Next) => void;

export interface AiHandlerOptions {
  fetch?: FetchLike;
  /**
   * Refuse POSTs without an Origin header (browsers always send one on POST). Production
   * turns this on; it stops casual scripts, not a determined caller (that is the rate limit's job).
   */
  requireOrigin?: boolean;
  /** At most this many completions per minute for the whole server (0 or unset: no limit). */
  perMinute?: number;
  now?: () => number;
}

export function sendJson(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(data));
}

function readBody(req: IncomingMessage, limit: number): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error("too_large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

/**
 * Only this app's own pages may use the relay: a request that carries an Origin must
 * come from the same host (so another website open in the browser cannot spend the key).
 * Behind nginx this works because nginx passes the public Host header through.
 */
function sameOrigin(req: IncomingMessage): boolean {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

/** A sliding one-minute window over the whole server. */
export function createRateLimiter(perMinute: number, now: () => number = Date.now) {
  const stamps: number[] = [];
  return (): boolean => {
    if (!perMinute || perMinute <= 0) return true;
    const t = now();
    while (stamps.length && t - stamps[0]! >= 60_000) stamps.shift();
    if (stamps.length >= perMinute) return false;
    stamps.push(t);
    return true;
  };
}

/** The request handler, separate from any server so it can be tested with plain objects. */
export function createAiHandler(getConfig: () => AiServerConfig, options: AiHandlerOptions | FetchLike = {}): AiHandler {
  const opts: AiHandlerOptions = typeof options === "function" ? { fetch: options } : options;
  const allow = createRateLimiter(opts.perMinute ?? 0, opts.now);

  return (req, res, next) => {
    const path = (req.url ?? "").split("?")[0];
    if (path !== AI_ROUTES.status && path !== AI_ROUTES.complete) return next();
    if (!sameOrigin(req)) return sendJson(res, 403, { ok: false, code: "bad_request", error: "Cross-origin requests are not allowed." });

    if (path === AI_ROUTES.status) {
      if (req.method !== "GET") return sendJson(res, 405, { ok: false, code: "bad_request", error: "Use GET." });
      return sendJson(res, 200, aiStatus(getConfig()));
    }

    if (req.method !== "POST") return sendJson(res, 405, { ok: false, code: "bad_request", error: "Use POST." });
    if (opts.requireOrigin && !req.headers.origin) return sendJson(res, 403, { ok: false, code: "bad_request", error: "Requests must come from the app." });
    if (!String(req.headers["content-type"] ?? "").includes("application/json")) {
      return sendJson(res, 415, { ok: false, code: "bad_request", error: "Send JSON (content-type: application/json)." });
    }
    if (!allow()) {
      return sendJson(res, 429, { ok: false, code: "rate_limited", error: "Too many AI requests right now; the demo rules answer instead. Try again in a minute." });
    }
    void (async () => {
      let raw: string;
      try {
        raw = await readBody(req, LIMITS.body);
      } catch {
        return sendJson(res, 413, { ok: false, code: "bad_request", error: "The request is too large." });
      }
      let body: unknown;
      try {
        body = JSON.parse(raw);
      } catch {
        return sendJson(res, 400, { ok: false, code: "bad_request", error: "The request is not valid JSON." });
      }
      const parsed = CompleteRequestSchema.safeParse(body);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        return sendJson(res, 400, { ok: false, code: "bad_request", error: `Invalid request: ${issue?.path.join(".") || "body"} ${issue?.message ?? ""}`.trim() });
      }
      const result = await complete(getConfig(), parsed.data, opts.fetch);
      sendJson(res, 200, result);
    })().catch((error: unknown) => {
      if (!res.headersSent) sendJson(res, 500, { ok: false, code: "network", error: error instanceof Error ? error.message : "Relay error" });
    });
  };
}
