/**
 * Numbers about the requests, for the KPI row, the charts, the crew meters and the
 * timelines. Pure: every function takes the records (and "now") as arguments.
 */
import { CREW_SLOTS, STATUSES, type Category, type RequestRecord, type Status } from "./records.ts";
import { dayNumber, daysBetween, weekStart } from "./time.ts";

export interface Kpis {
  /** Requests not done yet. */
  open: number;
  /** Open requests due Monday to Sunday of the current week. */
  dueThisWeek: number;
  /** Open requests whose due date has passed. */
  overdue: number;
  done: number;
  /** Requests finished Monday to Sunday of the current week. */
  doneThisWeek: number;
  /** Mean days from received to done over the finished requests (one decimal), or null when none is done. */
  averageDays: number | null;
}

function doneAt(record: RequestRecord): string | undefined {
  return record.history.find((e) => e.status === "done")?.at;
}

export function computeKpis(records: readonly RequestRecord[], now: string): Kpis {
  const today = dayNumber(now);
  const monday = weekStart(today);
  const inThisWeek = (iso: string) => {
    const day = dayNumber(iso);
    return day >= monday && day < monday + 7;
  };

  const open = records.filter((r) => r.status !== "done");
  const durations = records.flatMap((r) => {
    const at = doneAt(r);
    return at ? [daysBetween(r.receivedAt, at)] : [];
  });
  const average = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null;

  return {
    open: open.length,
    dueThisWeek: open.filter((r) => inThisWeek(r.dueAt)).length,
    overdue: open.filter((r) => Date.parse(r.dueAt) < Date.parse(now)).length,
    done: records.length - open.length,
    doneThisWeek: records.filter((r) => {
      const at = doneAt(r);
      return at !== undefined && inThisWeek(at);
    }).length,
    averageDays: average === null ? null : Math.round(average * 10) / 10,
  };
}

/** True when the request is still open after its due date. */
export function isOverdue(record: RequestRecord, now: string): boolean {
  return record.status !== "done" && Date.parse(record.dueAt) < Date.parse(now);
}

/** How many records fall under each key, in the order of `keys` (zeros included), for charts and tables. */
export function countBy<K extends string>(
  records: readonly RequestRecord[],
  keyOf: (record: RequestRecord) => K,
  keys: readonly K[],
): { key: K; count: number }[] {
  const counts = new Map<K, number>(keys.map((k) => [k, 0]));
  for (const record of records) {
    const key = keyOf(record);
    if (counts.has(key)) counts.set(key, counts.get(key)! + 1);
  }
  return keys.map((key) => ({ key, count: counts.get(key)! }));
}

/** A category crew's load this week: requests scheduled for it against its weekly slots. */
export function crewLoad(records: readonly RequestRecord[], category: Category): { used: number; slots: number } {
  return {
    used: records.filter((r) => r.category === category && r.status === "scheduled").length,
    slots: CREW_SLOTS[category],
  };
}

export type StepState = "done" | "current" | "upcoming";

export interface ProgressStep {
  status: Status;
  state: StepState;
  /** When the step was reached (undefined for steps still ahead). */
  at?: string;
}

/** Every step of a request with its state: the ones reached are done, the latest is current (done when finished). */
export function progress(record: RequestRecord): ProgressStep[] {
  const reached = new Map(record.history.map((e) => [e.status, e.at]));
  const current = STATUSES.indexOf(record.status);
  return STATUSES.map((status, i) => ({
    status,
    state: i < current || record.status === "done" ? "done" : i === current ? "current" : "upcoming",
    at: reached.get(status),
  }));
}
