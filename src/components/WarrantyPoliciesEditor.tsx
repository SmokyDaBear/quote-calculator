import { useState, useEffect } from "react";
import { getWarrantyPolicies, saveWarrantyPolicies, DEFAULT_WARRANTY_POLICIES } from "../storage";
import { CATEGORY_NAMES, getSubcategories } from "../utils/partCategories";
import type { WarrantyPolicy, WarrantyTier } from "../types/index";

function newTier(): WarrantyTier {
  return {
    id: crypto.randomUUID(),
    label: "",
    maxMonths: null,
    maxMiles: null,
    partsPct: 100,
    laborPct: 0,
  };
}

function newPolicy(): WarrantyPolicy {
  return {
    id: crypto.randomUUID(),
    label: "New Policy",
    category: "",
    subcategory: [],
    tiers: [newTier()],
    swapMaxMonths: null,
    billOutMultiplier: 1.0,
    billOutMaxMonths: null,
  };
}

function numOrNull(val: string): number | null {
  const n = parseFloat(val);
  return isNaN(n) || val.trim() === "" ? null : n;
}

export default function WarrantyPoliciesEditor({
  onToast,
}: {
  onToast?: (msg: string, type?: "success" | "error") => void;
}) {
  const [policies, setPolicies] = useState<WarrantyPolicy[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getWarrantyPolicies().then((p) => {
      setPolicies(p);
      if (p.length > 0) setSelectedId(p[0].id);
    });
  }, []);

  const selected = policies.find((p) => p.id === selectedId) ?? null;

  const handleSave = async () => {
    await saveWarrantyPolicies(policies);
    setSaved(true);
    onToast?.("Warranty policies saved.");
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    if (!window.confirm("Reset all warranty policies to defaults?")) return;
    setPolicies(DEFAULT_WARRANTY_POLICIES);
    setSelectedId(DEFAULT_WARRANTY_POLICIES[0]?.id ?? null);
  };

  const addPolicy = () => {
    const p = newPolicy();
    setPolicies((prev) => [...prev, p]);
    setSelectedId(p.id);
  };

  const removePolicy = (id: string) => {
    if (!window.confirm("Remove this policy?")) return;
    setPolicies((prev) => {
      const next = prev.filter((p) => p.id !== id);
      if (selectedId === id) setSelectedId(next[0]?.id ?? null);
      return next;
    });
  };

  const updateSelected = (patch: Partial<WarrantyPolicy>) => {
    if (!selectedId) return;
    setPolicies((prev) => prev.map((p) => p.id === selectedId ? { ...p, ...patch } : p));
  };

  const updateTier = (tierId: string, patch: Partial<WarrantyTier>) => {
    if (!selected) return;
    updateSelected({
      tiers: selected.tiers.map((t) => t.id === tierId ? { ...t, ...patch } : t),
    });
  };

  const addTier = () => {
    if (!selected) return;
    updateSelected({ tiers: [...selected.tiers, newTier()] });
  };

  const removeTier = (tierId: string) => {
    if (!selected) return;
    updateSelected({ tiers: selected.tiers.filter((t) => t.id !== tierId) });
  };

  return (
    <div className="wpe-wrap">
      <div className="wpe-layout">

        {/* ── Policy list (left/top) ── */}
        <aside className="wpe-policy-list">
          {policies.map((p) => (
            <div key={p.id} className={`wpe-list-item${selectedId === p.id ? " active" : ""}`}>
              <button
                type="button"
                className="wpe-list-item-btn"
                onClick={() => setSelectedId(p.id)}
              >
                <span className="wpe-list-item-label">{p.label || "Unnamed"}</span>
                {p.category && (
                  <span className="wpe-list-item-cat">{p.category}</span>
                )}
              </button>
              <button
                type="button"
                className="wpe-list-item-delete"
                onClick={() => removePolicy(p.id)}
                aria-label={`Remove ${p.label}`}
                title="Remove policy"
              >
                ×
              </button>
            </div>
          ))}
          <button type="button" className="wpe-list-add" onClick={addPolicy}>
            + New Policy
          </button>
        </aside>

        {/* ── Edit panel (right/bottom) ── */}
        <div className="wpe-edit-panel">
          {selected ? (
            <>
              <div className="wpe-edit-header">
                <h4 className="wpe-edit-title">{selected.label || "Unnamed Policy"}</h4>
                <div className="settings-actions">
                  <button type="button" className="btn-small btn-secondary" onClick={handleReset}>
                    Reset Defaults
                  </button>
                  <button type="button" className="btn-small btn-success" onClick={handleSave}>
                    {saved ? "Saved!" : "Save"}
                  </button>
                </div>
              </div>

              {/* Name */}
              <div className="lib-form-group">
                <label>Policy Name</label>
                <input
                  aria-label="Policy name"
                  type="text"
                  placeholder="e.g. Batteries"
                  value={selected.label}
                  onChange={(e) => updateSelected({ label: e.target.value })}
                />
              </div>

              {/* Category & Subcategories */}
              <div className="wpe-policy-meta">
                <div className="lib-form-group wpe-meta-field">
                  <label>Part Category</label>
                  <select
                    aria-label="Part category"
                    value={selected.category}
                    onChange={(e) => updateSelected({ category: e.target.value, subcategory: [] })}
                  >
                    <option value="">— Any / None —</option>
                    {CATEGORY_NAMES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {selected.category && (
                  <div className="lib-form-group wpe-meta-field wpe-subcats-field">
                    <label>
                      Subcategories
                      <span className="wpe-optional"> (leave empty to match any)</span>
                    </label>
                    <div className="wpe-subcat-list">
                      {getSubcategories(selected.category).map((sub) => {
                        const checked = selected.subcategory.includes(sub);
                        return (
                          <label key={sub} className="wpe-subcat-item">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                const next = checked
                                  ? selected.subcategory.filter((s) => s !== sub)
                                  : [...selected.subcategory, sub];
                                updateSelected({ subcategory: next });
                              }}
                            />
                            <span>{sub}</span>
                          </label>
                        );
                      })}
                    </div>
                    {selected.subcategory.length > 0 && (
                      <button
                        type="button"
                        className="wpe-subcat-clear"
                        onClick={() => updateSelected({ subcategory: [] })}
                      >
                        Clear selection
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Bill-out config */}
              <div className="wpe-policy-config">
                <div className="lib-form-group wpe-config-field">
                  <label>Swap Period (months)</label>
                  <input
                    aria-label="Swap period in months"
                    type="number"
                    min="0"
                    placeholder="none"
                    value={selected.swapMaxMonths ?? ""}
                    onChange={(e) => updateSelected({ swapMaxMonths: numOrNull(e.target.value) })}
                  />
                </div>
                <div className="lib-form-group wpe-config-field">
                  <label>Bill-Out Multiplier</label>
                  <input
                    aria-label="Bill-out multiplier"
                    type="number"
                    min="1"
                    step="0.001"
                    placeholder="1.0"
                    value={selected.billOutMultiplier}
                    onChange={(e) => updateSelected({ billOutMultiplier: parseFloat(e.target.value) || 1 })}
                  />
                </div>
                <div className="lib-form-group wpe-config-field">
                  <label>Bill-Out Max Months</label>
                  <input
                    aria-label="Bill-out max months"
                    type="number"
                    min="0"
                    placeholder="none"
                    value={selected.billOutMaxMonths ?? ""}
                    onChange={(e) => updateSelected({ billOutMaxMonths: numOrNull(e.target.value) })}
                  />
                </div>
              </div>

              {/* Tiers table */}
              <div className="markup-matrix-wrap wpe-tiers-wrap">
                <table className="markup-matrix-table wpe-tiers-table">
                  <thead>
                    <tr>
                      <th scope="col">Tier Label</th>
                      <th scope="col">Max Months</th>
                      <th scope="col">Max Miles</th>
                      <th scope="col">Parts %</th>
                      <th scope="col">Labor %</th>
                      <th scope="col"><span className="sr-only">Remove</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.tiers.map((tier) => (
                      <tr key={tier.id}>
                        <td data-label="Tier Label">
                          <input
                            aria-label="Tier label"
                            type="text"
                            className="matrix-input wpe-label-input"
                            placeholder="e.g. 75% Warranty"
                            value={tier.label}
                            onChange={(e) => updateTier(tier.id, { label: e.target.value })}
                          />
                        </td>
                        <td data-label="Max Months">
                          <input
                            aria-label="Max months for this tier"
                            type="number"
                            className="matrix-input"
                            min="0"
                            placeholder="∞"
                            value={tier.maxMonths ?? ""}
                            onChange={(e) => updateTier(tier.id, { maxMonths: numOrNull(e.target.value) })}
                          />
                        </td>
                        <td data-label="Max Miles">
                          <input
                            aria-label="Max miles for this tier"
                            type="number"
                            className="matrix-input"
                            min="0"
                            placeholder="∞"
                            value={tier.maxMiles ?? ""}
                            onChange={(e) => updateTier(tier.id, { maxMiles: numOrNull(e.target.value) })}
                          />
                        </td>
                        <td data-label="Parts %">
                          <input
                            aria-label="Parts warranty percentage"
                            type="number"
                            className="matrix-input"
                            min="0"
                            max="100"
                            step="1"
                            value={tier.partsPct}
                            onChange={(e) => updateTier(tier.id, { partsPct: Number(e.target.value) || 0 })}
                          />
                        </td>
                        <td data-label="Labor %">
                          <input
                            aria-label="Labor warranty percentage"
                            type="number"
                            className="matrix-input"
                            min="0"
                            max="100"
                            step="1"
                            value={tier.laborPct}
                            onChange={(e) => updateTier(tier.id, { laborPct: Number(e.target.value) || 0 })}
                          />
                        </td>
                        <td className="matrix-remove-cell">
                          <button
                            type="button"
                            className="btn-remove"
                            onClick={() => removeTier(tier.id)}
                            disabled={selected.tiers.length <= 1}
                            aria-label="Remove tier"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="wpe-tier-actions">
                <button type="button" className="btn-small btn-secondary" onClick={addTier}>
                  + Add Tier
                </button>
              </div>
            </>
          ) : (
            <div className="wpe-empty-state">
              <p>Select a policy to edit, or create a new one.</p>
              <button type="button" className="btn-small btn-secondary" onClick={addPolicy}>
                + New Policy
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
