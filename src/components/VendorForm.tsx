import PhonesEditor from "./PhonesEditor";
import { saveVendor, updateVendor } from "../storage";
import type { Vendor, PhoneEntry } from "../types/index";

export type VendorFormData = {
  name: string;
  phones: PhoneEntry[];
  address: string;
  contact: string;
  notes: string;
};

export const EMPTY_VENDOR_FORM: VendorFormData = {
  name: "",
  phones: [{ label: "Phone", number: "" }],
  address: "",
  contact: "",
  notes: "",
};

/** Form state for an existing vendor. Tolerates records saved without phones. */
export function vendorToForm(v: Vendor): VendorFormData {
  return {
    name: v.name,
    phones: v.phones?.length ? v.phones : [{ label: "Phone", number: "" }],
    address: v.address || "",
    contact: v.contact || "",
    notes: v.notes || "",
  };
}

/** Writes the form to storage. Returns the saved vendor, or null if unnamed. */
export async function persistVendorForm(
  form: VendorFormData,
  editing?: Vendor | null,
): Promise<Vendor | null> {
  if (!form.name.trim()) return null;
  const data = {
    name: form.name.trim(),
    phones: form.phones
      .filter((p) => p.number.trim())
      .map((p) => ({ label: p.label.trim() || "Phone", number: p.number.trim() })),
    address: form.address.trim(),
    contact: form.contact.trim(),
    notes: form.notes.trim(),
  };
  if (editing) {
    await updateVendor(editing.id, data);
    return { ...editing, ...data };
  }
  return saveVendor(data);
}

// ── Fields ────────────────────────────────────────────────────────────────────

export function VendorFormFields({
  form,
  onChange,
}: {
  form: VendorFormData;
  onChange: (f: VendorFormData) => void;
}) {
  const set = <K extends keyof VendorFormData>(f: K, v: VendorFormData[K]) =>
    onChange({ ...form, [f]: v });

  return (
    <>
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
    </>
  );
}

export default VendorFormFields;
