import { describe, expect, it } from "vitest";
import { computeKpis, countBy, crewLoad, isOverdue, progress } from "./kpis.ts";
import { CATEGORIES, STATUSES, advanceRecord, createRecord, seedRecords, type RequestRecord } from "./records.ts";

const NOW = "2026-10-07T10:00:00+08:00"; // a Wednesday; the week runs 5–11 Oct

function record(over: Partial<RequestRecord> & Pick<RequestRecord, "code">): RequestRecord {
  return {
    barangay: "BRGY-01",
    category: "water",
    priority: "normal",
    channel: "walkIn",
    households: 1,
    landmark: "",
    status: "received",
    receivedAt: "2026-10-01T09:00:00+08:00",
    dueAt: "2026-10-09T17:00:00+08:00",
    history: [{ status: "received", at: "2026-10-01T09:00:00+08:00" }],
    ...over,
  };
}

describe("computeKpis", () => {
  it("counts open, due this week, overdue and done, and averages days to close", () => {
    const records = [
      record({ code: "REC-0001" }), // open, due Fri this week
      record({ code: "REC-0002", dueAt: "2026-10-05T17:00:00+08:00" }), // open, due Mon this week, overdue
      record({ code: "REC-0003", dueAt: "2026-10-02T17:00:00+08:00" }), // open, due last week, overdue
      record({ code: "REC-0004", dueAt: "2026-10-13T17:00:00+08:00" }), // open, due next week
      record({
        code: "REC-0005",
        status: "done",
        receivedAt: "2026-10-01T09:00:00+08:00",
        history: [
          { status: "received", at: "2026-10-01T09:00:00+08:00" },
          { status: "done", at: "2026-10-03T21:00:00+08:00" }, // 2.5 days, last week
        ],
      }),
      record({
        code: "REC-0006",
        status: "done",
        receivedAt: "2026-10-02T09:00:00+08:00",
        history: [
          { status: "received", at: "2026-10-02T09:00:00+08:00" },
          { status: "done", at: "2026-10-06T09:00:00+08:00" }, // 4 days, this week
        ],
      }),
    ];
    expect(computeKpis(records, NOW)).toEqual({
      open: 4,
      dueThisWeek: 2,
      overdue: 2,
      done: 2,
      doneThisWeek: 1,
      averageDays: 3.3, // (2.5 + 4) / 2 = 3.25, one decimal
    });
  });

  it("has no average before anything is done", () => {
    expect(computeKpis([record({ code: "REC-0001" })], NOW).averageDays).toBeNull();
    expect(computeKpis([], NOW)).toMatchObject({ open: 0, done: 0, averageDays: null });
  });

  it("gives the sample a busy but readable week", () => {
    expect(computeKpis(seedRecords(), NOW)).toEqual({
      open: 11,
      dueThisWeek: 8,
      overdue: 2,
      done: 13,
      doneThisWeek: 3,
      averageDays: 5,
    });
  });
});

describe("isOverdue", () => {
  it("is true only for open requests past their due date", () => {
    expect(isOverdue(record({ code: "REC-0001", dueAt: "2026-10-06T17:00:00+08:00" }), NOW)).toBe(true);
    expect(isOverdue(record({ code: "REC-0001", dueAt: "2026-10-07T17:00:00+08:00" }), NOW)).toBe(false);
    expect(isOverdue(record({ code: "REC-0001", status: "done", dueAt: "2026-10-01T17:00:00+08:00" }), NOW)).toBe(false);
  });
});

describe("countBy", () => {
  it("counts in the order of the keys, zeros included", () => {
    const records = [record({ code: "REC-0001" }), record({ code: "REC-0002", status: "done" }), record({ code: "REC-0003" })];
    expect(countBy(records, (r) => r.status, STATUSES)).toEqual([
      { key: "received", count: 2 },
      { key: "review", count: 0 },
      { key: "scheduled", count: 0 },
      { key: "done", count: 1 },
    ]);
  });

  it("adds up to the number of records", () => {
    const records = seedRecords();
    const total = countBy(records, (r) => r.category, CATEGORIES).reduce((sum, c) => sum + c.count, 0);
    expect(total).toBe(records.length);
  });
});

describe("crewLoad", () => {
  it("counts the scheduled requests of a category against its weekly slots", () => {
    const records = seedRecords();
    expect(crewLoad(records, "road")).toEqual({ used: 3, slots: 3 });
    expect(crewLoad(records, "water")).toEqual({ used: 0, slots: 4 });
  });

  it("goes up when a request of that category is scheduled", () => {
    const at = "2026-10-07T10:00:00+08:00";
    const fresh = createRecord(
      { barangay: "BRGY-01", category: "waste", priority: "normal", channel: "phone", households: 3, landmark: "" },
      [],
      at,
    );
    const scheduled = advanceRecord(advanceRecord(fresh, at), at);
    expect(crewLoad([fresh], "waste").used).toBe(0);
    expect(crewLoad([scheduled], "waste").used).toBe(1);
  });
});

describe("progress", () => {
  it("marks reached steps done, the latest current and the rest upcoming", () => {
    const r = record({
      code: "REC-0001",
      status: "review",
      history: [
        { status: "received", at: "2026-10-01T09:00:00+08:00" },
        { status: "review", at: "2026-10-02T09:00:00+08:00" },
      ],
    });
    expect(progress(r)).toEqual([
      { status: "received", state: "done", at: "2026-10-01T09:00:00+08:00" },
      { status: "review", state: "current", at: "2026-10-02T09:00:00+08:00" },
      { status: "scheduled", state: "upcoming", at: undefined },
      { status: "done", state: "upcoming", at: undefined },
    ]);
  });

  it("marks every step done when the request is done", () => {
    const done = seedRecords().find((r) => r.status === "done")!;
    expect(progress(done).map((s) => s.state)).toEqual(["done", "done", "done", "done"]);
  });
});
