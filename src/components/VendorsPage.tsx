import { useState, useEffect } from "react";
import { getVendors, deleteVendor } from "../storage";
import { formatPhone } from "../utils/formatPhone";
import { requestPurchaseOrder } from "../utils/poRequest";
import {
  EMPTY_VENDOR_FORM,
  VendorFormFields,
  persistVendorForm,
  vendorToForm,
} from "./VendorForm";
import type { VendorFormData } from "./VendorForm";
import type { Vendor } from "../types/index";
import { CSVLoader } from "./CSVLoader";

const PAGE_SIZE = 10;

type View = "list" | "new" | { editing: Vendor };

// ── Vendor form ───────────────────────────────────────────────────────────────

function VendorForm({ form, onChange, onSave, onCancel, isEditing }: {
  form: VendorFormData;
  onChange: (f: VendorFormData) => void;
  onSave: () => void;
  onCancel: () => void;
  isEditing: boolean;
}) {
  return (
    <div className="page-form page-card">
      <VendorFormFields form={form} onChange={onChange} />
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

function VendorsPage({ onToast, onChanged }: {
  onToast?: (msg: string, type?: string) => void;
  /** Fires whenever the vendor list changes, so open editors can pick it up. */
  onChanged?: () => void;
}) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [view, setView] = useState<View>("list");
  const [form, setForm] = useState<VendorFormData>(EMPTY_VENDOR_FORM);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const refresh = async () => {
    setVendors(await getVendors());
    onChanged?.();
  };
  useEffect(() => { refresh(); }, []);

  const openNew = () => { setForm(EMPTY_VENDOR_FORM); setView("new"); };

  const openEdit = (v: Vendor) => {
    setForm(vendorToForm(v));
    setView({ editing: v });
  };

  const handleSave = async () => {
    const editing = typeof view === "object" && "editing" in view ? view.editing : null;
    const saved = await persistVendorForm(form, editing);
    if (!saved) return;
    onToast?.(
      editing ? `"${saved.name}" updated.` : `"${saved.name}" saved.`,
      editing ? "info" : undefined,
    );
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
                        className="btn-small btn-success"
                        title={`Start a purchase order for ${v.name}`}
                        onClick={() => requestPurchaseOrder({ vendorId: v.id })}
                      >
                        + PO
                      </button>
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
