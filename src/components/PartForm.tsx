import { CATEGORY_NAMES, getSubcategories } from "../utils/partCategories";
import { calculateSellPrice } from "../utils/partsMarkup";
import type { MarkupBracket } from "../types/index";

export type PartFormData = {
  partNumber: string;
  name: string;
  cost: string;
  price: string;
  msrp: string;
  description: string;
  category: string;
  subcategory: string;
  menuPrice: boolean;
  _editingId?: string;
};

export const EMPTY_PART_FORM: PartFormData = {
  partNumber: "",
  name: "",
  cost: "",
  price: "",
  msrp: "",
  description: "",
  category: "",
  subcategory: "",
  menuPrice: false,
};

function PartForm({
  form,
  onChange,
  onSave,
  onCancel,
  markupMatrix,
  saveLabel,
}: {
  form: PartFormData;
  onChange: (form: PartFormData) => void;
  onSave: () => void;
  onCancel: () => void;
  markupMatrix?: MarkupBracket[];
  saveLabel?: string;
}) {
  const set = (field: string, value: string) =>
    onChange({ ...form, [field]: value });
  const subcategories = getSubcategories(form.category);

  const handleCategoryChange = (value: string) => {
    onChange({ ...form, category: value, subcategory: "" });
  };

  const handleCostChange = (value: string) => {
    if (form.menuPrice) {
      onChange({ ...form, cost: value });
      return;
    }
    const sell =
      value && markupMatrix ? calculateSellPrice(Number(value), markupMatrix) : 0;
    onChange({ ...form, cost: value, price: sell > 0 ? sell.toFixed(2) : "" });
  };

  const handleMenuPriceChange = (checked: boolean) => {
    if (!checked && markupMatrix && form.cost) {
      const sell = calculateSellPrice(Number(form.cost), markupMatrix);
      onChange({ ...form, menuPrice: false, price: sell > 0 ? sell.toFixed(2) : "" });
    } else {
      onChange({ ...form, menuPrice: checked });
    }
  };

  return (
    <div className="page-form page-card">
      <div className="lib-form-group">
        <label>Name *</label>
        <input
          type="text"
          placeholder="Part name"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
        />
      </div>
      <div className="lib-form-group">
        <label>Part #</label>
        <input
          type="text"
          placeholder="Part number"
          value={form.partNumber}
          onChange={(e) => set("partNumber", e.target.value)}
        />
      </div>
      <div className="lib-form-row three-col">
        <div className="lib-form-group">
          <label>Cost ($)</label>
          <input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={form.cost}
            onChange={(e) => handleCostChange(e.target.value)}
          />
        </div>
        <div className="lib-form-group">
          <div className="lib-label-row">
            <label>Sell Price ($)</label>
            <label className="menu-price-check">
              <input
                type="checkbox"
                checked={form.menuPrice}
                onChange={(e) => handleMenuPriceChange(e.target.checked)}
              />
              <span>Menu price</span>
            </label>
          </div>
          <input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={form.price}
            disabled={!form.menuPrice}
            onChange={(e) => set("price", e.target.value)}
          />
        </div>
        <div className="lib-form-group">
          <label>MSRP / List ($)</label>
          <input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={form.msrp}
            onChange={(e) => set("msrp", e.target.value)}
          />
        </div>
      </div>
      <div className="lib-form-row two-col">
        <div className="lib-form-group">
          <label>Category</label>
          <select
            aria-label="Select category"
            value={form.category}
            onChange={(e) => handleCategoryChange(e.target.value)}
          >
            <option value="">— None —</option>
            {CATEGORY_NAMES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="lib-form-group">
          <label>Subcategory</label>
          <select
            aria-label="Select subcategory"
            value={form.subcategory}
            onChange={(e) => set("subcategory", e.target.value)}
            disabled={!form.category}
          >
            <option value="">— None —</option>
            {subcategories.map((s: string) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="lib-form-group">
        <label>Description</label>
        <textarea
          className="lib-textarea"
          placeholder="Part description..."
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </div>
      <div className="lib-form-actions">
        <button type="button" className="btn-small btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn-small btn-success" onClick={onSave}>
          {saveLabel ?? (form._editingId ? "Update Part" : "Save Part")}
        </button>
      </div>
    </div>
  );
}

export default PartForm;
