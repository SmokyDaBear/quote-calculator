import PhonesEditor from "./PhonesEditor";
import type { PhoneEntry } from "../types/index";

export type CustomerFormData = {
  name: string;
  phones: PhoneEntry[];
  email: string;
  address: string;
  notes: string;
  taxable: boolean;
  taxId: string;
};

export const EMPTY_CUSTOMER_FORM_DATA: CustomerFormData = {
  name: "",
  phones: [{ label: "Mobile", number: "" }],
  email: "",
  address: "",
  notes: "",
  taxable: true,
  taxId: "",
};

export function CustomerFormFields({
  value,
  onChange,
  nameLabel = "Name *",
  compact = false,
}: {
  value: CustomerFormData;
  onChange: (v: CustomerFormData) => void;
  nameLabel?: string;
  compact?: boolean;
}) {
  const set = <K extends keyof CustomerFormData>(field: K, val: CustomerFormData[K]) =>
    onChange({ ...value, [field]: val });

  return (
    <div className={`customer-form-fields${compact ? " customer-form-fields--compact" : ""}`}>
      <div className="lib-form-group">
        <label>{nameLabel}</label>
        <input
          type="text"
          placeholder="Customer name"
          value={value.name}
          onChange={(e) => set("name", e.target.value)}
        />
      </div>

      <PhonesEditor
        phones={value.phones}
        onChange={(phones) => set("phones", phones)}
      />

      <div className="lib-form-group">
        <label>Email</label>
        <input
          type="email"
          placeholder="customer@email.com"
          value={value.email}
          onChange={(e) => set("email", e.target.value)}
        />
      </div>

      <div className="lib-form-group">
        <label>Address</label>
        <input
          type="text"
          placeholder="Street address, city, state"
          value={value.address}
          onChange={(e) => set("address", e.target.value)}
        />
      </div>

      <div className="lib-form-group">
        <label>Notes</label>
        <textarea
          className="lib-textarea"
          placeholder="Internal notes about this customer…"
          value={value.notes}
          onChange={(e) => set("notes", e.target.value)}
        />
      </div>
    </div>
  );
}
