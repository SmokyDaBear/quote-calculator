import { useState, useEffect } from "react";
import { getPartsLibrary, getWarrantyPolicies } from "../storage";
import { calculateProration } from "../utils/proration";
import { EditIcon } from "../icons";
import PartRow from "./PartRow";
import SaveToInventoryModal from "./SaveToInventoryModal";
import type { LibraryPart, WorkingJob, WorkingPart, WarrantyPolicy } from "../types/index";

function JobCard({
  job,
  subtotal,
  onUpdate,
  onRemove,
  onSaveAsTemplate,
  isBlank,
}: {
  job: WorkingJob;
  subtotal: number;
  onUpdate: (id: number, field: string, value: unknown) => void;
  onRemove: (id: number) => void;
  onSaveAsTemplate: (job: WorkingJob) => void;
  isBlank: boolean;
}) {
  const [library, setLibrary] = useState<LibraryPart[]>([]);
  const [saveInvSnap, setSaveInvSnap] = useState<{ idx: number; data: { partNumber?: string; name?: string; price?: string; cost?: string; msrp?: string } } | null>(null);
  const openSaveToInv = (idx: number) => {
    const p = job.parts[idx];
    if (!p) return;
    setSaveInvSnap({ idx, data: { partNumber: p.partNumber, name: p.name, price: p.price, cost: p.cost, msrp: p.msrp } });
  };
  const [warrantyPolicies, setWarrantyPolicies] = useState<WarrantyPolicy[]>([]);
  const [warrantyOpen, setWarrantyOpen] = useState(!!job.warrantyPolicyId);

  useEffect(() => {
    getPartsLibrary().then(setLibrary);
    getWarrantyPolicies().then(setWarrantyPolicies);
  }, []);

  const [isEditing, setIsEditing] = useState(!!isBlank);

  const addPart = () => {
    onUpdate(job.id, "parts", [
      ...job.parts,
      { partNumber: "", name: "", price: "", quantity: 1 },
    ]);
  };

  const updatePart = (idx: number, field: string, value: string | number) => {
    onUpdate(
      job.id,
      "parts",
      job.parts.map((p, i) => (i === idx ? { ...p, [field]: value } : p)),
    );
  };

  const replacePart = (idx: number, data: Record<string, unknown>) => {
    onUpdate(
      job.id,
      "parts",
      job.parts.map((p, i) =>
        i === idx ? ({ ...p, ...data } as WorkingPart) : p,
      ),
    );
  };

  const removePart = (idx: number) => {
    onUpdate(
      job.id,
      "parts",
      job.parts.filter((_, i) => i !== idx),
    );
  };

  const partsTotal = job.parts.reduce(
    (sum, p) => sum + (Number(p.price) || 0) * (Number(p.quantity) || 0),
    0,
  );

  const hasEstimates = job.parts.some((p) => p.isEstimate);
  const laborCost = Number(job.laborCost) || 0;
  const laborHrs = Number(job.laborHrs) || 0;

  // Warranty helpers
  const selectedWarrantyPolicy = warrantyPolicies.find((p) => p.id === job.warrantyPolicyId) ?? null;
  const hasMileageTiers = selectedWarrantyPolicy?.tiers.some((t) => t.maxMiles !== null) ?? false;
  const warrantyResult =
    selectedWarrantyPolicy && job.warrantyDateBilled
      ? calculateProration(
          selectedWarrantyPolicy,
          job.warrantyDateBilled,
          partsTotal,
          partsTotal,
          laborCost,
          laborCost,
          job.warrantyMileage ? parseFloat(job.warrantyMileage) : undefined,
        )
      : null;

  const clearWarranty = () => {
    setWarrantyOpen(false);
    onUpdate(job.id, "warrantyPolicyId", undefined);
    onUpdate(job.id, "warrantyPolicyName", undefined);
    onUpdate(job.id, "warrantyDateBilled", undefined);
    onUpdate(job.id, "warrantyMileage", undefined);
  };

  if (!isEditing) {
    return (
      <div className="job-card job-card--collapsed">
        <div className="job-card-collapsed-header">
          <span className="job-card-collapsed-name">
            {job.name || "Unnamed Job"}
          </span>
          <div className="job-card-collapsed-actions">
            <button
              type="button"
              className="btn-small btn-secondary"
              onClick={() => setIsEditing(true)}
            >
              <EditIcon />
              Edit
            </button>
            <button
              type="button"
              className="btn-remove"
              onClick={() => onRemove(job.id)}
            >
              ×
            </button>
          </div>
        </div>
        <div className="job-card-collapsed-summary">
          {laborCost > 0 && (
            <span>
              Labor: {laborHrs > 0 ? `${laborHrs} hrs · ` : ""}$
              {laborCost.toFixed(2)}
            </span>
          )}
          {job.parts.length > 0 && (
            <span>
              {job.parts.length} part{job.parts.length !== 1 ? "s" : ""} · {hasEstimates ? "~" : ""}$
              {partsTotal.toFixed(2)}
              {hasEstimates && <span className="est-badge est-badge--inline">est.</span>}
            </span>
          )}
          <span className="job-card-collapsed-subtotal">
            {hasEstimates ? "~" : ""}Subtotal: ${subtotal.toFixed(2)}
            {hasEstimates && <span className="est-badge est-badge--inline">est.</span>}
          </span>
        </div>
        {job.description && (
          <div className="job-card-collapsed-desc">{job.description}</div>
        )}
        {job.warrantyPolicyName && (
          <div className="job-warranty-badge-row">
            <span className="job-warranty-badge">Warranty: {job.warrantyPolicyName}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="job-card"
      data-job-id={job.id}
    >
      <div className="job-header">
        <input
          aria-label="Job Name"
          type="text"
          className="job-name"
          value={job.name}
          onChange={(e) => onUpdate(job.id, "name", e.target.value)}
        />
        <div className="job-header-actions">
          <button
            type="button"
            className="btn-small btn-secondary"
            onClick={() => setIsEditing(false)}
          >
            Done
          </button>
          <button
            type="button"
            className="btn-remove"
            onClick={() => onRemove(job.id)}
          >
            ×
          </button>
        </div>
      </div>

      <div className="job-inputs">
        <div className="form-group">
          <label>Labor Hrs</label>
          <input
            type="number"
            step="0.1"
            placeholder="0"
            value={job.laborHrs}
            onChange={(e) => onUpdate(job.id, "laborHrs", e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Labor Cost ($)</label>
          <input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={job.laborCost}
            onChange={(e) => onUpdate(job.id, "laborCost", e.target.value)}
          />
        </div>
        <div className="form-group form-group--checkbox">
          <label className="price-at-list-label">
            <input
              type="checkbox"
              checked={job.priceAtList || false}
              onChange={(e) =>
                onUpdate(job.id, "priceAtList", e.target.checked)
              }
            />
            Price at List
          </label>
        </div>
      </div>

      <div className="parts-section">
        <div className="parts-section-header">
          <span className="parts-section-label">Parts</span>
          <button
            type="button"
            className="btn-small"
            onClick={addPart}
          >
            + Add Part
          </button>
        </div>
        {job.parts.length > 0 && (
          <>
            <div className="parts-col-headers">
              <span>Part #</span>
              <span>Name</span>
              <span>Price ($)</span>
              <span>Qty</span>
              <span>Extended</span>
              <span />
            </div>
            {job.parts.map((part, idx) => (
              <PartRow
                key={idx}
                part={part}
                idx={idx}
                library={library}
                onUpdate={updatePart}
                onReplace={replacePart}
                onRemove={removePart}
                priceAtList={job.priceAtList || false}
                onSaveToInventory={() => openSaveToInv(idx)}
              />
            ))}
            <div className="parts-total-row">
              Parts Total: {hasEstimates ? "~" : ""}${partsTotal.toFixed(2)}
              {hasEstimates && <span className="est-note">* includes estimated pricing</span>}
            </div>
          </>
        )}
      </div>

      <div className="form-group job-description-group">
        <label>Description</label>
        <textarea
          className="job-description"
          placeholder="Job description..."
          value={job.description}
          onChange={(e) => onUpdate(job.id, "description", e.target.value)}
        />
      </div>

      {/* Warranty Section */}
      <div className="job-warranty-wrap">
        {!warrantyOpen ? (
          <button
            type="button"
            className="btn-small btn-secondary job-warranty-add-btn"
            onClick={() => setWarrantyOpen(true)}
          >
            + Apply Warranty
          </button>
        ) : (
          <div className="job-warranty-section">
            <div className="job-warranty-header">
              <span className="job-warranty-title">Warranty Coverage</span>
              <button
                type="button"
                className="btn-remove"
                onClick={clearWarranty}
                title="Remove warranty"
              >
                ×
              </button>
            </div>
            <div className="job-warranty-fields">
              <div className="job-warranty-field">
                <label>Warranty Policy</label>
                <select
                  aria-label="Warranty policy"
                  value={job.warrantyPolicyId ?? ""}
                  onChange={(e) => {
                    const policy = warrantyPolicies.find((p) => p.id === e.target.value);
                    onUpdate(job.id, "warrantyPolicyId", e.target.value || undefined);
                    onUpdate(job.id, "warrantyPolicyName", policy?.label ?? undefined);
                  }}
                >
                  <option value="">— Select Policy —</option>
                  {warrantyPolicies.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div className="job-warranty-field">
                <label>Install Date</label>
                <input
                  type="date"
                  aria-label="Install date"
                  value={job.warrantyDateBilled ?? ""}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => onUpdate(job.id, "warrantyDateBilled", e.target.value || undefined)}
                />
              </div>
              {hasMileageTiers && (
                <div className="job-warranty-field">
                  <label>Current Mileage</label>
                  <input
                    type="number"
                    aria-label="Current mileage"
                    min="0"
                    placeholder="e.g. 45000"
                    value={job.warrantyMileage ?? ""}
                    onChange={(e) => onUpdate(job.id, "warrantyMileage", e.target.value || undefined)}
                  />
                </div>
              )}
            </div>
            {warrantyResult && (
              <div className="job-warranty-preview">
                {warrantyResult.tier === null ? (
                  <span className="job-warranty-preview-none">Out of warranty — no coverage applies.</span>
                ) : (
                  <>
                    <span className="job-warranty-preview-policy">{selectedWarrantyPolicy?.label}</span>
                    {" — "}
                    <span className="job-warranty-preview-tier">
                      {warrantyResult.tier?.label}
                    </span>
                    <div className="job-warranty-preview-amounts">
                      {warrantyResult.warrantyPaysCost > 0 && (
                        <span>Parts: <strong>${warrantyResult.warrantyPaysCost.toFixed(2)} covered</strong></span>
                      )}
                      {warrantyResult.warrantyPaysLaborCost > 0 && (
                        <span>Labor: <strong>${warrantyResult.warrantyPaysLaborCost.toFixed(2)} covered</strong></span>
                      )}
                      {warrantyResult.warrantyPaysCost === 0 && warrantyResult.warrantyPaysLaborCost === 0 && (
                        <span className="job-warranty-preview-none">No coverage at current percentages.</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {saveInvSnap !== null && (
        <SaveToInventoryModal
          initialData={saveInvSnap.data}
          onSaved={(saved) => {
            const p = job.parts[saveInvSnap.idx];
            if (p) {
              replacePart(saveInvSnap.idx, {
                partNumber: saved.partNumber || p.partNumber,
                name: saved.name,
                cost: saved.cost ? saved.cost.toString() : undefined,
                msrp: saved.msrp ? saved.msrp.toString() : undefined,
              });
            }
            setLibrary((prev) => [...prev, saved]);
            setSaveInvSnap(null);
          }}
          onCancel={() => setSaveInvSnap(null)}
        />
      )}

      <div className="job-footer">
        <button
          type="button"
          className="btn-small btn-secondary"
          onClick={() => onSaveAsTemplate(job)}
        >
          Save as Template
        </button>
        <div className="job-subtotal">
          <span>{hasEstimates ? "~" : ""}Subtotal: </span>
          <span className="job-subtotal-value">${subtotal.toFixed(2)}</span>
          {hasEstimates && <span className="est-badge est-badge--subtle">est.</span>}
        </div>
      </div>
    </div>
  );
}

export default JobCard;
