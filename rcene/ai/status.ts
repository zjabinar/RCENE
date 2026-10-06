/**
 * What the relay says about the providers (GET /api/ai/status): the default provider,
 * which providers have keys, and their default models. Fetched once per page load and
 * shared by every component; "unavailable" means there is no relay (a static build),
 * so only the demo rules can answer.
 */
import { useEffect } from "react";
import { create } from "zustand";
import { AI_ROUTES, type AiStatus } from "./protocol.ts";

export type AiStatusState = "idle" | "loading" | "ready" | "unavailable";

interface StatusStore {
  state: AiStatusState;
  status: AiStatus | null;
  load: (force?: boolean) => Promise<void>;
}

/** Reads the relay status, or null when there is no relay (404, offline static build, bad reply). */
export async function fetchAiStatus(fetchImpl: typeof fetch = fetch, endpoint: string = AI_ROUTES.status): Promise<AiStatus | null> {
  try {
    const res = await fetchImpl(endpoint, { headers: { accept: "application/json" } });
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<AiStatus>;
    return data && Array.isArray(data.providers) && typeof data.defaultProvider === "string" ? (data as AiStatus) : null;
  } catch {
    return null;
  }
}

export const useAiStatusStore = create<StatusStore>((set, get) => ({
  state: "idle",
  status: null,
  load: async (force = false) => {
    if (!force && (get().state === "loading" || get().state === "ready")) return;
    set({ state: "loading" });
    const status = await fetchAiStatus();
    set({ state: status ? "ready" : "unavailable", status });
  },
}));

/** The relay status, loaded on first use. `refresh()` asks again (after editing the env file and restarting). */
export function useAiStatus(): { state: AiStatusState; status: AiStatus | null; refresh: () => Promise<void> } {
  const state = useAiStatusStore((s) => s.state);
  const status = useAiStatusStore((s) => s.status);
  const load = useAiStatusStore((s) => s.load);
  useEffect(() => {
    if (state === "idle") void load();
  }, [state, load]);
  return { state, status, refresh: () => load(true) };
}
