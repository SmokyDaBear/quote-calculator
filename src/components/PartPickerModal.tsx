import { useState, useEffect } from 'react';
import { getPartsLibrary } from '../storage';
import type { LibraryPart } from '../types/index';

function PartPickerModal({ isOpen, onClose, onAddPart }: {
  isOpen: boolean;
  onClose: () => void;
  onAddPart: (part: { id: string; partNumber: string; name: string; price: string; quantity: number; cost?: string; msrp?: string }) => void;
}) {
  const [parts, setParts] = useState<LibraryPart[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      getPartsLibrary().then(setParts);
      setSearch('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = parts.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.partNumber || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="modal-overlay show"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal part-picker-modal">
        <div className="library-modal-header">
          <h3>Add from Inventory</h3>
          <button className="btn-remove" onClick={onClose}>×</button>
        </div>
        <div className="part-picker-search">
          <input
            type="text"
            placeholder="Search by name or part #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>
        <div className="part-picker-list">
          {parts.length === 0 ? (
            <div className="library-empty">No parts in library yet.</div>
          ) : filtered.length === 0 ? (
            <div className="library-empty">No parts match your search.</div>
          ) : (
            filtered.map((p) => (
              <div key={p.id} className="part-picker-item">
                <div className="part-picker-info">
                  <strong>{p.name}</strong>
                  <span className="library-item-meta">
                    {p.partNumber && `#${p.partNumber} · `}
                    ${Number(p.price).toFixed(2)}
                  </span>
                  {p.description && (
                    <span className="library-item-desc">{p.description}</span>
                  )}
                </div>
                <button
                  className="btn-small btn-success"
                  onClick={() => {
                    onAddPart({
                      id: p.id,
                      partNumber: p.partNumber || '',
                      name: p.name,
                      price: p.price.toString(),
                      quantity: 1,
                      cost: p.cost?.toString(),
                      msrp: p.msrp?.toString(),
                    });
                    onClose();
                  }}
                >
                  Add
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default PartPickerModal;
