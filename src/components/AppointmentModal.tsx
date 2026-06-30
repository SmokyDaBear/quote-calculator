import { useEffect, useState } from "react";
import { CustomerSearch } from "./CustomerAutocomplete";
import {
  getCustomerVehicles,
  ensureCustomerAndVehicle,
  saveAppointment,
} from "../storage";
import { EMPTY_CUSTOMER_FORM_DATA } from "./CustomerFormFields";
import type { CustomerFormData } from "./CustomerFormFields";
import type { OrderDraft } from "../hooks/useOrder";
import type { Customer, Vehicle, TransportType } from "../types/index";

const TRANSPORTS: { value: TransportType; label: string }[] = [
  { value: undefined, label: "—" },
  { value: "waiter", label: "Waiter" },
  { value: "dropoff", label: "Drop-Off" },
  { value: "loaner", label: "Loaner" },
  { value: "shuttle", label: "Shuttle" },
];

const toTs = (v: string): number | undefined => (v ? new Date(v).getTime() : undefined);
const vLabel = (v: { year?: string; make?: string; model?: string; trim?: string }) =>
  [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ") || "Vehicle";

function AppointmentModal({
  draft,
  onClose,
  onSaved,
  toast,
}: {
  draft?: OrderDraft | null;
  onClose: () => void;
  onSaved: () => void;
  toast: (msg: string, type?: string) => void;
}) {
  const [customerId, setCustomerId] = useState<string | null>(draft?.customerId ?? null);
  const [customerData, setCustomerData] = useState<CustomerFormData>(
    draft?.customerData ?? EMPTY_CUSTOMER_FORM_DATA,
  );
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    draft?.selectedCustomer ?? null,
  );

  const draftHasVehicle = !!(draft?.vehicle.year || draft?.vehicle.make || draft?.vehicle.model);
  const [savedVehicles, setSavedVehicles] = useState<Vehicle[]>([]);
  // "draft" = use the vehicle carried over from the quote; otherwise a saved vehicle id.
  const [vehicleChoice, setVehicleChoice] = useState<string>(draftHasVehicle ? "draft" : "");

  const [dropoff, setDropoff] = useState("");
  const [promised, setPromised] = useState("");
  const [transportType, setTransportType] = useState<TransportType>(undefined);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const hasCustomer = !!customerId || !!customerData.name.trim();

  useEffect(() => {
    if (customerId) {
      getCustomerVehicles(customerId).then(setSavedVehicles);
    } else {
      setSavedVehicles([]);
    }
  }, [customerId]);

  const handleSelectCustomer = (c: Customer) => {
    setSelectedCustomer(c);
    setCustomerId(c.id);
    setCustomerData({
      name: c.name,
      phones: c.phones.length ? c.phones : [{ label: "Mobile", number: "" }],
      email: c.email,
      address: c.address,
      notes: c.notes,
      taxable: c.taxable !== false,
      taxId: c.taxId ?? "",
    });
    setVehicleChoice("");
  };

  const canSave = hasCustomer && !!dropoff && (vehicleChoice === "draft" || !!vehicleChoice);

  const handleSave = async () => {
    if (!canSave || busy) return;
    setBusy(true);
    try {
      const useDraftVehicle = vehicleChoice === "draft";
      const ids = await ensureCustomerAndVehicle({
        customerId,
        customer: {
          name: customerData.name,
          phones: customerData.phones,
          email: customerData.email,
          address: customerData.address,
          notes: customerData.notes,
          taxable: customerData.taxable,
          taxId: customerData.taxId,
        },
        vehicleId: useDraftVehicle ? null : vehicleChoice,
        vehicle: {
          year: draft?.vehicle.year ?? "",
          make: draft?.vehicle.make ?? "",
          model: draft?.vehicle.model ?? "",
          trim: draft?.vehicle.trim ?? "",
          vin: draft?.vehicle.vin ?? "",
          mileage: draft?.vehicle.mileage ?? "",
        },
      });
      if (!ids) {
        toast("A customer and vehicle are required.", "error");
        setBusy(false);
        return;
      }
      await saveAppointment({
        customerId: ids.customerId,
        vehicleId: ids.vehicleId,
        quoteId: draft?.quoteId,
        dropoffAt: toTs(dropoff)!,
        promisedAt: toTs(promised),
        transportType,
        notes,
      });
      toast("Appointment scheduled.");
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="modal-overlay show"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal payment-modal">
        <div className="library-modal-header">
          <h3>Schedule Appointment</h3>
          <button type="button" className="btn-remove" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="payment-modal-body">
          <div className="lib-form-group">
            <label>Customer *</label>
            {customerId || selectedCustomer ? (
              <div className="customer-linked-badge">
                <span className="customer-linked-name">{customerData.name}</span>
                {!draft?.customerId && (
                  <button
                    type="button"
                    className="customer-linked-clear"
                    onClick={() => {
                      setSelectedCustomer(null);
                      setCustomerId(null);
                      setCustomerData(EMPTY_CUSTOMER_FORM_DATA);
                      setVehicleChoice("");
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            ) : customerData.name.trim() ? (
              <div className="appt-draft-line">New customer: {customerData.name}</div>
            ) : (
              <CustomerSearch
                selectedCustomer={null}
                onSelect={handleSelectCustomer}
                onClear={() => {}}
              />
            )}
          </div>

          <div className="lib-form-group">
            <label>Vehicle *</label>
            {draftHasVehicle && (
              <label className="appt-radio">
                <input
                  type="radio"
                  name="appt-vehicle"
                  checked={vehicleChoice === "draft"}
                  onChange={() => setVehicleChoice("draft")}
                />
                {vLabel(draft!.vehicle)} <span className="appt-draft-tag">from quote</span>
              </label>
            )}
            {savedVehicles.map((v) => (
              <label key={v.id} className="appt-radio">
                <input
                  type="radio"
                  name="appt-vehicle"
                  checked={vehicleChoice === v.id}
                  onChange={() => setVehicleChoice(v.id)}
                />
                {vLabel(v)}
              </label>
            ))}
            {!draftHasVehicle && savedVehicles.length === 0 && (
              <div className="appt-draft-line">
                {hasCustomer ? "No saved vehicles for this customer." : "Select a customer first."}
              </div>
            )}
          </div>

          <div className="lib-form-row two-col">
            <div className="lib-form-group">
              <label>Drop-off *</label>
              <input
                type="datetime-local"
                value={dropoff}
                onChange={(e) => setDropoff(e.target.value)}
              />
            </div>
            <div className="lib-form-group">
              <label>Promised By</label>
              <input
                type="datetime-local"
                value={promised}
                onChange={(e) => setPromised(e.target.value)}
              />
            </div>
          </div>

          <div className="lib-form-group">
            <label>Transport</label>
            <select
              aria-label="Transport type"
              value={transportType ?? ""}
              onChange={(e) => setTransportType((e.target.value || undefined) as TransportType)}
            >
              {TRANSPORTS.map((t) => (
                <option key={t.label} value={t.value ?? ""}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="lib-form-group">
            <label>Notes</label>
            <input
              type="text"
              placeholder="Optional notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="payment-modal-actions">
          <button type="button" className="btn-small btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-small btn-success"
            disabled={!canSave || busy}
            onClick={handleSave}
          >
            Schedule
          </button>
        </div>
      </div>
    </div>
  );
}

export default AppointmentModal;
