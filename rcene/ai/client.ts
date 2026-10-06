/**
 * Runs an AI task on a provider and always comes back with a validated answer:
 * - provider "demo": the task's demo() rules, in the browser, no network;
 * - a live provider: through the relay (/api/ai/complete), then JSON parsing and zod
 *   validation; on any failure (no key, offline, timeout, bad JSON, wrong shape) the
 *   demo rules answer instead and the result says "fallback" with the reason.
 * The UI shows `mode`, `provider`, `model` and `latencyMs` with every answer.
 */
import type { Lang } from "@rcene/i18n";
import { parseJsonObject } from "./json.ts";
import { AI_ROUTES, isLiveProvider, type AiProviderId, type CompleteResponse } from "./protocol.ts";
import { buildTaskRequest, type AiTask } from "./task.ts";

export type AiMode = "live" | "demo" | "fallback";

export interface AiResultMeta {
  /** The task's id. */
  task: string;
  /** live: a model answered · demo: the demo rules were chosen · fallback: the model failed, the demo rules answered. */
  mode: AiMode;
  /** Who answered: "demo" in demo and fallback mode. */
  provider: AiProviderId;
  /** The live provider that was tried (also set in fallback mode). */
  requested?: AiProviderId;
  model?: string;
  latencyMs: number;
  /** Why a fallback happened (safe to show). */
  note?: string;
  /** ISO time of the answer. */
  at: string;
}

export interface AiResult<O> extends AiResultMeta {
  data: O;
}

export type AiErrorCode = "relay_missing" | "not_configured" | "provider_error" | "timeout" | "network" | "empty" | "invalid" | "bad_request" | "rate_limited";

export class AiTaskError extends Error {
  readonly code: AiErrorCode;
  constructor(message: string, code: AiErrorCode) {
    super(message);
    this.name = "AiTaskError";
    this.code = code;
  }
}

export interface RunOptions {
  /** A resolved provider (not "auto"). */
  provider: AiProviderId;
  /** Model override; the relay's default (from the env file) when omitted. */
  model?: string;
  /** The language the answer's text is written in. */
  lang: Lang;
  /** Answer with the demo rules when the live provider fails. Default true. */
  fallback?: boolean;
  /** Client-side cap on one live call. Default 60 s (the relay has its own timeout). */
  timeoutMs?: number;
  /** A short pause before demo answers, so the demo shows the "thinking" state. Default 0. */
  demoDelayMs?: number;
  signal?: AbortSignal;
  fetch?: typeof fetch;
  endpoint?: string;
  now?: () => number;
}

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (ms <= 0) return resolve();
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });

function demoResult<I, O>(task: AiTask<I, O>, input: I, options: RunOptions, started: number, extra: Partial<AiResultMeta>): AiResult<O> {
  const now = options.now ?? (() => performance.now());
  // The demo answer is validated too: a demo() that drifts from the schema fails its tests, not the demo.
  const data = task.output(input).parse(task.demo(input, options.lang));
  return { task: task.id, data, mode: "demo", provider: "demo", latencyMs: Math.round(now() - started), at: new Date().toISOString(), ...extra };
}

async function callRelay<I, O>(task: AiTask<I, O>, input: I, options: RunOptions): Promise<AiResult<O>> {
  const now = options.now ?? (() => performance.now());
  const started = now();
  const fetchImpl = options.fetch ?? fetch;
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener("abort", abort);
  const timer = setTimeout(abort, options.timeoutMs ?? 60_000);
  try {
    let res: Response;
    try {
      res = await fetchImpl(options.endpoint ?? AI_ROUTES.complete, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider: options.provider, ...(options.model && { model: options.model }), ...buildTaskRequest(task, input, options.lang) }),
        signal: controller.signal,
      });
    } catch (error) {
      if (options.signal?.aborted) throw error;
      if (controller.signal.aborted) throw new AiTaskError("The AI did not answer in time.", "timeout");
      throw new AiTaskError("The AI relay could not be reached (is the dev server running?).", "network");
    }
    if (res.status === 404) throw new AiTaskError("The AI relay is not running here (a static build): run npm run dev or npm run preview.", "relay_missing");
    let payload: CompleteResponse;
    try {
      payload = (await res.json()) as CompleteResponse;
    } catch {
      throw new AiTaskError(`The AI relay answered HTTP ${res.status} without JSON.`, "network");
    }
    if (!payload.ok) throw new AiTaskError(payload.error, payload.code === "bad_request" ? "bad_request" : payload.code);

    let raw: Record<string, unknown>;
    try {
      raw = parseJsonObject(payload.text);
    } catch {
      throw new AiTaskError("The model's answer was not a JSON object.", "invalid");
    }
    const parsed = task.output(input).safeParse(task.normalize ? task.normalize(raw, input) : raw);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new AiTaskError(`The model's answer did not match the expected format (${issue?.path.join(".") || "answer"}: ${issue?.message ?? "invalid"}).`, "invalid");
    }
    return {
      task: task.id,
      data: parsed.data,
      mode: "live",
      provider: options.provider,
      model: payload.model,
      latencyMs: payload.latencyMs ?? Math.round(now() - started),
      at: new Date().toISOString(),
    };
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", abort);
  }
}

/** Runs `task` on `input`. Throws only when fallback is off (or the call was aborted). */
export async function runAiTask<I, O>(task: AiTask<I, O>, input: I, options: RunOptions): Promise<AiResult<O>> {
  const now = options.now ?? (() => performance.now());
  const started = now();
  if (!isLiveProvider(options.provider)) {
    await wait(options.demoDelayMs ?? 0, options.signal);
    return demoResult(task, input, options, started, {});
  }
  try {
    return await callRelay(task, input, options);
  } catch (error) {
    if (options.signal?.aborted) throw error;
    if (options.fallback === false) throw error instanceof AiTaskError ? error : new AiTaskError(String(error), "network");
    const note = error instanceof Error ? error.message : String(error);
    return { ...demoResult(task, input, options, started, {}), mode: "fallback", requested: options.provider, note };
  }
}
