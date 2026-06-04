import type { ReactNode } from "react";

export function ToggleField({
  checked,
  onChange,
  label,
  hint,
  badge,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
  badge?: ReactNode;
}) {
  return (
    <label className="toggle-field">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="toggle-field-label">{label}</span>
      {hint && <span className="toggle-field-hint">{hint}</span>}
      {badge != null && <span className="toggle-field-badge">{badge}</span>}
    </label>
  );
}
