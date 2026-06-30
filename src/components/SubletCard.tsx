import { calculateSellPrice } from "../utils/partsMarkup";
import { ToggleField } from "./forms/ToggleField";
import type { Vendor, WorkingSublet, MarkupBracket } from "../types/index";

function SubletCard({
  sublet,
  vendors,
  markupMatrix,
  onUpdate,
  onRemove,
  onCreatePo,
}: {
  sublet: WorkingSublet;
  vendors: Vendor[];
  markupMatrix?: MarkupBracket[];
  onUpdate: (id: string, field: keyof WorkingSublet, value: string | boolean) => void;
  onRemove: (id: string) => void;
  onCreatePo: (sublet: WorkingSublet) => void;
}) {
  const cost = Number(sublet.cost) || 0;
  const sell = Number(sublet.sellPrice) || 0;
  const belowCost = sell > 0 && cost > 0 && sell < cost;

  const handleCostChange = (value: string) => {
    const c = Number(value) || 0;
    // Auto-fill sell price from the sublet markup matrix until manually overridden.
    if (markupMatrix && c > 0 && (!sublet.sellPrice || Number(sublet.sellPrice) === 0)) {
      const computed = calculateSellPrice(c, markupMatrix);
      onUpdate(sublet.id, "cost", value);
      onUpdate(sublet.id, "sellPrice", computed > 0 ? computed.toFixed(2) : "");
      return;
    }
    onUpdate(sublet.id, "cost", value);
  };

  return (
    <div className="job-card sublet-card">
      <div className="job-header">
        <input
          aria-label="Sublet description"
          type="text"
          className="job-name"
          placeholder="Sublet description (e.g. Detail, Alignment)"
          value={sublet.description}
          onChange={(e) => onUpdate(sublet.id, "description", e.target.value)}
        />
        <div className="job-header-actions">
          <button type="button" className="btn-remove" onClick={() => onRemove(sublet.id)}>
            ×
          </button>
        </div>
      </div>

      <div className="sublet-fields">
        <div className="form-group">
          <label>Vendor</label>
          <select
            aria-label="Sublet vendor"
            value={sublet.vendorId ?? ""}
            onChange={(e) => onUpdate(sublet.id, "vendorId", e.target.value)}
          >
            <option value="">— Vendor —</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Cost ($)</label>
          <input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={sublet.cost}
            onChange={(e) => handleCostChange(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Sell Price ($)</label>
          <input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={sublet.sellPrice}
            onChange={(e) => onUpdate(sublet.id, "sellPrice", e.target.value)}
          />
        </div>
        <div className="form-group form-group--checkbox">
          <ToggleField
            checked={sublet.taxable}
            onChange={(v) => onUpdate(sublet.id, "taxable", v)}
            label="Taxable"
          />
        </div>
      </div>

      {belowCost && (
        <div className="sublet-warning">⚠ Sell price is below cost.</div>
      )}

      <div className="job-footer">
        {sublet.poId ? (
          <span className="sublet-po-badge">Linked to PO #{sublet.poId}</span>
        ) : (
          <button
            type="button"
            className="btn-small btn-secondary"
            onClick={() => onCreatePo(sublet)}
          >
            Create Purchase Order
          </button>
        )}
        <div className="job-subtotal">
          <span>Sublet: </span>
          <span className="job-subtotal-value">${sell.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

export default SubletCard;
