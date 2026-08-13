import { useEffect, useMemo, useState } from "react";
import { CustomerSearch } from "./CustomerAutocomplete";
import {
  getCustomer,
  getCustomerVehicles,
  ensureCustomerAndVehicle,
  saveAppointment,
  updateAppointment,
} from "../storage";
import { DateTimeField } from "./DatePicker/DateTimeField";
import {
  DEFAULT_STORE_HOURS,
  PROMISE_ROUND_MINUTES,
  estimatePromiseTime,
} from "../utils/storeHours";
import { EMPTY_CUSTOMER_FORM_DATA } from "./CustomerFormFields";
import type { CustomerFormData } from "./CustomerFormFields";
import type { OrderDraft } from "../hooks/useOrder";
import type {
  Appointment,
  Customer,
  Vehicle,
  StoreHours,
  TransportType,
} from "../types/index";

const TRANSPORTS: { value: TransportType; label: string }[] = [
  { value: undefined, label: "—" },
  { value: "waiter", label: "Waiter" },
  { value: "dropoff", label: "Drop-Off" },
  { value: "loaner", label: "Loaner" },
  { value: "shuttle", label: "Shuttle" },
];

const vLabel = (v: {
  year?: string;
  make?: string;
  model?: string;
  trim?: string;
}) => [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ") || "Vehicle";

const norm = (s?: string) => (s ?? "").trim().toLowerCase();
const specKey = (v: { year?: string; make?: string; model?: string; trim?: string }) =>
  [norm(v.year), norm(v.make), norm(v.model), norm(v.trim)].join("|");

function AppointmentModal({
  draft,
  appointment,
  laborHours = 0,
  storeHours = DEFAULT_STORE_HOURS,
  onClose,
  onSaved,
  toast,
}: {
  draft?: OrderDraft | null;
  /** When set, the modal edits this appointment instead of creating one. */
  appointment?: Appointment | null;
  /** Billed hours on the quote, used to estimate the promise time. */
  laborHours?: number;
  /** Shop operating hours from business settings. */
  storeHours?: StoreHours;
  onClose: () => void;
  onSaved: () => void;
  toast: (msg: string, type?: string) => void;
}) {
  const isEditing = !!appointment;

  // A draft is the live quote, so its customer wins when both are present.
  const [customerId, setCustomerId] = useState<string | null>(
    draft?.customerId ?? appointment?.customerId ?? null,
  );
  const [customerData, setCustomerData] = useState<CustomerFormData>(
    draft?.customerData ?? EMPTY_CUSTOMER_FORM_DATA,
  );
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    draft?.selectedCustomer ?? null,
  );

  // Editing starts from an id alone — pull the customer record in for display.
  useEffect(() => {
    if (!appointment || draft?.customerData) return;
    getCustomer(appointment.customerId).then((c) => {
      if (!c) return;
      setSelectedCustomer(c);
      setCustomerData({
        name: c.name,
        phones: c.phones.length ? c.phones : [{ label: "Mobile", number: "" }],
        email: c.email,
        address: c.address,
        notes: c.notes,
        taxable: c.taxable !== false,
        taxId: c.taxId ?? "",
      });
    });
  }, [appointment?.customerId]); // eslint-disable-line react-hooks/exhaustive-deps

  const draftVehicle = draft?.vehicle;
  const draftHasVehicle = !!(
    draftVehicle?.year ||
    draftVehicle?.make ||
    draftVehicle?.model ||
    draftVehicle?.vin
  );
  const [savedVehicles, setSavedVehicles] = useState<Vehicle[]>([]);
  // "draft" = use the vehicle carried over from the quote; otherwise a saved vehicle id.
  const [vehicleChoice, setVehicleChoice] = useState<string>("");

  const [dropoff, setDropoff] = useState<number | undefined>(
    appointment?.dropoffAt,
  );
  const [promised, setPromised] = useState<number | undefined>(
    appointment?.promisedAt,
  );
  // An existing promise time is the user's own — don't overwrite it with an estimate.
  const [promiseTouched, setPromiseTouched] = useState(
    appointment?.promisedAt !== undefined,
  );
  const [transportType, setTransportType] = useState<TransportType>(
    appointment?.transportType,
  );
  const [notes, setNotes] = useState(appointment?.notes ?? "");
  const [busy, setBusy] = useState(false);

  const hasCustomer = !!customerId || !!customerData.name.trim();

  useEffect(() => {
    if (customerId) {
      getCustomerVehicles(customerId).then(setSavedVehicles);
    } else {
      setSavedVehicles([]);
    }
  }, [customerId]);

  /**
   * The saved vehicle record the draft vehicle already corresponds to, if any.
   * Without this, a quote whose vehicle was already saved against the customer
   * would still offer the "from quote" option and create a duplicate record.
   */
  const matchedSavedVehicleId = useMemo(() => {
    // Editing: the appointment's own vehicle, unless the customer was changed.
    if (appointment && customerId === appointment.customerId)
      return appointment.vehicleId;
    // Only trust the draft's vehicle id while it still belongs to this customer.
    if (draft?.vehicleId && customerId === draft.customerId) return draft.vehicleId;
    if (!draftVehicle || !draftHasVehicle) return null;
    const draftVin = norm(draftVehicle.vin);
    if (draftVin) {
      const byVin = savedVehicles.find((v) => norm(v.vin) === draftVin);
      if (byVin) return byVin.id;
    }
    // Fall back to year/make/model/trim, but never across a conflicting VIN.
    const bySpec = savedVehicles.find(
      (v) =>
        specKey(v) === specKey(draftVehicle) &&
        (!norm(v.vin) || !draftVin || norm(v.vin) === draftVin),
    );
    return bySpec?.id ?? null;
  }, [
    appointment,
    draft?.vehicleId,
    draft?.customerId,
    customerId,
    draftVehicle,
    draftHasVehicle,
    savedVehicles,
  ]);

  // Only offer the quote's vehicle when it isn't already a saved record.
  const showDraftVehicleOption = draftHasVehicle && !matchedSavedVehicleId;

  useEffect(() => {
    if (matchedSavedVehicleId) setVehicleChoice(matchedSavedVehicleId);
    else if (draftHasVehicle) setVehicleChoice("draft");
    else setVehicleChoice("");
  }, [matchedSavedVehicleId, draftHasVehicle, customerId]);

  /** Where the shop should be done, given the drop-off and the billed hours. */
  const estimatedPromise = useMemo(
    () =>
      dropoff === undefined
        ? null
        : estimatePromiseTime(dropoff, laborHours, storeHours),
    [dropoff, laborHours, storeHours],
  );

  // Fill the promise time from the estimate until the user picks one, and never
  // leave a promise time sitting before the drop-off after a reschedule.
  useEffect(() => {
    if (dropoff === undefined) return;
    if (!promiseTouched) {
      if (estimatedPromise !== null && estimatedPromise !== promised) {
        setPromised(estimatedPromise);
      }
      return;
    }
    if (promised !== undefined && promised < dropoff) {
      setPromised(estimatedPromise ?? undefined);
      setPromiseTouched(false);
    }
  }, [dropoff, estimatedPromise, promiseTouched]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const canSave =
    hasCustomer &&
    !!dropoff &&
    (promised === undefined || promised >= dropoff) &&
    (vehicleChoice === "draft" || !!vehicleChoice);

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
      if (appointment) {
        await updateAppointment(appointment.id, {
          customerId: ids.customerId,
          vehicleId: ids.vehicleId,
          dropoffAt: dropoff!,
          promisedAt: promised,
          transportType,
          notes,
        });
      } else {
        await saveAppointment({
          customerId: ids.customerId,
          vehicleId: ids.vehicleId,
          quoteId: draft?.quoteId,
          dropoffAt: dropoff!,
          promisedAt: promised,
          transportType,
          notes,
        });
      }
      toast(appointment ? "Appointment updated." : "Appointment scheduled.");
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
          <h3>{isEditing ? "Update Appointment" : "Schedule Appointment"}</h3>
          <button type="button" className="btn-remove" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="payment-modal-body">
          <div className="lib-form-group">
            <label>Customer *</label>
            {customerId || selectedCustomer ? (
              <div className="customer-linked-badge">
                <span className="customer-linked-name">
                  {customerData.name}
                </span>
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
              <div className="appt-draft-line">
                New customer: {customerData.name}
              </div>
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
            {showDraftVehicleOption && (
              <label className="appt-radio">
                <input
                  type="radio"
                  name="appt-vehicle"
                  checked={vehicleChoice === "draft"}
                  onChange={() => setVehicleChoice("draft")}
                />
                {vLabel(draftVehicle!)}{" "}
                <span className="appt-draft-tag">from quote</span>
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
            {!showDraftVehicleOption && savedVehicles.length === 0 && (
              <div className="appt-draft-line">
                {hasCustomer
                  ? "No saved vehicles for this customer."
                  : "Select a customer first."}
              </div>
            )}
          </div>

          <div className="dtfield-row">
            <div className="lib-form-group">
              <DateTimeField
                label="Drop-off *"
                value={dropoff}
                onChange={setDropoff}
                storeHours={storeHours}
                // No back-dating, except to keep an already-past appointment visible.
                minTimestamp={Math.min(Date.now(), dropoff ?? Date.now())}
                placeholder="Pick a drop-off date and time"
                defaultOpen={dropoff === undefined}
              />
            </div>
            <div className="lib-form-group">
              <DateTimeField
                label="Promised By"
                value={promised}
                onChange={(ts) => {
                  setPromised(ts);
                  setPromiseTouched(true);
                }}
                storeHours={storeHours}
                slotMinutes={PROMISE_ROUND_MINUTES}
                minTimestamp={dropoff}
                defaultDate={dropoff}
                timeFirst
                placeholder={
                  dropoff === undefined
                    ? "Set a drop-off time first"
                    : "Not promised"
                }
                clearable
              >
                {estimatedPromise !== null && promised !== estimatedPromise && (
                  <button
                    type="button"
                    className="btn-small btn-secondary"
                    title={`${laborHours.toFixed(1)} billed hours from drop-off`}
                    onClick={() => {
                      setPromised(estimatedPromise);
                      setPromiseTouched(false);
                    }}
                  >
                    Estimate
                  </button>
                )}
              </DateTimeField>
              {promised !== undefined && (
                <p className="appt-promise-note">
                  {promised === estimatedPromise
                    ? `Estimated from ${laborHours.toFixed(1)} billed hours.`
                    : "Manually set."}
                </p>
              )}
            </div>
          </div>

          <div className="lib-form-group">
            <label>Transport</label>
            <select
              aria-label="Transport type"
              value={transportType ?? ""}
              onChange={(e) =>
                setTransportType((e.target.value || undefined) as TransportType)
              }
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
          <button
            type="button"
            className="btn-small btn-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-small btn-success"
            disabled={!canSave || busy}
            onClick={handleSave}
          >
            {isEditing ? "Update" : "Schedule"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AppointmentModal;
