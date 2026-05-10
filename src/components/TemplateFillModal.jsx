import { useState } from "react";
import { getPartsLibrary } from "../storage";

function TemplateFillModal({ template, onConfirm, onCancel }) {
  const [library] = useState(() => getPartsLibrary());

  const slots = (template.parts || [])
    .map((p, idx) => ({ ...p, idx }))
    .filter((p) => p.type === "category");

  const [selections, setSelections] = useState(() =>
    Object.fromEntries(slots.map((s) => [s.idx, null]))
  );

  const select = (slotIdx, partId) =>
    setSelections((prev) => ({ ...prev, [slotIdx]: partId === prev[slotIdx] ? null : partId }));

  const handleConfirm = () => {
    const resolvedParts = (template.parts || [])
      .map((p, idx) => {
        if (p.type !== "category") return p;
        const partId = selections[idx];
        if (!partId) return null;
        const found = library.find((l) => l.id === partId);
        if (!found) return null;
        return {
          type: "specific",
          partNumber: found.partNumber || "",
          name: found.name,
          price: found.price.toString(),
          quantity: Number(p.quantity) || 1,
        };
      })
      .filter(Boolean);
    onConfirm(resolvedParts);
  };

  const allRequiredFilled = slots.every((s) => {
    const matches = library.filter(
      (p) => p.category === s.category && p.subcategory === s.subcategory
    );
    return matches.length === 0 || selections[s.idx] !== null;
  });

  return (
    <div className="modal-overlay show" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal fill-modal">
        <div className="modal-header">
          <h3 className="modal-title">Configure: {template.name}</h3>
          <button className="modal-close" onClick={onCancel}>×</button>
        </div>
        <p className="fill-modal-desc">
          Select a part from your inventory for each flexible slot.
        </p>
        <div className="fill-modal-body">
          {slots.map((slot) => {
            const matches = library.filter(
              (p) => p.category === slot.category && p.subcategory === slot.subcategory
            );
            const selected = selections[slot.idx];

            return (
              <div key={slot.idx} className="fill-slot">
                <div className="fill-slot-label">
                  <span className="fill-slot-name">
                    {slot.subcategory || slot.category || "Uncategorized"}
                  </span>
                  <span className="fill-slot-cat">
                    {slot.category}{slot.subcategory ? ` / ${slot.subcategory}` : ""}
                  </span>
                  {slot.quantity > 1 && (
                    <span className="fill-slot-qty">Qty: {slot.quantity}</span>
                  )}
                </div>

                {matches.length === 0 ? (
                  <p className="fill-slot-empty">
                    No {slot.subcategory || slot.category} parts in inventory — slot will be skipped.
                  </p>
                ) : (
                  <div className="fill-slot-options">
                    {matches.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className={`fill-option${selected === p.id ? " fill-option--selected" : ""}`}
                        onClick={() => select(slot.idx, p.id)}
                      >
                        <span className="fill-option-name">{p.name}</span>
                        <span className="fill-option-meta">
                          {p.partNumber ? `#${p.partNumber} · ` : ""}
                          ${Number(p.price).toFixed(2)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {matches.length > 0 && selected && (
                  <button
                    type="button"
                    className="fill-slot-clear"
                    onClick={() => select(slot.idx, selected)}
                  >
                    Clear selection
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <div className="modal-actions">
          <button className="btn-small btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn-small btn-success" onClick={handleConfirm}>
            Add to Quote
          </button>
        </div>
      </div>
    </div>
  );
}

export default TemplateFillModal;
