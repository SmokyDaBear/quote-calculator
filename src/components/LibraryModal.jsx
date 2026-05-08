import { useState, useEffect } from 'react';
import {
  getJobTemplates, saveJobTemplate, updateJobTemplate, deleteJobTemplate,
  getPartsLibrary, saveLibraryPart, updateLibraryPart, deleteLibraryPart,
} from '../storage';

// ── Parts editor reused inside the template form ──────────────────────────────

function TemplatePartsEditor({ parts, onChange }) {
  const addPart = () =>
    onChange([...parts, { partNumber: '', name: '', price: '', quantity: 1 }]);

  const updatePart = (idx, field, value) =>
    onChange(parts.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));

  const removePart = (idx) => onChange(parts.filter((_, i) => i !== idx));

  return (
    <div className="template-parts-editor">
      <div className="template-parts-header">
        <span className="parts-section-label">Default Parts</span>
        <button type="button" className="btn-small" onClick={addPart}>
          + Add Part
        </button>
      </div>
      {parts.length > 0 && (
        <>
          <div className="parts-col-headers">
            <span>Part #</span>
            <span>Name</span>
            <span>Price ($)</span>
            <span>Qty</span>
            <span>Extended</span>
            <span />
          </div>
          {parts.map((part, idx) => {
            const extended = (Number(part.price) || 0) * (Number(part.quantity) || 0);
            return (
              <div key={idx} className="part-row">
                <input type="text" placeholder="Part #" value={part.partNumber}
                  onChange={(e) => updatePart(idx, 'partNumber', e.target.value)} />
                <input type="text" placeholder="Name" value={part.name}
                  onChange={(e) => updatePart(idx, 'name', e.target.value)} />
                <input type="number" step="0.01" placeholder="0.00" value={part.price}
                  onChange={(e) => updatePart(idx, 'price', e.target.value)} />
                <input type="number" step="1" min="1" placeholder="1" value={part.quantity}
                  onChange={(e) => updatePart(idx, 'quantity', e.target.value)} />
                <span className="part-extended">${extended.toFixed(2)}</span>
                <button type="button" className="btn-remove"
                  onClick={() => removePart(idx)}>×</button>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

// ── Template form (create / edit) ─────────────────────────────────────────────

const EMPTY_TEMPLATE_FORM = {
  name: '', description: '', laborHrs: '', laborCost: '', parts: [],
};

function TemplateForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial ?? EMPTY_TEMPLATE_FORM);
  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSave = () => {
    if (!form.name.trim()) return;
    onSave({
      name: form.name.trim(),
      description: form.description,
      laborHrs: Number(form.laborHrs) || 0,
      laborCost: Number(form.laborCost) || 0,
      parts: form.parts.map((p) => ({
        partNumber: p.partNumber || '',
        name: p.name || '',
        price: Number(p.price) || 0,
        quantity: Number(p.quantity) || 1,
      })),
    });
  };

  return (
    <div className="library-form">
      <div className="lib-form-group">
        <label>Template Name *</label>
        <input type="text" placeholder="e.g. Oil Change" value={form.name}
          onChange={(e) => set('name', e.target.value)} />
      </div>
      <div className="lib-form-row two-col">
        <div className="lib-form-group">
          <label>Default Labor Hrs</label>
          <input type="number" step="0.1" placeholder="0" value={form.laborHrs}
            onChange={(e) => set('laborHrs', e.target.value)} />
        </div>
        <div className="lib-form-group">
          <label>Default Labor Cost ($)</label>
          <input type="number" step="0.01" placeholder="0.00" value={form.laborCost}
            onChange={(e) => set('laborCost', e.target.value)} />
        </div>
      </div>
      <div className="lib-form-group">
        <label>Description</label>
        <textarea className="lib-textarea" placeholder="Job description..."
          value={form.description} onChange={(e) => set('description', e.target.value)} />
      </div>
      <TemplatePartsEditor parts={form.parts}
        onChange={(parts) => set('parts', parts)} />
      <div className="lib-form-actions">
        <button className="btn-small btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn-small btn-success" onClick={handleSave}>
          {initial ? 'Update Template' : 'Save Template'}
        </button>
      </div>
    </div>
  );
}

// ── Part form (create / edit) ─────────────────────────────────────────────────

const EMPTY_PART_FORM = { partNumber: '', name: '', price: '', description: '' };

function PartForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial ?? EMPTY_PART_FORM);
  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSave = () => {
    if (!form.name.trim()) return;
    onSave({ ...form, price: Number(form.price) || 0 });
  };

  return (
    <div className="library-form">
      <div className="lib-form-row two-col">
        <div className="lib-form-group">
          <label>Part #</label>
          <input type="text" placeholder="Part number" value={form.partNumber}
            onChange={(e) => set('partNumber', e.target.value)} />
        </div>
        <div className="lib-form-group">
          <label>Price ($)</label>
          <input type="number" step="0.01" placeholder="0.00" value={form.price}
            onChange={(e) => set('price', e.target.value)} />
        </div>
      </div>
      <div className="lib-form-group">
        <label>Name *</label>
        <input type="text" placeholder="Part name" value={form.name}
          onChange={(e) => set('name', e.target.value)} />
      </div>
      <div className="lib-form-group">
        <label>Description</label>
        <textarea className="lib-textarea" placeholder="Part description..."
          value={form.description} onChange={(e) => set('description', e.target.value)} />
      </div>
      <div className="lib-form-actions">
        <button className="btn-small btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn-small btn-success" onClick={handleSave}>
          {initial ? 'Update Part' : 'Save Part'}
        </button>
      </div>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

function LibraryModal({ isOpen, onClose, onApplyTemplate }) {
  const [tab, setTab] = useState('templates');
  const [templates, setTemplates] = useState([]);
  const [libraryParts, setLibraryParts] = useState([]);
  // 'list' | 'new' | { editing: item }
  const [templateView, setTemplateView] = useState('list');
  const [partView, setPartView] = useState('list');

  useEffect(() => {
    if (isOpen) {
      setTemplates(getJobTemplates());
      setLibraryParts(getPartsLibrary());
      setTemplateView('list');
      setPartView('list');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const refreshTemplates = () => setTemplates(getJobTemplates());
  const refreshParts = () => setLibraryParts(getPartsLibrary());

  // ── Template handlers
  const handleSaveTemplate = (data) => {
    if (templateView?.editing) {
      updateJobTemplate(templateView.editing.id, data);
    } else {
      saveJobTemplate(data);
    }
    refreshTemplates();
    setTemplateView('list');
  };

  const handleDeleteTemplate = (id) => {
    if (!window.confirm('Delete this template?')) return;
    deleteJobTemplate(id);
    refreshTemplates();
  };

  // ── Part handlers
  const handleSavePart = (data) => {
    if (partView?.editing) {
      updateLibraryPart(partView.editing.id, data);
    } else {
      saveLibraryPart(data);
    }
    refreshParts();
    setPartView('list');
  };

  const handleDeletePart = (id) => {
    if (!window.confirm('Delete this part?')) return;
    deleteLibraryPart(id);
    refreshParts();
  };

  const switchTab = (t) => {
    setTab(t);
    setTemplateView('list');
    setPartView('list');
  };

  return (
    <div className="modal-overlay show"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal library-modal">

        <div className="library-modal-header">
          <h3>Library</h3>
          <button className="btn-remove" onClick={onClose}>×</button>
        </div>

        <div className="library-tabs">
          <button className={`library-tab${tab === 'templates' ? ' active' : ''}`}
            onClick={() => switchTab('templates')}>
            Job Templates
          </button>
          <button className={`library-tab${tab === 'parts' ? ' active' : ''}`}
            onClick={() => switchTab('parts')}>
            Parts Library
          </button>
        </div>

        <div className="library-body">

          {/* ── Templates tab ── */}
          {tab === 'templates' && templateView === 'list' && (
            <>
              <div className="library-section-header">
                <span>{templates.length} template{templates.length !== 1 ? 's' : ''}</span>
                <button className="btn-small" onClick={() => setTemplateView('new')}>
                  + New Template
                </button>
              </div>
              <div className="library-list">
                {templates.length === 0 ? (
                  <div className="library-empty">No job templates saved yet.</div>
                ) : (
                  templates.map((t) => (
                    <div key={t.id} className="library-item">
                      <div className="library-item-info">
                        <strong className="library-item-name">{t.name}</strong>
                        <span className="library-item-meta">
                          {t.laborHrs > 0 && `${t.laborHrs} hrs · `}
                          {t.parts.length} part{t.parts.length !== 1 ? 's' : ''}
                        </span>
                        {t.description && (
                          <span className="library-item-desc">{t.description}</span>
                        )}
                      </div>
                      <div className="library-item-actions">
                        <button className="btn-small btn-success"
                          onClick={() => { onApplyTemplate(t); onClose(); }}>
                          Add to Quote
                        </button>
                        <button className="btn-small btn-secondary"
                          onClick={() => setTemplateView({ editing: t })}>
                          Edit
                        </button>
                        <button className="btn-small btn-danger-sm"
                          onClick={() => handleDeleteTemplate(t.id)}>
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {tab === 'templates' && (templateView === 'new' || templateView?.editing) && (
            <TemplateForm
              initial={templateView?.editing ? {
                name: templateView.editing.name,
                description: templateView.editing.description,
                laborHrs: templateView.editing.laborHrs?.toString() || '',
                laborCost: templateView.editing.laborCost?.toString() || '',
                parts: templateView.editing.parts.map((p) => ({
                  ...p, price: p.price?.toString() || '',
                })),
              } : null}
              onSave={handleSaveTemplate}
              onCancel={() => setTemplateView('list')}
            />
          )}

          {/* ── Parts tab ── */}
          {tab === 'parts' && partView === 'list' && (
            <>
              <div className="library-section-header">
                <span>{libraryParts.length} part{libraryParts.length !== 1 ? 's' : ''}</span>
                <button className="btn-small" onClick={() => setPartView('new')}>
                  + New Part
                </button>
              </div>
              <div className="library-list">
                {libraryParts.length === 0 ? (
                  <div className="library-empty">No parts saved yet.</div>
                ) : (
                  libraryParts.map((p) => (
                    <div key={p.id} className="library-item">
                      <div className="library-item-info">
                        <strong className="library-item-name">{p.name}</strong>
                        <span className="library-item-meta">
                          {p.partNumber && `#${p.partNumber} · `}
                          ${Number(p.price).toFixed(2)}
                        </span>
                        {p.description && (
                          <span className="library-item-desc">{p.description}</span>
                        )}
                      </div>
                      <div className="library-item-actions">
                        <button className="btn-small btn-secondary"
                          onClick={() => setPartView({ editing: p })}>
                          Edit
                        </button>
                        <button className="btn-small btn-danger-sm"
                          onClick={() => handleDeletePart(p.id)}>
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {tab === 'parts' && (partView === 'new' || partView?.editing) && (
            <PartForm
              initial={partView?.editing ? {
                ...partView.editing,
                price: partView.editing.price?.toString() || '',
              } : null}
              onSave={handleSavePart}
              onCancel={() => setPartView('list')}
            />
          )}

        </div>
      </div>
    </div>
  );
}

export default LibraryModal;
