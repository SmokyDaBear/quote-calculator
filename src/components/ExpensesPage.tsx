import { useEffect, useMemo, useState } from "react";
import { getExpenseLines, getVendors, poLineTotal } from "../storage";
import type { PurchaseOrder, PurchaseOrderLine, Vendor } from "../types/index";

type Row = { line: PurchaseOrderLine; po: PurchaseOrder };

function ExpensesPage({ reloadKey, onBack }: { reloadKey: number; onBack: () => void }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [vendors, setVendors] = useState<Record<string, Vendor>>({});

  useEffect(() => {
    Promise.all([getExpenseLines(), getVendors()]).then(([r, v]) => {
      setRows(r);
      setVendors(Object.fromEntries(v.map((x) => [x.id, x])));
    });
  }, [reloadKey]);

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const { line } of rows) {
      const cat = line.lineType === "misc" ? "Shop Supplies / Misc" : line.expenseCategory || "Other";
      map[cat] = (map[cat] ?? 0) + poLineTotal(line);
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const grandTotal = byCategory.reduce((s, [, v]) => s + v, 0);

  return (
    <div className="page-container">
      <div className="page-header-row">
        <h2 className="page-title">Expenses</h2>
        <button type="button" className="btn-small btn-secondary" onClick={onBack}>
          ← Purchase Orders
        </button>
      </div>

      {byCategory.length > 0 && (
        <div className="expense-summary page-card">
          {byCategory.map(([cat, amt]) => (
            <div key={cat} className="expense-summary-row">
              <span>{cat}</span>
              <span>${amt.toFixed(2)}</span>
            </div>
          ))}
          <div className="expense-summary-row expense-summary-total">
            <span>Total</span>
            <span>${grandTotal.toFixed(2)}</span>
          </div>
        </div>
      )}

      <div className="page-list">
        {rows.length === 0 ? (
          <div className="page-empty">No expenses recorded yet.</div>
        ) : (
          rows.map(({ line, po }) => (
            <div key={line.id} className="page-item page-card">
              <div className="page-item-info">
                <div className="page-item-name-row">
                  <strong className="page-item-name">{line.name || "(no description)"}</strong>
                  <span className="part-category-badge">
                    {line.lineType === "misc" ? "Misc" : line.expenseCategory || "Other"}
                  </span>
                </div>
                <span className="page-item-meta">
                  {new Date(po.createdAt).toLocaleDateString()} · {vendors[po.vendorId]?.name ?? "Vendor"} · PO #{po.id}
                </span>
              </div>
              <div className="page-item-actions">
                <span className="history-total">${poLineTotal(line).toFixed(2)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ExpensesPage;
