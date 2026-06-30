import { useEffect, useState } from "react";
import {
  getVendors,
  getOrders,
  getPartsLibrary,
  getCustomers,
  getPurchaseOrder,
  getPoLines,
  createPurchaseOrder,
  updatePurchaseOrder,
  savePoLine,
  deletePoLine,
  deletePurchaseOrder,
  receivePurchaseOrder,
  saveOrderSublet,
  updateOrderSublet,
} from "../storage";
import { CATEGORY_NAMES } from "../utils/partCategories";
import { EXPENSE_CATEGORIES } from "../types/index";
import type { PoPrefill } from "../utils/poRequest";
import type {
  Vendor,
  Order,
  Customer,
  LibraryPart,
  PurchaseOrder,
  PoLineType,
} from "../types/index";

const fmt = (n: number) => `$${Number(n).toFixed(2)}`;

const LINE_TYPE_LABEL: Record<PoLineType, string> = {
  inventory: "Inventory Part",
  special_order: "Special Order",
  sublet: "Sublet",
  expense: "Expense",
  misc: "Misc / Supplies",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  ordered: "Ordered",
  partial: "Partial",
  received: "Received",
  cancelled: "Cancelled",
};

interface LineDraft {
  key: string;
  id?: string;
  lineType: PoLineType;
  inventoryId?: string;
  partNumber: string;
  name: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: number;
  sellPrice?: number;
  category?: string;
  expenseCategory?: string;
  orderId?: string;
  subletId?: string;
  note?: string;
  receiveNow?: number; // transient, receive mode only
}

let keySeq = 0;
const newKey = () => `l${++keySeq}`;

function blankLine(lineType: PoLineType, prefill?: PoPrefill): LineDraft {
  return {
    key: newKey(),
    lineType,
    inventoryId: prefill?.lineType === lineType ? prefill.inventoryId : undefined,
    partNumber: prefill?.partNumber ?? "",
    name: prefill?.name ?? "",
    quantityOrdered: 1,
    quantityReceived: 0,
    unitCost: prefill?.unitCost ?? 0,
    sellPrice: prefill?.sellPrice,
    category: prefill?.category,
    expenseCategory: lineType === "expense" ? "Other" : undefined,
    orderId: prefill?.orderId,
    subletId: prefill?.subletId,
  };
}

function PurchaseOrderEditor({
  poId,
  prefill,
  onBack,
  onChanged,
  toast,
}: {
  poId: string | null;
  prefill?: PoPrefill | null;
  onBack: () => void;
  onChanged: () => void;
  toast: (msg: string, type?: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorId, setVendorId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([]);
  const [library, setLibrary] = useState<LibraryPart[]>([]);
  const [openOrders, setOpenOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Record<string, Customer>>({});
  const [receiving, setReceiving] = useState(false);
  const [partSearch, setPartSearch] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [vnds, lib, orders, custs] = await Promise.all([
        getVendors(),
        getPartsLibrary(),
        getOrders(),
        getCustomers(),
      ]);
      if (cancelled) return;
      setVendors(vnds);
      setLibrary(lib);
      setOpenOrders(orders.filter((o) => !o.voidedAt));
      setCustomers(Object.fromEntries(custs.map((c) => [c.id, c])));

      if (poId) {
        const [existing, existingLines] = await Promise.all([
          getPurchaseOrder(poId),
          getPoLines(poId),
        ]);
        if (cancelled) return;
        if (existing) {
          setPo(existing);
          setVendorId(existing.vendorId);
          setNotes(existing.notes);
          setLines(
            existingLines.map((l) => ({
              key: newKey(),
              id: l.id,
              lineType: l.lineType,
              inventoryId: l.inventoryId,
              partNumber: l.partNumber,
              name: l.name,
              quantityOrdered: l.quantityOrdered,
              quantityReceived: l.quantityReceived,
              unitCost: l.unitCost,
              sellPrice: l.sellPrice,
              category: l.category,
              expenseCategory: l.expenseCategory,
              orderId: l.orderId,
              subletId: l.subletId,
              note: l.note,
            })),
          );
        }
      } else {
        if (prefill?.vendorId) setVendorId(prefill.vendorId);
        if (prefill) setLines([blankLine(prefill.lineType, prefill)]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [poId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div className="app-loading">Loading purchase order…</div>;

  const readOnly = po?.status === "received" || po?.status === "cancelled";
  const total = lines.reduce(
    (s, l) => s + l.unitCost * (l.lineType === "inventory" || l.lineType === "special_order" || l.lineType === "sublet" ? l.quantityOrdered : 1),
    0,
  );

  const setLine = (key: string, patch: Partial<LineDraft>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const addLine = (lineType: PoLineType) => setLines((prev) => [...prev, blankLine(lineType)]);
  const removeLine = (key: string) => setLines((prev) => prev.filter((l) => l.key !== key));

  const ensurePo = async (): Promise<PurchaseOrder | null> => {
    if (!vendorId) {
      toast("Select a vendor first.", "error");
      return null;
    }
    if (po) {
      await updatePurchaseOrder(po.id, { vendorId, notes });
      return { ...po, vendorId, notes };
    }
    const created = await createPurchaseOrder({ vendorId, notes });
    setPo(created);
    return created;
  };

  const persistLines = async (savedPo: PurchaseOrder) => {
    const existing = await getPoLines(savedPo.id);
    const keptIds = new Set<string>();
    for (const l of lines) {
      // Sublet linkage: create/link an OrderSublet on the chosen work order.
      let subletId = l.subletId;
      if (l.lineType === "sublet" && l.orderId) {
        if (subletId) {
          await updateOrderSublet(subletId, {
            poId: savedPo.id,
            description: l.name,
            vendorId: savedPo.vendorId,
            cost: l.unitCost,
            sellPrice: l.sellPrice ?? l.unitCost,
          });
        } else {
          const os = await saveOrderSublet({
            orderId: l.orderId,
            description: l.name,
            vendorId: savedPo.vendorId,
            cost: l.unitCost,
            sellPrice: l.sellPrice ?? l.unitCost,
            taxable: false,
            poId: savedPo.id,
          });
          subletId = os.id;
        }
      }
      const saved = await savePoLine({
        id: l.id,
        poId: savedPo.id,
        lineType: l.lineType,
        inventoryId: l.inventoryId,
        partNumber: l.partNumber,
        name: l.name,
        quantityOrdered: l.quantityOrdered,
        quantityReceived: l.quantityReceived,
        unitCost: l.unitCost,
        sellPrice: l.sellPrice,
        category: l.category,
        expenseCategory: l.expenseCategory,
        orderId: l.orderId,
        subletId,
      });
      keptIds.add(saved.id);
    }
    await Promise.all(
      existing.filter((e) => !keptIds.has(e.id)).map((e) => deletePoLine(e.id)),
    );
  };

  const handleSave = async (markOrdered = false) => {
    const savedPo = await ensurePo();
    if (!savedPo) return;
    await persistLines(savedPo);
    if (markOrdered && savedPo.status === "draft") {
      await updatePurchaseOrder(savedPo.id, { status: "ordered", orderedAt: Date.now() });
    }
    const fresh = await getPurchaseOrder(savedPo.id);
    setPo(fresh);
    onChanged();
    toast(markOrdered ? `PO #${savedPo.id} marked ordered.` : `PO #${savedPo.id} saved.`);
  };

  const handleReceive = async () => {
    if (!po) return;
    const receipts = lines
      .filter((l) => l.id && (l.receiveNow ?? 0) > 0)
      .map((l) => ({ lineId: l.id!, quantityReceived: l.receiveNow! }));
    if (receipts.length === 0) {
      toast("Enter quantities to receive.", "error");
      return;
    }
    await receivePurchaseOrder(po.id, receipts);
    const [fresh, freshLines] = await Promise.all([getPurchaseOrder(po.id), getPoLines(po.id)]);
    setPo(fresh);
    setLines(
      freshLines.map((l) => ({
        key: newKey(),
        id: l.id,
        lineType: l.lineType,
        inventoryId: l.inventoryId,
        partNumber: l.partNumber,
        name: l.name,
        quantityOrdered: l.quantityOrdered,
        quantityReceived: l.quantityReceived,
        unitCost: l.unitCost,
        sellPrice: l.sellPrice,
        category: l.category,
        expenseCategory: l.expenseCategory,
        orderId: l.orderId,
        subletId: l.subletId,
        note: l.note,
      })),
    );
    setReceiving(false);
    onChanged();
    toast("Items received.");
  };

  const handleDelete = async () => {
    if (!po) return;
    if (!window.confirm(`Delete PO #${po.id}? This cannot be undone.`)) return;
    await deletePurchaseOrder(po.id);
    onChanged();
    onBack();
  };

  const orderLabel = (o: Order) =>
    `#${o.id} — ${customers[o.customerId]?.name ?? "Customer"}`;

  const partMatches = (key: string) => {
    const q = (partSearch[key] ?? "").trim().toLowerCase();
    if (!q) return [];
    return library
      .filter((p) => p.name.toLowerCase().includes(q) || (p.partNumber || "").toLowerCase().includes(q))
      .slice(0, 6);
  };

  return (
    <div className="calculator-container">
      <div className="order-editor-topbar">
        <button type="button" className="btn-small btn-secondary" onClick={onBack}>
          ← Purchasing
        </button>
        <div className="order-editor-title">
          {po ? `PO #${po.id}` : "New Purchase Order"}
          {po && (
            <span className={`order-status-badge po-status--${po.status}`}>
              {STATUS_LABEL[po.status]}
            </span>
          )}
        </div>
      </div>

      <div className="po-editor-grid">
        <div className="po-editor-main">
          <div className="order-details-row page-card">
            <div className="lib-form-group">
              <label>Vendor *</label>
              <select
                aria-label="Vendor"
                value={vendorId}
                disabled={readOnly || !!po}
                onChange={(e) => setVendorId(e.target.value)}
              >
                <option value="">Select vendor…</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
            <div className="lib-form-group" style={{ flex: "2 1 240px" }}>
              <label>Notes</label>
              <input
                type="text"
                placeholder="PO notes…"
                value={notes}
                disabled={readOnly}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {vendorId && !receiving && !readOnly && (
            <div className="po-add-line-bar">
              {(Object.keys(LINE_TYPE_LABEL) as PoLineType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  className="btn-small btn-secondary"
                  onClick={() => addLine(t)}
                >
                  + {LINE_TYPE_LABEL[t]}
                </button>
              ))}
            </div>
          )}

          <div className="po-lines">
            {lines.length === 0 ? (
              <div className="page-empty">
                {vendorId ? "Add lines using the buttons above." : "Select a vendor to begin."}
              </div>
            ) : (
              lines.map((l) => {
                const qtyApplies =
                  l.lineType === "inventory" || l.lineType === "special_order" || l.lineType === "sublet";
                const lineTotal = l.unitCost * (qtyApplies ? l.quantityOrdered : 1);
                const remaining = l.quantityOrdered - l.quantityReceived;
                return (
                  <div key={l.key} className="po-line page-card">
                    <div className="po-line-head">
                      <span className={`po-line-type po-line-type--${l.lineType}`}>
                        {LINE_TYPE_LABEL[l.lineType]}
                      </span>
                      {!receiving && !readOnly && (
                        <button type="button" className="btn-remove" onClick={() => removeLine(l.key)}>
                          ×
                        </button>
                      )}
                    </div>

                    {/* Inventory part search */}
                    {l.lineType === "inventory" && (
                      <div className="po-line-fields">
                        {l.inventoryId ? (
                          <div className="po-line-picked">
                            <strong>{l.name}</strong>
                            {l.partNumber && <span className="po-line-pn">#{l.partNumber}</span>}
                            {!receiving && !readOnly && (
                              <button
                                type="button"
                                className="btn-small btn-secondary"
                                onClick={() => setLine(l.key, { inventoryId: undefined, name: "", partNumber: "" })}
                              >
                                Change
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="po-part-search">
                            <input
                              type="text"
                              placeholder="Search inventory part…"
                              value={partSearch[l.key] ?? ""}
                              onChange={(e) => setPartSearch((s) => ({ ...s, [l.key]: e.target.value }))}
                            />
                            {partMatches(l.key).length > 0 && (
                              <div className="po-part-results">
                                {partMatches(l.key).map((p) => (
                                  <button
                                    key={p.id}
                                    type="button"
                                    className="po-part-result"
                                    onClick={() => {
                                      setLine(l.key, {
                                        inventoryId: p.id,
                                        name: p.name,
                                        partNumber: p.partNumber,
                                        unitCost: p.cost || l.unitCost,
                                      });
                                      setPartSearch((s) => ({ ...s, [l.key]: "" }));
                                    }}
                                  >
                                    <span>{p.name}</span>
                                    <span className="po-part-result-meta">
                                      {p.partNumber ? `#${p.partNumber} · ` : ""}On hand {p.qtyOnHand ?? 0}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Special order fields */}
                    {l.lineType === "special_order" && (
                      <div className="po-line-fields po-line-grid">
                        <input
                          type="text" placeholder="Part #" value={l.partNumber}
                          disabled={receiving || readOnly}
                          onChange={(e) => setLine(l.key, { partNumber: e.target.value })}
                        />
                        <input
                          type="text" placeholder="Part name" value={l.name}
                          disabled={receiving || readOnly}
                          onChange={(e) => setLine(l.key, { name: e.target.value })}
                        />
                        <select
                          aria-label="Category" value={l.category ?? ""}
                          disabled={receiving || readOnly}
                          onChange={(e) => setLine(l.key, { category: e.target.value || undefined })}
                        >
                          <option value="">— Category —</option>
                          {CATEGORY_NAMES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <input
                          type="number" step="0.01" placeholder="Sell price (opt)"
                          value={l.sellPrice ?? ""}
                          disabled={receiving || readOnly}
                          onChange={(e) => setLine(l.key, { sellPrice: e.target.value ? Number(e.target.value) : undefined })}
                        />
                      </div>
                    )}

                    {/* Sublet fields */}
                    {l.lineType === "sublet" && (
                      <div className="po-line-fields po-line-grid">
                        <input
                          type="text" placeholder="Sublet description" value={l.name}
                          disabled={receiving || readOnly}
                          onChange={(e) => setLine(l.key, { name: e.target.value })}
                        />
                        <select
                          aria-label="Link to order" value={l.orderId ?? ""}
                          disabled={receiving || readOnly}
                          onChange={(e) => setLine(l.key, { orderId: e.target.value || undefined })}
                        >
                          <option value="">Link to order (optional)…</option>
                          {openOrders.map((o) => (
                            <option key={o.id} value={o.id}>{orderLabel(o)}</option>
                          ))}
                        </select>
                        <input
                          type="number" step="0.01" placeholder="Sell price (opt)"
                          value={l.sellPrice ?? ""}
                          disabled={receiving || readOnly}
                          onChange={(e) => setLine(l.key, { sellPrice: e.target.value ? Number(e.target.value) : undefined })}
                        />
                      </div>
                    )}

                    {/* Expense fields */}
                    {l.lineType === "expense" && (
                      <div className="po-line-fields po-line-grid">
                        <select
                          aria-label="Expense category" value={l.expenseCategory ?? "Other"}
                          disabled={receiving || readOnly}
                          onChange={(e) => setLine(l.key, { expenseCategory: e.target.value })}
                        >
                          {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <input
                          type="text" placeholder="Description" value={l.name}
                          disabled={receiving || readOnly}
                          onChange={(e) => setLine(l.key, { name: e.target.value })}
                        />
                      </div>
                    )}

                    {/* Misc fields */}
                    {l.lineType === "misc" && (
                      <div className="po-line-fields">
                        <input
                          type="text" placeholder="Description / note (e.g. brake clean, towels)"
                          value={l.name}
                          disabled={receiving || readOnly}
                          onChange={(e) => setLine(l.key, { name: e.target.value })}
                        />
                      </div>
                    )}

                    {/* Cost / qty row */}
                    <div className="po-line-amounts">
                      <label className="po-amount-field">
                        <span>{l.lineType === "expense" || l.lineType === "misc" ? "Amount" : "Unit cost"}</span>
                        <input
                          type="number" step="0.01" value={l.unitCost || ""}
                          disabled={receiving || readOnly}
                          onChange={(e) => setLine(l.key, { unitCost: Number(e.target.value) || 0 })}
                        />
                      </label>
                      {qtyApplies && (
                        <label className="po-amount-field">
                          <span>Qty</span>
                          <input
                            type="number" step="1" min="1" value={l.quantityOrdered}
                            disabled={receiving || readOnly}
                            onChange={(e) => setLine(l.key, { quantityOrdered: Number(e.target.value) || 1 })}
                          />
                        </label>
                      )}
                      {receiving && (
                        <label className="po-amount-field po-amount-field--receive">
                          <span>Receive (rem {qtyApplies ? remaining : 1})</span>
                          <input
                            type="number" step="1" min="0"
                            value={l.receiveNow ?? ""}
                            onChange={(e) => setLine(l.key, { receiveNow: Number(e.target.value) || 0 })}
                          />
                        </label>
                      )}
                      <span className="po-line-total">{fmt(lineTotal)}</span>
                    </div>

                    {l.quantityReceived > 0 && (
                      <div className="po-line-received">Received {l.quantityReceived} of {l.quantityOrdered}</div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="quote-compose-aside">
          <div className="order-balance-card">
            <div className="order-balance-row">
              <span>Lines</span>
              <span>{lines.length}</span>
            </div>
            <div className="order-balance-row order-balance-due">
              <span>PO Total</span>
              <span>{fmt(total)}</span>
            </div>
          </div>

          <div className="quote-aside-actions">
            {!readOnly && !receiving && (
              <>
                <button type="button" className="btn btn-success" onClick={() => handleSave(false)}>
                  Save PO
                </button>
                {po && po.status === "draft" && (
                  <button type="button" className="btn btn-secondary" onClick={() => handleSave(true)}>
                    Save & Mark Ordered
                  </button>
                )}
                {po && (po.status === "ordered" || po.status === "partial") && (
                  <button type="button" className="btn btn-warning" onClick={() => setReceiving(true)}>
                    Receive Items
                  </button>
                )}
              </>
            )}
            {receiving && (
              <>
                <button type="button" className="btn btn-success" onClick={handleReceive}>
                  Confirm Receipt
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setReceiving(false)}>
                  Cancel
                </button>
              </>
            )}
            {po && po.status === "draft" && !receiving && (
              <button type="button" className="btn btn-danger-text" onClick={handleDelete}>
                Delete PO
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PurchaseOrderEditor;
