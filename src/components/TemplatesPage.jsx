import { useState } from "react";
import {
  getJobTemplates,
  saveJobTemplate,
  updateJobTemplate,
  deleteJobTemplate,
  loadGlobalRates,
  getPartsLibrary,
} from "../storage";
import { CATEGORY_NAMES, getSubcategories } from "../utils/partCategories";
import PartPickerModal from "./PartPickerModal";
import { CSVLoader } from "./CSVLoader";
import PartRow from "./PartRow";

const EMPTY_FORM = {
  name: "",
  description: "",
  laborHrs: "",
  laborCost: "",
  parts: [],
  mileageInterval: "",
  quickJob: false,
};

// ── Category Slot Row ─────────────────────────────────────────────────────────

function CategorySlotRow({ part, idx, onUpdate, onRemove }) {
  const subcategories = getSubcategories(part.category);

  const handleCategoryChange = (value) => {
    onUpdate(idx, { category: value, subcategory: "" });
  };

  return (
    <div className="part-row part-row--slot">
      <span className="slot-badge">Slot</span>
      <select
        value={part.category}
        onChange={(e) => handleCategoryChange(e.target.value)}
      >
        <option value="">Category…</option>
        {CATEGORY_NAMES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <select
        value={part.subcategory}
        onChange={(e) => onUpdate(idx, { subcategory: e.target.value })}
        disabled={!part.category}
      >
        <option value="">Subcategory…</option>
        {subcategories.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <div className="slot-qty-wrap">
        <label className="slot-qty-label">Qty</label>
        <input
          type="number"
          step="1"
          min="1"
          placeholder="1"
          value={part.quantity}
          onChange={(e) => onUpdate(idx, { quantity: e.target.value })}
          className="slot-qty-input"
        />
      </div>
      <button
        type="button"
        className="btn-remove"
        onClick={() => onRemove(idx)}
      >
        ×
      </button>
    </div>
  );
}

// ── Parts Editor ──────────────────────────────────────────────────────────────

function PartsEditor({ parts, onChange, onOpenPicker }) {
  const [library] = useState(() => getPartsLibrary());

  const addPart = () =>
    onChange([
      ...parts,
      { type: "specific", partNumber: "", name: "", price: "", quantity: 1 },
    ]);

  const addCategorySlot = () =>
    onChange([
      ...parts,
      { type: "category", category: "", subcategory: "", quantity: 1 },
    ]);

  const updatePart = (idx, patch) =>
    onChange(parts.map((p, i) => (i === idx ? { ...p, ...patch } : p)));

  const updatePartField = (idx, field, value) => updatePart(idx, { [field]: value });
  const replacePart = (idx, data) => updatePart(idx, data);

  const removePart = (idx) => onChange(parts.filter((_, i) => i !== idx));

  const specificParts = parts.filter((p) => p.type !== "category");

  return (
    <div className="template-parts-editor">
      <div className="template-parts-header">
        <span className="parts-section-label">Default Parts</span>
        <div className="parts-header-actions">
          <button
            type="button"
            className="btn-small btn-secondary"
            onClick={onOpenPicker}
          >
            From Inventory
          </button>
          <button
            type="button"
            className="btn-small btn-secondary"
            onClick={addCategorySlot}
          >
            + Category Slot
          </button>
          <button type="button" className="btn-small" onClick={addPart}>
            + Add Part
          </button>
        </div>
      </div>

      {parts.length > 0 && (
        <>
          {/* Column headers for specific parts */}
          {specificParts.length > 0 && (
            <div className="parts-col-headers">
              <span>Part #</span>
              <span>Name</span>
              <span>Price ($)</span>
              <span>Qty</span>
              <span>Extended</span>
              <span />
            </div>
          )}

          {parts.map((part, idx) => {
            if (part.type === "category") {
              return (
                <CategorySlotRow
                  key={idx}
                  part={part}
                  idx={idx}
                  onUpdate={updatePart}
                  onRemove={removePart}
                />
              );
            }

            return (
              <PartRow
                key={idx}
                part={part}
                idx={idx}
                library={library}
                onUpdate={updatePartField}
                onReplace={replacePart}
                onRemove={removePart}
              />
            );
          })}

          {specificParts.length > 0 && (
            <div className="parts-total-row">
              Parts Total: $
              {specificParts
                .reduce(
                  (s, p) =>
                    s + (Number(p.price) || 0) * (Number(p.quantity) || 0),
                  0,
                )
                .toFixed(2)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Template Form ─────────────────────────────────────────────────────────────

function TemplateForm({
  form,
  onChange,
  onSave,
  onCancel,
  onOpenPicker,
  laborRate,
}) {
  const set = (field, value) => onChange({ ...form, [field]: value });

  const handleLaborHrsChange = (value) => {
    const hrs = parseFloat(value);
    const cost = !isNaN(hrs) && hrs > 0 ? (hrs * laborRate).toFixed(2) : "";
    onChange({ ...form, laborHrs: value, laborCost: cost });
  };

  const specificParts = form.parts.filter((p) => p.type !== "category");
  const partsTotal = specificParts.reduce(
    (sum, p) => sum + (Number(p.price) || 0) * (Number(p.quantity) || 0),
    0,
  );
  const laborCost = Number(form.laborCost) || 0;
  const jobTotal = partsTotal + laborCost;
  const slotCount = form.parts.filter((p) => p.type === "category").length;

  return (
    <div className="page-form page-card">
      <div className="lib-form-group">
        <label>Template Name *</label>
        <input
          type="text"
          placeholder="e.g. Oil Change"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
        />
      </div>
      <div className="lib-form-row two-col">
        <div className="lib-form-group">
          <label>Default Labor Hrs</label>
          <input
            type="number"
            step="0.1"
            placeholder="0"
            value={form.laborHrs}
            onChange={(e) => handleLaborHrsChange(e.target.value)}
          />
        </div>
        <div className="lib-form-group">
          <label>
            Default Labor Cost ($)
            <span className="lib-label-hint">
              {" "}
              @ ${laborRate.toFixed(2)}/hr
            </span>
          </label>
          <input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={form.laborCost}
            onChange={(e) => set("laborCost", e.target.value)}
          />
        </div>
      </div>
      <div className="lib-form-group">
        <label>Description</label>
        <textarea
          className="lib-textarea"
          placeholder="Job description..."
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </div>
      <div className="lib-form-group">
        <label>
          Mileage Interval{" "}
          <span className="lib-label-hint">
            (optional — e.g. 5000 for every 5k mi)
          </span>
        </label>
        <input
          type="number"
          step="500"
          min="0"
          placeholder="e.g. 5000"
          value={form.mileageInterval}
          onChange={(e) => set("mileageInterval", e.target.value)}
        />
      </div>
      <div className="lib-form-group">
        <label className="template-checkbox-label">
          <input
            type="checkbox"
            checked={form.quickJob}
            onChange={(e) => set("quickJob", e.target.checked)}
          />
          Quick Job{" "}
          <span className="lib-label-hint">
            (show in quick-add panel on quote screen)
          </span>
        </label>
      </div>
      <PartsEditor
        parts={form.parts}
        onChange={(parts) => set("parts", parts)}
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
        {slotCount > 0 && (
          <div className="template-totals-row template-slot-note">
            <span>
              {slotCount} category slot{slotCount !== 1 ? "s" : ""} — priced at
              selection
            </span>
          </div>
        )}
        <div className="template-totals-row template-totals-grand">
          <span>Job Total</span>
          <span>${jobTotal.toFixed(2)}</span>
        </div>
      </div>
      <div className="lib-form-actions">
        <button className="btn-small btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn-small btn-success" onClick={onSave}>
          {form._editingId ? "Update Template" : "Save Template"}
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function TemplatesPage({ onApplyTemplate, onSwitchToQuote, onToast }) {
  const [templates, setTemplates] = useState(() => getJobTemplates());
  const [view, setView] = useState("list");
  const [form, setForm] = useState(EMPTY_FORM);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [{ laborRate }] = useState(() => loadGlobalRates());

  const refresh = () => setTemplates(getJobTemplates());

  const openNew = () => {
    setForm(EMPTY_FORM);
    setView("new");
  };

  const openEdit = (t) => {
    setForm({
      name: t.name,
      description: t.description || "",
      laborHrs: t.laborHrs?.toString() || "",
      laborCost: t.laborCost?.toString() || "",
      parts: (t.parts || []).map((p) =>
        p.type === "category" ?
          { ...p }
        : { ...p, type: "specific", price: p.price?.toString() || "" },
      ),
      mileageInterval:
        t.mileageInterval != null ? t.mileageInterval.toString() : "",
      quickJob: t.quickJob === true,
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
      parts: form.parts.map((p) =>
        p.type === "category" ?
          {
            type: "category",
            category: p.category,
            subcategory: p.subcategory,
            quantity: Number(p.quantity) || 1,
          }
        : {
            type: "specific",
            partNumber: p.partNumber || "",
            name: p.name || "",
            price: Number(p.price) || 0,
            quantity: Number(p.quantity) || 1,
          },
      ),
      mileageInterval:
        form.mileageInterval !== "" ? Number(form.mileageInterval) : null,
      quickJob: form.quickJob === true,
    };
    if (view?.editing) {
      updateJobTemplate(view.editing.id, data);
      onToast?.(`Template "${data.name}" updated.`, "info");
    } else {
      saveJobTemplate(data);
      onToast?.(`Template "${data.name}" saved.`);
    }
    refresh();
    setView("list");
  };

  const handleDelete = (id) => {
    if (!window.confirm("Delete this template?")) return;
    deleteJobTemplate(id);
    refresh();
  };

  const handleAddFromInventory = (part) => {
    setForm((f) => ({
      ...f,
      parts: [
        ...f.parts,
        {
          type: "specific",
          partNumber: part.partNumber || "",
          name: part.name,
          price: part.price?.toString() || "",
          quantity: 1,
        },
      ],
    }));
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>
          {view === "list" ?
            "Job Templates"
          : view?.editing ?
            "Edit Template"
          : "New Template"}
        </h2>
        {view === "list" && (
          <div className="page-header-actions">
            <CSVLoader type="templates" onRefresh={refresh} onToast={onToast} />
            <button className="btn-small" onClick={openNew}>
              + New Template
            </button>
          </div>
        )}
      </div>

      {view === "list" ?
        <div className="page-list">
          {templates.length === 0 ?
            <div className="page-empty">
              No templates yet. Create one to get started.
            </div>
          : templates.map((t) => {
              const slotCount = (t.parts || []).filter(
                (p) => p.type === "category",
              ).length;
              return (
                <div key={t.id} className="page-item page-card">
                  <div className="page-item-info">
                    <strong className="page-item-name">{t.name}</strong>
                    <span className="page-item-meta">
                      {t.laborHrs > 0 && `${t.laborHrs} hrs · `}
                      {t.parts.length} part{t.parts.length !== 1 ? "s" : ""}
                      {slotCount > 0 && ` (${slotCount} flexible)`}
                      {t.laborCost > 0 &&
                        ` · $${Number(t.laborCost).toFixed(2)} labor`}
                      {t.mileageInterval != null &&
                        ` · every ${Number(t.mileageInterval).toLocaleString()} mi`}
                      {t.quickJob && " · Quick Job"}
                    </span>
                    {t.description && (
                      <span className="page-item-desc">{t.description}</span>
                    )}
                  </div>
                  <div className="page-item-actions">
                    <button
                      className="btn-small btn-success"
                      onClick={() => {
                        onApplyTemplate(t);
                        onSwitchToQuote();
                      }}
                    >
                      Add to Quote
                    </button>
                    <button
                      className="btn-small btn-secondary"
                      onClick={() => openEdit(t)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn-small btn-danger-sm"
                      onClick={() => handleDelete(t.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          }
        </div>
      : <>
          <TemplateForm
            form={form}
            onChange={setForm}
            onSave={handleSave}
            onCancel={() => setView("list")}
            laborRate={laborRate}
            onOpenPicker={() => setPickerOpen(true)}
          />
          <PartPickerModal
            isOpen={pickerOpen}
            onClose={() => setPickerOpen(false)}
            onAddPart={handleAddFromInventory}
          />
        </>
      }
    </div>
  );
}

export default TemplatesPage;
