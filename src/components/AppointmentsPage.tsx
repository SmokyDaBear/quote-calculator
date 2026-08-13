import { useEffect, useMemo, useState } from "react";
import {
  getAppointments,
  getCustomers,
  getAllVehicles,
  deleteAppointment,
} from "../storage";
import { EditIcon, CalendarIcon, IconTools } from "../icons";
import { DailyCalendar } from "./calendar/DailyCalendar";
import type { CalendarEvent, CalendarEventAction } from "./calendar/DailyCalendar";
import { WeeklyCalendar, addDays, isSameDay, startOfWeek } from "./calendar/WeeklyCalendar";
import WeekNav from "./calendar/WeekNav";
import DayNav from "./calendar/DayNav";
import type { PillTone } from "./ui/StatusPill";
import {
  DEFAULT_STORE_HOURS,
  describeDay,
  hoursForDay,
  normalizeStoreHours,
} from "../utils/storeHours";
import type { Appointment, Customer, StoreHours, Vehicle } from "../types/index";

const vehicleLabel = (v?: Vehicle) =>
  v ? [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ") : "";

const fmtDateTime = (ts?: number) =>
  ts
    ? new Date(ts).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

const fmtTime = (ts: number) =>
  new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

const TRANSPORT_LABEL: Record<string, string> = {
  waiter: "Waiter",
  dropoff: "Drop-Off",
  loaner: "Loaner",
  shuttle: "Shuttle",
};

type ViewMode = "list" | "week" | "day";

const VIEWS: { id: ViewMode; label: string }[] = [
  { id: "list", label: "List" },
  { id: "week", label: "Week" },
  { id: "day", label: "Day" },
];

function AppointmentsPage({
  reloadKey,
  storeHours,
  onNewAppointment,
  onEditAppointment,
  onRescheduleAppointment,
  onConvertToOrder,
  onChanged,
}: {
  reloadKey: number;
  /** Shop hours, used to bound the day view's time grid. */
  storeHours?: StoreHours;
  onNewAppointment: () => void;
  /** Opens the quote this appointment came from, so the work can be changed. */
  onEditAppointment: (appt: Appointment) => void;
  /** Opens the appointment itself for a date/transport change. */
  onRescheduleAppointment: (appt: Appointment) => void;
  onConvertToOrder: (appt: Appointment) => void;
  onChanged: () => void;
}) {
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<Record<string, Customer>>({});
  const [vehicles, setVehicles] = useState<Record<string, Vehicle>>({});
  const [view, setView] = useState<ViewMode>("list");
  // Both calendars are driven off one cursor date, so switching views keeps place.
  const [cursor, setCursor] = useState(() => new Date());

  const load = () => {
    Promise.all([getAppointments(), getCustomers(), getAllVehicles()]).then(([a, c, v]) => {
      setAppts(a);
      setCustomers(Object.fromEntries(c.map((x) => [x.id, x])));
      setVehicles(Object.fromEntries(v.map((x) => [x.id, x])));
    });
  };

  useEffect(load, [reloadKey]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this appointment?")) return;
    await deleteAppointment(id);
    load();
    onChanged();
  };

  const now = Date.now();

  // ── Calendar plumbing ──────────────────────────────────────────────────────

  const hours = useMemo(
    () => normalizeStoreHours(storeHours ?? DEFAULT_STORE_HOURS),
    [storeHours],
  );

  const toEvent = (a: Appointment): CalendarEvent<Appointment> => ({
    eventId: a.id,
    name: customers[a.customerId]?.name || "Unknown Customer",
    time: new Date(a.dropoffAt),
    data: a,
  });

  const weekEvents = useMemo(() => {
    const start = startOfWeek(cursor, 0).getTime();
    const end = addDays(startOfWeek(cursor, 0), 7).getTime();
    return appts
      .filter((a) => a.dropoffAt >= start && a.dropoffAt < end)
      .map(toEvent);
  }, [appts, cursor, customers]);

  const dayEvents = useMemo(
    () => appts.filter((a) => isSameDay(new Date(a.dropoffAt), cursor)).map(toEvent),
    [appts, cursor, customers],
  );

  const dayWindow = hoursForDay(hours, cursor);

  const renderMeta = (event: CalendarEvent<Appointment>) => {
    const a = event.data;
    const parts = [vehicleLabel(vehicles[a.vehicleId])];
    if (a.promisedAt) parts.push(`Promised ${fmtTime(a.promisedAt)}`);
    return parts.filter(Boolean).join(" · ") || null;
  };

  const renderStatus = (
    event: CalendarEvent<Appointment>,
  ): { label: string; tone: PillTone } => {
    const a = event.data;
    if (a.orderId) return { label: "Order", tone: "success" };
    if (a.dropoffAt < now) return { label: "Past", tone: "warning" };
    if (a.quoteId) return { label: `Quote #${a.quoteId}`, tone: "info" };
    return { label: "Scheduled", tone: "neutral" };
  };

  const actions: CalendarEventAction<Appointment>[] = [
    {
      // Opens the quote behind the appointment, where jobs/parts are edited.
      label: "Edit services",
      icon: <IconTools />,
      onClick: (e) => onEditAppointment(e.data),
      hidden: (e) => !e.data.quoteId,
    },
    {
      label: "Reschedule",
      icon: <CalendarIcon size={14} />,
      onClick: (e) => onRescheduleAppointment(e.data),
    },
    {
      label: "Convert to order",
      icon: "→",
      onClick: (e) => onConvertToOrder(e.data),
      hidden: (e) => !!e.data.orderId,
    },
    {
      label: "Delete",
      icon: "×",
      danger: true,
      onClick: (e) => handleDelete(e.data.id),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header-row">
        <h2 className="page-title">Appointments</h2>
        <div className="appt-header-actions">
          <div className="appt-view-toggle" role="tablist" aria-label="Appointment view">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                role="tab"
                aria-selected={view === v.id}
                className={`btn-small${view === v.id ? " btn-success" : " btn-secondary"}`}
                onClick={() => setView(v.id)}
              >
                {v.label}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-success" onClick={onNewAppointment}>
            + Schedule
          </button>
        </div>
      </div>

      {view === "week" && (
        <>
          <div className="appt-cal-nav">
            <WeekNav weekOf={cursor} onChange={setCursor} />
          </div>
          <WeeklyCalendar
            events={weekEvents}
            weekOf={cursor}
            renderMeta={renderMeta}
            renderStatus={renderStatus}
            actions={actions}
            onEventClick={(e) => onEditAppointment(e.data)}
          />
        </>
      )}

      {view === "day" && (
        <>
          <div className="appt-cal-nav">
            <DayNav
              date={cursor}
              onChange={setCursor}
              note={describeDay(hours, cursor)}
            />
          </div>
          {dayEvents.length === 0 ? (
            <div className="page-empty">No appointments on this day.</div>
          ) : (
            <DailyCalendar
              events={dayEvents}
              // Lanes are transport types — the shop's practical split for a day.
              groupBy={(a) => (a.transportType ? TRANSPORT_LABEL[a.transportType] : "")}
              unassignedLabel="No Transport"
              startHour={dayWindow ? Math.floor(dayWindow.open / 60) : undefined}
              endHour={dayWindow ? Math.ceil(dayWindow.close / 60) : undefined}
              renderMeta={renderMeta}
              renderStatus={renderStatus}
              actions={actions}
              onEventClick={(e) => onEditAppointment(e.data)}
            />
          )}
        </>
      )}

      {view === "list" && (
        <div className="page-list">
          {appts.length === 0 ? (
            <div className="page-empty">No appointments scheduled.</div>
          ) : (
            appts.map((a) => {
              const past = a.dropoffAt < now;
              return (
                <div
                  key={a.id}
                  className={`page-item page-card appt-item${past ? " appt-item--past" : ""}`}
                >
                  <div className="appt-item-main">
                    <div className="page-item-name-row">
                      <strong className="page-item-name">
                        {customers[a.customerId]?.name || "Unknown Customer"}
                      </strong>
                      {a.transportType && (
                        <span className="appt-transport-tag">
                          {TRANSPORT_LABEL[a.transportType] ?? a.transportType}
                        </span>
                      )}
                      {a.quoteId && <span className="appt-quote-tag">Quote #{a.quoteId}</span>}
                    </div>
                    <span className="page-item-meta">
                      {[vehicleLabel(vehicles[a.vehicleId]), `Drop-off ${fmtDateTime(a.dropoffAt)}`]
                        .filter(Boolean)
                        .join(" · ")}
                      {a.promisedAt ? ` · Promised ${fmtDateTime(a.promisedAt)}` : ""}
                    </span>
                    {a.notes && <span className="appt-notes">{a.notes}</span>}
                  </div>
                  <div className="page-item-actions appt-item-actions">
                    {/* Only quote-linked appointments have services to edit. */}
                    {a.quoteId && (
                      <button
                        type="button"
                        className="btn-small btn-secondary appt-edit-btn"
                        title={`Edit the jobs and parts on Quote #${a.quoteId}`}
                        onClick={() => onEditAppointment(a)}
                      >
                        <IconTools /> Edit Services
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-small btn-secondary appt-edit-btn"
                      title="Change date, transport or notes"
                      onClick={() => onRescheduleAppointment(a)}
                    >
                      <EditIcon /> Reschedule
                    </button>
                    <button
                      type="button"
                      className="btn-small btn-success"
                      onClick={() => onConvertToOrder(a)}
                    >
                      → Order
                    </button>
                    <button
                      type="button"
                      className="btn-small btn-danger-sm"
                      onClick={() => handleDelete(a.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default AppointmentsPage;
