import { useState, useRef } from "react";
import { DEFAULT_RATES, saveJobTemplate, saveLibraryPart, repricePartsLibrary } from "../storage";
import { ACCENT_PRESETS } from "../utils/accentPresets";
import { DEFAULT_MARKUP_MATRIX, grossProfitPct } from "../utils/partsMarkup";
import { exportAllDataCSV, parseCSV } from "./CSVLoader";
import { formatPhoneInput } from "../utils/formatPhone";
import { TemplatePart } from "../types";

type TSettingsPageProps = {
  rates: typeof DEFAULT_RATES;
  onRatesChange: (rates: typeof DEFAULT_RATES) => void;
  businessInfo: {
    name: string;
    phone: string;
    address: string;
    logo: string;
    printMessage?: string;
  };
  onBusinessChange: (info: TSettingsPageProps["businessInfo"]) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  accent: string;
  onAccentChange: (accentId: string) => void;
  onClearHistory: () => void;
  onClearAllData: () => void;
  onToast?: (message: string, type?: "success" | "error") => void;
};

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
  onClearAllData,
  onToast,
}: TSettingsPageProps) {
  const [ratesSaved, setRatesSaved] = useState(false);
  const [bizSaved, setBizSaved] = useState(false);
  const [defaultsLoading, setDefaultsLoading] = useState(false);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [repriceLoading, setRepriceLoading] = useState(false);
  const [showWipeModal, setShowWipeModal] = useState(false);
  const [wipeExporting, setWipeExporting] = useState(false);
  const [wipeExported, setWipeExported] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleExportFirst = async () => {
    setWipeExporting(true);
    try {
      await exportAllDataCSV();
      setWipeExported(true);
    } finally {
      setWipeExporting(false);
    }
  };

  const handleWipeOpen = () => {
    setWipeExported(false);
    setShowWipeModal(true);
  };

  const handleRateChange = (field: string, value: string) => {
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
      const validRows = rows.filter((row: Record<string, string>) =>
        row["name"]?.trim(),
      );
      await Promise.all(
        validRows.map((row: Record<string, string>) => {
          let parts: TemplatePart[] = [];
          if (row["parts"]) {
            try {
              const p = JSON.parse(row["parts"]);
              if (Array.isArray(p)) parts = p;
            } catch {
              /* ignore */
            }
          }
          return saveJobTemplate({
            name: row["name"].trim(),
            description: row["description"] || "",
            laborHrs: Number(row["laborHrs"]) || 0,
            laborCost: Number(row["laborCost"]) || 0,
            parts,
          });
        }),
      );
      onToast?.(
        `Loaded ${validRows.length} default template${validRows.length !== 1 ? "s" : ""}.`,
      );
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
      const validRows = rows.filter((row: Record<string, string>) =>
        row["name"]?.trim(),
      );
      await Promise.all(
        validRows.map((row: Record<string, string>) =>
          saveLibraryPart({
            name: row["name"].trim(),
            partNumber: row["partNumber"] || "",
            cost: Number(row["cost"]) || 0,
            price: Number(row["price"]) || 0,
            msrp: Number(row["msrp"]) || 0,
            category: row["category"] || "",
            subcategory: row["subcategory"] || "",
            description: row["description"] || "",
          }),
        ),
      );
      onToast?.(
        `Loaded ${validRows.length} default part${validRows.length !== 1 ? "s" : ""}.`,
      );
    } catch {
      onToast?.("Failed to load default inventory.", "error");
    } finally {
      setInventoryLoading(false);
    }
  };

  const sortedMatrix = [
    ...(rates.partsMarkupMatrix || DEFAULT_MARKUP_MATRIX),
  ].sort((a, b) => {
    if (a.max === null) return 1;
    if (b.max === null) return -1;
    return a.max - b.max;
  });

  const updateMatrixRow = (
    displayIdx: number,
    field: string,
    rawValue: string,
  ) => {
    const value =
      field === "max" ?
        rawValue === "" ?
          null
        : Number(rawValue)
      : Number(rawValue) || 0;
    const updated = sortedMatrix.map((row, i) =>
      i === displayIdx ? { ...row, [field]: value } : row,
    );
    onRatesChange({ ...rates, partsMarkupMatrix: updated });
  };

  const addMatrixRow = () => {
    const finite = sortedMatrix.filter((r) => r.max !== null);
    const prevMax = finite.length > 0 ? finite[finite.length - 1].max : 0;
    const newRow = { max: (prevMax || 0) + 100, markupPct: 30 };
    const last = sortedMatrix.find((r) => r.max === null);
    onRatesChange({
      ...rates,
      partsMarkupMatrix: [...finite, newRow, ...(last ? [last] : [])],
    });
  };

  const removeMatrixRow = (displayIdx: number) => {
    if (sortedMatrix.length <= 1) return;
    let updated = sortedMatrix.filter((_, i) => i !== displayIdx);
    if (!updated.some((r) => r.max === null)) {
      updated = updated.map((r, i) =>
        i === updated.length - 1 ? { ...r, max: null } : r,
      );
    }
    onRatesChange({ ...rates, partsMarkupMatrix: updated });
  };

  const resetMatrix = () => {
    onRatesChange({ ...rates, partsMarkupMatrix: DEFAULT_MARKUP_MATRIX });
  };

  const handleRepriceInventory = async () => {
    setRepriceLoading(true);
    try {
      const count = await repricePartsLibrary(rates.partsMarkupMatrix);
      onToast?.(
        count > 0
          ? `Repriced ${count} part${count !== 1 ? "s" : ""} using the current matrix.`
          : "No parts to reprice (all have menu pricing or no cost set).",
      );
    } finally {
      setRepriceLoading(false);
    }
  };

  const formatRangeMin = (idx: number) => {
    if (idx === 0) return "$0.01";
    const prev = sortedMatrix[idx - 1].max || 0;
    return `$${(prev + 0.01).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleRatesSave = () => {
    setRatesSaved(true);
    setTimeout(() => setRatesSaved(false), 2000);
  };

  const setBiz = (field: string, value: string) => {
    onBusinessChange({ ...businessInfo, [field]: value });
    setBizSaved(false);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === "string") {
        onBusinessChange({ ...businessInfo, logo: result });
        setBizSaved(false);
      }
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
        <div
          className="settings-appearance-row"
          style={{ marginTop: "1rem" }}
        >
          <span className="settings-appearance-label">Accent Color</span>
        </div>
        <div className="accent-swatch-row">
          {ACCENT_PRESETS.map((preset) => (
            <button
              type="button"
              key={preset.id}
              className={`accent-swatch${accent === preset.id ? " active" : ""}`}
              style={{ "--swatch-color": preset.swatch } as React.CSSProperties}
              onClick={() => onAccentChange(preset.id)}
              title={preset.name}
              aria-label={preset.name}
            />
          ))}
        </div>
      </div>

      <div
        className="page-card settings-section"
        style={{ marginTop: "1rem" }}
      >
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
                onClick={() => logoInputRef.current?.click()}
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
                aria-label="Upload business logo image file"
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
        <br/>
        <div className="settings-actions">
          <button
            className="btn-small btn-success"
            onClick={handleBizSave}
          >
            {bizSaved ? "Saved!" : "Save"}
          </button>
        </div>
      </div>

      <div
        className="page-card settings-section"
        style={{ marginTop: "1rem" }}
      >
        <h3 className="settings-section-title">Global Rates</h3>
        <p className="settings-section-desc">
          These defaults apply to all new quotes. Rates saved with a quote are
          preserved when you reload it.
        </p>
        <div className="settings-rates-grid">
          <div className="lib-form-group">
            <label>Tax Rate (%)</label>
            <input
              aria-label="Tax Rate Percentage"
              type="number"
              step="0.01"
              value={rates.taxRate}
              onChange={(e) => handleRateChange("taxRate", e.target.value)}
            />
          </div>
          <div className="lib-form-group">
            <label>Labor Rate ($/hr)</label>
            <input
              aria-label="Labor rate in dollars per hour"
              type="number"
              step="0.01"
              value={rates.laborRate}
              onChange={(e) => handleRateChange("laborRate", e.target.value)}
            />
          </div>
          <div className="lib-form-group">
            <label>Shop Supplies Rate (%)</label>
            <input
              aria-label="Shop supplies percentage rate"
              type="number"
              step="0.01"
              value={rates.ssRate}
              onChange={(e) => handleRateChange("ssRate", e.target.value)}
            />
          </div>
          <div className="lib-form-group">
            <label>Shop Supplies Max ($)</label>
            <input
              aria-label="Maximum shop supplies charge in dollars"
              type="number"
              step="0.01"
              value={rates.ssMax}
              onChange={(e) => handleRateChange("ssMax", e.target.value)}
            />
          </div>
        </div>
        <div className="settings-actions">
          <button
            className="btn-small btn-secondary"
            onClick={handleReset}
          >
            Reset to Defaults
          </button>
          <button
            className="btn-small btn-success"
            onClick={handleRatesSave}
          >
            {ratesSaved ? "Saved!" : "Save"}
          </button>
        </div>
      </div>
      <div
        className="page-card settings-section"
        style={{ marginTop: "1rem" }}
      >
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
                    {row.max === null ?
                      "+"
                    : ` – $${Number(row.max).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    }
                  </td>
                  <td>
                    {row.max === null ?
                      <span className="matrix-unlimited">∞</span>
                    : <input
                        aria-label="Maximum cost for this markup tier in dollars"
                        type="number"
                        className="matrix-input"
                        step="1"
                        min="0"
                        value={row.max}
                        onChange={(e) =>
                          updateMatrixRow(idx, "max", e.target.value)
                        }
                      />
                    }
                  </td>
                  <td>
                    <input
                      aria-label="Markup percentage for this tier"
                      type="number"
                      className="matrix-input"
                      step="0.1"
                      min="0"
                      value={row.markupPct}
                      onChange={(e) =>
                        updateMatrixRow(idx, "markupPct", e.target.value)
                      }
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
        <div
          className="settings-actions"
          style={{ marginTop: "0.75rem" }}
        >
          <button
            className="btn-small btn-secondary"
            onClick={addMatrixRow}
          >
            + Add Bracket
          </button>
          <button
            className="btn-small btn-secondary"
            onClick={resetMatrix}
          >
            Reset to Defaults
          </button>
        </div>
        <div className="settings-reprice-row">
          <button
            type="button"
            className="btn-small btn-success"
            onClick={handleRepriceInventory}
            disabled={repriceLoading}
          >
            {repriceLoading ? "Repricing…" : "Apply to Inventory"}
          </button>
          <span className="settings-reprice-hint">
            Recalculates sell prices for all non-menu-priced parts using the current matrix.
          </span>
        </div>
      </div>

      <div
        className="page-card settings-section"
        style={{ marginTop: "1rem" }}
      >
        <h3 className="settings-section-title">Load Default Data</h3>
        <p className="settings-section-desc">
          Populate your account with pre-built starter data. Each button adds to
          your existing records without removing anything.
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
          Permanently delete saved quotes and history, or wipe all data from
          this device.
        </p>
        <div className="settings-actions">
          <button
            className="btn-small btn-danger-sm"
            onClick={onClearHistory}
          >
            Clear Quote History
          </button>
          <button
            className="btn-small btn-danger-sm"
            onClick={handleWipeOpen}
          >
            Delete All Data
          </button>
        </div>
      </div>

      {showWipeModal && (
        <div
          className="modal-overlay show"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowWipeModal(false);
          }}
        >
          <div className="modal wipe-modal">
            <h3>Delete All Data?</h3>
            <p>
              This will permanently erase all quotes, customers, inventory,
              templates, tasks, and settings from this device. This action
              cannot be undone.
            </p>
            <div className="wipe-export-row">
              <button
                type="button"
                className={`btn-small btn-secondary${wipeExported ? " wipe-exported" : ""}`}
                onClick={handleExportFirst}
                disabled={wipeExporting}
              >
                {wipeExporting ?
                  "Exporting…"
                : wipeExported ?
                  "✓ Data Exported"
                : "Export Data First"}
              </button>
              <span className="wipe-export-hint">
                Downloads a CSV backup of your inventory, templates, and
                customers.
              </span>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowWipeModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={onClearAllData}
              >
                Delete Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingsPage;
