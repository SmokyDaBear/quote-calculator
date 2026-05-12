import { useState, useEffect } from "react";
import { getPartsLibrary } from "../storage";
import type { JobTemplate, LibraryPart, TemplatePart_Category, WorkingPart } from "../types/index";

const ESTIMATED = "__estimated__";

function TemplateFillModal({ template, onConfirm, onCancel }: {
  template: JobTemplate;
  onConfirm: (parts: WorkingPart[]) => void;
  onCancel: () => void;
}) {
  const [library, setLibrary] = useState<LibraryPart[]>([]);

  const slots = (template.parts || [])
    .map((p, idx) => ({ ...p, idx }))
    .filter((p): p is TemplatePart_Category & { idx: number } => p.type === "category");

  const [selections, setSelections] = useState<Record<number, string | null>>(() =>
    Object.fromEntries(slots.map((s) => [s.idx, null]))
  );

  useEffect(() => {
    getPartsLibrary().then((lib) => {
      setLibrary(lib);
      // Auto-select estimated for slots with no inventory match and an estimated price
      setSelections((prev) => {
        const next = { ...prev };
        slots.forEach((slot) => {
          if (prev[slot.idx] !== null) return;
          const hasMatch = lib.some(
            (p) => p.category === slot.category && p.subcategory === slot.subcategory,
          );
          if (!hasMatch && slot.estimatedPrice && Number(slot.estimatedPrice) > 0) {
            next[slot.idx] = ESTIMATED;
          }
        });
        return next;
      });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const select = (slotIdx: number, value: string) =>
    setSelections((prev) => ({ ...prev, [slotIdx]: value === prev[slotIdx] ? null : value }));

  const handleConfirm = () => {
    const resolvedParts: WorkingPart[] = (template.parts || [])
      .map((p, idx): WorkingPart | null => {
        if (p.type !== "category") return null;
        const selection = selections[idx];

        if (selection === ESTIMATED) {
          return {
            partNumber: "",
            name: `${p.subcategory || p.category} (estimated)`,
            price: (Number(p.estimatedPrice) || 0).toFixed(2),
            quantity: Number(p.quantity) || 1,
            isEstimate: true,
          };
        }

        if (!selection) return null;

        const found = library.find((l) => l.id === selection);
        if (!found) return null;
        return {
          partNumber: found.partNumber || "",
          name: found.name,
          price: found.price.toString(),
          quantity: Number(p.quantity) || 1,
          cost: found.cost?.toString(),
          msrp: found.msrp?.toString(),
        } satisfies WorkingPart;
      })
      .filter((p): p is WorkingPart => p !== null);
    onConfirm(resolvedParts);
  };

  const allRequiredFilled = slots.every((s) => {
    const hasMatch = library.some(
      (p) => p.category === s.category && p.subcategory === s.subcategory,
    );
    return !hasMatch || selections[s.idx] !== null;
  });

  return (
    <div className="modal-overlay show" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal fill-modal">
        <div className="modal-header">
          <h3 className="modal-title">Configure: {template.name}</h3>
          <button type="button" className="modal-close" onClick={onCancel}>×</button>
        </div>
        <p className="fill-modal-desc">
          Select a part from your inventory for each flexible slot.
        </p>
        <div className="fill-modal-body">
          {slots.map((slot) => {
            const matches = library.filter(
              (p) => p.category === slot.category && p.subcategory === slot.subcategory,
            );
            const selected = selections[slot.idx];
            const hasEst = slot.estimatedPrice && Number(slot.estimatedPrice) > 0;

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
                  hasEst ? (
                    <p className="fill-slot-est-note">
                      No inventory match — adding as estimated placeholder at ${Number(slot.estimatedPrice).toFixed(2)}.
                    </p>
                  ) : (
                    <p className="fill-slot-empty">
                      No {slot.subcategory || slot.category} parts in inventory — slot will be skipped.
                    </p>
                  )
                ) : (
                  <div className="fill-slot-options">
                    {hasEst && (
                      <button
                        type="button"
                        className={`fill-option fill-option--est${selected === ESTIMATED ? " fill-option--selected" : ""}`}
                        onClick={() => select(slot.idx, ESTIMATED)}
                      >
                        <span className="fill-option-name">Use estimated placeholder</span>
                        <span className="fill-option-meta">
                          ${Number(slot.estimatedPrice).toFixed(2)}
                        </span>
                      </button>
                    )}
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
          <button type="button" className="btn-small btn-secondary" onClick={onCancel}>Cancel</button>
          <button
            type="button"
            className="btn-small btn-success"
            onClick={handleConfirm}
            disabled={!allRequiredFilled}
          >
            Add to Quote
          </button>
        </div>
      </div>
    </div>
  );
}

export default TemplateFillModal;
