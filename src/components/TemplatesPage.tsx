import { useState, useEffect } from "react";
import {
  getJobTemplates,
  saveJobTemplate,
  updateJobTemplate,
  deleteJobTemplate,
  loadGlobalRates,
  getPartsLibrary,
  getEstimatedPriceMap,
} from "../storage";
import { CATEGORY_NAMES, getSubcategories } from "../utils/partCategories";
import PartPickerModal from "./PartPickerModal";
import { CSVLoader } from "./CSVLoader";
import PartRow from "./PartRow";
import type { JobTemplate, LibraryPart, TemplatePart, JobCategory, EstimatedPriceMap } from "../types/index";
import { JOB_CATEGORIES } from "../types/index";

type WorkingCategorySlot = {
  type: "category";
  category: string;
  subcategory: string;
  quantity: string | number;
  estimatedPrice?: string;
};
type WorkingSpecificPart = {
  type: "specific";
  partId?: string;
  partNumber: string;
  name: string;
  price: string;
  quantity: number;
};
type FormTemplatePart = WorkingCategorySlot | WorkingSpecificPart;

type TemplateFormData = {
  name: string;
  description: string;
  laborHrs: string;
  laborCost: string;
  parts: FormTemplatePart[];
  mileageInterval: string;
  quickJob: boolean;
  jobCategory: JobCategory | "";
  _editingId?: string;
};

const EMPTY_FORM: TemplateFormData = {
  name: "",
  description: "",
  laborHrs: "",
  laborCost: "",
  parts: [],
  mileageInterval: "",
  quickJob: false,
  jobCategory: "",
};

const PAGE_SIZE = 10;

type TemplateView = "list" | "new" | { editing: JobTemplate };

// ── Category Slot Row ─────────────────────────────────────────────────────────

function CategorySlotRow({ part, idx, onUpdate, onRemove, priceMap = {} }: {
  part: WorkingCategorySlot;
  idx: number;
  onUpdate: (idx: number, patch: Record<string, unknown>) => void;
  onRemove: (idx: number) => void;
  priceMap?: EstimatedPriceMap;
}) {
  const subcategories = getSubcategories(part.category);

  const handleCategoryChange = (cat: string) => {
    onUpdate(idx, { category: cat, subcategory: "", estimatedPrice: "" });
  };

  const handleSubcategoryChange = (sub: string) => {
    const mapped = priceMap[part.category]?.[sub];
    onUpdate(idx, {
      subcategory: sub,
      ...(mapped != null && mapped > 0 ? { estimatedPrice: mapped.toString() } : {}),
    });
  };

  return (
    <div className="part-row part-row--slot">
      <span className="slot-badge">Slot</span>
      <select
        aria-label="Part category"
        value={part.category}
        onChange={(e) => handleCategoryChange(e.target.value)}
      >
        <option value="">Category…</option>
        {CATEGORY_NAMES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <select
        aria-label="Part subcategory"
        value={part.subcategory}
        onChange={(e) => handleSubcategoryChange(e.target.value)}
        disabled={!part.category}
      >
        <option value="">Subcategory…</option>
        {subcategories.map((s: string) => (
          <option key={s} value={s}>{s}</option>
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
      <div className="slot-est-wrap">
        <label className="slot-qty-label">Est. $</label>
        <input
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          value={part.estimatedPrice ?? ""}
          onChange={(e) => onUpdate(idx, { estimatedPrice: e.target.value })}
          className="slot-est-input"
        />
        {Number(part.estimatedPrice) > 0 && (
          <span className="est-badge est-badge--slot">~Est.</span>
        )}
      </div>
      <button type="button" className="btn-remove" onClick={() => onRemove(idx)}>
        ×
      </button>
    </div>
  );
}

// ── Parts Editor ──────────────────────────────────────────────────────────────

function PartsEditor({ parts, onChange, onOpenPicker }: {
  parts: FormTemplatePart[];
  onChange: (parts: FormTemplatePart[]) => void;
  onOpenPicker: () => void;
}) {
  const [library, setLibrary] = useState<LibraryPart[]>([]);
  const [priceMap, setPriceMap] = useState<EstimatedPriceMap>({});
  useEffect(() => {
    Promise.all([getPartsLibrary(), getEstimatedPriceMap()]).then(([lib, map]) => {
      setLibrary(lib);
      setPriceMap(map);
    });
  }, []);

  const addPart = () =>
    onChange([...parts, { type: "specific", partNumber: "", name: "", price: "", quantity: 1 }]);

  const addCategorySlot = () =>
    onChange([...parts, { type: "category", category: "", subcategory: "", quantity: 1, estimatedPrice: "" }]);

  const updatePart = (idx: number, patch: Record<string, unknown>) =>
    onChange(parts.map((p, i) => (i === idx ? { ...p, ...patch } as FormTemplatePart : p)));

  const updatePartField = (idx: number, field: string, value: string | number) =>
    updatePart(idx, { [field]: value });

  const removePart = (idx: number) => onChange(parts.filter((_, i) => i !== idx));

  const specificParts = parts.filter((p): p is WorkingSpecificPart => p.type !== "category");

  return (
    <div className="template-parts-editor">
      <div className="template-parts-header">
        <span className="parts-section-label">Default Parts</span>
        <div className="parts-header-actions">
          <button type="button" className="btn-small btn-secondary" onClick={onOpenPicker}>
            From Inventory
          </button>
          <button type="button" className="btn-small btn-secondary" onClick={addCategorySlot}>
            + Category Slot
          </button>
          <button type="button" className="btn-small" onClick={addPart}>
            + Add Part
          </button>
        </div>
      </div>

      {parts.length > 0 && (
        <>
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
                  priceMap={priceMap}
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
                onReplace={(idx, data) => updatePart(idx, data)}
                onRemove={removePart}
              />
            );
          })}

          {specificParts.length > 0 && (
            <div className="parts-total-row">
              Parts Total: $
              {specificParts
                .reduce((s, p) => s + (Number(p.price) || 0) * (Number(p.quantity) || 0), 0)
                .toFixed(2)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Template Form ─────────────────────────────────────────────────────────────

function TemplateForm({ form, onChange, onSave, onCancel, onOpenPicker, laborRate }: {
  form: TemplateFormData;
  onChange: (form: TemplateFormData) => void;
  onSave: () => void;
  onCancel: () => void;
  onOpenPicker: () => void;
  laborRate: number;
}) {
  const set = (field: string, value: unknown) => onChange({ ...form, [field]: value });

  const handleLaborHrsChange = (value: string) => {
    const hrs = parseFloat(value);
    const cost = !isNaN(hrs) && hrs > 0 ? (hrs * laborRate).toFixed(2) : "";
    onChange({ ...form, laborHrs: value, laborCost: cost });
  };

  const specificParts = form.parts.filter((p): p is WorkingSpecificPart => p.type !== "category");
  const categorySlots = form.parts.filter((p): p is WorkingCategorySlot => p.type === "category");
  const partsTotal = specificParts.reduce(
    (sum, p) => sum + (Number(p.price) || 0) * (Number(p.quantity) || 0),
    0,
  );
  const slotsEstTotal = categorySlots.reduce(
    (sum, s) => sum + (Number(s.estimatedPrice) || 0) * (Number(s.quantity) || 1),
    0,
  );
  const laborCost = Number(form.laborCost) || 0;
  const jobTotal = partsTotal + laborCost + slotsEstTotal;
  const slotCount = categorySlots.length;

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
      <div className="lib-form-group">
        <label>Job Category</label>
        <select
          aria-label="Job category"
          value={form.jobCategory}
          onChange={(e) => set("jobCategory", e.target.value)}
        >
          <option value="">— None —</option>
          {JOB_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
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
            <span className="lib-label-hint"> @ ${laborRate.toFixed(2)}/hr</span>
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
          <span className="lib-label-hint">(optional — e.g. 5000 for every 5k mi)</span>
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
          <span className="lib-label-hint">(show in quick-add panel on quote screen)</span>
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
            <span>{slotCount} category slot{slotCount !== 1 ? "s" : ""}</span>
            <span>
              {slotsEstTotal > 0
                ? `~$${slotsEstTotal.toFixed(2)} estimated`
                : "priced at selection"}
            </span>
          </div>
        )}
        <div className="template-totals-row template-totals-grand">
          <span>
            {slotsEstTotal > 0 ? "~" : ""}Job Total
            {slotsEstTotal > 0 && <span className="est-badge est-badge--subtle">est.</span>}
          </span>
          <span>{slotsEstTotal > 0 ? "~" : ""}${jobTotal.toFixed(2)}</span>
        </div>
      </div>
      <div className="lib-form-actions">
        <button type="button" className="btn-small btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn-small btn-success" onClick={onSave}>
          {form._editingId ? "Update Template" : "Save Template"}
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function TemplatesPage({ onApplyTemplate, onSwitchToQuote, onToast }: {
  onApplyTemplate: (t: JobTemplate) => void;
  onSwitchToQuote: () => void;
  onToast?: (msg: string, type?: string) => void;
}) {
  const [templates, setTemplates] = useState<JobTemplate[]>([]);
  const [view, setView] = useState<TemplateView>("list");
  const [form, setForm] = useState<TemplateFormData>(EMPTY_FORM);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [laborRate, setLaborRate] = useState(215);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<JobCategory | "">("");
  const [page, setPage] = useState(1);

  const refresh = () => getJobTemplates().then(setTemplates);

  useEffect(() => {
    refresh();
    loadGlobalRates().then((r) => setLaborRate(r.laborRate));
  }, []);

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    setPage(1);
  };

  const handleCategoryChange = (cat: JobCategory | "") => {
    setCategoryFilter(cat);
    setPage(1);
  };

  const filtered = templates.filter((t) => {
    if (categoryFilter && t.jobCategory !== categoryFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openNew = () => {
    setForm(EMPTY_FORM);
    setView("new");
  };

  const openEdit = async (t: JobTemplate) => {
    const library = await getPartsLibrary();
    setForm({
      name: t.name,
      description: t.description || "",
      laborHrs: t.laborHrs?.toString() || "",
      laborCost: t.laborCost?.toString() || "",
      parts: (t.parts || []).map((p): FormTemplatePart => {
        if (p.type === "category") return {
          ...p,
          quantity: p.quantity,
          estimatedPrice: p.estimatedPrice != null ? p.estimatedPrice.toString() : "",
        };
        const found = library.find((lp) => lp.id === p.partId);
        return {
          type: "specific",
          partId: p.partId || "",
          partNumber: found?.partNumber || "",
          name: found?.name || (p.partId ? "(unlinked part)" : ""),
          price: found?.price?.toString() || "",
          quantity: p.quantity,
        };
      }),
      mileageInterval: t.mileageInterval != null ? t.mileageInterval.toString() : "",
      quickJob: t.quickJob === true,
      jobCategory: t.jobCategory || "",
      _editingId: t.id,
    });
    setView({ editing: t });
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    const library = await getPartsLibrary();
    const data = {
      name: form.name.trim(),
      description: form.description,
      laborHrs: Number(form.laborHrs) || 0,
      laborCost: Number(form.laborCost) || 0,
      parts: form.parts.map((p): TemplatePart => {
        if (p.type === "category") {
          const ep = Number(p.estimatedPrice) || 0;
          return {
            type: "category",
            category: p.category,
            subcategory: p.subcategory,
            quantity: Number(p.quantity) || 1,
            ...(ep > 0 ? { estimatedPrice: ep } : {}),
          };
        }
        let partId = p.partId || "";
        if (!partId && p.name) {
          const match = library.find(
            (lp) => lp.name === p.name && (!p.partNumber || lp.partNumber === p.partNumber),
          );
          partId = match?.id || "";
        }
        return { type: "specific", partId, quantity: Number(p.quantity) || 1 };
      }),
      mileageInterval: form.mileageInterval !== "" ? Number(form.mileageInterval) : null,
      quickJob: form.quickJob === true,
      jobCategory: form.jobCategory || undefined,
    };
    if (typeof view === "object" && "editing" in view) {
      await updateJobTemplate(view.editing.id, data);
      onToast?.(`Template "${data.name}" updated.`, "info");
    } else {
      await saveJobTemplate(data);
      onToast?.(`Template "${data.name}" saved.`);
    }
    await refresh();
    setView("list");
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this template?")) return;
    await deleteJobTemplate(id);
    refresh();
  };

  const handleAddFromInventory = (part: {
    partNumber: string;
    name: string;
    price: string;
    quantity: number;
    cost?: string;
    msrp?: string;
  }) => {
    setForm((f) => ({
      ...f,
      parts: [
        ...f.parts,
        {
          type: "specific" as const,
          partNumber: part.partNumber || "",
          name: part.name,
          price: part.price || "",
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
          : typeof view === "object" && "editing" in view ?
            "Edit Template"
          : "New Template"}
        </h2>
        {view === "list" && (
          <div className="page-header-actions">
            <CSVLoader type="templates" onRefresh={refresh} onToast={onToast} />
            <button type="button" className="btn-small" onClick={openNew}>
              + New Template
            </button>
          </div>
        )}
      </div>

      {view === "list" ?
        <>
          <div className="templates-filter-bar">
            <input
              type="search"
              placeholder="Search templates…"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              aria-label="Search templates"
            />
            <select
              aria-label="Filter by category"
              value={categoryFilter}
              onChange={(e) => handleCategoryChange(e.target.value as JobCategory | "")}
            >
              <option value="">All Categories</option>
              {JOB_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="page-list">
            {templates.length === 0 ?
              <div className="page-empty">No templates yet. Create one to get started.</div>
            : filtered.length === 0 ?
              <div className="page-empty">No templates match your search.</div>
            : paginated.map((t) => {
                const slotCount = (t.parts || []).filter((p) => p.type === "category").length;
                return (
                  <div key={t.id} className="page-item page-card">
                    <div className="page-item-info">
                      <div className="page-item-name-row">
                        <strong className="page-item-name">{t.name}</strong>
                        {t.jobCategory && (
                          <span className="template-category-tag">{t.jobCategory}</span>
                        )}
                      </div>
                      <span className="page-item-meta">
                        {t.laborHrs > 0 && `${t.laborHrs} hrs · `}
                        {t.parts.length} part{t.parts.length !== 1 ? "s" : ""}
                        {slotCount > 0 && ` (${slotCount} flexible)`}
                        {t.laborCost > 0 && ` · $${Number(t.laborCost).toFixed(2)} labor`}
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
                        type="button"
                        className="btn-small btn-success"
                        onClick={() => {
                          onApplyTemplate(t);
                          onSwitchToQuote();
                        }}
                      >
                        Add to Quote
                      </button>
                      <button
                        type="button"
                        className="btn-small btn-secondary"
                        onClick={() => openEdit(t)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
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

          {pageCount > 1 && (
            <div className="templates-pagination">
              <button
                type="button"
                className="btn-small btn-secondary"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                ← Prev
              </button>
              <span className="templates-pagination-info">
                Page {page} of {pageCount}
                <span className="templates-pagination-count">
                  {" "}({filtered.length} total)
                </span>
              </span>
              <button
                type="button"
                className="btn-small btn-secondary"
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={page === pageCount}
              >
                Next →
              </button>
            </div>
          )}
        </>
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
