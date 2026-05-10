import { useState } from 'react';
import {
  getPartsLibrary, saveLibraryPart, updateLibraryPart, deleteLibraryPart,
} from '../storage';
import { CATEGORY_NAMES, getSubcategories } from '../utils/partCategories';
import { calculateSellPrice } from '../utils/partsMarkup';
import { CSVLoader } from './CSVLoader';

const EMPTY_FORM = {
  partNumber: '', name: '', cost: '', price: '', msrp: '',
  description: '', category: '', subcategory: '',
};

function PartForm({ form, onChange, onSave, onCancel, markupMatrix }) {
  const set = (field, value) => onChange({ ...form, [field]: value });
  const subcategories = getSubcategories(form.category);

  const handleCategoryChange = (value) => {
    onChange({ ...form, category: value, subcategory: '' });
  };

  const handleCostChange = (value) => {
    const sell = value && markupMatrix
      ? calculateSellPrice(Number(value), markupMatrix)
      : 0;
    onChange({ ...form, cost: value, price: sell > 0 ? sell.toFixed(2) : '' });
  };

  return (
    <div className="page-form page-card">
      <div className="lib-form-group">
        <label>Name *</label>
        <input type="text" placeholder="Part name" value={form.name}
          onChange={(e) => set('name', e.target.value)} />
      </div>
      <div className="lib-form-group">
        <label>Part #</label>
        <input type="text" placeholder="Part number" value={form.partNumber}
          onChange={(e) => set('partNumber', e.target.value)} />
      </div>
      <div className="lib-form-row three-col">
        <div className="lib-form-group">
          <label>Cost ($)</label>
          <input type="number" step="0.01" placeholder="0.00" value={form.cost}
            onChange={(e) => handleCostChange(e.target.value)} />
        </div>
        <div className="lib-form-group">
          <label>Sell Price ($) <span className="lib-label-hint">auto</span></label>
          <input type="number" step="0.01" placeholder="0.00" value={form.price}
            onChange={(e) => set('price', e.target.value)} />
        </div>
        <div className="lib-form-group">
          <label>MSRP / List ($)</label>
          <input type="number" step="0.01" placeholder="0.00" value={form.msrp}
            onChange={(e) => set('msrp', e.target.value)} />
        </div>
      </div>
      <div className="lib-form-row two-col">
        <div className="lib-form-group">
          <label>Category</label>
          <select value={form.category} onChange={(e) => handleCategoryChange(e.target.value)}>
            <option value="">— None —</option>
            {CATEGORY_NAMES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="lib-form-group">
          <label>Subcategory</label>
          <select
            value={form.subcategory}
            onChange={(e) => set('subcategory', e.target.value)}
            disabled={!form.category}
          >
            <option value="">— None —</option>
            {subcategories.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="lib-form-group">
        <label>Description</label>
        <textarea className="lib-textarea" placeholder="Part description..."
          value={form.description} onChange={(e) => set('description', e.target.value)} />
      </div>
      <div className="lib-form-actions">
        <button className="btn-small btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn-small btn-success" onClick={onSave}>
          {form._editingId ? 'Update Part' : 'Save Part'}
        </button>
      </div>
    </div>
  );
}

function InventoryPage({ onToast, markupMatrix }) {
  const [parts, setParts] = useState(() => getPartsLibrary());
  const [view, setView] = useState('list');
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');

  const refresh = () => setParts(getPartsLibrary());

  const openNew = () => {
    setForm(EMPTY_FORM);
    setView('new');
  };

  const openEdit = (p) => {
    setForm({
      partNumber: p.partNumber || '',
      name: p.name,
      cost: p.cost ? p.cost.toString() : '',
      price: p.price?.toString() || '',
      msrp: p.msrp ? p.msrp.toString() : '',
      description: p.description || '',
      category: p.category || '',
      subcategory: p.subcategory || '',
      _editingId: p.id,
    });
    setView({ editing: p });
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    const data = {
      partNumber: form.partNumber,
      name: form.name.trim(),
      cost: Number(form.cost) || 0,
      price: Number(form.price) || 0,
      msrp: Number(form.msrp) || 0,
      description: form.description,
      category: form.category,
      subcategory: form.subcategory,
    };
    if (view?.editing) {
      updateLibraryPart(view.editing.id, data);
      onToast?.(`"${data.name}" updated.`, 'info');
    } else {
      saveLibraryPart(data);
      onToast?.(`"${data.name}" saved.`);
    }
    refresh();
    setView('list');
  };

  const handleDelete = (id) => {
    if (!window.confirm('Delete this part?')) return;
    deleteLibraryPart(id);
    refresh();
  };

  const filtered = search.trim()
    ? parts.filter((p) => {
        const q = search.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          (p.partNumber || '').toLowerCase().includes(q) ||
          (p.description || '').toLowerCase().includes(q) ||
          (p.category || '').toLowerCase().includes(q) ||
          (p.subcategory || '').toLowerCase().includes(q)
        );
      })
    : parts;

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>{view === 'list' ? 'Inventory' : view?.editing ? 'Edit Part' : 'New Part'}</h2>
        {view === 'list' && (
          <div className="page-header-actions">
            <CSVLoader type="parts" onRefresh={refresh} onToast={onToast} />
            <button className="btn-small" onClick={openNew}>+ New Part</button>
          </div>
        )}
      </div>

      {view === 'list' ? (
        <>
          <div className="page-search">
            <input
              type="text"
              placeholder="Search by name, part #, or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="page-list">
            {parts.length === 0 ? (
              <div className="page-empty">No parts in inventory yet.</div>
            ) : filtered.length === 0 ? (
              <div className="page-empty">No parts match your search.</div>
            ) : (
              filtered.map((p) => (
                <div key={p.id} className="page-item page-card">
                  <div className="page-item-info">
                    <div className="page-item-name-row">
                      <strong className="page-item-name">{p.name}</strong>
                      {p.category && (
                        <span className="part-category-badge">
                          {p.subcategory ? `${p.category} / ${p.subcategory}` : p.category}
                        </span>
                      )}
                    </div>
                    <span className="page-item-meta">
                      {p.partNumber && `#${p.partNumber} · `}
                      {p.cost > 0 && `Cost $${Number(p.cost).toFixed(2)} · `}
                      Sell ${Number(p.price).toFixed(2)}
                      {p.msrp > 0 && ` · List $${Number(p.msrp).toFixed(2)}`}
                    </span>
                    {p.description && (
                      <span className="page-item-desc">{p.description}</span>
                    )}
                  </div>
                  <div className="page-item-actions">
                    <button className="btn-small btn-secondary" onClick={() => openEdit(p)}>
                      Edit
                    </button>
                    <button className="btn-small btn-danger-sm" onClick={() => handleDelete(p.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <PartForm
          form={form}
          onChange={setForm}
          onSave={handleSave}
          onCancel={() => setView('list')}
          markupMatrix={markupMatrix}
        />
      )}
    </div>
  );
}

export default InventoryPage;
