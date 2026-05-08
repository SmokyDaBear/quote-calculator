import { useState, useEffect } from 'react';
import { getJobTemplates } from '../storage';

function TemplatePickerModal({ isOpen, onClose, onApplyTemplate }) {
  const [templates, setTemplates] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTemplates(getJobTemplates());
      setSearch('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = templates.filter((t) => {
    const q = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="modal-overlay show"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal part-picker-modal">
        <div className="library-modal-header">
          <h3>Add Job from Template</h3>
          <button className="btn-remove" onClick={onClose}>×</button>
        </div>
        <div className="part-picker-search">
          <input
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>
        <div className="part-picker-list">
          {templates.length === 0 ? (
            <div className="library-empty">No templates saved yet.</div>
          ) : filtered.length === 0 ? (
            <div className="library-empty">No templates match your search.</div>
          ) : (
            filtered.map((t) => {
              const partsTotal = t.parts.reduce(
                (sum, p) => sum + (Number(p.price) || 0) * (Number(p.quantity) || 0),
                0
              );
              const jobTotal = partsTotal + (Number(t.laborCost) || 0);
              return (
                <div key={t.id} className="part-picker-item template-picker-item">
                  <div className="part-picker-info">
                    <strong>{t.name}</strong>
                    <span className="library-item-meta">
                      {t.laborHrs > 0 && `${t.laborHrs} hrs · `}
                      {t.parts.length} part{t.parts.length !== 1 ? 's' : ''}
                      {jobTotal > 0 && ` · $${jobTotal.toFixed(2)}`}
                    </span>
                    {t.description && (
                      <span className="library-item-desc">{t.description}</span>
                    )}
                  </div>
                  <button
                    className="btn-small btn-success"
                    onClick={() => { onApplyTemplate(t); onClose(); }}
                  >
                    Add
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default TemplatePickerModal;
