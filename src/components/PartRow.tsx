import { useState, useEffect, useRef } from "react";
import type { LibraryPart } from "../types/index";

type PartData = { partNumber: string; name: string; price: string; quantity: number; msrp?: string; cost?: string; isEstimate?: boolean };

function searchLibrary(library: LibraryPart[], term: string): LibraryPart[] {
  if (!term.trim()) return [];
  const q = term.toLowerCase();
  return library
    .filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.partNumber || "").toLowerCase().includes(q),
    )
    .slice(0, 7);
}

function PartRow({ part, idx, library, onUpdate, onReplace, onRemove, priceAtList = false, onSaveToInventory }: {
  part: PartData;
  idx: number;
  library: LibraryPart[];
  onUpdate: (idx: number, field: string, value: string | number) => void;
  onReplace: (idx: number, data: Partial<PartData>) => void;
  onRemove: (idx: number) => void;
  priceAtList?: boolean;
  onSaveToInventory?: () => void;
}) {
  const [results, setResults] = useState<LibraryPart[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const search = (term: string) => setResults(searchLibrary(library, term));

  const handleFieldChange = (field: string, value: string) => {
    onUpdate(idx, field, value);
    search(value);
  };

  const handleFocus = (field: string) => {
    const term = field === "partNumber" ? part.partNumber : part.name;
    if (term.trim()) search(term);
  };

  const selectPart = (p: LibraryPart) => {
    const sellPrice = (priceAtList && p.msrp) ? p.msrp : p.price;
    onReplace(idx, {
      partNumber: p.partNumber || "",
      name: p.name,
      price: sellPrice.toString(),
      msrp: p.msrp ? p.msrp.toString() : "",
      cost: p.cost ? p.cost.toString() : "",
    });
    setResults([]);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setResults([]);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const extended = (Number(part.price) || 0) * (Number(part.quantity) || 0);

  const trimmedName = part.name.trim();
  const isInLibrary =
    trimmedName !== "" &&
    library.some((l) => l.name.toLowerCase() === trimmedName.toLowerCase());
  const showSaveHint =
    trimmedName !== "" && !part.isEstimate && !isInLibrary && !!onSaveToInventory;

  return (
    <div className="part-row-wrapper" ref={wrapperRef}>
      <div className={`part-row${part.isEstimate ? " part-row--estimate" : ""}`}>
        {part.isEstimate && <span className="est-badge">~Est.</span>}
        <input
          type="text"
          placeholder="Part #"
          value={part.partNumber}
          autoComplete="off"
          onChange={(e) => handleFieldChange("partNumber", e.target.value)}
          onFocus={() => handleFocus("partNumber")}
        />
        <input
          type="text"
          placeholder="Name"
          value={part.name}
          autoComplete="off"
          onChange={(e) => handleFieldChange("name", e.target.value)}
          onFocus={() => handleFocus("name")}
        />
        <input
          type="number"
          step="0.01"
          placeholder="0.00"
          value={part.price}
          onChange={(e) => onUpdate(idx, "price", e.target.value)}
        />
        <input
          type="number"
          step="1"
          min="1"
          placeholder="1"
          value={part.quantity}
          onChange={(e) => onUpdate(idx, "quantity", e.target.value)}
        />
        <span className="part-extended">${extended.toFixed(2)}</span>
        <button
          type="button"
          className="btn-remove"
          onClick={() => onRemove(idx)}
        >
          ×
        </button>
      </div>
      {results.length > 0 && (
        <div className="part-autocomplete-dropdown">
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              className="part-autocomplete-item"
              onMouseDown={() => selectPart(p)}
            >
              <span className="part-autocomplete-name">{p.name}</span>
              <span className="part-autocomplete-meta">
                {p.partNumber ? `#${p.partNumber} · ` : ""}$
                {Number(p.price).toFixed(2)}
              </span>
            </button>
          ))}
        </div>
      )}
      {showSaveHint && (
        <div className="part-row-save-hint">
          <button
            type="button"
            className="part-save-inv-btn"
            onMouseDown={(e) => { e.preventDefault(); onSaveToInventory!(); }}
          >
            + Save to Inventory
          </button>
        </div>
      )}
    </div>
  );
}

export default PartRow;
