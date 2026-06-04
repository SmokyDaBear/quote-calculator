import { useState, useEffect } from "react";
import {
  getPartsLibrary,
  saveLibraryPart,
  updateLibraryPart,
  deleteLibraryPart,
} from "../storage";
import type { LibraryPart, MarkupBracket } from "../types/index";
import { CATEGORY_NAMES, getSubcategories } from "../utils/partCategories";
import { CSVLoader } from "./CSVLoader";
import PartEstimatesPage from "./PartEstimatesPage";
import PartForm, { EMPTY_PART_FORM } from "./PartForm";
import type { PartFormData } from "./PartForm";

const PAGE_SIZE = 10;

function InventoryPage({
  onToast,
  markupMatrix,
}: {
  onToast?: (msg: string, type?: string) => void;
  markupMatrix?: MarkupBracket[];
}) {
  const [subView, setSubView] = useState<"parts" | "estimates">("parts");
  const [parts, setParts] = useState<LibraryPart[]>([]);
  const [view, setView] = useState<
    "list" | "new" | { editing: Record<string, unknown> }
  >("list");
  const [form, setForm] = useState<PartFormData>(EMPTY_PART_FORM);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [subcategoryFilter, setSubcategoryFilter] = useState("");
  const [page, setPage] = useState(1);

  const refresh = () => getPartsLibrary().then(setParts);
  useEffect(() => {
    refresh();
  }, []);

  const handleSearchChange = (q: string) => { setSearch(q); setPage(1); };
  const handleCategoryChange = (cat: string) => {
    setCategoryFilter(cat);
    setSubcategoryFilter("");
    setPage(1);
  };
  const handleSubcategoryChange = (sub: string) => { setSubcategoryFilter(sub); setPage(1); };

  const filterSubcategories = getSubcategories(categoryFilter);

  const openNew = () => {
    setForm(EMPTY_PART_FORM);
    setView("new");
  };

  const openEdit = (p: LibraryPart) => {
    setForm({
      partNumber: p.partNumber || "",
      name: p.name,
      cost: p.cost ? p.cost.toString() : "",
      price: p.price?.toString() || "",
      msrp: p.msrp ? p.msrp.toString() : "",
      description: p.description || "",
      category: p.category || "",
      subcategory: p.subcategory || "",
      menuPrice: p.menuPrice ?? false,
      _editingId: p.id,
    });
    setView({ editing: p as unknown as Record<string, unknown> });
  };

  const handleSave = async () => {
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
      menuPrice: form.menuPrice,
    };
    if (typeof view === "object" && "editing" in view) {
      await updateLibraryPart(view.editing.id as string, data);
      onToast?.(`"${data.name}" updated.`, "info");
    } else {
      await saveLibraryPart(data);
      onToast?.(`"${data.name}" saved.`);
    }
    await refresh();
    setView("list");
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this part?")) return;
    await deleteLibraryPart(id);
    refresh();
  };

  const filtered = parts.filter((p) => {
    if (categoryFilter && p.category !== categoryFilter) return false;
    if (subcategoryFilter && p.subcategory !== subcategoryFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        (p.partNumber || "").toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>
          {subView === "estimates" ?
            "Part Price Guide"
          : view === "list" ?
            "Inventory"
          : typeof view === "object" && "editing" in view ?
            "Edit Part"
          : "New Part"}
        </h2>
        {subView === "parts" && view === "list" && (
          <div className="page-header-actions">
            <CSVLoader
              type="parts"
              onRefresh={refresh}
              onToast={onToast}
            />
            <button
              className="btn-small"
              onClick={openNew}
            >
              + New Part
            </button>
          </div>
        )}
      </div>

      <div className="section-tabs">
        <button
          type="button"
          className={`section-tab${subView === "parts" ? " section-tab--active" : ""}`}
          onClick={() => { setSubView("parts"); setView("list"); }}
        >
          Parts Library
        </button>
        <button
          type="button"
          className={`section-tab${subView === "estimates" ? " section-tab--active" : ""}`}
          onClick={() => setSubView("estimates")}
        >
          Part Price Guide
        </button>
      </div>

      {subView === "estimates" ? (
        <PartEstimatesPage onToast={onToast} />
      ) : view === "list" ?
        <>
          <div className="templates-filter-bar">
            <input
              type="search"
              placeholder="Search by name or part #…"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              aria-label="Search inventory"
            />
            <select
              aria-label="Filter by category"
              value={categoryFilter}
              onChange={(e) => handleCategoryChange(e.target.value)}
            >
              <option value="">All Categories</option>
              {CATEGORY_NAMES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              aria-label="Filter by subcategory"
              value={subcategoryFilter}
              onChange={(e) => handleSubcategoryChange(e.target.value)}
              disabled={!categoryFilter || filterSubcategories.length === 0}
            >
              <option value="">All Subcategories</option>
              {filterSubcategories.map((s: string) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="page-list">
            {parts.length === 0 ?
              <div className="page-empty">No parts in inventory yet.</div>
            : filtered.length === 0 ?
              <div className="page-empty">No parts match your search.</div>
            : paginated.map((p) => (
                <div
                  key={p.id}
                  className="page-item page-card"
                >
                  <div className="page-item-info">
                    <div className="page-item-name-row">
                      <strong className="page-item-name">{p.name}</strong>
                      {p.menuPrice && (
                        <span className="menu-price-badge">Menu</span>
                      )}
                      {p.category && (
                        <span className="part-category-badge">
                          {p.subcategory ?
                            `${p.category} / ${p.subcategory}`
                          : p.category}
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
                    <button
                      className="btn-small btn-secondary"
                      onClick={() => openEdit(p)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn-small btn-danger-sm"
                      onClick={() => handleDelete(p.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
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
      : <PartForm
          form={form}
          onChange={setForm}
          onSave={handleSave}
          onCancel={() => setView("list")}
          markupMatrix={markupMatrix}
        />
      }
    </div>
  );

}

export default InventoryPage;
