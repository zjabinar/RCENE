/**
 * Dates for the service requests, in Philippine time (UTC+8, no daylight saving).
 * Records keep ISO 8601 strings with the +08:00 offset; day arithmetic works on whole
 * Philippine calendar days, so every computer gives the same answer.
 */

const OFFSET_MS = 8 * 60 * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The demo's "today": the event day. The synthetic records are dated in the two weeks
 * before it, and the KPIs ("due this week", "overdue") are counted from it, so every
 * rehearsal reads the same. A live app uses the real date instead.
 */
export const DEMO_DAY = "2026-10-07";

/** Days since 1970-01-01, counted in Philippine time. */
export function dayNumber(iso: string): number {
  return Math.floor((Date.parse(iso) + OFFSET_MS) / DAY_MS);
}

/** The Philippine day number of a calendar date, e.g. dayOfDate("2026-10-07"). */
export function dayOfDate(date: string): number {
  return dayNumber(`${date}T00:00:00+08:00`);
}

/** An ISO string with the +08:00 offset for a day number and a time of day. */
export function isoAt(day: number, hour = 0, minute = 0): string {
  const wall = new Date(day * DAY_MS + (hour * 60 + minute) * 60_000);
  return `${wall.toISOString().slice(0, 16)}:00+08:00`;
}

/** The Monday of the week that holds `day` (weeks run Monday to Sunday; 1970-01-01 was a Thursday). */
export function weekStart(day: number): number {
  return day - ((day + 3) % 7);
}

/** Days from `from` to `to` (ISO strings), with fractions: 60 hours is 2.5. */
export function daysBetween(from: string, to: string): number {
  return (Date.parse(to) - Date.parse(from)) / DAY_MS;
}

/**
 * "Now" on the demo day: the real wall-clock time (Philippine time) on DEMO_DAY. New
 * requests get this stamp, so they sort after the seeded ones and the KPIs stay put.
 * A live app uses `new Date().toISOString()`.
 */
export function demoNow(real: Date = new Date()): string {
  const minutes = Math.floor((((real.getTime() + OFFSET_MS) % DAY_MS) + DAY_MS) % DAY_MS / 60_000);
  return isoAt(dayOfDate(DEMO_DAY), Math.floor(minutes / 60), minutes % 60);
}
