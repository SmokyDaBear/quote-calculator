type DiscountProps = { type: 'percentage' | 'flat'; value: string; appliesTo: 'both' | 'parts' | 'labor' };

function DiscountSection({ discount, onChange }: {
  discount: DiscountProps;
  onChange: (d: DiscountProps) => void;
}) {
  const set = (patch: Partial<DiscountProps>) => onChange({ ...discount, ...patch });

  return (
    <div className="discount-section">
      <div className="discount-header">
        <h3>Discount</h3>
      </div>
      <div className="discount-controls">
        <div className="discount-toggle-group">
          <button
            type="button"
            className={`discount-toggle-btn${discount.type === "percentage" ? " active" : ""}`}
            onClick={() => set({ type: "percentage" })}
          >
            %
          </button>
          <button
            type="button"
            className={`discount-toggle-btn${discount.type === "flat" ? " active" : ""}`}
            onClick={() => set({ type: "flat" })}
          >
            $
          </button>
        </div>

        <div className="discount-input-wrap">
          {discount.type === "flat" && <span className="discount-prefix">$</span>}
          <input
            type="number"
            className="discount-input"
            placeholder={discount.type === "percentage" ? "0" : "0.00"}
            value={discount.value}
            min="0"
            max={discount.type === "percentage" ? "100" : undefined}
            step={discount.type === "percentage" ? "1" : "0.01"}
            onChange={(e) => set({ value: e.target.value })}
          />
          {discount.type === "percentage" && <span className="discount-suffix">%</span>}
        </div>

        <span className="discount-label">on</span>

        <div className="discount-toggle-group">
          {(["labor", "parts", "both"] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              className={`discount-toggle-btn${discount.appliesTo === opt ? " active" : ""}`}
              onClick={() => set({ appliesTo: opt })}
            >
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default DiscountSection;
