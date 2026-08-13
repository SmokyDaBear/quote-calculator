import { useState } from "react";
import { formatPhone } from "../utils/formatPhone";
import {
  EMPTY_VENDOR_FORM,
  VendorFormFields,
  persistVendorForm,
  vendorToForm,
} from "./VendorForm";
import type { VendorFormData } from "./VendorForm";
import type { Vendor } from "../types/index";

const MAX_RESULTS = 6;

export const vendorMeta = (v: Vendor) =>
  [
    v.contact && `Contact: ${v.contact}`,
    v.phones?.[0]?.number && formatPhone(v.phones[0].number),
    v.address,
  ]
    .filter(Boolean)
    .join(" · ");

/** Same fields the vendors page searches on. */
export function matchVendors(vendors: Vendor[], query: string): Vendor[] {
  const q = query.trim().toLowerCase();
  if (!q) return vendors;
  return vendors.filter(
    (v) =>
      v.name.toLowerCase().includes(q) ||
      (v.contact || "").toLowerCase().includes(q) ||
      (v.phones ?? []).some((p) => p.number.toLowerCase().includes(q)),
  );
}

// ── Create / edit modal ───────────────────────────────────────────────────────

export function VendorFormModal({
  vendor,
  initialName,
  onSaved,
  onClose,
}: {
  /** Omit to create a new vendor. */
  vendor?: Vendor | null;
  /** Seeds the name field when creating from a search that found nothing. */
  initialName?: string;
  onSaved: (vendor: Vendor) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<VendorFormData>(() =>
    vendor ? vendorToForm(vendor) : { ...EMPTY_VENDOR_FORM, name: initialName ?? "" },
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const saved = await persistVendorForm(form, vendor);
    setSaving(false);
    if (saved) onSaved(saved);
  };

  return (
    <div
      className="modal-overlay show"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal vendor-modal">
        <div className="modal-header">
          <h3 className="modal-title">{vendor ? "Edit Vendor" : "New Vendor"}</h3>
          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="vendor-modal-body">
          <VendorFormFields form={form} onChange={setForm} />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn-small btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-small btn-success"
            onClick={handleSave}
            disabled={saving || !form.name.trim()}
          >
            {vendor ? "Update Vendor" : "Save Vendor"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Search + pick field ───────────────────────────────────────────────────────

function VendorPicker({
  vendors,
  vendorId,
  onChange,
  onVendorsChanged,
  disabled = false,
  label = "Vendor *",
}: {
  vendors: Vendor[];
  vendorId: string;
  onChange: (vendorId: string) => void;
  /** Called after a vendor is created or edited, so the caller can refetch. */
  onVendorsChanged?: () => void;
  /** Locks the selection. Editing the picked vendor's details is still allowed. */
  disabled?: boolean;
  label?: string;
}) {
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ vendor?: Vendor } | null>(null);

  const selected = vendors.find((v) => v.id === vendorId) ?? null;
  const matches = search.trim() ? matchVendors(vendors, search).slice(0, MAX_RESULTS) : [];

  const handleSaved = (v: Vendor) => {
    setModal(null);
    setSearch("");
    onChange(v.id);
    onVendorsChanged?.();
  };

  return (
    <div className="lib-form-group vendor-picker-field">
      <label>{label}</label>

      {selected ? (
        <div className="vendor-picked">
          <div className="vendor-picked-info">
            <strong>{selected.name}</strong>
            {vendorMeta(selected) && (
              <span className="vendor-picked-meta">{vendorMeta(selected)}</span>
            )}
          </div>
          <div className="vendor-picked-actions">
            <button
              type="button"
              className="btn-small btn-secondary"
              onClick={() => setModal({ vendor: selected })}
            >
              Edit
            </button>
            {!disabled && (
              <button
                type="button"
                className="btn-small btn-secondary"
                onClick={() => onChange("")}
              >
                Change
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="vendor-search">
          <div className="vendor-search-row">
            <input
              type="text"
              placeholder="Search vendors by name, contact, or phone…"
              value={search}
              disabled={disabled}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              type="button"
              className="btn-small btn-secondary"
              disabled={disabled}
              onClick={() => setModal({})}
            >
              + New
            </button>
          </div>
          {search.trim() && (
            <div className="vendor-search-results">
              {matches.length === 0 ? (
                <button
                  type="button"
                  className="vendor-search-result vendor-search-result--create"
                  onClick={() => setModal({})}
                >
                  <span>No vendors match "{search.trim()}"</span>
                  <span className="vendor-search-result-meta">Create it</span>
                </button>
              ) : (
                matches.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    className="vendor-search-result"
                    onClick={() => {
                      onChange(v.id);
                      setSearch("");
                    }}
                  >
                    <span>{v.name}</span>
                    <span className="vendor-search-result-meta">{vendorMeta(v)}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {modal && (
        <VendorFormModal
          vendor={modal.vendor}
          initialName={modal.vendor ? undefined : search.trim()}
          onSaved={handleSaved}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

export default VendorPicker;
