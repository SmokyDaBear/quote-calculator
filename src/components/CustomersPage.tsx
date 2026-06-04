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
import { VehicleFormFields } from "./VehicleSection";
import type { VehicleFields } from "./VehicleSection";
import { CustomerFormFields } from "./CustomerFormFields";
import type { CustomerFormData } from "./CustomerFormFields";
import { ToggleField } from "./forms/ToggleField";
import { formatPhone } from "../utils/formatPhone";
import type { Customer, Vehicle } from "../types/index";

// ── Constants ─────────────────────────────────────────────────────────────────

const EMPTY_CUSTOMER_FORM: CustomerFormData = {
  name: "",
  phones: [{ label: "Mobile", number: "" }],
  email: "",
  address: "",
  notes: "",
  taxable: true,
  taxId: "",
};

const EMPTY_VEHICLE_FORM = { year: "", make: "", model: "", trim: "", vin: "", mileage: "" };

// ── Vehicle form ──────────────────────────────────────────────────────────────

type VehicleFormState = VehicleFields & { _editingId?: string };

function VehicleForm({ form, onChange, onSave, onCancel }: {
  form: VehicleFormState;
  onChange: (f: VehicleFormState) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const vehicleFields: VehicleFields = {
    year: form.year, make: form.make, model: form.model,
    trim: form.trim, vin: form.vin, mileage: form.mileage,
  };
  return (
    <div className="page-form page-card">
      <VehicleFormFields
        vehicle={vehicleFields}
        onChange={(v) => onChange({ ...form, ...v })}
      />
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
          {customer.taxable === false && (
            <span className="customer-tax-exempt-badge">
              Tax Exempt{customer.taxId ? ` — ${customer.taxId}` : ""}
            </span>
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

const PAGE_SIZE = 10;

function CustomersPage({ onToast }: { onToast?: (msg: string, type?: string) => void }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [view, setView] = useState<View>("list");
  const [customerForm, setCustomerForm] = useState<CustomerFormData>(EMPTY_CUSTOMER_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [vehicleForm, setVehicleForm] = useState<VehicleFormState>(EMPTY_VEHICLE_FORM);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const refresh = () => getCustomers().then(setCustomers);
  useEffect(() => { refresh(); }, []);

  // ── Customer actions ────────────────────────────────────────────────────────

  const openNew = () => {
    setCustomerForm(EMPTY_CUSTOMER_FORM);
    setEditingId(null);
    setView("new");
  };

  const openEdit = (c: Customer) => {
    setCustomerForm({
      name: c.name,
      phones: c.phones?.length > 0 ? c.phones : [{ label: "Mobile", number: "" }],
      email: c.email || "",
      address: c.address || "",
      notes: c.notes || "",
      taxable: c.taxable !== false,
      taxId: c.taxId || "",
    });
    setEditingId(c.id);
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
      taxable: customerForm.taxable,
      taxId: customerForm.taxId.trim(),
    };
    if (editingId && typeof view === "object" && "editingCustomer" in view) {
      await updateCustomer(editingId, data);
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

  const handleSearchChange = (val: string) => { setSearch(val); setPage(1); };

  const q = search.trim().toLowerCase();
  const filtered = q
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.email || "").toLowerCase().includes(q) ||
          c.phones.some((p) => p.number.toLowerCase().includes(q)),
      )
    : customers;

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
          <div className="page-list">
            {customers.length === 0 ? (
              <div className="page-empty">No customers saved yet.</div>
            ) : filtered.length === 0 ? (
              <div className="page-empty">No customers match your search.</div>
            ) : (
              paginated.map((c) => {
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
                      {c.taxable === false && (
                        <span className="customer-tax-exempt-badge">Tax Exempt</span>
                      )}
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

          {pageCount > 1 && (
            <div className="templates-pagination">
              <button
                type="button"
                className="btn-small btn-secondary"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                ← Prev
              </button>
              <span className="templates-pagination-info">
                Page {page} of {pageCount}
                <span className="templates-pagination-count">
                  {" "}({filtered.length} total)
                </span>
              </span>
              <button
                type="button"
                className="btn-small btn-secondary"
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={page === pageCount}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {(view === "new" || (typeof view === "object" && "editingCustomer" in view)) && (
        <div className="page-form page-card">
          <CustomerFormFields
            value={customerForm}
            onChange={setCustomerForm}
          />

          <div className="customer-tax-row">
            <ToggleField
              checked={customerForm.taxable}
              onChange={(v) => setCustomerForm({ ...customerForm, taxable: v })}
              label="Taxable"
            />
            {!customerForm.taxable && (
              <div className="lib-form-group customer-tax-id-group">
                <label>Tax Exempt ID</label>
                <input
                  type="text"
                  placeholder="Exemption certificate #"
                  value={customerForm.taxId}
                  onChange={(e) => setCustomerForm({ ...customerForm, taxId: e.target.value })}
                />
              </div>
            )}
          </div>

          <div className="lib-form-actions">
            <button
              type="button"
              className="btn-small btn-secondary"
              onClick={() =>
                setView(
                  typeof view === "object" && "editingCustomer" in view
                    ? { detail: view.editingCustomer }
                    : "list",
                )
              }
            >
              Cancel
            </button>
            <button type="button" className="btn-small btn-success" onClick={handleSaveCustomer}>
              {editingId ? "Update" : "Save"}
            </button>
          </div>
        </div>
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
