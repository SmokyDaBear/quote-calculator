import { useEffect, useMemo, useState } from "react";
import { getPurchaseOrders, getVendors, getAllPoLines, poLineTotal } from "../storage";
import type { PurchaseOrder, Vendor, PurchaseOrderLine } from "../types/index";

const PAGE_SIZE = 10;

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "ordered", label: "Ordered" },
  { value: "partial", label: "Partial" },
  { value: "received", label: "Received" },
];

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  ordered: "Ordered",
  partial: "Partial",
  received: "Received",
  cancelled: "Cancelled",
};

function PurchaseOrdersPage({
  reloadKey,
  onNewPo,
  onOpenPo,
  onViewExpenses,
}: {
  reloadKey: number;
  onNewPo: () => void;
  onOpenPo: (id: string) => void;
  onViewExpenses: () => void;
}) {
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [vendors, setVendors] = useState<Record<string, Vendor>>({});
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    Promise.all([getPurchaseOrders(), getVendors(), getAllPoLines()]).then(([p, v, lines]) => {
      setPos(p);
      setVendors(Object.fromEntries(v.map((x) => [x.id, x])));
      const t: Record<string, number> = {};
      for (const l of lines as PurchaseOrderLine[]) {
        t[l.poId] = (t[l.poId] ?? 0) + poLineTotal(l);
      }
      setTotals(t);
    });
  }, [reloadKey]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pos.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (!q) return true;
      const vendor = vendors[p.vendorId]?.name ?? "";
      return p.id.includes(q) || vendor.toLowerCase().includes(q);
    });
  }, [pos, vendors, search, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="page-container">
      <div className="page-header-row">
        <h2 className="page-title">Purchase Orders</h2>
        <div className="page-header-actions">
          <button type="button" className="btn-small btn-secondary" onClick={onViewExpenses}>
            Expenses
          </button>
          <button type="button" className="btn btn-success" onClick={onNewPo}>
            + New PO
          </button>
        </div>
      </div>

      <div className="page-search">
        <input
          type="text"
          placeholder="Search by vendor or PO #…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <div className="order-filter-chips">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            className={`order-filter-chip${statusFilter === f.value ? " order-filter-chip--active" : ""}`}
            onClick={() => {
              setStatusFilter(f.value);
              setPage(1);
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="page-list">
        {pos.length === 0 ? (
          <div className="page-empty">No purchase orders yet.</div>
        ) : paginated.length === 0 ? (
          <div className="page-empty">No purchase orders match.</div>
        ) : (
          paginated.map((p) => (
            <div key={p.id} className="page-item page-card quote-history-item">
              <button
                type="button"
                className="quote-history-item-select"
                onClick={() => onOpenPo(p.id)}
              >
                <div className="page-item-name-row">
                  <strong className="page-item-name">
                    {vendors[p.vendorId]?.name || "Unknown Vendor"}
                  </strong>
                  <span className="history-quote-num">#{p.id}</span>
                  <span className={`order-status-badge po-status--${p.status}`}>
                    {STATUS_LABEL[p.status]}
                  </span>
                </div>
                <span className="page-item-meta">
                  {new Date(p.createdAt).toLocaleDateString()}
                  {p.notes ? ` · ${p.notes}` : ""}
                </span>
              </button>
              <div className="page-item-actions">
                <span className="history-total">${(totals[p.id] ?? 0).toFixed(2)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {pageCount > 1 && (
        <div className="templates-pagination">
          <button
            type="button"
            className="btn-small btn-secondary"
            onClick={() => setPage(Math.max(1, safePage - 1))}
            disabled={safePage === 1}
          >
            ← Prev
          </button>
          <span className="templates-pagination-info">
            Page {safePage} of {pageCount}
            <span className="templates-pagination-count"> ({filtered.length} total)</span>
          </span>
          <button
            type="button"
            className="btn-small btn-secondary"
            onClick={() => setPage(Math.min(pageCount, safePage + 1))}
            disabled={safePage === pageCount}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

export default PurchaseOrdersPage;
