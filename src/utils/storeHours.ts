import type { StoreDayHours, StoreHours } from "../types/index";

/**
 * Store hours drive both appointment scheduling and promise-time estimates.
 * Everything here works in minutes past midnight so a day is just a number
 * range and arithmetic never has to worry about DST or timezones.
 */

const DAY = (open: number, close: number, closed = false): StoreDayHours => ({
  open,
  close,
  closed,
});

/** Mon–Fri 8 AM – 5 PM, Saturday 8 AM – noon, closed Sunday. */
export const DEFAULT_STORE_HOURS: StoreHours = [
  DAY(8 * 60, 12 * 60, true), // Sun
  DAY(8 * 60, 17 * 60), // Mon
  DAY(8 * 60, 17 * 60), // Tue
  DAY(8 * 60, 17 * 60), // Wed
  DAY(8 * 60, 17 * 60), // Thu
  DAY(8 * 60, 17 * 60), // Fri
  DAY(8 * 60, 12 * 60), // Sat
];

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/** Promise times land on clean half hours, so partial work rounds up. */
export const PROMISE_ROUND_MINUTES = 30;

/** Fills in any missing/short week so callers can trust seven valid entries. */
export function normalizeStoreHours(hours?: StoreHours | null): StoreHours {
  return DEFAULT_STORE_HOURS.map((fallback, i) => {
    const d = hours?.[i];
    if (!d) return { ...fallback };
    const open = Number.isFinite(d.open) ? d.open : fallback.open;
    const close = Number.isFinite(d.close) ? d.close : fallback.close;
    return { closed: !!d.closed || close <= open, open, close };
  });
}

/** The open window for a calendar day, or null when the store is closed. */
export function hoursForDay(
  hours: StoreHours,
  date: Date,
): { open: number; close: number } | null {
  const d = hours[date.getDay()];
  if (!d || d.closed || d.close <= d.open) return null;
  return { open: d.open, close: d.close };
}

export const isOpenOn = (hours: StoreHours, date: Date) =>
  hoursForDay(hours, date) !== null;

const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());

const addDays = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

const stamp = (day: Date, minutes: number) =>
  new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    Math.floor(minutes / 60),
    minutes % 60,
  ).getTime();

/** First open day on or after `from`; null if the whole week is closed. */
export function nextOpenDay(
  hours: StoreHours,
  from: Date,
  maxLookahead = 14,
): Date | null {
  let day = startOfDay(from);
  for (let i = 0; i <= maxLookahead; i++) {
    if (isOpenOn(hours, day)) return day;
    day = addDays(day, 1);
  }
  return null;
}

/** Round a minute-of-day up to the next half hour. */
const roundUp = (minutes: number) =>
  Math.ceil(minutes / PROMISE_ROUND_MINUTES) * PROMISE_ROUND_MINUTES;

/**
 * Estimated promise time: `laborHours` of shop time consumed from `dropoffAt`
 * forward, counting only hours the store is actually open and spilling into
 * following days for multi-day jobs. A drop-off outside business hours starts
 * the clock at the next opening. The result is rounded up to the next half
 * hour, and rolls to the next open day if that pushes past closing.
 *
 * Returns null when the store has no open days at all.
 */
export function estimatePromiseTime(
  dropoffAt: number,
  laborHours: number,
  hours: StoreHours = DEFAULT_STORE_HOURS,
): number | null {
  const week = normalizeStoreHours(hours);
  const dropoffDate = new Date(dropoffAt);

  let day = startOfDay(dropoffDate);
  let cursor = dropoffDate.getHours() * 60 + dropoffDate.getMinutes();

  // Move to the first minute the shop could actually start the work.
  const today = hoursForDay(week, day);
  if (!today || cursor >= today.close) {
    const next = nextOpenDay(week, addDays(day, 1));
    if (!next) return null;
    day = next;
    cursor = hoursForDay(week, day)!.open;
  } else if (cursor < today.open) {
    cursor = today.open;
  }

  let remaining = Math.max(0, Math.round(laborHours * 60));

  for (let guard = 0; guard < 400; guard++) {
    const window = hoursForDay(week, day)!;
    const available = window.close - cursor;

    if (remaining <= available) {
      const finish = roundUp(cursor + remaining);
      // Rounding may push past closing — promise it at the next opening.
      if (finish > window.close) {
        const next = nextOpenDay(week, addDays(day, 1));
        if (!next) return null;
        return stamp(next, hoursForDay(week, next)!.open);
      }
      return stamp(day, finish);
    }

    remaining -= available;
    const next = nextOpenDay(week, addDays(day, 1));
    if (!next) return null;
    day = next;
    cursor = hoursForDay(week, day)!.open;
  }

  return null;
}

// ── Formatting helpers ───────────────────────────────────────────────────────

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Minutes past midnight → the `HH:MM` an `<input type="time">` expects. */
export const minutesToTimeInput = (m: number) =>
  `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;

/** `HH:MM` back to minutes past midnight; falls back on unparseable input. */
export function timeInputToMinutes(value: string, fallback = 0): number {
  const [h, m] = value.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return fallback;
  return h * 60 + m;
}

export function formatMinutes(m: number): string {
  const h = Math.floor(m / 60);
  const h12 = ((h + 11) % 12) + 1;
  const suffix = h >= 12 ? "PM" : "AM";
  return m % 60 === 0
    ? `${h12} ${suffix}`
    : `${h12}:${pad2(m % 60)} ${suffix}`;
}

/** Short "8 AM – 5 PM" / "Closed" label for a calendar day. */
export function describeDay(hours: StoreHours, date: Date): string {
  const h = hoursForDay(hours, date);
  return h ? `${formatMinutes(h.open)} – ${formatMinutes(h.close)}` : "Closed";
}
