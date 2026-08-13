import "./DatePicker.css";
import { useMemo, useState } from "react";
import { CalendarIcon, CloseIcon } from "../../icons";

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const pad2 = (n: number) => String(n).padStart(2, "0");

/* Defaults match the contact-form use case: weekdays, 9 AM – 5 PM, 30-min slots. */
const OPEN_MIN = 9 * 60;
const CLOSE_MIN = 17 * 60;
const SLOT_MINUTES = 30;
const MAX_DAYS_OUT = 60;

const isWeekday = (d: Date) => d.getDay() !== 0 && d.getDay() !== 6;

export const formatSlot = (mins: number) => {
  const h = Math.floor(mins / 60);
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${pad2(mins % 60)} ${h >= 12 ? "PM" : "AM"}`;
};

export const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const addDays = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** Combine a calendar day with a minutes-past-midnight slot into a timestamp. */
export const toTimestamp = (date: Date, minutes: number) =>
  new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    Math.floor(minutes / 60),
    minutes % 60,
  ).getTime();

/** Split a timestamp back into the day + slot the picker works with. */
export const fromTimestamp = (ts: number) => {
  const d = new Date(ts);
  return { date: startOfDay(d), minutes: d.getHours() * 60 + d.getMinutes() };
};

export function DatePicker({
  date,
  time,
  onSelectDate,
  onSelectTime,
  minDate: minDateProp,
  maxDate: maxDateProp,
  allowWeekends = false,
  openMinutes = OPEN_MIN,
  closeMinutes = CLOSE_MIN,
  slotMinutes = SLOT_MINUTES,
  dayHours,
  minTimestamp,
  showCalendar = true,
  note = "Weekdays · 9 AM – 5 PM",
  emptyLabel = "Pick a date to see available call times.",
  showSummary = true,
  summaryLabel = "Requested",
}: {
  date: Date | null;
  time: number | null;
  onSelectDate: (d: Date) => void;
  onSelectTime: (t: number) => void;
  /** Earliest selectable day. Defaults to tomorrow. */
  minDate?: Date;
  /** Latest selectable day. Defaults to 60 days out. */
  maxDate?: Date;
  allowWeekends?: boolean;
  openMinutes?: number;
  closeMinutes?: number;
  slotMinutes?: number;
  /**
   * Per-day opening window, for callers with real store hours. When given it
   * supersedes `allowWeekends` / `openMinutes` / `closeMinutes`; returning null
   * marks the day closed.
   */
  dayHours?: (d: Date) => { open: number; close: number } | null;
  /** Earliest selectable instant — trims slots on the day it falls in. */
  minTimestamp?: number;
  /** Hide the month grid and show times only (the day stays as chosen). */
  showCalendar?: boolean;
  note?: string;
  emptyLabel?: string;
  showSummary?: boolean;
  summaryLabel?: string;
}) {
  const today = startOfDay(new Date());
  const minDate = minDateProp ? startOfDay(minDateProp) : addDays(today, 1);
  const maxDate = maxDateProp ? startOfDay(maxDateProp) : addDays(today, MAX_DAYS_OUT);
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    const anchor = date ?? minDate;
    return new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  });

  const windowFor = (d: Date) =>
    dayHours
      ? dayHours(d)
      : allowWeekends || isWeekday(d)
        ? { open: openMinutes, close: closeMinutes }
        : null;

  const isOpenDay = (d: Date) => windowFor(d) !== null;

  const slotsForDate = (d: Date): number[] => {
    const window = windowFor(d);
    if (!window) return [];
    // Same day as the floor: start at it rather than at opening.
    const floor =
      minTimestamp !== undefined &&
      startOfDay(new Date(minTimestamp)).getTime() === d.getTime()
        ? fromTimestamp(minTimestamp).minutes
        : -Infinity;
    const slots: number[] = [];
    for (let t = window.open; t <= window.close - slotMinutes; t += slotMinutes) {
      if (t >= floor) slots.push(t);
    }
    return slots;
  };

  const canPrev =
    viewMonth.getTime() >
    new Date(today.getFullYear(), today.getMonth(), 1).getTime();
  const canNext =
    viewMonth.getTime() <
    new Date(maxDate.getFullYear(), maxDate.getMonth(), 1).getTime();

  const cells = useMemo<(Date | null)[]>(() => {
    const daysInMonth = new Date(
      viewMonth.getFullYear(),
      viewMonth.getMonth() + 1,
      0,
    ).getDate();
    return [
      ...Array.from({ length: viewMonth.getDay() }, () => null),
      ...Array.from(
        { length: daysInMonth },
        (_, i) =>
          new Date(viewMonth.getFullYear(), viewMonth.getMonth(), i + 1),
      ),
    ];
  }, [viewMonth]);

  const changeMonth = (delta: number) =>
    setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));

  const slots = date ? slotsForDate(date) : [];

  return (
    <>
      <div className={showCalendar ? "picker" : "picker picker--times-only"}>
        {showCalendar && (
        <div className="picker-cal">
          <div className="cal-head">
            <button
              type="button"
              className="cal-nav"
              onClick={() => changeMonth(-1)}
              disabled={!canPrev}
              aria-label="Previous month"
            >
              &#8249;
            </button>
            <span>
              {viewMonth.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </span>
            <button
              type="button"
              className="cal-nav"
              onClick={() => changeMonth(1)}
              disabled={!canNext}
              aria-label="Next month"
            >
              &#8250;
            </button>
          </div>
          <div className="cal-grid">
            {DOW_LABELS.map((d) => (
              <span key={d} className="cal-dow">
                {d}
              </span>
            ))}
            {cells.map((cell, i) => {
              if (cell === null) return <span key={`blank-${i}`} />;
              const selectable =
                cell.getTime() >= minDate.getTime() &&
                cell.getTime() <= maxDate.getTime() &&
                isOpenDay(cell);
              const isSelected =
                date !== null && cell.getTime() === date.getTime();
              const classes = [
                "cal-day",
                isSelected ? "selected" : "",
                cell.getTime() === today.getTime() ? "today" : "",
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <button
                  key={cell.getTime()}
                  type="button"
                  className={classes}
                  disabled={!selectable}
                  aria-pressed={isSelected}
                  onClick={() => onSelectDate(cell)}
                >
                  {cell.getDate()}
                </button>
              );
            })}
          </div>
          {note && <p className="cal-note">{note}</p>}
        </div>
        )}

        <div className="picker-slots">
          {date === null ? (
            <p className="slots-empty">{emptyLabel}</p>
          ) : slots.length === 0 ? (
            <p className="slots-empty">
              No times available on{" "}
              {date.toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
              .
            </p>
          ) : (
            <>
              <span className="slots-label">
                {date.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
              </span>
              <div className="slot-grid">
                {slots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    className={time === slot ? "slot selected" : "slot"}
                    aria-pressed={time === slot}
                    onClick={() => onSelectTime(slot)}
                  >
                    {formatSlot(slot)}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {showSummary && date !== null && time !== null && (
        <p className="picker-summary">
          <span className="mark" aria-hidden="true" />
          {summaryLabel}:{" "}
          {date.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}{" "}
          at {formatSlot(time)}
        </p>
      )}
    </>
  );
}

/**
 * Optional "schedule a call" section for contact forms. Collapsed by
 * default; when a date and time are chosen, the request is submitted
 * through a hidden input (works with Formspree like any other field).
 */
export function ScheduleCallField({
  name = "requested-meeting",
}: {
  name?: string;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | null>(null);
  const [time, setTime] = useState<number | null>(null);

  const value =
    open && date !== null && time !== null
      ? `${date.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })} at ${formatSlot(time)}`
      : "";

  return (
    <div className="schedule-field">
      <button
        type="button"
        className={"schedule-toggle" + (open ? " open" : "")}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        {open ? <CloseIcon size={16} /> : <CalendarIcon size={16} />}
        {open ? "Never mind, no meeting" : "Schedule a meeting or callback"}
      </button>
      {open && (
        <div className="schedule-body">
          <p className="schedule-hint">
            Pick a day and time that suits you — I'll confirm by email or phone.
          </p>
          <DatePicker
            date={date}
            time={time}
            onSelectDate={setDate}
            onSelectTime={setTime}
          />
        </div>
      )}
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
