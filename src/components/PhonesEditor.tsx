import { formatPhoneInput } from "../utils/formatPhone";
import type { PhoneEntry } from "../types/index";

function PhonesEditor({ phones, onChange }: {
  phones: PhoneEntry[];
  onChange: (phones: PhoneEntry[]) => void;
}) {
  const update = (idx: number, field: keyof PhoneEntry, value: string) =>
    onChange(phones.map((p, i) => i === idx ? { ...p, [field]: value } : p));

  const remove = (idx: number) => onChange(phones.filter((_, i) => i !== idx));

  const add = () => onChange([...phones, { label: "Mobile", number: "" }]);

  return (
    <div className="phones-editor">
      <div className="phones-editor-header">
        <label>Phone Numbers</label>
        <button type="button" className="btn-small btn-secondary" onClick={add}>
          + Add
        </button>
      </div>
      <div className="phones-editor-list">
        {phones.map((phone, idx) => (
          <div key={idx} className="phones-editor-row">
            <input
              type="text"
              className="phones-editor-label-select"
              placeholder="Label"
              value={phone.label}
              onChange={(e) => update(idx, "label", e.target.value)}
              aria-label={`Phone ${idx + 1} label`}
            />
            <input
              type="tel"
              className="phones-editor-number"
              placeholder="Phone number"
              value={phone.number}
              onChange={(e) => update(idx, "number", formatPhoneInput(e.target.value))}
              aria-label={`Phone ${idx + 1} number`}
            />
            {phones.length > 1 && (
              <button
                type="button"
                className="btn-remove"
                onClick={() => remove(idx)}
                aria-label="Remove phone"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default PhonesEditor;
