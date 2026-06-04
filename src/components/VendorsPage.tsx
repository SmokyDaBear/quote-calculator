import { useState, useEffect } from "react";
import {
  getVendors,
  saveVendor,
  updateVendor,
  deleteVendor,
} from "../storage";
import { formatPhone } from "../utils/formatPhone";
import PhonesEditor from "./PhonesEditor";
import type { Vendor, PhoneEntry } from "../types/index";
import { CSVLoader } from "./CSVLoader";

const PAGE_SIZE = 10;

type VendorFormData = {
  name: string;
  phones: PhoneEntry[];
  address: string;
  contact: string;
  notes: string;
};

const EMPTY_FORM: VendorFormData = {
  name: "",
  phones: [{ label: "Phone", number: "" }],
  address: "",
  contact: "",
  notes: "",
};

// Normalize phones from stored vendor: handles legacy single-string phone field
function normalizePhones(vendor: Vendor): PhoneEntry[] {
  if (vendor.phones && vendor.phones.length > 0) {
    return vendor.phones;
  }
  return [{ label: "Phone", number: "" }];
}

type View = "list" | "new" | { editing: Vendor };

// ── Vendor form ───────────────────────────────────────────────────────────────

function VendorForm({ form, onChange, onSave, onCancel, isEditing }: {
  form: VendorFormData;
  onChange: (f: VendorFormData) => void;
  onSave: () => void;
  onCancel: () => void;
  isEditing: boolean;
}) {
  const set = <K extends keyof VendorFormData>(f: K, v: VendorFormData[K]) =>
    onChange({ ...form, [f]: v });

  return (
    <div className="page-form page-card">
      <div className="lib-form-group">
        <label>Vendor Name *</label>
        <input
          type="text"
          placeholder="e.g. NAPA Auto Parts"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
        />
      </div>

      <div className="lib-form-row two-col">
        <PhonesEditor
          phones={form.phones}
          onChange={(phones) => set("phones", phones)}
        />
        <div className="lib-form-group">
          <label>Contact Person</label>
          <input
            type="text"
            placeholder="Sales rep name"
            value={form.contact}
            onChange={(e) => set("contact", e.target.value)}
          />
        </div>
      </div>

      <div className="lib-form-group">
        <label>Address</label>
        <textarea
          className="lib-textarea"
          placeholder="Street, City, State ZIP"
          value={form.address}
          onChange={(e) => set("address", e.target.value)}
        />
      </div>
      <div className="lib-form-group">
        <label>Notes</label>
        <textarea
          className="lib-textarea"
          placeholder="Account numbers, terms, etc."
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
        />
      </div>
      <div className="lib-form-actions">
        <button type="button" className="btn-small btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn-small btn-success" onClick={onSave}>
          {isEditing ? "Update Vendor" : "Save Vendor"}
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function VendorsPage({ onToast }: { onToast?: (msg: string, type?: string) => void }) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [view, setView] = useState<View>("list");
  const [form, setForm] = useState<VendorFormData>(EMPTY_FORM);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const refresh = () => getVendors().then(setVendors);
  useEffect(() => { refresh(); }, []);

  const openNew = () => { setForm(EMPTY_FORM); setView("new"); };

  const openEdit = (v: Vendor) => {
    setForm({
      name: v.name,
      phones: normalizePhones(v),
      address: v.address || "",
      contact: v.contact || "",
      notes: v.notes || "",
    });
    setView({ editing: v });
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    const phones = form.phones
      .filter((p) => p.number.trim())
      .map((p) => ({ label: p.label.trim() || "Phone", number: p.number.trim() }));
    const data = {
      name: form.name.trim(),
      phones,
      address: form.address.trim(),
      contact: form.contact.trim(),
      notes: form.notes.trim(),
    };
    if (typeof view === "object" && "editing" in view) {
      await updateVendor(view.editing.id, data);
      onToast?.(`"${data.name}" updated.`, "info");
    } else {
      await saveVendor(data);
      onToast?.(`"${data.name}" saved.`);
    }
    await refresh();
    setView("list");
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    await deleteVendor(id);
    refresh();
    onToast?.(`"${name}" deleted.`, "info");
  };

  const handleSearchChange = (val: string) => { setSearch(val); setPage(1); };

  const q = search.trim().toLowerCase();
  const filtered = q
    ? vendors.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          (v.contact || "").toLowerCase().includes(q) ||
          v.phones.some((p) => p.number.toLowerCase().includes(q)),
      )
    : vendors;

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const isEditing = typeof view === "object" && "editing" in view;
  const heading = view === "list" ? "Vendors" : isEditing ? "Edit Vendor" : "New Vendor";
  const backLabel = view !== "list" ? "← Vendors" : null;

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-title-group">
          {backLabel && (
            <button type="button" className="btn-back" onClick={() => setView("list")}>
              {backLabel}
            </button>
          )}
          <h2>{heading}</h2>
        </div>
        {view === "list" && (
          <div className="page-header-actions">
            <CSVLoader type="vendors" onRefresh={refresh} onToast={onToast} />
            <button type="button" className="btn-small" onClick={openNew}>
              + New Vendor
            </button>
          </div>
        )}
      </div>

      {view === "list" && (
        <>
          <div className="page-search">
            <input
              type="text"
              placeholder="Search by name, contact, or phone..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
          <div className="page-list">
            {vendors.length === 0 ? (
              <div className="page-empty">No vendors saved yet.</div>
            ) : filtered.length === 0 ? (
              <div className="page-empty">No vendors match your search.</div>
            ) : (
              paginated.map((v) => {
                const primaryPhone = v.phones?.[0]?.number ?? "";
                return (
                  <div key={v.id} className="page-item page-card">
                    <div className="page-item-info">
                      <strong className="page-item-name">{v.name}</strong>
                      <span className="page-item-meta">
                        {[
                          v.contact && `Contact: ${v.contact}`,
                          primaryPhone && formatPhone(primaryPhone),
                          v.address,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                      {v.notes && (
                        <span className="page-item-desc">{v.notes}</span>
                      )}
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
                        onClick={() => handleDelete(v.id, v.name)}
                      >
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

      {(view === "new" || isEditing) && (
        <VendorForm
          form={form}
          onChange={setForm}
          onSave={handleSave}
          onCancel={() => setView("list")}
          isEditing={isEditing}
        />
      )}
    </div>
  );
}

export default VendorsPage;
