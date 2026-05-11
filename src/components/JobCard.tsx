import { useState, useEffect } from "react";
import { getPartsLibrary } from "../storage";
import { EditIcon } from "../icons";
import PartRow from "./PartRow";
import type { LibraryPart, WorkingJob, WorkingPart } from "../types/index";

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

  useEffect(() => {
    getPartsLibrary().then(setLibrary);
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

  const laborCost = Number(job.laborCost) || 0;
  const laborHrs = Number(job.laborHrs) || 0;

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
              {job.parts.length} part{job.parts.length !== 1 ? "s" : ""} · $
              {partsTotal.toFixed(2)}
            </span>
          )}
          <span className="job-card-collapsed-subtotal">
            Subtotal: ${subtotal.toFixed(2)}
          </span>
        </div>
        {job.description && (
          <div className="job-card-collapsed-desc">{job.description}</div>
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
              />
            ))}
            <div className="parts-total-row">
              Parts Total: ${partsTotal.toFixed(2)}
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

      <div className="job-footer">
        <button
          type="button"
          className="btn-small btn-secondary"
          onClick={() => onSaveAsTemplate(job)}
        >
          Save as Template
        </button>
        <div className="job-subtotal">
          <span>Subtotal: </span>
          <span className="job-subtotal-value">${subtotal.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

export default JobCard;
