/**
 * The service requests: one store every role reads and writes. It is persisted in
 * localStorage (key rcene:starter-app:records) and synced across this app's windows,
 * so a request filed in the console shows up on the board and the resident's phone.
 * The rules live in src/domain/records.ts; the store only applies them.
 * "Reset demo" (AppShell showReset) clears it back to the seeded records.
 */
import { createSyncedStore } from "@rcene/store";
import {
  advanceRecord,
  createRecord,
  seedRecords,
  type NewRequest,
  type RequestRecord,
} from "./domain/records.ts";

interface RecordsState {
  records: RequestRecord[];
  /** Files a request received at `at` and returns it (with its new code). */
  add: (draft: NewRequest, at: string) => RequestRecord;
  /** Moves a request to its next step at `at`. */
  advance: (code: string, at: string) => void;
}

export const useRecords = createSyncedStore<RecordsState>(
  "starter-app:records",
  (set, get) => ({
    records: seedRecords(),
    add: (draft, at) => {
      const record = createRecord(draft, get().records, at);
      set((s) => ({ records: [...s.records, record] }));
      return record;
    },
    advance: (code, at) =>
      set((s) => ({ records: s.records.map((r) => (r.code === code ? advanceRecord(r, at) : r)) })),
  }),
  // Bump `version` (and pass `migrate`) when RequestRecord changes shape.
  { version: 1, partialize: (s) => ({ records: s.records }) },
);
