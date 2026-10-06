/**
 * The AI activity log: the last runs of every task (which provider answered, how fast,
 * live or fallback). Synced across windows, so the admin page shows the calls made in
 * the console window. Evidence for the judges that the AI really runs. "Reset demo"
 * clears it.
 */
import { createSyncedStore } from "@rcene/store";
import type { AiResultMeta } from "./client.ts";

export interface AiLogEntry extends AiResultMeta {
  id: string;
}

interface AiLogState {
  entries: AiLogEntry[];
  add: (meta: AiResultMeta) => void;
  clear: () => void;
}

export const AI_LOG_LIMIT = 40;

export const useAiLog = createSyncedStore<AiLogState>(
  "ai:log",
  (set) => ({
    entries: [],
    add: (meta) =>
      set((s) => {
        const { task, mode, provider, requested, model, latencyMs, note, at } = meta;
        const entry: AiLogEntry = { id: `${at}-${s.entries.length}`, task, mode, provider, requested, model, latencyMs, note, at };
        return { entries: [entry, ...s.entries].slice(0, AI_LOG_LIMIT) };
      }),
    clear: () => set({ entries: [] }),
  }),
  { version: 1, partialize: (s) => ({ entries: s.entries }) },
);
