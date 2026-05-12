import { useState, useEffect, useRef } from "react";
import {
  getAllVehicles,
  getCustomers,
  saveVehicle,
  updateVehicle,
  deleteVehicle,
} from "../storage";
import type { Vehicle, Customer } from "../types/index";
import { VehicleFormFields } from "./VehicleSection";
import type { VehicleFields } from "./VehicleSection";
import { CSVLoader } from "./CSVLoader";

const PAGE_SIZE = 10;

type VehicleFormState = VehicleFields & {
  customerId: string;
  color: string;
  notes: string;
  _editingId?: string;
};

const EMPTY_FORM: VehicleFormState = {
  year: "", make: "", model: "", trim: "", vin: "", mileage: "",
  customerId: "", color: "", notes: "",
};

function vehicleLabel(v: Partial<Vehicle>): string {
  const parts = [v.year, v.make, v.model, v.trim].filter(Boolean);
  return parts.length ? parts.join(" ") : "Unknown Vehicle";
}

function CustomerSearchInput({
  customerId,
  customers,
  onChange,
}: {
  customerId: string;
  customers: Customer[];
  onChange: (id: string) => void;
}) {
  const [text, setText] = useState(() => customers.find((c) => c.id === customerId)?.name ?? "");
  const [results, setResults] = useState<Customer[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const found = customers.find((c) => c.id === customerId);
    setText(found?.name ?? "");
  }, [customerId, customers]);

  const handleChange = (value: string) => {
    setText(value);
    if (!value.trim()) {
      onChange("");
      setResults([]);
      return;
    }
    const q = value.toLowerCase();
    const digits = value.replace(/\D/g, "");
    setResults(
      customers
        .filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            (digits && c.phones.some((p) => p.number.replace(/\D/g, "").includes(digits))),
        )
        .slice(0, 8),
    );
  };

  const select = (c: Customer) => {
    onChange(c.id);
    setText(c.name);
    setResults([]);
  };

  const handleBlur = () => {
    // restore display text to the currently committed customer name
    const found = customers.find((c) => c.id === customerId);
    setText(found?.name ?? "");
    setResults([]);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        handleBlur();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }); // intentionally no deps — always uses latest customerId/customers via closure

  return (
    <div className="cust-search-wrap" ref={wrapperRef}>
      <input
        type="text"
        placeholder="Search by name or phone…"
        value={text}
        autoComplete="off"
        aria-label="Search customer"
        onChange={(e) => handleChange(e.target.value)}
      />
      {results.length > 0 && (
        <div className="cust-search-dropdown">
          {results.map((c) => (
            <button
              key={c.id}
              type="button"
              className="cust-search-item"
              onMouseDown={() => select(c)}
            >
              <span className="cust-search-name">{c.name}</span>
              {c.phones[0]?.number && (
                <span className="cust-search-phone">{c.phones[0].number}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function VehicleForm({
  form,
  onChange,
  onSave,
  onCancel,
  customers,
}: {
  form: VehicleFormState;
  onChange: (f: VehicleFormState) => void;
  onSave: () => void;
  onCancel: () => void;
  customers: Customer[];
}) {
  const vehicleFields: VehicleFields = {
    year: form.year, make: form.make, model: form.model,
    trim: form.trim, vin: form.vin, mileage: form.mileage,
  };

  return (
    <div className="page-form page-card">
      <div className="lib-form-group">
        <label>Customer</label>
        <CustomerSearchInput
          customerId={form.customerId}
          customers={customers}
          onChange={(id) => onChange({ ...form, customerId: id })}
        />
      </div>
      <VehicleFormFields
        vehicle={vehicleFields}
        onChange={(v) => onChange({ ...form, ...v })}
      />
      <div className="lib-form-row two-col">
        <div className="lib-form-group">
          <label>Color</label>
          <input
            type="text"
            placeholder="e.g. Silver"
            value={form.color}
            onChange={(e) => onChange({ ...form, color: e.target.value })}
          />
        </div>
      </div>
      <div className="lib-form-group">
        <label>Notes</label>
        <textarea
          className="lib-textarea"
          placeholder="Vehicle notes…"
          value={form.notes}
          onChange={(e) => onChange({ ...form, notes: e.target.value })}
        />
      </div>
      <div className="lib-form-actions">
        <button type="button" className="btn-small btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn-small btn-success" onClick={onSave}>
          {form._editingId ? "Update Vehicle" : "Save Vehicle"}
        </button>
      </div>
    </div>
  );
}

function VehiclesPage({ onToast }: { onToast?: (msg: string, type?: string) => void }) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [view, setView] = useState<"list" | "new" | { editing: Vehicle }>("list");
  const [form, setForm] = useState<VehicleFormState>(EMPTY_FORM);
  const [search, setSearch] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [page, setPage] = useState(1);

  const refresh = async () => {
    const [v, c] = await Promise.all([getAllVehicles(), getCustomers()]);
    setVehicles(v);
    setCustomers(c);
  };

  useEffect(() => { refresh(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const customerMap = Object.fromEntries(customers.map((c) => [c.id, c.name]));

  const openNew = () => { setForm(EMPTY_FORM); setView("new"); };

  const openEdit = (v: Vehicle) => {
    setForm({
      year: v.year, make: v.make, model: v.model,
      trim: v.trim, vin: v.vin, mileage: v.mileage,
      customerId: v.customerId || "",
      color: v.color || "", notes: v.notes || "",
      _editingId: v.id,
    });
    setView({ editing: v });
  };

  const handleSave = async () => {
    const data = {
      customerId: form.customerId || "",
      year: form.year, make: form.make, model: form.model,
      trim: form.trim, vin: form.vin, mileage: form.mileage,
      color: form.color, notes: form.notes,
    };
    if (typeof view === "object" && "editing" in view) {
      await updateVehicle(view.editing.id, data);
      onToast?.(`"${vehicleLabel(data)}" updated.`, "info");
    } else {
      await saveVehicle(data);
      onToast?.(`"${vehicleLabel(data)}" saved.`);
    }
    await refresh();
    setView("list");
  };

  const handleDelete = async (id: string, label: string) => {
    if (!window.confirm(`Delete "${label}"?`)) return;
    await deleteVehicle(id);
    refresh();
    onToast?.(`"${label}" deleted.`, "info");
  };

  const handleSearchChange = (q: string) => { setSearch(q); setPage(1); };
  const handleCustomerFilterChange = (c: string) => { setCustomerFilter(c); setPage(1); };

  const filtered = vehicles.filter((v) => {
    if (customerFilter && v.customerId !== customerFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        (v.year || "").toLowerCase().includes(q) ||
        (v.make || "").toLowerCase().includes(q) ||
        (v.model || "").toLowerCase().includes(q) ||
        (v.trim || "").toLowerCase().includes(q) ||
        (v.vin || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const heading =
    view === "list" ? "Vehicles"
    : typeof view === "object" && "editing" in view ? "Edit Vehicle"
    : "New Vehicle";

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>{heading}</h2>
        {view === "list" && (
          <div className="page-header-actions">
            <CSVLoader type="vehicles" onRefresh={refresh} onToast={onToast} />
            <button type="button" className="btn-small" onClick={openNew}>
              + New Vehicle
            </button>
          </div>
        )}
      </div>

      {view === "list" ? (
        <>
          <div className="templates-filter-bar">
            <input
              type="search"
              placeholder="Search by year, make, model, VIN…"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              aria-label="Search vehicles"
            />
            <select
              aria-label="Filter by customer"
              value={customerFilter}
              onChange={(e) => handleCustomerFilterChange(e.target.value)}
            >
              <option value="">All Customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="page-list">
            {vehicles.length === 0 ? (
              <div className="page-empty">No vehicles saved yet.</div>
            ) : filtered.length === 0 ? (
              <div className="page-empty">No vehicles match your search.</div>
            ) : paginated.map((v) => (
              <div key={v.id} className="page-item page-card">
                <div className="page-item-info">
                  <div className="page-item-name-row">
                    <strong className="page-item-name">{vehicleLabel(v)}</strong>
                    {v.customerId && customerMap[v.customerId] && (
                      <span className="part-category-badge">
                        {customerMap[v.customerId]}
                      </span>
                    )}
                  </div>
                  <span className="page-item-meta">
                    {[
                      v.vin && `VIN: ${v.vin}`,
                      v.mileage && `${Number(v.mileage).toLocaleString()} mi`,
                      v.color,
                    ].filter(Boolean).join(" · ")}
                  </span>
                  {v.notes && <span className="page-item-desc">{v.notes}</span>}
                </div>
                <div className="page-item-actions">
                  <button
                    type="button"
                    className="btn-small btn-secondary"
                    onClick={() => openEdit(v)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn-small btn-danger-sm"
                    onClick={() => handleDelete(v.id, vehicleLabel(v))}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
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
      ) : (
        <VehicleForm
          form={form}
          onChange={setForm}
          onSave={handleSave}
          onCancel={() => setView("list")}
          customers={customers}
        />
      )}
    </div>
  );
}

export default VehiclesPage;
