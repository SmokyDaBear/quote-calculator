import { useMemo, useState } from "react";
import {
  DatePicker,
  addDays,
  formatSlot,
  fromTimestamp,
  startOfDay,
  toTimestamp,
} from "./DatePicker";
import { CalendarIcon } from "../../icons";
import {
  DEFAULT_STORE_HOURS,
  describeDay,
  hoursForDay,
  normalizeStoreHours,
} from "../../utils/storeHours";
import type { StoreHours } from "../../types/index";

const SHOP_SLOT_MINUTES = 15;
const SHOP_DAYS_OUT = 365;

const fmtStamp = (ts: number) => {
  const { date, minutes } = fromTimestamp(ts);
  return `${date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })} · ${formatSlot(minutes)}`;
};

/**
 * Calendar-driven replacement for `<input type="datetime-local">`. Collapsed to
 * a summary line until the user opens it, so two of these fit in a modal.
 */
export function DateTimeField({
  label,
  value,
  onChange,
  storeHours,
  slotMinutes = SHOP_SLOT_MINUTES,
  minTimestamp,
  clearable = false,
  placeholder = "No time selected",
  defaultOpen = false,
  timeFirst = false,
  defaultDate,
  children,
}: {
  label: string;
  value?: number;
  onChange: (ts: number | undefined) => void;
  /** Operating hours the slot grid is generated from. */
  storeHours?: StoreHours;
  slotMinutes?: number;
  /** Nothing earlier than this instant can be picked. */
  minTimestamp?: number;
  clearable?: boolean;
  placeholder?: string;
  defaultOpen?: boolean;
  /** Show times only, with the calendar behind a "Change date" toggle. */
  timeFirst?: boolean;
  /** Day the slot list falls back to before anything is picked. */
  defaultDate?: number;
  /** Extra controls rendered next to Clear/Choose (e.g. a re-estimate button). */
  children?: React.ReactNode;
}) {
  const hours = useMemo(
    () => normalizeStoreHours(storeHours ?? DEFAULT_STORE_HOURS),
    [storeHours],
  );

  const [open, setOpen] = useState(defaultOpen);
  // In time-first mode the month grid stays hidden until it's asked for —
  // most appointments are same-day, and only multi-day work needs the date.
  const [calendarOpen, setCalendarOpen] = useState(!timeFirst);
  // Held separately so a chosen day survives until a time is picked too.
  const [pendingDate, setPendingDate] = useState<Date | null>(
    value ? fromTimestamp(value).date : null,
  );

  const fallbackDate =
    defaultDate !== undefined
      ? fromTimestamp(defaultDate).date
      : minTimestamp !== undefined
        ? fromTimestamp(minTimestamp).date
        : null;

  const selectedDate = value
    ? fromTimestamp(value).date
    : (pendingDate ?? fallbackDate);
  const selectedTime = value ? fromTimestamp(value).minutes : null;

  const earliestDay =
    minTimestamp !== undefined
      ? startOfDay(new Date(minTimestamp))
      : startOfDay(new Date());

  const handleSelectDate = (d: Date) => {
    setPendingDate(d);
    // Keep the time of day when only the date is being moved, unless that
    // would land before the floor or outside the new day's hours.
    if (selectedTime === null) return;
    const window = hoursForDay(hours, d);
    const ts = toTimestamp(d, selectedTime);
    if (!window || selectedTime < window.open || selectedTime > window.close) return;
    if (minTimestamp !== undefined && ts < minTimestamp) return;
    onChange(ts);
  };

  const handleSelectTime = (t: number) => {
    const day = selectedDate ?? startOfDay(new Date());
    onChange(toTimestamp(day, t));
    setOpen(false);
  };

  return (
    <div className="dtfield">
      <div className="dtfield-head">
        <span className="dtfield-label">{label}</span>
        <div className="dtfield-actions">
          {children}
          {clearable && value !== undefined && (
            <button
              type="button"
              className="btn-small btn-secondary"
              onClick={() => {
                onChange(undefined);
                setPendingDate(null);
              }}
            >
              Clear
            </button>
          )}
          <button
            type="button"
            className="btn-small btn-secondary dtfield-toggle"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
          >
            <CalendarIcon size={14} />
            {open ? "Done" : value !== undefined ? "Change" : "Choose"}
          </button>
        </div>
      </div>

      <div className={`dtfield-value${value === undefined ? " dtfield-value--empty" : ""}`}>
        {value !== undefined ? fmtStamp(value) : placeholder}
      </div>

      {open && (
        <>
          {timeFirst && (
            <button
              type="button"
              className="btn-small btn-secondary dtfield-datetoggle"
              onClick={() => setCalendarOpen((c) => !c)}
              aria-expanded={calendarOpen}
            >
              {calendarOpen ? "Hide calendar" : "Change date (multi-day job)"}
            </button>
          )}
          <DatePicker
            date={selectedDate}
            time={selectedTime}
            onSelectDate={handleSelectDate}
            onSelectTime={handleSelectTime}
            minDate={earliestDay}
            maxDate={addDays(new Date(), SHOP_DAYS_OUT)}
            minTimestamp={minTimestamp}
            dayHours={(d) => hoursForDay(hours, d)}
            slotMinutes={slotMinutes}
            showCalendar={calendarOpen}
            note={selectedDate ? describeDay(hours, selectedDate) : "Store hours"}
            emptyLabel="Pick a day to see available times."
            showSummary={false}
          />
        </>
      )}
    </div>
  );
}
