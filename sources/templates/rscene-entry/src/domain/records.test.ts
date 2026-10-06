import { describe, expect, it } from "vitest";
import {
  CATEGORIES,
  STATUSES,
  advanceRecord,
  createRecord,
  dueDate,
  findRecord,
  newestFirst,
  nextCode,
  nextStatus,
  normalizeCode,
  seedRecords,
  type NewRequest,
} from "./records.ts";

const draft: NewRequest = {
  barangay: "Sample Barangay 2",
  category: "water",
  priority: "urgent",
  channel: "walkIn",
  households: 12,
  landmark: "  Near the covered court ",
};

describe("seedRecords", () => {
  const records = seedRecords();

  it("is deterministic: same seed, same records", () => {
    expect(seedRecords()).toEqual(records);
    expect(seedRecords(1)).not.toEqual(records);
  });

  it("makes 24 records coded REC-0001 … REC-0024 in filing order", () => {
    expect(records).toHaveLength(24);
    expect(records.map((r) => r.code)).toEqual(Array.from({ length: 24 }, (_, i) => `REC-${String(i + 1).padStart(4, "0")}`));
    const filed = records.map((r) => Date.parse(r.receivedAt));
    expect(filed).toEqual([...filed].sort((a, b) => a - b));
  });

  it("uses codes, never names, for barangays", () => {
    for (const r of records) expect(r.barangay).toMatch(/^BRGY-(0[1-9]|1[0-2])$/);
  });

  it("dates everything between 21 Sep and the evening before the demo day", () => {
    for (const r of records) {
      for (const e of r.history) {
        expect(Date.parse(e.at)).toBeGreaterThanOrEqual(Date.parse("2026-09-21T00:00:00+08:00"));
        expect(Date.parse(e.at)).toBeLessThanOrEqual(Date.parse("2026-10-06T17:00:00+08:00"));
      }
    }
  });

  it("keeps each history in step order, ending at the record's status", () => {
    for (const r of records) {
      expect(r.history.map((e) => e.status)).toEqual(STATUSES.slice(0, r.history.length));
      expect(r.history.at(-1)?.status).toBe(r.status);
      expect(r.history[0]?.at).toBe(r.receivedAt);
      expect(r.dueAt).toBe(dueDate(r.receivedAt, r.category));
    }
  });

  it("covers every category and every status (the charts and the board need them)", () => {
    expect(new Set(records.map((r) => r.category))).toEqual(new Set(CATEGORIES));
    expect(new Set(records.map((r) => r.status))).toEqual(new Set(STATUSES));
  });

  it("leaves REC-0001 open, so its record page shows a step to take", () => {
    expect(records[0]?.status).not.toBe("done");
  });
});

describe("codes", () => {
  it("gives the next code after the highest one", () => {
    expect(nextCode([])).toBe("REC-0001");
    expect(nextCode([{ code: "REC-0002" }, { code: "REC-0024" }, { code: "REC-0003" }])).toBe("REC-0025");
    expect(nextCode([{ code: "OTHER-9" }])).toBe("REC-0001");
  });

  it("reads codes the way people type them", () => {
    expect(normalizeCode("REC-0007")).toBe("REC-0007");
    expect(normalizeCode(" rec-7 ")).toBe("REC-0007");
    expect(normalizeCode("rec 0012")).toBe("REC-0012");
    expect(normalizeCode("REC0012")).toBe("REC-0012");
    expect(normalizeCode("12")).toBe("REC-0012");
    expect(normalizeCode("")).toBeNull();
    expect(normalizeCode("REC-0000")).toBeNull();
    expect(normalizeCode("BRGY-05")).toBeNull();
    expect(normalizeCode("hello")).toBeNull();
  });

  it("finds a record by a loosely typed code", () => {
    const records = seedRecords();
    expect(findRecord(records, "rec 3")?.code).toBe("REC-0003");
    expect(findRecord(records, "REC-0099")).toBeUndefined();
    expect(findRecord(records, "nope")).toBeUndefined();
  });
});

describe("filing and advancing", () => {
  const at = "2026-10-07T10:15:00+08:00";

  it("files a new request as received, with the next code and a due date", () => {
    const record = createRecord(draft, seedRecords(), at);
    expect(record).toMatchObject({
      code: "REC-0025",
      status: "received",
      receivedAt: at,
      dueAt: "2026-10-10T17:00:00+08:00",
      landmark: "Near the covered court",
      history: [{ status: "received", at }],
    });
  });

  it("moves a request one step at a time and stops at done", () => {
    expect(nextStatus("received")).toBe("review");
    expect(nextStatus("scheduled")).toBe("done");
    expect(nextStatus("done")).toBeNull();

    let record = createRecord(draft, [], at);
    for (const expected of ["review", "scheduled", "done"] as const) {
      record = advanceRecord(record, at);
      expect(record.status).toBe(expected);
    }
    expect(record.history.map((e) => e.status)).toEqual([...STATUSES]);
    expect(advanceRecord(record, at)).toBe(record);
  });

  it("sorts newest first", () => {
    const sorted = newestFirst(seedRecords());
    expect(sorted[0]?.code).toBe("REC-0024");
    expect(sorted.at(-1)?.code).toBe("REC-0001");
  });
});
