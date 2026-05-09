import { useState } from "react";
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

const EMPTY_CUSTOMER_FORM = { name: "", phone: "" };
const EMPTY_VEHICLE_FORM  = { year: "", make: "", model: "", trim: "", vin: "", mileage: "" };

// ── Customer form ─────────────────────────────────────────────────────────────

function CustomerForm({ form, onChange, onSave, onCancel }) {
  const set = (f, v) => onChange({ ...form, [f]: v });
  return (
    <div className="page-form page-card">
      <div className="lib-form-group">
        <label>Name *</label>
        <input type="text" placeholder="Customer or vendor name"
          value={form.name} onChange={(e) => set("name", e.target.value)} />
      </div>
      <div className="lib-form-group">
        <label>Phone</label>
        <input type="tel" placeholder="Phone number"
          value={form.phone} onChange={(e) => set("phone", formatPhoneInput(e.target.value))} />
      </div>
      <div className="lib-form-actions">
        <button className="btn-small btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn-small btn-success" onClick={onSave}>
          {form._editingId ? "Update" : "Save"}
        </button>
      </div>
    </div>
  );
}

// ── Vehicle form ──────────────────────────────────────────────────────────────

function VehicleForm({ form, onChange, onSave, onCancel }) {
  const set = (f, v) => onChange({ ...form, [f]: v });
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
        <button className="btn-small btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn-small btn-success" onClick={onSave}>
          {form._editingId ? "Update Vehicle" : "Save Vehicle"}
        </button>
      </div>
    </div>
  );
}

// ── Vehicle label helper ──────────────────────────────────────────────────────

function vehicleLabel(v) {
  return [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ") || "Unknown Vehicle";
}

// ── Customer detail (vehicle list) ───────────────────────────────────────────

function CustomerDetail({ customer, onEditCustomer, onBack, onEditVehicle, onAddVehicle, onToast }) {
  const [vehicles, setVehicles] = useState(() => getCustomerVehicles(customer.id));

  const refresh = () => setVehicles(getCustomerVehicles(customer.id));

  const handleDeleteVehicle = (v) => {
    if (!window.confirm(`Delete "${vehicleLabel(v)}"?`)) return;
    deleteCustomerVehicle(customer.id, v.id);
    refresh();
    onToast?.(`"${vehicleLabel(v)}" deleted.`, "info");
  };

  return (
    <div>
      <div className="customer-detail-header page-card">
        <div className="customer-detail-info">
          <strong className="customer-detail-name">{customer.name}</strong>
          {customer.phone && (
            <span className="customer-detail-phone">{formatPhone(customer.phone)}</span>
          )}
        </div>
        <div className="page-item-actions">
          <button className="btn-small btn-secondary" onClick={onEditCustomer}>
            Edit
          </button>
        </div>
      </div>

      <div className="page-header customer-vehicles-subheader">
        <h3 className="customer-vehicles-heading">Vehicles</h3>
        <button className="btn-small" onClick={onAddVehicle}>+ Add Vehicle</button>
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
                <button className="btn-small btn-secondary" onClick={() => onEditVehicle(v)}>
                  Edit
                </button>
                <button className="btn-small btn-danger-sm" onClick={() => handleDeleteVehicle(v)}>
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

// ── Page ──────────────────────────────────────────────────────────────────────

function CustomersPage({ onToast }) {
  const [customers, setCustomers] = useState(() =>
    [...getCustomers()].sort((a, b) => a.name.localeCompare(b.name))
  );
  const [view, setView] = useState("list");
  const [customerForm, setCustomerForm] = useState(EMPTY_CUSTOMER_FORM);
  const [vehicleForm, setVehicleForm] = useState(EMPTY_VEHICLE_FORM);
  const [search, setSearch] = useState("");

  const refresh = () =>
    setCustomers([...getCustomers()].sort((a, b) => a.name.localeCompare(b.name)));

  // ── Customer actions ────────────────────────────────────────────────────────

  const openNew = () => {
    setCustomerForm(EMPTY_CUSTOMER_FORM);
    setView("new");
  };

  const openEdit = (c) => {
    setCustomerForm({ name: c.name, phone: formatPhone(c.phone), _editingId: c.id });
    setView({ editingCustomer: c });
  };

  const openDetail = (c) => setView({ detail: c });

  const handleSaveCustomer = () => {
    if (!customerForm.name.trim()) return;
    if (view?.editingCustomer) {
      updateCustomer(view.editingCustomer.id, { name: customerForm.name, phone: customerForm.phone });
      onToast?.(`"${customerForm.name.trim()}" updated.`, "info");
      refresh();
      setView({ detail: { ...view.editingCustomer, name: customerForm.name.trim(), phone: customerForm.phone.trim() } });
    } else {
      saveCustomer({ name: customerForm.name, phone: customerForm.phone });
      onToast?.(`"${customerForm.name.trim()}" saved.`);
      refresh();
      setView("list");
    }
  };

  const handleDeleteCustomer = (id, name) => {
    if (!window.confirm(`Delete "${name}"? This will also remove their saved vehicles.`)) return;
    deleteCustomer(id);
    refresh();
  };

  // ── Vehicle actions ─────────────────────────────────────────────────────────

  const openAddVehicle = (customer) => {
    setVehicleForm(EMPTY_VEHICLE_FORM);
    setView({ addingVehicle: customer });
  };

  const openEditVehicle = (customer, vehicle) => {
    setVehicleForm({
      year: vehicle.year, make: vehicle.make, model: vehicle.model,
      trim: vehicle.trim, vin: vehicle.vin, mileage: vehicle.mileage,
      _editingId: vehicle.id,
    });
    setView({ editingVehicle: { customer, vehicle } });
  };

  const handleSaveVehicle = () => {
    const data = {
      year: vehicleForm.year, make: vehicleForm.make, model: vehicleForm.model,
      trim: vehicleForm.trim, vin: vehicleForm.vin, mileage: vehicleForm.mileage,
    };
    if (view?.editingVehicle) {
      const { customer, vehicle } = view.editingVehicle;
      updateCustomerVehicle(customer.id, vehicle.id, data);
      onToast?.(`"${vehicleLabel(data)}" updated.`, "info");
      setView({ detail: customer });
    } else if (view?.addingVehicle) {
      const customer = view.addingVehicle;
      saveCustomerVehicle(customer.id, data);
      onToast?.(`"${vehicleLabel(data)}" saved.`);
      setView({ detail: customer });
    }
  };

  // ── Filtered list ───────────────────────────────────────────────────────────

  const q = search.trim().toLowerCase();
  const filtered = q
    ? customers.filter((c) =>
        c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q)
      )
    : customers;

  // ── Heading ─────────────────────────────────────────────────────────────────

  let heading = "Customers";
  let backLabel = null;
  let backTarget = "list";
  if (view === "new") { heading = "New Customer"; backLabel = "← Customers"; }
  else if (view?.editingCustomer) { heading = "Edit Customer"; backLabel = `← ${view.editingCustomer.name}`; backTarget = { detail: view.editingCustomer }; }
  else if (view?.detail) { heading = view.detail.name; backLabel = "← Customers"; }
  else if (view?.addingVehicle) { heading = "Add Vehicle"; backLabel = `← ${view.addingVehicle.name}`; backTarget = { detail: view.addingVehicle }; }
  else if (view?.editingVehicle) { heading = "Edit Vehicle"; backLabel = `← ${view.editingVehicle.customer.name}`; backTarget = { detail: view.editingVehicle.customer }; }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-title-group">
          {backLabel && (
            <button className="btn-back" onClick={() => setView(backTarget)}>
              {backLabel}
            </button>
          )}
          <h2>{heading}</h2>
        </div>
        {view === "list" && (
          <div className="page-header-actions">
            <CSVLoader type="customers" onRefresh={refresh} onToast={onToast} />
            <button className="btn-small" onClick={openNew}>+ New Customer</button>
          </div>
        )}
      </div>

      {view === "list" && (
        <>
          <div className="page-search">
            <input type="text" placeholder="Search by name or phone..."
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="page-list">
            {customers.length === 0 ? (
              <div className="page-empty">No customers saved yet.</div>
            ) : filtered.length === 0 ? (
              <div className="page-empty">No customers match your search.</div>
            ) : (
              filtered.map((c) => (
                <div key={c.id} className="page-item page-card">
                  <div className="page-item-info">
                    <strong className="page-item-name">{c.name}</strong>
                    {c.phone && <span className="page-item-meta">{formatPhone(c.phone)}</span>}
                  </div>
                  <div className="page-item-actions">
                    <button className="btn-small btn-secondary" onClick={() => openDetail(c)}>
                      Vehicles
                    </button>
                    <button className="btn-small btn-secondary" onClick={() => openEdit(c)}>
                      Edit
                    </button>
                    <button className="btn-small btn-danger-sm" onClick={() => handleDeleteCustomer(c.id, c.name)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {(view === "new" || view?.editingCustomer) && (
        <CustomerForm
          form={customerForm}
          onChange={setCustomerForm}
          onSave={handleSaveCustomer}
          onCancel={() => setView(view?.editingCustomer ? { detail: view.editingCustomer } : "list")}
        />
      )}

      {view?.detail && (
        <CustomerDetail
          customer={view.detail}
          onEditCustomer={() => openEdit(view.detail)}
          onBack={() => setView("list")}
          onEditVehicle={(v) => openEditVehicle(view.detail, v)}
          onAddVehicle={() => openAddVehicle(view.detail)}
          onToast={onToast}
        />
      )}

      {(view?.addingVehicle || view?.editingVehicle) && (
        <VehicleForm
          form={vehicleForm}
          onChange={setVehicleForm}
          onSave={handleSaveVehicle}
          onCancel={() => setView(
            view?.editingVehicle
              ? { detail: view.editingVehicle.customer }
              : { detail: view.addingVehicle }
          )}
        />
      )}
    </div>
  );
}

export default CustomersPage;
