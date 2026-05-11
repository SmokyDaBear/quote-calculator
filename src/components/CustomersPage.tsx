import { useState, useEffect } from "react";
import {
  getCustomers,
  saveCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerVehicles,
  saveCustomerVehicle,
  updateCustomerVehicle,
  deleteCustomerVehicle,
} from "../storage";
import { CSVLoader } from "./CSVLoader";
import { formatPhone, formatPhoneInput } from "../utils/formatPhone";
import type { Customer, PhoneEntry, Vehicle } from "../types/index";

// ── Form types ────────────────────────────────────────────────────────────────

type CustomerFormData = {
  name: string;
  phones: PhoneEntry[];
  email: string;
  address: string;
  notes: string;
  _editingId?: string;
};

const EMPTY_CUSTOMER_FORM: CustomerFormData = {
  name: "",
  phones: [{ label: "Mobile", number: "" }],
  email: "",
  address: "",
  notes: "",
};

const EMPTY_VEHICLE_FORM = { year: "", make: "", model: "", trim: "", vin: "", mileage: "" };

// ── Customer form ─────────────────────────────────────────────────────────────

function CustomerForm({ form, onChange, onSave, onCancel }: {
  form: CustomerFormData;
  onChange: (f: CustomerFormData) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const set = (field: keyof CustomerFormData, value: unknown) =>
    onChange({ ...form, [field]: value });

  const addPhone = () =>
    onChange({ ...form, phones: [...form.phones, { label: "Mobile", number: "" }] });

  const updatePhone = (idx: number, field: keyof PhoneEntry, value: string) => {
    onChange({
      ...form,
      phones: form.phones.map((p, i) =>
        i === idx ? { ...p, [field]: value } : p,
      ),
    });
  };

  const removePhone = (idx: number) =>
    onChange({ ...form, phones: form.phones.filter((_, i) => i !== idx) });

  return (
    <div className="page-form page-card">
      <div className="lib-form-group">
        <label>Name *</label>
        <input
          type="text"
          placeholder="Customer name"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
        />
      </div>

      <div className="lib-form-group">
        <div className="customer-phones-header">
          <label>Phone Numbers</label>
          <button type="button" className="btn-small btn-secondary" onClick={addPhone}>
            + Add
          </button>
        </div>
        <div className="customer-phone-list">
          {form.phones.map((phone, idx) => (
            <div key={idx} className="customer-phone-row">
              <input
                type="text"
                className="customer-phone-label-input"
                placeholder="Label"
                value={phone.label}
                onChange={(e) => updatePhone(idx, "label", e.target.value)}
                aria-label={`Phone ${idx + 1} label`}
              />
              <input
                type="tel"
                className="customer-phone-number-input"
                placeholder="Phone number"
                value={phone.number}
                onChange={(e) => updatePhone(idx, "number", formatPhoneInput(e.target.value))}
                aria-label={`Phone ${idx + 1} number`}
              />
              {form.phones.length > 1 && (
                <button
                  type="button"
                  className="btn-remove"
                  onClick={() => removePhone(idx)}
                  aria-label="Remove phone"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="lib-form-group">
        <label>Email</label>
        <input
          type="email"
          placeholder="customer@email.com"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
        />
      </div>

      <div className="lib-form-group">
        <label>Address</label>
        <input
          type="text"
          placeholder="Street address, city, state"
          value={form.address}
          onChange={(e) => set("address", e.target.value)}
        />
      </div>

      <div className="lib-form-group">
        <label>Notes</label>
        <textarea
          className="lib-textarea"
          placeholder="Internal notes about this customer…"
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
        />
      </div>

      <div className="lib-form-actions">
        <button type="button" className="btn-small btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn-small btn-success" onClick={onSave}>
          {form._editingId ? "Update" : "Save"}
        </button>
      </div>
    </div>
  );
}

// ── Vehicle form ──────────────────────────────────────────────────────────────

function VehicleForm({ form, onChange, onSave, onCancel }: {
  form: Record<string, string>;
  onChange: (f: Record<string, string>) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const set = (f: string, v: string) => onChange({ ...form, [f]: v });
  return (
    <div className="page-form page-card">
      <div className="lib-form-row two-col">
        <div className="lib-form-group">
          <label>Year</label>
          <input type="text" placeholder="e.g. 2020" maxLength={4}
            value={form.year} onChange={(e) => set("year", e.target.value)} />
        </div>
        <div className="lib-form-group">
          <label>Make</label>
          <input type="text" placeholder="e.g. Honda"
            value={form.make} onChange={(e) => set("make", e.target.value)} />
        </div>
      </div>
      <div className="lib-form-row two-col">
        <div className="lib-form-group">
          <label>Model</label>
          <input type="text" placeholder="e.g. Civic"
            value={form.model} onChange={(e) => set("model", e.target.value)} />
        </div>
        <div className="lib-form-group">
          <label>Trim</label>
          <input type="text" placeholder="e.g. SE"
            value={form.trim} onChange={(e) => set("trim", e.target.value)} />
        </div>
      </div>
      <div className="lib-form-row two-col">
        <div className="lib-form-group">
          <label>Mileage</label>
          <input type="text" placeholder="e.g. 45000"
            value={form.mileage} onChange={(e) => set("mileage", e.target.value)} />
        </div>
        <div className="lib-form-group">
          <label>VIN</label>
          <input type="text" placeholder="17-character VIN" maxLength={17}
            value={form.vin}
            onChange={(e) => set("vin", e.target.value.toUpperCase())} />
        </div>
      </div>
      <div className="lib-form-actions">
        <button type="button" className="btn-small btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="button" className="btn-small btn-success" onClick={onSave}>
          {form._editingId ? "Update Vehicle" : "Save Vehicle"}
        </button>
      </div>
    </div>
  );
}

function vehicleLabel(v: Partial<Vehicle>) {
  return [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ") || "Unknown Vehicle";
}

// ── Customer detail ───────────────────────────────────────────────────────────

function CustomerDetail({ customer, onEditCustomer, onEditVehicle, onAddVehicle, onToast }: {
  customer: Customer;
  onEditCustomer: () => void;
  onEditVehicle: (v: Vehicle) => void;
  onAddVehicle: () => void;
  onToast?: (msg: string, type?: string) => void;
}) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const refresh = () => getCustomerVehicles(customer.id).then(setVehicles);
  useEffect(() => { refresh(); }, [customer.id]);

  const handleDeleteVehicle = async (v: Vehicle) => {
    if (!window.confirm(`Delete "${vehicleLabel(v)}"?`)) return;
    await deleteCustomerVehicle(customer.id, v.id);
    refresh();
    onToast?.(`"${vehicleLabel(v)}" deleted.`, "info");
  };

  const phones = customer.phones?.filter((p) => p.number) ?? [];

  return (
    <div>
      <div className="customer-detail-header page-card">
        <div className="customer-detail-info">
          <strong className="customer-detail-name">{customer.name}</strong>
          <div className="customer-detail-contacts">
            {phones.map((p, i) => (
              <span key={i} className="customer-detail-contact">
                <span className="customer-detail-contact-label">{p.label}:</span>
                {formatPhone(p.number)}
              </span>
            ))}
            {customer.email && (
              <span className="customer-detail-contact">
                <span className="customer-detail-contact-label">Email:</span>
                {customer.email}
              </span>
            )}
            {customer.address && (
              <span className="customer-detail-contact">
                <span className="customer-detail-contact-label">Address:</span>
                {customer.address}
              </span>
            )}
          </div>
          {customer.notes && (
            <span className="customer-detail-notes">{customer.notes}</span>
          )}
        </div>
        <div className="page-item-actions">
          <button type="button" className="btn-small btn-secondary" onClick={onEditCustomer}>
            Edit
          </button>
        </div>
      </div>

      <div className="page-header customer-vehicles-subheader">
        <h3 className="customer-vehicles-heading">Vehicles</h3>
        <button type="button" className="btn-small" onClick={onAddVehicle}>
          + Add Vehicle
        </button>
      </div>

      <div className="page-list">
        {vehicles.length === 0 ? (
          <div className="page-empty">No vehicles saved for this customer.</div>
        ) : (
          vehicles.map((v) => (
            <div key={v.id} className="page-item page-card">
              <div className="page-item-info">
                <strong className="page-item-name">{vehicleLabel(v)}</strong>
                <span className="page-item-meta">
                  {[v.vin && `VIN: ${v.vin}`, v.mileage && `${Number(v.mileage).toLocaleString()} mi`]
                    .filter(Boolean).join(" · ")}
                </span>
              </div>
              <div className="page-item-actions">
                <button type="button" className="btn-small btn-secondary" onClick={() => onEditVehicle(v)}>
                  Edit
                </button>
                <button type="button" className="btn-small btn-danger-sm" onClick={() => handleDeleteVehicle(v)}>
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── View type ─────────────────────────────────────────────────────────────────

type View =
  | "list"
  | "new"
  | { editingCustomer: Customer }
  | { detail: Customer }
  | { addingVehicle: Customer }
  | { editingVehicle: { customer: Customer; vehicle: Vehicle } };

// ── Page ──────────────────────────────────────────────────────────────────────

function CustomersPage({ onToast }: { onToast?: (msg: string, type?: string) => void }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [view, setView] = useState<View>("list");
  const [customerForm, setCustomerForm] = useState<CustomerFormData>(EMPTY_CUSTOMER_FORM);
  const [vehicleForm, setVehicleForm] = useState<Record<string, string>>(EMPTY_VEHICLE_FORM);
  const [search, setSearch] = useState("");

  const refresh = () => getCustomers().then(setCustomers);
  useEffect(() => { refresh(); }, []);

  // ── Customer actions ────────────────────────────────────────────────────────

  const openNew = () => { setCustomerForm(EMPTY_CUSTOMER_FORM); setView("new"); };

  const openEdit = (c: Customer) => {
    setCustomerForm({
      name: c.name,
      phones: c.phones?.length > 0 ? c.phones : [{ label: "Mobile", number: "" }],
      email: c.email || "",
      address: c.address || "",
      notes: c.notes || "",
      _editingId: c.id,
    });
    setView({ editingCustomer: c });
  };

  const openDetail = (c: Customer) => setView({ detail: c });

  const handleSaveCustomer = async () => {
    if (!customerForm.name.trim()) return;
    const phones = customerForm.phones
      .filter((p) => p.number.trim())
      .map((p) => ({ label: p.label.trim() || "Phone", number: p.number.trim() }));
    const data = {
      name: customerForm.name.trim(),
      phones,
      email: customerForm.email.trim(),
      address: customerForm.address.trim(),
      notes: customerForm.notes.trim(),
    };
    if (typeof view === "object" && "editingCustomer" in view) {
      await updateCustomer(view.editingCustomer.id, data);
      onToast?.(`"${data.name}" updated.`, "info");
      await refresh();
      setView({ detail: { ...view.editingCustomer, ...data } });
    } else {
      await saveCustomer(data);
      onToast?.(`"${data.name}" saved.`);
      await refresh();
      setView("list");
    }
  };

  const handleDeleteCustomer = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? This will also remove their saved vehicles.`)) return;
    await deleteCustomer(id);
    refresh();
  };

  // ── Vehicle actions ─────────────────────────────────────────────────────────

  const openAddVehicle = (customer: Customer) => {
    setVehicleForm(EMPTY_VEHICLE_FORM);
    setView({ addingVehicle: customer });
  };

  const openEditVehicle = (customer: Customer, vehicle: Vehicle) => {
    setVehicleForm({
      year: vehicle.year, make: vehicle.make, model: vehicle.model,
      trim: vehicle.trim, vin: vehicle.vin, mileage: vehicle.mileage,
      _editingId: vehicle.id,
    });
    setView({ editingVehicle: { customer, vehicle } });
  };

  const handleSaveVehicle = async () => {
    const data = {
      year: vehicleForm.year, make: vehicleForm.make, model: vehicleForm.model,
      trim: vehicleForm.trim, vin: vehicleForm.vin, mileage: vehicleForm.mileage,
      color: "", notes: "",
    };
    if (typeof view === "object" && "editingVehicle" in view) {
      const { customer, vehicle } = view.editingVehicle;
      await updateCustomerVehicle(customer.id, vehicle.id, data);
      onToast?.(`"${vehicleLabel(data)}" updated.`, "info");
      setView({ detail: customer });
    } else if (typeof view === "object" && "addingVehicle" in view) {
      const customer = view.addingVehicle;
      await saveCustomerVehicle(customer.id, data);
      onToast?.(`"${vehicleLabel(data)}" saved.`);
      setView({ detail: customer });
    }
  };

  // ── Filtered list ───────────────────────────────────────────────────────────

  const q = search.trim().toLowerCase();
  const filtered = q
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.email || "").toLowerCase().includes(q) ||
          c.phones.some((p) => p.number.toLowerCase().includes(q)),
      )
    : customers;

  // ── Heading / back ──────────────────────────────────────────────────────────

  let heading = "Customers";
  let backLabel: string | null = null;
  let backTarget: View = "list";
  if (view === "new") {
    heading = "New Customer"; backLabel = "← Customers";
  } else if (typeof view === "object" && "editingCustomer" in view) {
    heading = "Edit Customer"; backLabel = `← ${view.editingCustomer.name}`; backTarget = { detail: view.editingCustomer };
  } else if (typeof view === "object" && "detail" in view) {
    heading = view.detail.name; backLabel = "← Customers";
  } else if (typeof view === "object" && "addingVehicle" in view) {
    heading = "Add Vehicle"; backLabel = `← ${view.addingVehicle.name}`; backTarget = { detail: view.addingVehicle };
  } else if (typeof view === "object" && "editingVehicle" in view) {
    heading = "Edit Vehicle"; backLabel = `← ${view.editingVehicle.customer.name}`; backTarget = { detail: view.editingVehicle.customer };
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-title-group">
          {backLabel && (
            <button type="button" className="btn-back" onClick={() => setView(backTarget)}>
              {backLabel}
            </button>
          )}
          <h2>{heading}</h2>
        </div>
        {view === "list" && (
          <div className="page-header-actions">
            <CSVLoader type="customers" onRefresh={refresh} onToast={onToast} />
            <button type="button" className="btn-small" onClick={openNew}>+ New Customer</button>
          </div>
        )}
      </div>

      {view === "list" && (
        <>
          <div className="page-search">
            <input
              type="text"
              placeholder="Search by name, phone, or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="page-list">
            {customers.length === 0 ? (
              <div className="page-empty">No customers saved yet.</div>
            ) : filtered.length === 0 ? (
              <div className="page-empty">No customers match your search.</div>
            ) : (
              filtered.map((c) => {
                const primaryPhone = c.phones?.find((p) => p.number)?.number ?? "";
                return (
                  <div key={c.id} className="page-item page-card">
                    <div className="page-item-info">
                      <strong className="page-item-name">{c.name}</strong>
                      <span className="page-item-meta">
                        {[primaryPhone && formatPhone(primaryPhone), c.email]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </div>
                    <div className="page-item-actions">
                      <button type="button" className="btn-small btn-secondary" onClick={() => openDetail(c)}>
                        Vehicles
                      </button>
                      <button type="button" className="btn-small btn-secondary" onClick={() => openEdit(c)}>
                        Edit
                      </button>
                      <button type="button" className="btn-small btn-danger-sm" onClick={() => handleDeleteCustomer(c.id, c.name)}>
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {(view === "new" || (typeof view === "object" && "editingCustomer" in view)) && (
        <CustomerForm
          form={customerForm}
          onChange={setCustomerForm}
          onSave={handleSaveCustomer}
          onCancel={() =>
            setView(
              typeof view === "object" && "editingCustomer" in view
                ? { detail: view.editingCustomer }
                : "list",
            )
          }
        />
      )}

      {typeof view === "object" && "detail" in view && (
        <CustomerDetail
          customer={view.detail}
          onEditCustomer={() => openEdit(view.detail)}
          onEditVehicle={(v) => openEditVehicle(view.detail, v)}
          onAddVehicle={() => openAddVehicle(view.detail)}
          onToast={onToast}
        />
      )}

      {typeof view === "object" && ("addingVehicle" in view || "editingVehicle" in view) && (
        <VehicleForm
          form={vehicleForm}
          onChange={setVehicleForm}
          onSave={handleSaveVehicle}
          onCancel={() =>
            setView(
              typeof view === "object" && "editingVehicle" in view
                ? { detail: view.editingVehicle.customer }
                : typeof view === "object" && "addingVehicle" in view
                  ? { detail: view.addingVehicle }
                  : "list",
            )
          }
        />
      )}
    </div>
  );
}

export default CustomersPage;
