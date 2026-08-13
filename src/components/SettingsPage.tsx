import { useState, useRef } from "react";
import {
  DEFAULT_RATES,
  saveJobTemplate,
  saveLibraryPart,
  repricePartsLibrary,
} from "../storage";
import { ACCENT_PRESETS } from "../utils/accentPresets";
import CustomThemeEditor from "./CustomThemeEditor";
import type { CustomTheme } from "../utils/customTheme";
import { DEFAULT_MARKUP_MATRIX, grossProfitPct } from "../utils/partsMarkup";
import { parseCSV } from "./CSVLoader";
import { downloadBackup, restoreBackup } from "../utils/backupData";
import WarrantyPoliciesEditor from "./WarrantyPoliciesEditor";
import { formatPhoneInput } from "../utils/formatPhone";
import {
  DAY_NAMES,
  DEFAULT_STORE_HOURS,
  minutesToTimeInput,
  normalizeStoreHours,
  timeInputToMinutes,
} from "../utils/storeHours";
import { JobCategory, TemplatePart, StoreHours } from "../types";

type TSettingsPageProps = {
  rates: typeof DEFAULT_RATES;
  onRatesChange: (rates: typeof DEFAULT_RATES) => void;
  businessInfo: {
    name: string;
    phone: string;
    address: string;
    logo: string;
    printMessage?: string;
    workOrderDisclaimer?: string;
    invoiceWarranty?: string;
    storeHours?: StoreHours;
  };
  onBusinessChange: (info: TSettingsPageProps["businessInfo"]) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  accent: string;
  onAccentChange: (accentId: string) => void;
  customTheme: CustomTheme | null;
  onCustomThemeSave: (theme: CustomTheme) => void;
  onClearHistory: () => void;
  onClearAllData: () => void;
  onToast?: (message: string, type?: "success" | "error") => void;
};

type SettingsTab = "appearance" | "business" | "rates" | "policies" | "data";

const SETTINGS_TABS: { id: SettingsTab; label: string }[] = [
  { id: "appearance", label: "Appearance" },
  { id: "business",   label: "Business" },
  { id: "rates",      label: "Rates" },
  { id: "policies",   label: "Warranty" },
  { id: "data",       label: "Data" },
];

function SettingsPage({
  rates,
  onRatesChange,
  businessInfo,
  onBusinessChange,
  isDark,
  onToggleTheme,
  accent,
  onAccentChange,
  customTheme,
  onCustomThemeSave,
  onClearHistory,
  onClearAllData,
  onToast,
}: TSettingsPageProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("appearance");
  const [showCustomEditor, setShowCustomEditor] = useState(false);
  const [ratesSaved, setRatesSaved] = useState(false);
  const [bizSaved, setBizSaved] = useState(false);
  const [defaultsLoading, setDefaultsLoading] = useState(false);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [repriceLoading, setRepriceLoading] = useState(false);
  const [showWipeModal, setShowWipeModal] = useState(false);
  const [wipeExporting, setWipeExporting] = useState(false);
  const [wipeExported, setWipeExported] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  // ── Backup / Restore ────────────────────────────────────────────────────────

  const handleBackup = async () => {
    setBackingUp(true);
    try {
      await downloadBackup();
      onToast?.("Backup downloaded.");
    } catch {
      onToast?.("Backup failed.", "error");
    } finally {
      setBackingUp(false);
    }
  };

  const handleExportFirst = async () => {
    setWipeExporting(true);
    try {
      await downloadBackup();
      setWipeExported(true);
    } finally {
      setWipeExporting(false);
    }
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (!window.confirm("Restoring a backup will overwrite all current data. Continue?")) return;
    setRestoring(true);
    try {
      const counts = await restoreBackup(file);
      onToast?.(
        `Backup restored — ${counts.customers} customers, ${counts.vehicles} vehicles, ${counts.vendors} vendors, ${counts.inventory} parts, ${counts.templates} templates.`,
      );
      setTimeout(() => window.location.reload(), 1200);
    } catch {
      onToast?.("Restore failed. Make sure the file is a valid backup .zip.", "error");
    } finally {
      setRestoring(false);
    }
  };

  // ── Rates ────────────────────────────────────────────────────────────────────

  const handleRateChange = (field: string, value: string) => {
    onRatesChange({ ...rates, [field]: Number(value) });
    setRatesSaved(false);
  };

  const handleRatesReset = () => {
    onRatesChange({ ...DEFAULT_RATES });
    setRatesSaved(false);
  };

  const handleRatesSave = () => {
    setRatesSaved(true);
    setTimeout(() => setRatesSaved(false), 2000);
  };

  // ── Markup matrix ────────────────────────────────────────────────────────────

  const sortedMatrix = [...(rates.partsMarkupMatrix || DEFAULT_MARKUP_MATRIX)].sort((a, b) => {
    if (a.max === null) return 1;
    if (b.max === null) return -1;
    return a.max - b.max;
  });

  const updateMatrixRow = (displayIdx: number, field: string, rawValue: string) => {
    const value = field === "max"
      ? rawValue === "" ? null : Number(rawValue)
      : Number(rawValue) || 0;
    const updated = sortedMatrix.map((row, i) => i === displayIdx ? { ...row, [field]: value } : row);
    onRatesChange({ ...rates, partsMarkupMatrix: updated });
  };

  const addMatrixRow = () => {
    const finite = sortedMatrix.filter((r) => r.max !== null);
    const prevMax = finite.length > 0 ? finite[finite.length - 1].max : 0;
    const newRow = { max: (prevMax || 0) + 100, markupPct: 30 };
    const last = sortedMatrix.find((r) => r.max === null);
    onRatesChange({ ...rates, partsMarkupMatrix: [...finite, newRow, ...(last ? [last] : [])] });
  };

  const removeMatrixRow = (displayIdx: number) => {
    if (sortedMatrix.length <= 1) return;
    let updated = sortedMatrix.filter((_, i) => i !== displayIdx);
    if (!updated.some((r) => r.max === null)) {
      updated = updated.map((r, i) => i === updated.length - 1 ? { ...r, max: null } : r);
    }
    onRatesChange({ ...rates, partsMarkupMatrix: updated });
  };

  const resetMatrix = () => onRatesChange({ ...rates, partsMarkupMatrix: DEFAULT_MARKUP_MATRIX });

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

  // ── Business ─────────────────────────────────────────────────────────────────

  const setBiz = (field: string, value: string) => {
    onBusinessChange({ ...businessInfo, [field]: value });
    setBizSaved(false);
  };

  const storeHours = normalizeStoreHours(businessInfo.storeHours);

  const setStoreDay = (index: number, patch: Partial<StoreHours[number]>) => {
    onBusinessChange({
      ...businessInfo,
      storeHours: storeHours.map((d, i) => (i === index ? { ...d, ...patch } : d)),
    });
    setBizSaved(false);
  };

  /** Copy one day's window onto every other open day. */
  const applyHoursToAllDays = (index: number) => {
    const { open, close } = storeHours[index];
    onBusinessChange({
      ...businessInfo,
      storeHours: storeHours.map((d) => ({ ...d, open, close })),
    });
    setBizSaved(false);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === "string") {
        onBusinessChange({ ...businessInfo, logo: ev.target.result });
        setBizSaved(false);
      }
    };
    reader.readAsDataURL(files[0]);
  };

  const handleBizSave = () => {
    setBizSaved(true);
    setTimeout(() => setBizSaved(false), 2000);
  };

  // ── Defaults ─────────────────────────────────────────────────────────────────

  const handleLoadDefaults = async () => {
    setDefaultsLoading(true);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}templates.csv`);
      if (!res.ok) throw new Error("fetch failed");
      const { rows } = parseCSV(await res.text());
      const valid = rows.filter((r: Record<string, string>) => r["name"]?.trim());
      await Promise.all(valid.map((row: Record<string, string>) => {
        let parts: TemplatePart[] = [];
        if (row["parts"]) { try { const p = JSON.parse(row["parts"]); if (Array.isArray(p)) parts = p; } catch { /* ignore */ } }
        return saveJobTemplate({
          name: row["name"].trim(),
          description: row["description"] || "",
          laborHrs: Number(row["laborHrs"]) || 0,
          laborCost: Number(row["laborCost"]) || 0,
          parts,
          mileageInterval: Number(row["mileageInterval"]) || 0,
          quickJob: row["quickJob"] === "true",
          jobCategory: (row["jobCategory"] as JobCategory) || undefined,
        });
      }));
      onToast?.(`Loaded ${valid.length} default template${valid.length !== 1 ? "s" : ""}.`);
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
      const { rows } = parseCSV(await res.text());
      const valid = rows.filter((r: Record<string, string>) => r["name"]?.trim());
      await Promise.all(valid.map((row: Record<string, string>) => saveLibraryPart({
        name: row["name"].trim(),
        partNumber: row["partNumber"] || "",
        cost: Number(row["cost"]) || 0,
        price: Number(row["price"]) || 0,
        msrp: Number(row["msrp"]) || 0,
        category: row["category"] || "",
        subcategory: row["subcategory"] || "",
        description: row["description"] || "",
      })));
      onToast?.(`Loaded ${valid.length} default part${valid.length !== 1 ? "s" : ""}.`);
    } catch {
      onToast?.("Failed to load default inventory.", "error");
    } finally {
      setInventoryLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Settings</h2>
      </div>

      <nav className="section-tabs" aria-label="Settings sections">
        {SETTINGS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`section-tab${activeTab === tab.id ? " section-tab--active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* ── Appearance ── */}
      {activeTab === "appearance" && (
        <div className="page-card settings-section">
          <h3 className="settings-section-title">Appearance</h3>
          <div className="settings-appearance-row">
            <span className="settings-appearance-label">Dark Mode</span>
            <div
              className={`toggle-switch${isDark ? " active" : ""}`}
              onClick={onToggleTheme}
              aria-label="Dark mode"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" || e.key === " " ? onToggleTheme() : undefined}
            />
          </div>
          <div className="settings-appearance-row settings-mt">
            <span className="settings-appearance-label">Accent Color</span>
          </div>
          <div className="accent-swatch-row">
            {ACCENT_PRESETS.map((preset) => (
              <button
                type="button"
                key={preset.id}
                className={`accent-swatch${accent === preset.id ? " active" : ""}`}
                style={{ "--swatch-color": preset.swatch } as React.CSSProperties}
                onClick={() => { onAccentChange(preset.id); setShowCustomEditor(false); }}
                title={preset.name}
                aria-label={preset.name}
              />
            ))}
            {customTheme && (
              <button
                type="button"
                className={`accent-swatch${accent === "custom" ? " active" : ""}`}
                style={{ "--swatch-color": customTheme.swatch } as React.CSSProperties}
                onClick={() => { onAccentChange("custom"); setShowCustomEditor(false); }}
                title="Custom Theme"
                aria-label="Custom Theme"
              />
            )}
            <button
              type="button"
              className="accent-swatch-edit-btn"
              onClick={() => setShowCustomEditor((v) => !v)}
              title={customTheme ? "Edit custom theme" : "Create custom theme"}
              aria-label={customTheme ? "Edit custom theme" : "Create custom theme"}
            >
              {showCustomEditor ? "×" : customTheme ? "✎" : "+"}
            </button>
          </div>
          {showCustomEditor && (
            <CustomThemeEditor
              isDark={isDark}
              existing={customTheme}
              onSave={(theme) => {
                onCustomThemeSave(theme);
                setShowCustomEditor(false);
              }}
              onCancel={() => setShowCustomEditor(false)}
            />
          )}
        </div>
      )}

      {/* ── Business ── */}
      {activeTab === "business" && (
        <div className="page-card settings-section">
          <h3 className="settings-section-title">Business Information</h3>
          <p className="settings-section-desc">Appears in the header of printed quotes.</p>
          <div className="biz-form">
            <div className="biz-logo-row">
              <div className="biz-logo-preview">
                {businessInfo.logo
                  ? <img src={businessInfo.logo} alt="Logo" className="biz-logo-img" />
                  : <span className="biz-logo-placeholder">No logo</span>}
              </div>
              <div className="biz-logo-actions">
                <button type="button" className="btn-small btn-secondary" onClick={() => logoInputRef.current?.click()}>
                  {businessInfo.logo ? "Change Logo" : "Upload Logo"}
                </button>
                {businessInfo.logo && (
                  <button type="button" className="btn-small btn-danger-sm" onClick={() => setBiz("logo", "")}>
                    Remove
                  </button>
                )}
                <input
                  aria-label="Upload business logo image file"
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden-file-input"
                  onChange={handleLogoUpload}
                />
              </div>
            </div>
            <div className="lib-form-group">
              <label>Business Name</label>
              <input type="text" placeholder="Your Shop Name" value={businessInfo.name} onChange={(e) => setBiz("name", e.target.value)} />
            </div>
            <div className="lib-form-group">
              <label>Phone</label>
              <input type="tel" placeholder="Business phone" value={businessInfo.phone} onChange={(e) => setBiz("phone", formatPhoneInput(e.target.value))} />
            </div>
            <div className="lib-form-group">
              <label>Address</label>
              <textarea className="lib-textarea" placeholder="Street, City, State ZIP" value={businessInfo.address} onChange={(e) => setBiz("address", e.target.value)} />
            </div>
            <div className="lib-form-group">
              <label>Print Message</label>
              <textarea
                className="lib-textarea"
                placeholder={`e.g. "Thank you for choosing ${businessInfo.name || "our shop"}!"`}
                value={businessInfo?.printMessage || `Thank you for choosing ${businessInfo.name || "our shop"}! We appreciate your business.`}
                onChange={(e) => setBiz("printMessage", e.target.value)}
              />
            </div>
            <div className="lib-form-group">
              <label>Work Order Disclaimer</label>
              <textarea
                className="lib-textarea"
                rows={5}
                placeholder={`Authorization text printed above the signature line on work orders, e.g. "I hereby authorize the above repair work and necessary materials. I grant permission to operate the vehicle for testing or inspection and acknowledge a mechanic's lien on the vehicle to secure repair costs..."`}
                value={businessInfo?.workOrderDisclaimer ?? ""}
                onChange={(e) => setBiz("workOrderDisclaimer", e.target.value)}
              />
            </div>
            <div className="lib-form-group">
              <label>Invoice Warranty</label>
              <textarea
                className="lib-textarea"
                rows={4}
                placeholder={`Warranty text printed above the signature line on invoices, e.g. "All repairs except where otherwise stated carry a 12 month, 12,000 mile warranty covering material defect or improper installation..."`}
                value={businessInfo?.invoiceWarranty ?? ""}
                onChange={(e) => setBiz("invoiceWarranty", e.target.value)}
              />
            </div>
          </div>
          <div className="settings-actions settings-mt">
            <button type="button" className="btn-small btn-success" onClick={handleBizSave}>
              {bizSaved ? "Saved!" : "Save"}
            </button>
          </div>

          <h3 className="settings-section-title settings-mt">Store Hours</h3>
          <p className="settings-section-desc">
            Appointments can only be booked while you're open, and promised-by
            times are estimated by counting billed labor hours against this
            schedule.
          </p>
          <div className="store-hours">
            {storeHours.map((day, i) => (
              <div
                key={DAY_NAMES[i]}
                className={`store-hours-row${day.closed ? " store-hours-row--closed" : ""}`}
              >
                <label className="store-hours-day">
                  <input
                    type="checkbox"
                    checked={!day.closed}
                    onChange={(e) => setStoreDay(i, { closed: !e.target.checked })}
                  />
                  <span>{DAY_NAMES[i]}</span>
                </label>
                {day.closed ? (
                  <span className="store-hours-closed">Closed</span>
                ) : (
                  <div className="store-hours-times">
                    <input
                      type="time"
                      aria-label={`${DAY_NAMES[i]} opening time`}
                      value={minutesToTimeInput(day.open)}
                      onChange={(e) =>
                        setStoreDay(i, {
                          open: timeInputToMinutes(e.target.value, day.open),
                        })
                      }
                    />
                    <span className="store-hours-sep">to</span>
                    <input
                      type="time"
                      aria-label={`${DAY_NAMES[i]} closing time`}
                      value={minutesToTimeInput(day.close)}
                      onChange={(e) =>
                        setStoreDay(i, {
                          close: timeInputToMinutes(e.target.value, day.close),
                        })
                      }
                    />
                    <button
                      type="button"
                      className="btn-small btn-secondary"
                      title="Use these hours every day"
                      onClick={() => applyHoursToAllDays(i)}
                    >
                      Apply to all
                    </button>
                  </div>
                )}
                {!day.closed && day.close <= day.open && (
                  <span className="store-hours-warning">
                    Closing time must be after opening.
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="settings-actions settings-mt">
            <button
              type="button"
              className="btn-small btn-secondary"
              onClick={() =>
                onBusinessChange({ ...businessInfo, storeHours: DEFAULT_STORE_HOURS })
              }
            >
              Reset to Default Hours
            </button>
            <button type="button" className="btn-small btn-success" onClick={handleBizSave}>
              {bizSaved ? "Saved!" : "Save"}
            </button>
          </div>
        </div>
      )}

      {/* ── Rates ── */}
      {activeTab === "rates" && (
        <>
          <div className="page-card settings-section">
            <h3 className="settings-section-title">Global Rates</h3>
            <p className="settings-section-desc">
              These defaults apply to all new quotes. Rates saved with a quote are preserved when you reload it.
            </p>
            <div className="settings-rates-grid">
              <div className="lib-form-group">
                <label>Tax Rate (%)</label>
                <input aria-label="Tax Rate Percentage" type="number" step="0.01" value={rates.taxRate} onChange={(e) => handleRateChange("taxRate", e.target.value)} />
              </div>
              <div className="lib-form-group">
                <label>Labor Rate ($/hr)</label>
                <input aria-label="Labor rate in dollars per hour" type="number" step="0.01" value={rates.laborRate} onChange={(e) => handleRateChange("laborRate", e.target.value)} />
              </div>
              <div className="lib-form-group">
                <label>Shop Supplies Rate (%)</label>
                <input aria-label="Shop supplies percentage rate" type="number" step="0.01" value={rates.ssRate} onChange={(e) => handleRateChange("ssRate", e.target.value)} />
              </div>
              <div className="lib-form-group">
                <label>Shop Supplies Max ($)</label>
                <input aria-label="Maximum shop supplies charge in dollars" type="number" step="0.01" value={rates.ssMax} onChange={(e) => handleRateChange("ssMax", e.target.value)} />
              </div>
            </div>
            <div className="settings-actions">
              <button type="button" className="btn-small btn-secondary" onClick={handleRatesReset}>Reset to Defaults</button>
              <button type="button" className="btn-small btn-success" onClick={handleRatesSave}>{ratesSaved ? "Saved!" : "Save"}</button>
            </div>
          </div>

          <div className="page-card settings-section settings-mt-card">
            <h3 className="settings-section-title">Parts Markup Matrix</h3>
            <p className="settings-section-desc">
              Sell price is calculated bracket-by-bracket (like marginal tax): each slice of cost in a tier gets that tier's markup rate, and the results are summed.
            </p>
            <div className="markup-matrix-wrap">
              <table className="markup-matrix-table">
                <thead>
                  <tr>
                    <th>Cost Range</th>
                    <th>Up To ($)</th>
                    <th>Markup %</th>
                    <th>Gross Profit %</th>
                    <th><span className="sr-only">Remove</span></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedMatrix.map((row, idx) => (
                    <tr key={idx}>
                      <td className="matrix-range">
                        {formatRangeMin(idx)}
                        {row.max === null ? "+" : ` – $${Number(row.max).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      </td>
                      <td data-label="Up To ($)">
                        {row.max === null
                          ? <span className="matrix-unlimited">∞</span>
                          : <input aria-label="Maximum cost for this markup tier in dollars" type="number" className="matrix-input" step="1" min="0" value={row.max} onChange={(e) => updateMatrixRow(idx, "max", e.target.value)} />}
                      </td>
                      <td data-label="Markup %">
                        <input aria-label="Markup percentage for this tier" type="number" className="matrix-input" step="0.1" min="0" value={row.markupPct} onChange={(e) => updateMatrixRow(idx, "markupPct", e.target.value)} />
                      </td>
                      <td className="matrix-gp" data-label="GP %">
                        {grossProfitPct(row.markupPct).toFixed(1)}%
                      </td>
                      <td className="matrix-remove-cell">
                        <button type="button" className="btn-remove" onClick={() => removeMatrixRow(idx)} disabled={sortedMatrix.length <= 1}>×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="settings-actions settings-mt-sm">
              <button type="button" className="btn-small btn-secondary" onClick={addMatrixRow}>+ Add Bracket</button>
              <button type="button" className="btn-small btn-secondary" onClick={resetMatrix}>Reset to Defaults</button>
            </div>
            <div className="settings-reprice-row">
              <button type="button" className="btn-small btn-success" onClick={handleRepriceInventory} disabled={repriceLoading}>
                {repriceLoading ? "Repricing…" : "Apply to Inventory"}
              </button>
              <span className="settings-reprice-hint">Recalculates sell prices for all non-menu-priced parts using the current matrix.</span>
            </div>
          </div>
        </>
      )}

      {/* ── Policies ── */}
      {activeTab === "policies" && (
        <div className="page-card settings-section">
          <h3 className="settings-section-title">Warranty Policies</h3>
          <p className="settings-section-desc">
            Define proration tiers for warranty calculations. Policies can match a part category so they are auto-selected when looking up a part in the Proration Calculator.
          </p>
          <WarrantyPoliciesEditor onToast={onToast} />
        </div>
      )}

      {/* ── Data ── */}
      {activeTab === "data" && (
        <>
          <div className="page-card settings-section">
            <h3 className="settings-section-title">Default Data</h3>
            <p className="settings-section-desc">
              Populate your account with pre-built starter data. Each button adds to your existing records without removing anything.
            </p>
            <div className="settings-actions">
              <button type="button" className="btn-small btn-secondary" onClick={handleLoadDefaults} disabled={defaultsLoading}>
                {defaultsLoading ? "Loading…" : "Load Default Templates"}
              </button>
              <button type="button" className="btn-small btn-secondary" onClick={handleLoadDefaultInventory} disabled={inventoryLoading}>
                {inventoryLoading ? "Loading…" : "Load Default Inventory"}
              </button>
            </div>
          </div>

          <div className="page-card settings-section settings-mt-card">
            <h3 className="settings-section-title">Backup & Restore</h3>
            <p className="settings-section-desc">
              Download a full backup of all your data, or restore from a previous backup.
            </p>
            <div className="settings-actions">
              <button type="button" className="btn-small btn-secondary" onClick={handleBackup} disabled={backingUp}>
                {backingUp ? "Backing up…" : "Download Backup (.zip)"}
              </button>
              <button type="button" className="btn-small btn-secondary" onClick={() => restoreInputRef.current?.click()} disabled={restoring}>
                {restoring ? "Restoring…" : "Restore Backup (.zip)"}
              </button>
              <input ref={restoreInputRef} type="file" accept=".zip" aria-label="Select backup zip file to restore" className="hidden-file-input" onChange={handleRestoreFile} />
            </div>
          </div>

          <div className="page-card settings-section settings-danger-section settings-mt-card">
            <h3 className="settings-section-title">Danger Zone</h3>
            <p className="settings-section-desc">Permanently delete saved quotes or wipe all data from this device.</p>
            <div className="settings-actions">
              <button type="button" className="btn-small btn-danger-sm" onClick={onClearHistory}>Clear Quote History</button>
              <button type="button" className="btn-small btn-danger-sm" onClick={() => { setWipeExported(false); setShowWipeModal(true); }}>Delete All Data</button>
            </div>
          </div>
        </>
      )}

      {/* ── Wipe modal ── */}
      {showWipeModal && (
        <div className="modal-overlay show" onClick={(e) => { if (e.target === e.currentTarget) setShowWipeModal(false); }}>
          <div className="modal wipe-modal">
            <h3>Delete All Data?</h3>
            <p>This will permanently erase all quotes, customers, inventory, templates, tasks, and settings from this device. This action cannot be undone.</p>
            <div className="wipe-export-row">
              <button
                type="button"
                className={`btn-small btn-secondary${wipeExported ? " wipe-exported" : ""}`}
                onClick={handleExportFirst}
                disabled={wipeExporting}
              >
                {wipeExporting ? "Exporting…" : wipeExported ? "✓ Data Exported" : "Export Data First"}
              </button>
              <span className="wipe-export-hint">Downloads a full backup .zip before deleting.</span>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowWipeModal(false)}>Cancel</button>
              <button type="button" className="btn-danger" onClick={onClearAllData}>Delete Everything</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingsPage;
