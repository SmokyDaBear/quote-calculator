import { useMemo, type CSSProperties, type ReactNode } from "react";
import StatusPill, { type PillTone } from "../ui/StatusPill";
import type { CalendarEvent, CalendarEventAction } from "./DailyCalendar";
import styles from "./WeeklyCalendar.module.css";

/**
 * Weekly calendar — the condensed sibling of DailyCalendar. Same event shape
 * and actions, but columns are the days of the week (Sun–Sat, or Mon–Fri in
 * workweek mode) instead of advisors. Each day column is a time-sorted list of
 * compact event chips. Grouping is derived from each event's own date, so the
 * caller just passes the week's events — no `groupBy`.
 */

export interface WeeklyCalendarProps<T> {
  events: CalendarEvent<T>[];
  /** Any date within the week to display. Defaults to today. */
  weekOf?: Date;
  /** First day of the week: 0 = Sunday (default), 1 = Monday. Ignored in workweek mode. */
  weekStartsOn?: 0 | 1;
  /** Show Monday–Friday only. */
  workweek?: boolean;
  /** Secondary line under the name (advisor, vehicle, …). */
  renderMeta?: (event: CalendarEvent<T>) => ReactNode;
  /** Status pill rendered on each chip. */
  renderStatus?: (
    event: CalendarEvent<T>,
  ) => { label: string; tone: PillTone } | null;
  /** Per-event actions (Check in, …). */
  actions?: CalendarEventAction<T>[];
  onEventClick?: (event: CalendarEvent<T>) => void;
}

export function startOfWeek(date: Date, weekStartsOn: 0 | 1 = 0): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const diff = (d.getDay() - weekStartsOn + 7) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

export function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

interface DayColumn<T> {
  date: Date;
  isToday: boolean;
  events: CalendarEvent<T>[];
}

function buildWeek<T>(
  events: CalendarEvent<T>[],
  weekOf: Date,
  weekStartsOn: 0 | 1,
  workweek: boolean,
): DayColumn<T>[] {
  // Workweek always starts Monday and shows five days.
  const start = workweek
    ? startOfWeek(weekOf, 1)
    : startOfWeek(weekOf, weekStartsOn);
  const count = workweek ? 5 : 7;
  const today = new Date();

  const columns: DayColumn<T>[] = [];
  for (let i = 0; i < count; i++) {
    const date = addDays(start, i);
    const dayEvents = events
      .filter((e) => isSameDay(e.time, date))
      .sort((a, b) => a.time.getTime() - b.time.getTime());
    columns.push({ date, isToday: isSameDay(date, today), events: dayEvents });
  }
  return columns;
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function WeeklyCalendar<T>({
  events,
  weekOf,
  weekStartsOn = 0,
  workweek = false,
  renderMeta,
  renderStatus,
  actions = [],
  onEventClick,
}: WeeklyCalendarProps<T>) {
  const columns = useMemo(
    () => buildWeek(events, weekOf ?? new Date(), weekStartsOn, workweek),
    [events, weekOf, weekStartsOn, workweek],
  );

  const gridStyle = { "--wc-cols": columns.length } as CSSProperties;

  return (
    <div className={styles.scroll}>
      <div className={styles.week} style={gridStyle}>
        {columns.map((col) => (
          <div
            key={col.date.toISOString()}
            className={`${styles.dayCol} ${col.isToday ? styles.dayColToday : ""}`}
          >
            <div
              className={`${styles.dayHead} ${col.isToday ? styles.dayHeadToday : ""}`}
            >
              <span className={styles.dayName}>
                {col.date.toLocaleDateString(undefined, { weekday: "short" })}
              </span>
              <span className={styles.dayDate}>{col.date.getDate()}</span>
              {col.events.length > 0 && (
                <span className={styles.dayCount}>{col.events.length}</span>
              )}
            </div>

            <div className={styles.dayBody}>
              {col.events.length === 0 ? (
                <span className={styles.dayEmpty}>—</span>
              ) : (
                col.events.map((event) => {
                  const status = renderStatus?.(event) ?? null;
                  const meta = renderMeta?.(event);
                  const clickable = !!onEventClick;
                  const visibleActions = actions.filter(
                    (a) => !a.hidden?.(event),
                  );
                  return (
                    <div
                      key={event.eventId}
                      className={styles.chip}
                      data-tone={status?.tone ?? "neutral"}
                      role={clickable ? "button" : undefined}
                      tabIndex={clickable ? 0 : undefined}
                      onClick={
                        clickable ? () => onEventClick!(event) : undefined
                      }
                      onKeyDown={
                        clickable
                          ? (e) => {
                              if (e.target !== e.currentTarget) return;
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                onEventClick!(event);
                              }
                            }
                          : undefined
                      }
                    >
                      <div className={styles.chipHeader}>
                        <span className={styles.chipTime}>
                          {formatTime(event.time)}
                        </span>
                        {status && (
                          <StatusPill tone={status.tone}>
                            {status.label}
                          </StatusPill>
                        )}
                      </div>
                      <div className={styles.chipName}>{event.name}</div>
                      {meta != null && meta !== false && (
                        <div className={styles.chipMeta}>{meta}</div>
                      )}
                      {visibleActions.length > 0 && (
                        <div className={styles.chipActions}>
                          {visibleActions.map((action) => (
                            <button
                              key={action.label}
                              type="button"
                              className={`${styles.actionBtn} ${action.danger ? styles.actionDanger : ""}`}
                              title={action.label}
                              aria-label={action.label}
                              onClick={(ev) => {
                                ev.stopPropagation();
                                action.onClick(event);
                              }}
                            >
                              {action.icon ?? action.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
