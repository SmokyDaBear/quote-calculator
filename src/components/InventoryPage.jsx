import { useState } from 'react';
import {
  getPartsLibrary, saveLibraryPart, updateLibraryPart, deleteLibraryPart,
} from '../storage';

const EMPTY_FORM = { partNumber: '', name: '', price: '', description: '' };

function PartForm({ form, onChange, onSave, onCancel }) {
  const set = (field, value) => onChange({ ...form, [field]: value });

  return (
    <div className="page-form page-card">
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
        <button className="btn-small btn-success" onClick={onSave}>
          {form._editingId ? 'Update Part' : 'Save Part'}
        </button>
      </div>
    </div>
  );
}

function InventoryPage({ onToast }) {
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
      price: p.price?.toString() || '',
      description: p.description || '',
      _editingId: p.id,
    });
    setView({ editing: p });
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    const data = {
      partNumber: form.partNumber,
      name: form.name.trim(),
      price: Number(form.price) || 0,
      description: form.description,
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
          (p.description || '').toLowerCase().includes(q)
        );
      })
    : parts;

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>{view === 'list' ? 'Inventory' : view?.editing ? 'Edit Part' : 'New Part'}</h2>
        {view === 'list' && (
          <button className="btn-small" onClick={openNew}>+ New Part</button>
        )}
      </div>

      {view === 'list' ? (
        <>
          <div className="page-search">
            <input
              type="text"
              placeholder="Search by name or part #..."
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
                    <strong className="page-item-name">{p.name}</strong>
                    <span className="page-item-meta">
                      {p.partNumber && `#${p.partNumber} · `}
                      ${Number(p.price).toFixed(2)}
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
        />
      )}
    </div>
  );
}

export default InventoryPage;
