import { useEffect, useMemo, useState } from "react";
import { getOrders, getCustomers, getAllVehicles, orderStatus, orderGrandTotal } from "../storage";
import type { Order, Customer, Vehicle } from "../types/index";

const PAGE_SIZE = 10;

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "pending_authorization", label: "Pending Auth" },
  { value: "awaiting_parts", label: "Awaiting Parts" },
  { value: "invoiced", label: "Invoiced" },
  { value: "closed", label: "Closed" },
  { value: "void", label: "Voided" },
];

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  pending_authorization: "Pending Auth",
  awaiting_parts: "Awaiting Parts",
  invoiced: "Invoiced",
  closed: "Closed",
  void: "Voided",
};

function vehicleLabel(v?: Vehicle): string {
  if (!v) return "";
  return [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ");
}

function OrdersPage({
  reloadKey,
  onNewOrder,
  onOpenOrder,
}: {
  reloadKey: number;
  onNewOrder: () => void;
  onOpenOrder: (id: string) => void;
}) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Record<string, Customer>>({});
  const [vehicles, setVehicles] = useState<Record<string, Vehicle>>({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    Promise.all([getOrders(), getCustomers(), getAllVehicles()]).then(([o, c, v]) => {
      setOrders(o);
      setCustomers(Object.fromEntries(c.map((x) => [x.id, x])));
      setVehicles(Object.fromEntries(v.map((x) => [x.id, x])));
    });
  }, [reloadKey]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== "all" && orderStatus(o) !== statusFilter) return false;
      if (!q) return true;
      const cust = customers[o.customerId]?.name ?? "";
      const veh = vehicleLabel(vehicles[o.vehicleId]);
      return (
        o.id.includes(q) ||
        cust.toLowerCase().includes(q) ||
        veh.toLowerCase().includes(q)
      );
    });
  }, [orders, customers, vehicles, search, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="page-container">
      <div className="page-header-row">
        <h2 className="page-title">Repair Orders</h2>
        <button type="button" className="btn btn-success" onClick={onNewOrder}>
          + New Order
        </button>
      </div>

      <div className="page-search">
        <input
          type="text"
          placeholder="Search orders by customer, vehicle, or #…"
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
        {orders.length === 0 ? (
          <div className="page-empty">No orders yet. Create one to get started.</div>
        ) : paginated.length === 0 ? (
          <div className="page-empty">No orders match.</div>
        ) : (
          paginated.map((o) => {
            const status = orderStatus(o);
            return (
              <div key={o.id} className="page-item page-card quote-history-item">
                <button
                  type="button"
                  className="quote-history-item-select"
                  onClick={() => onOpenOrder(o.id)}
                >
                  <div className="page-item-name-row">
                    <strong className="page-item-name">
                      {customers[o.customerId]?.name || "Unknown Customer"}
                    </strong>
                    <span className="history-quote-num">#{o.id}</span>
                    <span className={`order-status-badge order-status--${status}`}>
                      {STATUS_LABEL[status]}
                    </span>
                  </div>
                  <span className="page-item-meta">
                    {[
                      vehicleLabel(vehicles[o.vehicleId]),
                      new Date(o.updatedAt ?? o.createdAt).toLocaleDateString(),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </button>
                <div className="page-item-actions">
                  <span className="history-total">${orderGrandTotal(o).toFixed(2)}</span>
                </div>
              </div>
            );
          })
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

export default OrdersPage;
