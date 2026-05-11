import { useState, useEffect } from 'react';
import {
  getJobTemplates, saveJobTemplate, updateJobTemplate, deleteJobTemplate,
  getPartsLibrary, saveLibraryPart, updateLibraryPart, deleteLibraryPart,
} from '../storage';
import type { JobTemplate, LibraryPart } from '../types/index';

type TemplatePart = { partNumber: string; name: string; price: number | string; quantity: number };
type TemplateFormData = { name: string; description: string; laborHrs: string; laborCost: string; parts: TemplatePart[] };

function TemplatePartsEditor({ parts, onChange }: { parts: TemplatePart[]; onChange: (p: TemplatePart[]) => void }) {
  const addPart = () =>
    onChange([...parts, { partNumber: '', name: '', price: '', quantity: 1 }]);

  const updatePart = (idx: number, field: string, value: string) =>
    onChange(parts.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));

  const removePart = (idx: number) => onChange(parts.filter((_, i) => i !== idx));

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
            <span>Part #</span><span>Name</span><span>Price ($)</span>
            <span>Qty</span><span>Extended</span><span />
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
                <button type="button" className="btn-remove" onClick={() => removePart(idx)}>×</button>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

const EMPTY_TEMPLATE_FORM: TemplateFormData = { name: '', description: '', laborHrs: '', laborCost: '', parts: [] };

function TemplateForm({ initial, onSave, onCancel }: {
  initial: TemplateFormData | null;
  onSave: (data: TemplateFormData) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<TemplateFormData>(initial ?? EMPTY_TEMPLATE_FORM);
  const set = (field: string, value: unknown) => setForm((f) => ({ ...f, [field]: value }));

  const handleSave = () => {
    if (!form.name.trim()) return;
    onSave({
      name: form.name.trim(),
      description: form.description,
      laborHrs: form.laborHrs,
      laborCost: form.laborCost,
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
      <TemplatePartsEditor parts={form.parts} onChange={(parts) => set('parts', parts)} />
      <div className="lib-form-actions">
        <button type="button" className="btn-small btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="button" className="btn-small btn-success" onClick={handleSave}>
          {initial ? 'Update Template' : 'Save Template'}
        </button>
      </div>
    </div>
  );
}

type PartFormData = { partNumber: string; name: string; price: string; description: string };
const EMPTY_PART_FORM: PartFormData = { partNumber: '', name: '', price: '', description: '' };

function PartForm({ initial, onSave, onCancel }: {
  initial: PartFormData | null;
  onSave: (data: PartFormData) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<PartFormData>(initial ?? EMPTY_PART_FORM);
  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSave = () => {
    if (!form.name.trim()) return;
    onSave({ ...form, price: String(Number(form.price) || 0) });
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
        <button type="button" className="btn-small btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="button" className="btn-small btn-success" onClick={handleSave}>
          {initial ? 'Update Part' : 'Save Part'}
        </button>
      </div>
    </div>
  );
}

type TemplateView = 'list' | 'new' | { editing: JobTemplate };
type PartView = 'list' | 'new' | { editing: LibraryPart };

function LibraryModal({ isOpen, onClose, onApplyTemplate }: {
  isOpen: boolean;
  onClose: () => void;
  onApplyTemplate: (t: JobTemplate) => void;
}) {
  const [tab, setTab] = useState('templates');
  const [templates, setTemplates] = useState<JobTemplate[]>([]);
  const [libraryParts, setLibraryParts] = useState<LibraryPart[]>([]);
  const [templateView, setTemplateView] = useState<TemplateView>('list');
  const [partView, setPartView] = useState<PartView>('list');

  useEffect(() => {
    if (isOpen) {
      Promise.all([getJobTemplates(), getPartsLibrary()]).then(([tmpl, parts]) => {
        setTemplates(tmpl);
        setLibraryParts(parts);
      });
      setTemplateView('list');
      setPartView('list');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const refreshTemplates = () => getJobTemplates().then(setTemplates);
  const refreshParts = () => getPartsLibrary().then(setLibraryParts);

  const handleSaveTemplate = async (data: TemplateFormData) => {
    if (typeof templateView === 'object' && 'editing' in templateView) {
      await updateJobTemplate(templateView.editing.id, {
        name: data.name, description: data.description,
        laborHrs: Number(data.laborHrs) || 0, laborCost: Number(data.laborCost) || 0, parts: [],
      });
    } else {
      await saveJobTemplate({
        name: data.name, description: data.description,
        laborHrs: Number(data.laborHrs) || 0, laborCost: Number(data.laborCost) || 0, parts: [],
      });
    }
    refreshTemplates();
    setTemplateView('list');
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!window.confirm('Delete this template?')) return;
    await deleteJobTemplate(id);
    refreshTemplates();
  };

  const handleSavePart = async (data: PartFormData) => {
    if (typeof partView === 'object' && 'editing' in partView) {
      await updateLibraryPart(partView.editing.id, { ...partView.editing, price: Number(data.price) || 0 });
    } else {
      await saveLibraryPart({ name: data.name, partNumber: data.partNumber, price: Number(data.price) || 0, description: data.description });
    }
    refreshParts();
    setPartView('list');
  };

  const handleDeletePart = async (id: string) => {
    if (!window.confirm('Delete this part?')) return;
    await deleteLibraryPart(id);
    refreshParts();
  };

  const switchTab = (t: string) => {
    setTab(t);
    setTemplateView('list');
    setPartView('list');
  };

  const editingTemplate = typeof templateView === 'object' && 'editing' in templateView ? templateView.editing : null;
  const editingPart = typeof partView === 'object' && 'editing' in partView ? partView.editing : null;

  return (
    <div className="modal-overlay show"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal library-modal">
        <div className="library-modal-header">
          <h3>Library</h3>
          <button type="button" className="btn-remove" onClick={onClose}>×</button>
        </div>
        <div className="library-tabs">
          <button type="button" className={`library-tab${tab === 'templates' ? ' active' : ''}`}
            onClick={() => switchTab('templates')}>Job Templates</button>
          <button type="button" className={`library-tab${tab === 'parts' ? ' active' : ''}`}
            onClick={() => switchTab('parts')}>Parts Library</button>
        </div>
        <div className="library-body">
          {tab === 'templates' && templateView === 'list' && (
            <>
              <div className="library-section-header">
                <span>{templates.length} template{templates.length !== 1 ? 's' : ''}</span>
                <button type="button" className="btn-small" onClick={() => setTemplateView('new')}>+ New Template</button>
              </div>
              <div className="library-list">
                {templates.length === 0 ? (
                  <div className="library-empty">No job templates saved yet.</div>
                ) : templates.map((t) => (
                  <div key={t.id} className="library-item">
                    <div className="library-item-info">
                      <strong className="library-item-name">{t.name}</strong>
                      <span className="library-item-meta">
                        {t.laborHrs > 0 && `${t.laborHrs} hrs · `}
                        {t.parts.length} part{t.parts.length !== 1 ? 's' : ''}
                      </span>
                      {t.description && <span className="library-item-desc">{t.description}</span>}
                    </div>
                    <div className="library-item-actions">
                      <button type="button" className="btn-small btn-success"
                        onClick={() => { onApplyTemplate(t); onClose(); }}>Add to Quote</button>
                      <button type="button" className="btn-small btn-secondary"
                        onClick={() => setTemplateView({ editing: t })}>Edit</button>
                      <button type="button" className="btn-small btn-danger-sm"
                        onClick={() => handleDeleteTemplate(t.id)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          {tab === 'templates' && templateView !== 'list' && (
            <TemplateForm
              initial={editingTemplate ? {
                name: editingTemplate.name,
                description: editingTemplate.description,
                laborHrs: editingTemplate.laborHrs?.toString() || '',
                laborCost: editingTemplate.laborCost?.toString() || '',
                parts: [],
              } : null}
              onSave={handleSaveTemplate}
              onCancel={() => setTemplateView('list')}
            />
          )}
          {tab === 'parts' && partView === 'list' && (
            <>
              <div className="library-section-header">
                <span>{libraryParts.length} part{libraryParts.length !== 1 ? 's' : ''}</span>
                <button type="button" className="btn-small" onClick={() => setPartView('new')}>+ New Part</button>
              </div>
              <div className="library-list">
                {libraryParts.length === 0 ? (
                  <div className="library-empty">No parts saved yet.</div>
                ) : libraryParts.map((p) => (
                  <div key={p.id} className="library-item">
                    <div className="library-item-info">
                      <strong className="library-item-name">{p.name}</strong>
                      <span className="library-item-meta">
                        {p.partNumber && `#${p.partNumber} · `}${Number(p.price).toFixed(2)}
                      </span>
                      {p.description && <span className="library-item-desc">{p.description}</span>}
                    </div>
                    <div className="library-item-actions">
                      <button type="button" className="btn-small btn-secondary"
                        onClick={() => setPartView({ editing: p })}>Edit</button>
                      <button type="button" className="btn-small btn-danger-sm"
                        onClick={() => handleDeletePart(p.id)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          {tab === 'parts' && partView !== 'list' && (
            <PartForm
              initial={editingPart ? {
                name: editingPart.name,
                partNumber: editingPart.partNumber,
                price: editingPart.price?.toString() || '',
                description: editingPart.description,
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
