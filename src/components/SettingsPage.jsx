import { useState, useRef } from "react";
import { DEFAULT_RATES, saveJobTemplate, saveLibraryPart } from "../storage";
import { ACCENT_PRESETS } from "../utils/accentPresets";
import { DEFAULT_MARKUP_MATRIX, grossProfitPct } from "../utils/partsMarkup";
import { CSVLoader, parseCSV } from "./CSVLoader";
import { formatPhoneInput } from "../utils/formatPhone";

function SettingsPage({
  rates,
  onRatesChange,
  businessInfo,
  onBusinessChange,
  isDark,
  onToggleTheme,
  accent,
  onAccentChange,
  onClearHistory,
  onToast,
}) {
  const [ratesSaved, setRatesSaved] = useState(false);
  const [bizSaved, setBizSaved] = useState(false);
  const [defaultsLoading, setDefaultsLoading] = useState(false);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const logoInputRef = useRef(null);

  const handleRateChange = (field, value) => {
    onRatesChange({ ...rates, [field]: Number(value) });
    setRatesSaved(false);
  };

  const handleReset = () => {
    onRatesChange({ ...DEFAULT_RATES });
    setRatesSaved(false);
  };

  const handleLoadDefaults = async () => {
    setDefaultsLoading(true);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}templates.csv`);
      if (!res.ok) throw new Error("fetch failed");
      const text = await res.text();
      const { rows } = parseCSV(text);
      let count = 0;
      for (const row of rows) {
        const name = row["name"]?.trim();
        if (!name) continue;
        let parts = [];
        if (row["parts"]) {
          try {
            const parsed = JSON.parse(row["parts"]);
            if (Array.isArray(parsed)) parts = parsed;
          } catch { /* malformed — import without parts */ }
        }
        saveJobTemplate({
          name,
          description: row["description"] || "",
          laborHrs: Number(row["laborHrs"]) || 0,
          laborCost: Number(row["laborCost"]) || 0,
          parts,
        });
        count++;
      }
      onToast?.(`Loaded ${count} default template${count !== 1 ? "s" : ""}.`);
    } catch {
      onToast?.("Failed to load default templates.", "error");
    } finally {
      setDefaultsLoading(false);
    }
  };

  const handleLoadDefaultInventory = async () => {
    setInventoryLoading(true);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}inventory.csv`);
      if (!res.ok) throw new Error("fetch failed");
      const text = await res.text();
      const { rows } = parseCSV(text);
      let count = 0;
      for (const row of rows) {
        const name = row["name"]?.trim();
        if (!name) continue;
        saveLibraryPart({
          name,
          partNumber:  row["partNumber"]  || "",
          price:       Number(row["price"]) || 0,
          description: row["description"] || "",
        });
        count++;
      }
      onToast?.(`Loaded ${count} default part${count !== 1 ? "s" : ""}.`);
    } catch {
      onToast?.("Failed to load default inventory.", "error");
    } finally {
      setInventoryLoading(false);
    }
  };

  const sortedMatrix = [...(rates.partsMarkupMatrix || DEFAULT_MARKUP_MATRIX)].sort(
    (a, b) => {
      if (a.max === null) return 1;
      if (b.max === null) return -1;
      return a.max - b.max;
    }
  );

  const updateMatrixRow = (displayIdx, field, rawValue) => {
    const value =
      field === "max"
        ? rawValue === "" ? null : Number(rawValue)
        : Number(rawValue) || 0;
    const updated = sortedMatrix.map((row, i) =>
      i === displayIdx ? { ...row, [field]: value } : row
    );
    onRatesChange({ ...rates, partsMarkupMatrix: updated });
  };

  const addMatrixRow = () => {
    const finite = sortedMatrix.filter((r) => r.max !== null);
    const prevMax = finite.length > 0 ? finite[finite.length - 1].max : 0;
    const newRow = { max: prevMax + 100, markupPct: 30 };
    const last = sortedMatrix.find((r) => r.max === null);
    onRatesChange({
      ...rates,
      partsMarkupMatrix: [...finite, newRow, ...(last ? [last] : [])],
    });
  };

  const removeMatrixRow = (displayIdx) => {
    if (sortedMatrix.length <= 1) return;
    let updated = sortedMatrix.filter((_, i) => i !== displayIdx);
    if (!updated.some((r) => r.max === null)) {
      updated = updated.map((r, i) =>
        i === updated.length - 1 ? { ...r, max: null } : r
      );
    }
    onRatesChange({ ...rates, partsMarkupMatrix: updated });
  };

  const resetMatrix = () => {
    onRatesChange({ ...rates, partsMarkupMatrix: DEFAULT_MARKUP_MATRIX });
  };

  const formatRangeMin = (idx) => {
    if (idx === 0) return "$0.01";
    const prev = sortedMatrix[idx - 1].max;
    return `$${(prev + 0.01).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleRatesSave = () => {
    setRatesSaved(true);
    setTimeout(() => setRatesSaved(false), 2000);
  };

  const setBiz = (field, value) => {
    onBusinessChange({ ...businessInfo, [field]: value });
    setBizSaved(false);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      onBusinessChange({ ...businessInfo, logo: ev.target.result });
      setBizSaved(false);
    };
    reader.readAsDataURL(file);
  };

  const handleBizSave = () => {
    setBizSaved(true);
    setTimeout(() => setBizSaved(false), 2000);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Settings</h2>
      </div>

      <div className="page-card settings-section">
        <h3 className="settings-section-title">Appearance</h3>
        <div className="settings-appearance-row">
          <span className="settings-appearance-label">Dark Mode</span>
          <div
            className={`toggle-switch${isDark ? " active" : ""}`}
            onClick={onToggleTheme}
            style={{ cursor: "pointer" }}
          />
        </div>
        <div className="settings-appearance-row" style={{ marginTop: "1rem" }}>
          <span className="settings-appearance-label">Accent Color</span>
        </div>
        <div className="accent-swatch-row">
          {ACCENT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              className={`accent-swatch${accent === preset.id ? " active" : ""}`}
              style={{ "--swatch-color": preset.swatch }}
              onClick={() => onAccentChange(preset.id)}
              title={preset.name}
              aria-label={preset.name}
              aria-pressed={accent === preset.id}
            />
          ))}
        </div>
      </div>

      <div className="page-card settings-section" style={{ marginTop: "1rem" }}>
        <h3 className="settings-section-title">Business Information</h3>
        <p className="settings-section-desc">
          Appears in the header of printed quotes.
        </p>
        <div className="biz-form">
          <div className="biz-logo-row">
            <div className="biz-logo-preview">
              {businessInfo.logo ?
                <img
                  src={businessInfo.logo}
                  alt="Logo"
                  className="biz-logo-img"
                />
              : <span className="biz-logo-placeholder">No logo</span>}
            </div>
            <div className="biz-logo-actions">
              <button
                className="btn-small btn-secondary"
                onClick={() => logoInputRef.current.click()}
              >
                {businessInfo.logo ? "Change Logo" : "Upload Logo"}
              </button>
              {businessInfo.logo && (
                <button
                  className="btn-small btn-danger-sm"
                  onClick={() => setBiz("logo", "")}
                >
                  Remove
                </button>
              )}
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleLogoUpload}
              />
            </div>
          </div>
          <div className="lib-form-group">
            <label>Business Name</label>
            <input
              type="text"
              placeholder="Your Shop Name"
              value={businessInfo.name}
              onChange={(e) => setBiz("name", e.target.value)}
            />
          </div>
          <div className="lib-form-group">
            <label>Phone</label>
            <input
              type="tel"
              placeholder="Business phone"
              value={businessInfo.phone}
              onChange={(e) =>
                setBiz("phone", formatPhoneInput(e.target.value))
              }
            />
          </div>
          <div className="lib-form-group">
            <label>Address</label>
            <textarea
              className="lib-textarea"
              placeholder="Street, City, State ZIP"
              value={businessInfo.address}
              onChange={(e) => setBiz("address", e.target.value)}
            />
          </div>
          <div className="lib-form-group">
            <label>Print Message</label>
            <textarea
              className="lib-textarea"
              placeholder={`e.g. "Thank you for choosing ${businessInfo.name || "our shop"}! We appreciate your business."`}
              value={
                businessInfo?.printMessage ||
                `Thank you for choosing ${businessInfo.name || "our shop"}! We appreciate your business.`
              }
              onChange={(e) => setBiz("printMessage", e.target.value)}
            />
          </div>
        </div>
        <div className="settings-actions">
          <button className="btn-small btn-success" onClick={handleBizSave}>
            {bizSaved ? "Saved!" : "Save"}
          </button>
        </div>
      </div>

      <div className="page-card settings-section" style={{ marginTop: "1rem" }}>
        <h3 className="settings-section-title">Global Rates</h3>
        <p className="settings-section-desc">
          These defaults apply to all new quotes. Rates saved with a quote are
          preserved when you reload it.
        </p>
        <div className="settings-rates-grid">
          <div className="lib-form-group">
            <label>Tax Rate (%)</label>
            <input
              type="number"
              step="0.01"
              value={rates.taxRate}
              onChange={(e) => handleRateChange("taxRate", e.target.value)}
            />
          </div>
          <div className="lib-form-group">
            <label>Labor Rate ($/hr)</label>
            <input
              type="number"
              step="0.01"
              value={rates.laborRate}
              onChange={(e) => handleRateChange("laborRate", e.target.value)}
            />
          </div>
          <div className="lib-form-group">
            <label>Shop Supplies Rate (%)</label>
            <input
              type="number"
              step="0.01"
              value={rates.ssRate}
              onChange={(e) => handleRateChange("ssRate", e.target.value)}
            />
          </div>
          <div className="lib-form-group">
            <label>Shop Supplies Max ($)</label>
            <input
              type="number"
              step="0.01"
              value={rates.ssMax}
              onChange={(e) => handleRateChange("ssMax", e.target.value)}
            />
          </div>
        </div>
        <div className="settings-actions">
          <button className="btn-small btn-secondary" onClick={handleReset}>
            Reset to Defaults
          </button>
          <button className="btn-small btn-success" onClick={handleRatesSave}>
            {ratesSaved ? "Saved!" : "Save"}
          </button>
        </div>
      </div>
      <div className="page-card settings-section" style={{ marginTop: "1rem" }}>
        <h3 className="settings-section-title">Parts Markup Matrix</h3>
        <p className="settings-section-desc">
          Sell price is calculated bracket-by-bracket (like marginal tax): each
          slice of cost in a tier gets that tier's markup rate, and the results
          are summed. Edit the rates below to match your pricing strategy.
        </p>
        <div className="markup-matrix-wrap">
          <table className="markup-matrix-table">
            <thead>
              <tr>
                <th>Cost Range</th>
                <th>Up To ($)</th>
                <th>Markup %</th>
                <th>Gross Profit %</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sortedMatrix.map((row, idx) => (
                <tr key={idx}>
                  <td className="matrix-range">
                    {formatRangeMin(idx)}
                    {row.max === null
                      ? "+"
                      : ` – $${Number(row.max).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </td>
                  <td>
                    {row.max === null ? (
                      <span className="matrix-unlimited">∞</span>
                    ) : (
                      <input
                        type="number"
                        className="matrix-input"
                        step="1"
                        min="0"
                        value={row.max}
                        onChange={(e) => updateMatrixRow(idx, "max", e.target.value)}
                      />
                    )}
                  </td>
                  <td>
                    <input
                      type="number"
                      className="matrix-input"
                      step="0.1"
                      min="0"
                      value={row.markupPct}
                      onChange={(e) => updateMatrixRow(idx, "markupPct", e.target.value)}
                    />
                  </td>
                  <td className="matrix-gp">
                    {grossProfitPct(row.markupPct).toFixed(1)}%
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-remove"
                      onClick={() => removeMatrixRow(idx)}
                      disabled={sortedMatrix.length <= 1}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="settings-actions" style={{ marginTop: "0.75rem" }}>
          <button className="btn-small btn-secondary" onClick={addMatrixRow}>
            + Add Bracket
          </button>
          <button className="btn-small btn-secondary" onClick={resetMatrix}>
            Reset to Defaults
          </button>
        </div>
      </div>

      <div className="page-card settings-section" style={{ marginTop: "1rem" }}>
        <h3 className="settings-section-title">Load Default Data</h3>
        <p className="settings-section-desc">
          Populate your account with pre-built starter data. Each button adds
          to your existing records without removing anything.
        </p>
        <div className="settings-actions">
          <button
            className="btn-small btn-secondary"
            onClick={handleLoadDefaults}
            disabled={defaultsLoading}
          >
            {defaultsLoading ? "Loading…" : "Load Default Templates"}
          </button>
          <button
            className="btn-small btn-secondary"
            onClick={handleLoadDefaultInventory}
            disabled={inventoryLoading}
          >
            {inventoryLoading ? "Loading…" : "Load Default Inventory"}
          </button>
        </div>
      </div>

      <div
        className="page-card settings-section settings-danger-section"
        style={{ marginTop: "1rem" }}
      >
        <h3 className="settings-section-title">Data</h3>
        <p className="settings-section-desc">
          Permanently delete all saved quotes and history. This cannot be
          undone.
        </p>
        <div className="settings-actions">
          <button className="btn-small btn-danger-sm" onClick={onClearHistory}>
            Clear All History
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
