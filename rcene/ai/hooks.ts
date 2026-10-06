/**
 * React hooks over the AI client: the provider in use, and running a task with its
 * loading / done / error state. Every run is written to the AI activity log.
 *
 *   const triage = useAiTask(classifyTask);
 *   <AiRunButton running={triage.running} onClick={() => triage.run(input)} />
 *   {triage.result && <AiInsightCard result={triage.result} … />}
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useLang } from "@rcene/i18n";
import { AiTaskError, runAiTask, type AiResult } from "./client.ts";
import { useAiLog } from "./log.ts";
import { isLiveProvider, type AiProviderId } from "./protocol.ts";
import { resolveModel, resolveProvider, useAiSettings } from "./settings.ts";
import { useAiStatus } from "./status.ts";
import type { AiTask } from "./task.ts";

export interface ActiveProvider {
  provider: AiProviderId;
  model?: string;
  /** False when a live provider is chosen but the relay has no key for it (or there is no relay). */
  ready: boolean;
  /** The settings say "auto" (AI_PROVIDER from the env file decides). */
  auto: boolean;
}

/** The provider and model the next run will use, and whether it is ready. */
export function useActiveProvider(): ActiveProvider {
  const choice = useAiSettings((s) => s.provider);
  const models = useAiSettings((s) => s.models);
  const { status } = useAiStatus();
  const provider = resolveProvider(choice, status);
  const ready = !isLiveProvider(provider) || Boolean(status?.providers.find((p) => p.id === provider)?.configured);
  return { provider, model: resolveModel(provider, models, status), ready, auto: choice === "auto" };
}

export interface AiTaskState<O> {
  running: boolean;
  result: AiResult<O> | null;
  /** Set only when fallback is off and the live call failed. */
  error: string | null;
}

export function useAiTask<I, O>(task: AiTask<I, O>, options: { fallback?: boolean } = {}) {
  const [lang] = useLang();
  const { provider, model } = useActiveProvider();
  const fallbackSetting = useAiSettings((s) => s.fallback);
  const demoDelayMs = useAiSettings((s) => s.demoDelayMs);
  const addLog = useAiLog((s) => s.add);
  const [state, setState] = useState<AiTaskState<O>>({ running: false, result: null, error: null });
  const controller = useRef<AbortController | null>(null);
  const fallback = options.fallback ?? fallbackSetting;

  useEffect(() => () => controller.current?.abort(), []);

  const run = useCallback(
    async (input: I): Promise<AiResult<O> | null> => {
      controller.current?.abort();
      const current = new AbortController();
      controller.current = current;
      setState((s) => ({ ...s, running: true, error: null }));
      try {
        const result = await runAiTask(task, input, { provider, model, lang, fallback, demoDelayMs, signal: current.signal });
        if (current.signal.aborted) return null;
        addLog(result);
        setState({ running: false, result, error: null });
        return result;
      } catch (error) {
        if (current.signal.aborted) return null;
        const message = error instanceof AiTaskError || error instanceof Error ? error.message : String(error);
        addLog({ task: task.id, mode: "live", provider, model, latencyMs: 0, note: message, at: new Date().toISOString() });
        setState({ running: false, result: null, error: message });
        return null;
      }
    },
    [task, provider, model, lang, fallback, demoDelayMs, addLog],
  );

  const reset = useCallback(() => {
    controller.current?.abort();
    setState({ running: false, result: null, error: null });
  }, []);

  return { ...state, run, reset, provider, model };
}
