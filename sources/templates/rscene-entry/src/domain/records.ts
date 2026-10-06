/**
 * Barangay service requests: the record type, the seeded sample records and the
 * rules for filing a request and moving it along. Pure functions only (no React,
 * no storage); the store in src/store.ts calls them.
 *
 * Records carry codes (REC-0001, BRGY-05), never personal names.
 */
import { code, createRng } from "@rcene/data";
import { dayNumber, isoAt } from "./time.ts";

/** The steps every request goes through, in order. */
export const STATUSES = ["received", "review", "scheduled", "done"] as const;
export type Status = (typeof STATUSES)[number];

export const CATEGORIES = ["water", "road", "waste", "streetlight", "permit"] as const;
export type Category = (typeof CATEGORIES)[number];

export const PRIORITIES = ["normal", "urgent"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const CHANNELS = ["walkIn", "phone", "referral"] as const;
export type Channel = (typeof CHANNELS)[number];

/** Target days from "received" to "done", per category. Sets the due date. */
export const TARGET_DAYS: Record<Category, number> = { water: 3, road: 10, waste: 2, streetlight: 5, permit: 7 };

/** Visits each category's crew can take in a week (the CapacityMeter on the record page and the board). */
export const CREW_SLOTS: Record<Category, number> = { water: 4, road: 3, waste: 5, streetlight: 3, permit: 4 };

export interface StatusEvent {
  status: Status;
  /** ISO 8601 with the +08:00 offset. */
  at: string;
}

export interface RequestRecord {
  /** "REC-0001". The only identifier: no names. */
  code: string;
  /** A barangay code ("BRGY-05") for the seeded records, the name from the barangays layer for new ones. */
  barangay: string;
  category: Category;
  priority: Priority;
  channel: Channel;
  /** Households affected (1 for a single home or business). */
  households: number;
  /** Where the crew should go, in the resident's words ("" when not given). */
  landmark: string;
  /** The request in the resident's own words ("" when not given). What the AI triage reads. */
  details: string;
  /** What the AI suggested at filing and what the staff did with it (absent: filed by hand). */
  triage?: TriageInfo;
  /** The current step; always the status of the last `history` entry. */
  status: Status;
  receivedAt: string;
  dueAt: string;
  /** When each step was reached, oldest first. */
  history: StatusEvent[];
}

/** The AI's suggestion when a request was filed, kept with the record (provenance for the judges and auditors). */
export interface TriageInfo {
  category: Category;
  priority: Priority;
  /** 0 to 1. */
  confidence: number;
  /** live: a model answered · demo: the demo rules · fallback: the model failed and the demo rules answered. */
  mode: "live" | "demo" | "fallback";
  provider: string;
  model?: string;
  /** accepted: filed as suggested · changed: the staff changed the category or the priority. */
  decision: "accepted" | "changed";
}

/** What the "New request" wizard collects. */
export type NewRequest = Pick<RequestRecord, "barangay" | "category" | "priority" | "channel" | "households" | "landmark"> & {
  details?: string;
  triage?: TriageInfo;
};

export const CODE_PREFIX = "REC";

/** The step after `status`, or null when the request is done. */
export function nextStatus(status: Status): Status | null {
  return STATUSES[STATUSES.indexOf(status) + 1] ?? null;
}

/** The due date: TARGET_DAYS after it was received, at the end of the office day (17:00). */
export function dueDate(receivedAt: string, category: Category): string {
  return isoAt(dayNumber(receivedAt) + TARGET_DAYS[category], 17, 0);
}

/** The code for the next request: one more than the highest REC number (REC-0001 for an empty list). */
export function nextCode(records: readonly Pick<RequestRecord, "code">[]): string {
  const highest = records.reduce((max, r) => {
    const match = /^REC-(\d+)$/.exec(r.code);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return code(CODE_PREFIX, highest + 1);
}

/**
 * A code as a resident might type it ("rec-7", "REC0007", "7", " rec 0007 ") in its
 * canonical form ("REC-0007"), or null when it is not a request code.
 */
export function normalizeCode(input: string): string | null {
  const match = /^(?:rec)?[\s-]*(\d{1,6})$/i.exec(input.trim());
  if (!match) return null;
  const n = Number(match[1]);
  return n > 0 ? code(CODE_PREFIX, n) : null;
}

/** The record with this code (typed loosely, see normalizeCode), or undefined. */
export function findRecord<T extends Pick<RequestRecord, "code">>(records: readonly T[], input: string): T | undefined {
  const wanted = normalizeCode(input);
  return wanted ? records.find((r) => r.code === wanted) : undefined;
}

/** A new request, received at `at`, with the next free code. */
export function createRecord(draft: NewRequest, records: readonly Pick<RequestRecord, "code">[], at: string): RequestRecord {
  const { triage, ...rest } = draft;
  return {
    code: nextCode(records),
    ...rest,
    ...(triage && { triage }),
    landmark: draft.landmark.trim(),
    details: draft.details?.trim() ?? "",
    status: "received",
    receivedAt: at,
    dueAt: dueDate(at, draft.category),
    history: [{ status: "received", at }],
  };
}

/** The record moved to its next step at `at`. A done record comes back unchanged. */
export function advanceRecord(record: RequestRecord, at: string): RequestRecord {
  const next = nextStatus(record.status);
  if (!next) return record;
  return { ...record, status: next, history: [...record.history, { status: next, at }] };
}

/** Newest first (by the time received; the code breaks ties). */
export function newestFirst<T extends Pick<RequestRecord, "receivedAt" | "code">>(records: readonly T[]): T[] {
  return [...records].sort((a, b) => Date.parse(b.receivedAt) - Date.parse(a.receivedAt) || b.code.localeCompare(a.code));
}

// ------------------------------------------------------------------ Seeding

/** The seed of the sample records (createRng). Same seed, same records: every rehearsal is identical. */
export const SEED = 171;
export const SEED_COUNT = 24;
/** The sample records use barangay codes BRGY-01 … BRGY-12. */
export const SEED_BARANGAYS = 12;

/** The sample records were received over these 16 days, before the demo day. */
const FIRST_DAY = dayNumber("2026-09-21T00:00:00+08:00");
const SPAN_DAYS = 16;
/** Nothing in the sample happens after this moment (the evening before the demo day). */
const CUTOFF = Date.parse("2026-10-06T17:00:00+08:00");

const CATEGORY_WEIGHTS: readonly (readonly [Category, number])[] = [
  ["water", 5],
  ["road", 4],
  ["waste", 4],
  ["streetlight", 3],
  ["permit", 3],
];
const CHANNEL_WEIGHTS: readonly (readonly [Channel, number])[] = [
  ["walkIn", 5],
  ["phone", 3],
  ["referral", 2],
];
/**
 * Days each step takes (min, max), per category: to review, to scheduled, to done.
 * Garbage is quick; road works wait for a crew and take longest.
 */
type Range = readonly [number, number];
const STEP_DAYS: Record<Category, readonly [Range, Range, Range]> = {
  water: [[1, 1], [1, 2], [1, 2]],
  road: [[1, 3], [2, 5], [3, 10]],
  waste: [[1, 1], [1, 2], [1, 1]],
  streetlight: [[1, 2], [1, 3], [1, 3]],
  permit: [[1, 3], [2, 4], [1, 3]],
};
const HOUSEHOLDS: Record<Category, Range> = {
  water: [5, 80],
  road: [10, 60],
  waste: [5, 40],
  streetlight: [3, 15],
  permit: [1, 1],
};
const MINUTES = [0, 10, 15, 20, 30, 40, 45, 50] as const;

/**
 * What residents wrote, per category, in English, Filipino and Waray (as they do at the
 * desk). {n} becomes the households. Places are generic ("Purok 3", "the chapel"); no names.
 */
const DETAILS: Record<Category, readonly string[]> = {
  water: [
    "No water from the tap since Monday in Purok 3. About {n} households are affected.",
    "Waray tubig ha amon purok tikang pa kahapon. Mga {n} ka pamilya an apektado.",
    "Leaking main pipe near the chapel; clean water runs onto the road all day.",
    "Mahina ang tubig sa gripo tuwing umaga, {n} kabahayan ang nagrereklamo.",
  ],
  road: [
    "Big pothole on the main road near the school. Tricycles swerve around it at night.",
    "Nasira ang kalsada matapos ang malakas na ulan, mahirap dumaan ang mga sasakyan.",
    "Daku nga lubak ha dalan tupad han eskwelahan, delikado ha mga estudyante.",
    "The footbridge railing at the creek crossing is broken; {n} households use it daily.",
  ],
  waste: [
    "Garbage has not been collected for two weeks; bags are piling up at the corner.",
    "Hindi nakolekta ang basura sa aming kalye ngayong linggo.",
    "Damu nga basura ha baybayon tikang han bagyo.",
    "Trash is burned near the houses every night and the smoke reaches the daycare.",
  ],
  streetlight: [
    "The streetlight at the corner is out; the street is very dark at night.",
    "Patay ang ilaw sa poste malapit sa basketball court.",
    "Madulom an dalan kay guba an suga ha poste tupad han kapilya.",
    "Lights along the coastal road keep flickering after the storm.",
  ],
  permit: [
    "Asking for the requirements of a barangay business clearance for a sari-sari store.",
    "Paano kumuha ng barangay clearance para sa maliit na negosyo?",
    "Follow-up on a pending business clearance filed last week.",
    "Need a barangay certificate for a carinderia permit renewal.",
  ],
};

/** A resident's description for a seeded record (its own random stream, so the records themselves stay the same). */
function seedDetails(rng: ReturnType<typeof createRng>, category: Category, households: number): string {
  return rng.pick(DETAILS[category]).replace("{n}", String(households));
}

/**
 * The sample requests: `count` records coded REC-0001…, received in order over the
 * 16 days before the demo day, each moved along its steps at office hours until the
 * evening before. Deterministic for a given seed.
 */
export function seedRecords(seed = SEED, count = SEED_COUNT): RequestRecord[] {
  const rng = createRng(seed);
  const words = createRng(seed + 1000);
  const officeTime = (day: number) => isoAt(day, rng.int(8, 15), rng.pick(MINUTES));

  // Codes follow the order of filing, so draw every filing time first and sort them.
  const filed = Array.from({ length: count }, (_, i) => officeTime(FIRST_DAY + Math.floor((i * SPAN_DAYS) / count))).sort();

  return filed.map((receivedAt, i): RequestRecord => {
    const category = rng.weighted(CATEGORY_WEIGHTS);
    const history: StatusEvent[] = [{ status: "received", at: receivedAt }];
    let day = dayNumber(receivedAt);
    for (const [step, status] of STATUSES.slice(1).entries()) {
      const [min, max] = STEP_DAYS[category][step]!;
      day += rng.int(min, max);
      const at = officeTime(day);
      if (Date.parse(at) > CUTOFF) break;
      history.push({ status, at });
    }
    const [minHouseholds, maxHouseholds] = HOUSEHOLDS[category];
    const barangay = code("BRGY", rng.int(1, SEED_BARANGAYS), 2);
    const priority: Priority = rng.bool(0.2) ? "urgent" : "normal";
    const channel = rng.weighted(CHANNEL_WEIGHTS);
    const households = rng.int(minHouseholds, maxHouseholds);
    return {
      code: code(CODE_PREFIX, i + 1),
      barangay,
      category,
      priority,
      channel,
      households,
      landmark: "",
      details: seedDetails(words, category, households),
      status: history[history.length - 1]!.status,
      receivedAt,
      dueAt: dueDate(receivedAt, category),
      history,
    };
  });
}
