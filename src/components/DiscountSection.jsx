function DiscountSection({ discount, onChange }) {
  const set = (patch) => onChange({ ...discount, ...patch });

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
            className={`discount-toggle-btn${discount.type === "fixed" ? " active" : ""}`}
            onClick={() => set({ type: "fixed" })}
          >
            $
          </button>
        </div>

        <div className="discount-input-wrap">
          {discount.type === "fixed" && <span className="discount-prefix">$</span>}
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
          {[
            { id: "labor", label: "Labor" },
            { id: "parts", label: "Parts" },
            { id: "both",  label: "Both"  },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`discount-toggle-btn${discount.appliesTo === opt.id ? " active" : ""}`}
              onClick={() => set({ appliesTo: opt.id })}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default DiscountSection;
