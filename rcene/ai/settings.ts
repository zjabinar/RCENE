/**
 * The AI settings chosen on the admin page: which provider answers, model overrides,
 * and whether a failed live call falls back to the demo rules. Persisted and synced
 * across the app's windows (rcene:ai:settings); "Reset demo" keeps them.
 *
 * The keys are not here: they stay in the env file, on the relay's side.
 */
import { createSyncedStore, keepOnReset } from "@rcene/store";
import type { AiProviderId, AiStatus, LiveProviderId } from "./protocol.ts";

/** "auto" follows AI_PROVIDER from the env file (the relay's default). */
export type ProviderChoice = AiProviderId | "auto";

export interface AiSettingsState {
  provider: ProviderChoice;
  /** Per-provider model overrides; empty means the relay's default. */
  models: Partial<Record<LiveProviderId, string>>;
  /** Answer with the demo rules when a live call fails (recommended for demos). */
  fallback: boolean;
  /** A short pause before demo answers, so the audience sees the "thinking" state. */
  demoDelayMs: number;
  setProvider: (provider: ProviderChoice) => void;
  setModel: (provider: LiveProviderId, model: string) => void;
  setFallback: (fallback: boolean) => void;
  setDemoDelay: (ms: number) => void;
}

export const AI_SETTINGS_STORE = "ai:settings";

export const useAiSettings = createSyncedStore<AiSettingsState>(
  AI_SETTINGS_STORE,
  (set) => ({
    provider: "auto",
    models: {},
    fallback: true,
    demoDelayMs: 700,
    setProvider: (provider) => set({ provider }),
    setModel: (provider, model) =>
      set((s) => {
        const models = { ...s.models };
        if (model.trim()) models[provider] = model.trim();
        else delete models[provider];
        return { models };
      }),
    setFallback: (fallback) => set({ fallback }),
    setDemoDelay: (demoDelayMs) => set({ demoDelayMs: Math.max(0, Math.min(5000, Math.round(demoDelayMs))) }),
  }),
  {
    version: 1,
    partialize: (s) => ({ provider: s.provider, models: s.models, fallback: s.fallback, demoDelayMs: s.demoDelayMs }),
  },
);

keepOnReset(AI_SETTINGS_STORE);

/** The provider that answers: the choice, or for "auto" the relay's default ("demo" when the relay is missing). */
export function resolveProvider(choice: ProviderChoice, status: AiStatus | null | undefined): AiProviderId {
  if (choice !== "auto") return choice;
  return status?.defaultProvider ?? "demo";
}

/** The model a live provider will use: the override, else the relay's default for it. */
export function resolveModel(provider: AiProviderId, models: Partial<Record<LiveProviderId, string>>, status: AiStatus | null | undefined): string | undefined {
  if (provider === "demo") return undefined;
  return models[provider] ?? status?.providers.find((p) => p.id === provider)?.model;
}
