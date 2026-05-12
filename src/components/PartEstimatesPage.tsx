import { useState, useEffect } from "react";
import { PART_CATEGORIES, CATEGORY_NAMES } from "../utils/partCategories";
import { getEstimatedPriceMap, saveEstimatedPriceMap } from "../storage";
import type { EstimatedPriceMap } from "../types/index";

function PartEstimatesPage({ onToast }: { onToast?: (msg: string, type?: string) => void }) {
  const [map, setMap] = useState<EstimatedPriceMap>({});
  const [dirty, setDirty] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("");

  useEffect(() => {
    getEstimatedPriceMap().then(setMap);
  }, []);

  const setPrice = (category: string, subcategory: string, value: string) => {
    const price = parseFloat(value);
    setMap((prev) => {
      const next = { ...prev };
      if (isNaN(price) || price <= 0) {
        if (!next[category]) return next;
        const catMap = { ...next[category] };
        delete catMap[subcategory];
        if (Object.keys(catMap).length === 0) {
          const { [category]: _removed, ...rest } = next;
          return rest;
        }
        next[category] = catMap;
      } else {
        next[category] = {
          ...(next[category] ?? {}),
          [subcategory]: parseFloat(price.toFixed(2)),
        };
      }
      return next;
    });
    setDirty(true);
  };

  const handleSave = async () => {
    await saveEstimatedPriceMap(map);
    setDirty(false);
    onToast?.("Price guide saved.");
  };

  const handleClear = async () => {
    if (!window.confirm("Clear all estimated prices in the guide?")) return;
    setMap({});
    await saveEstimatedPriceMap({});
    setDirty(false);
    onToast?.("Price guide cleared.", "info");
  };

  const totalSet = Object.values(map).reduce(
    (sum, cat) => sum + Object.keys(cat).length,
    0,
  );
  const categories = categoryFilter
    ? [categoryFilter]
    : CATEGORY_NAMES;

  return (
    <div className="price-guide-container">
      <div className="price-guide-toolbar">
        <div className="price-guide-toolbar-left">
          <select
            aria-label="Filter by category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="price-guide-filter-select"
          >
            <option value="">All Categories</option>
            {CATEGORY_NAMES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {totalSet > 0 && (
            <span className="price-guide-total-count">
              {`${totalSet} price${totalSet !== 1 ? "s" : ""} set`}
            </span>
          )}
        </div>
        <div className="price-guide-toolbar-right">
          <button
            type="button"
            className="btn-small btn-danger-sm"
            onClick={handleClear}
          >
            Clear All
          </button>
          <button
            type="button"
            className={`btn-small${dirty ? " btn-success" : " btn-secondary"}`}
            onClick={handleSave}
          >
            {dirty ? "Save Guide *" : "Save Guide"}
          </button>
        </div>
      </div>

      <p className="price-guide-desc">
        Set standard estimated prices per category slot. These auto-populate when adding a category slot to a job template.
      </p>

      <div className="price-guide-sections">
        {categories.map((cat) => {
          const subcategories =
            (PART_CATEGORIES as Record<string, string[]>)[cat] ?? [];
          const catMap = map[cat] ?? {};
          const setCount = Object.keys(catMap).length;

          return (
            <div
              key={cat}
              className={`price-guide-section${setCount > 0 ? " price-guide-section--active" : ""}`}
            >
              <div className="price-guide-section-header">
                <span className="price-guide-cat-name">{cat}</span>
                {setCount > 0 && (
                  <span className="price-guide-cat-badge">
                    {setCount}/{subcategories.length}
                  </span>
                )}
              </div>
              <div className="price-guide-grid">
                {subcategories.map((sub) => {
                  const val = catMap[sub];
                  return (
                    <div
                      key={sub}
                      className={`price-guide-row${val != null ? " price-guide-row--set" : ""}`}
                    >
                      <span className="price-guide-subcat">{sub}</span>
                      <div className="price-guide-input-wrap">
                        <span className="price-guide-dollar">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="—"
                          value={val != null ? val.toString() : ""}
                          onChange={(e) => setPrice(cat, sub, e.target.value)}
                          className="price-guide-input"
                          aria-label={`Estimated price for ${sub}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default PartEstimatesPage;
