/**
 * The spine: the one store every role's view reads and writes (docs/brief.md, "Spine").
 * It is persisted and synced across this app's windows, which is how one role's action
 * shows up in another role's window. Key per-barangay records by barangay. Keep static
 * data (layers) out of here, only state. Grow it requirement by requirement.
 */
import { createSyncedStore } from "@rcene/store";

export interface SpineState {
  /** When any role last changed the spine (ms since epoch), for "updated just now" labels. */
  updatedAt: number | null;
  touch: () => void;
}

export const useSpine = createSyncedStore<SpineState>(
  "p09-luntian:spine",
  (set) => ({
    updatedAt: null,
    touch: () => set({ updatedAt: Date.now() }),
  }),
  { version: 1 },
);
