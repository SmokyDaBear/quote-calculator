import { useState } from 'react';
import {
  getJobTemplates, saveJobTemplate, updateJobTemplate, deleteJobTemplate,
} from '../storage';
import PartPickerModal from './PartPickerModal';

const EMPTY_FORM = { name: '', description: '', laborHrs: '', laborCost: '', parts: [] };

function PartsEditor({ parts, onChange, onOpenPicker }) {
  const addPart = () =>
    onChange([...parts, { partNumber: '', name: '', price: '', quantity: 1 }]);

  const updatePart = (idx, field, value) =>
    onChange(parts.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));

  const removePart = (idx) => onChange(parts.filter((_, i) => i !== idx));

  return (
    <div className="template-parts-editor">
      <div className="template-parts-header">
        <span className="parts-section-label">Default Parts</span>
        <div className="parts-header-actions">
          <button type="button" className="btn-small btn-secondary" onClick={onOpenPicker}>
            From Inventory
          </button>
          <button type="button" className="btn-small" onClick={addPart}>
            + Add Part
          </button>
        </div>
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

function TemplateForm({ form, onChange, onSave, onCancel, onOpenPicker }) {
  const set = (field, value) => onChange({ ...form, [field]: value });

  const partsTotal = form.parts.reduce(
    (sum, p) => sum + (Number(p.price) || 0) * (Number(p.quantity) || 0),
    0
  );
  const laborCost = Number(form.laborCost) || 0;
  const jobTotal = partsTotal + laborCost;

  return (
    <div className="page-form page-card">
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
      <PartsEditor
        parts={form.parts}
        onChange={(parts) => set('parts', parts)}
        onOpenPicker={onOpenPicker}
      />
      <div className="template-totals">
        <div className="template-totals-row">
          <span>Labor</span>
          <span>${laborCost.toFixed(2)}</span>
        </div>
        <div className="template-totals-row">
          <span>Parts</span>
          <span>${partsTotal.toFixed(2)}</span>
        </div>
        <div className="template-totals-row template-totals-grand">
          <span>Job Total</span>
          <span>${jobTotal.toFixed(2)}</span>
        </div>
      </div>
      <div className="lib-form-actions">
        <button className="btn-small btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn-small btn-success" onClick={onSave}>
          {form._editingId ? 'Update Template' : 'Save Template'}
        </button>
      </div>
    </div>
  );
}

function TemplatesPage({ onApplyTemplate, onSwitchToQuote, onToast }) {
  const [templates, setTemplates] = useState(() => getJobTemplates());
  const [view, setView] = useState('list');
  const [form, setForm] = useState(EMPTY_FORM);
  const [pickerOpen, setPickerOpen] = useState(false);

  const refresh = () => setTemplates(getJobTemplates());

  const openNew = () => {
    setForm(EMPTY_FORM);
    setView('new');
  };

  const openEdit = (t) => {
    setForm({
      name: t.name,
      description: t.description || '',
      laborHrs: t.laborHrs?.toString() || '',
      laborCost: t.laborCost?.toString() || '',
      parts: t.parts.map((p) => ({ ...p, price: p.price?.toString() || '' })),
      _editingId: t.id,
    });
    setView({ editing: t });
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    const data = {
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
    };
    if (view?.editing) {
      updateJobTemplate(view.editing.id, data);
      onToast?.(`Template "${data.name}" updated.`, 'info');
    } else {
      saveJobTemplate(data);
      onToast?.(`Template "${data.name}" saved.`);
    }
    refresh();
    setView('list');
  };

  const handleDelete = (id) => {
    if (!window.confirm('Delete this template?')) return;
    deleteJobTemplate(id);
    refresh();
  };

  const handleAddFromInventory = (part) => {
    setForm((f) => ({ ...f, parts: [...f.parts, part] }));
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>{view === 'list' ? 'Job Templates' : view?.editing ? 'Edit Template' : 'New Template'}</h2>
        {view === 'list' && (
          <button className="btn-small" onClick={openNew}>+ New Template</button>
        )}
      </div>

      {view === 'list' ? (
        <div className="page-list">
          {templates.length === 0 ? (
            <div className="page-empty">No templates yet. Create one to get started.</div>
          ) : (
            templates.map((t) => (
              <div key={t.id} className="page-item page-card">
                <div className="page-item-info">
                  <strong className="page-item-name">{t.name}</strong>
                  <span className="page-item-meta">
                    {t.laborHrs > 0 && `${t.laborHrs} hrs · `}
                    {t.parts.length} part{t.parts.length !== 1 ? 's' : ''}
                    {t.laborCost > 0 && ` · $${Number(t.laborCost).toFixed(2)} labor`}
                  </span>
                  {t.description && (
                    <span className="page-item-desc">{t.description}</span>
                  )}
                </div>
                <div className="page-item-actions">
                  <button className="btn-small btn-success"
                    onClick={() => { onApplyTemplate(t); onSwitchToQuote(); }}>
                    Add to Quote
                  </button>
                  <button className="btn-small btn-secondary" onClick={() => openEdit(t)}>
                    Edit
                  </button>
                  <button className="btn-small btn-danger-sm" onClick={() => handleDelete(t.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <>
          <TemplateForm
            form={form}
            onChange={setForm}
            onSave={handleSave}
            onCancel={() => setView('list')}
            onOpenPicker={() => setPickerOpen(true)}
          />
          <PartPickerModal
            isOpen={pickerOpen}
            onClose={() => setPickerOpen(false)}
            onAddPart={handleAddFromInventory}
          />
        </>
      )}
    </div>
  );
}

export default TemplatesPage;
