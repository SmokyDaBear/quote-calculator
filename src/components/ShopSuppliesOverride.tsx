import { ToggleField } from "./forms/ToggleField";

export type SsOverride = { enabled: boolean; value: string };

function ShopSuppliesOverride({
  override,
  onChange,
  autoAmount,
}: {
  override: SsOverride;
  onChange: (o: SsOverride) => void;
  autoAmount: number;
}) {
  const handleToggle = (enabled: boolean) => {
    onChange({ enabled, value: enabled ? autoAmount.toFixed(2) : "" });
  };

  return (
    <div className="ss-override-section">
      <ToggleField
        checked={override.enabled}
        onChange={handleToggle}
        label="Override Shop Supplies"
        badge={!override.enabled && autoAmount > 0 ? `auto: $${autoAmount.toFixed(2)}` : undefined}
      />
      {override.enabled && (
        <div className="ss-override-row">
          <div className="ss-override-input-wrap">
            <span className="ss-override-dollar">$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              className="ss-override-input"
              value={override.value}
              onChange={(e) => onChange({ ...override, value: e.target.value })}
              placeholder={autoAmount.toFixed(2)}
              autoFocus
            />
          </div>
          <span className="ss-override-hint">auto was ${autoAmount.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}

export default ShopSuppliesOverride;
