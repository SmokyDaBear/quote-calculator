import { useEffect, useState } from "react";
import {
  getAppointments,
  getCustomers,
  getAllVehicles,
  deleteAppointment,
} from "../storage";
import type { Appointment, Customer, Vehicle } from "../types/index";

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

const TRANSPORT_LABEL: Record<string, string> = {
  waiter: "Waiter",
  dropoff: "Drop-Off",
  loaner: "Loaner",
  shuttle: "Shuttle",
};

function AppointmentsPage({
  reloadKey,
  onNewAppointment,
  onConvertToOrder,
  onChanged,
}: {
  reloadKey: number;
  onNewAppointment: () => void;
  onConvertToOrder: (appt: Appointment) => void;
  onChanged: () => void;
}) {
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<Record<string, Customer>>({});
  const [vehicles, setVehicles] = useState<Record<string, Vehicle>>({});

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

  return (
    <div className="page-container">
      <div className="page-header-row">
        <h2 className="page-title">Appointments</h2>
        <button type="button" className="btn btn-success" onClick={onNewAppointment}>
          + Schedule
        </button>
      </div>

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
    </div>
  );
}

export default AppointmentsPage;
