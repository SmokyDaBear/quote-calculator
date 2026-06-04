import type { QuoteIndexEntry } from "../types/index";

const PAGE_SIZE = 10;

function formatVehicle(v: unknown): string {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object") {
    const veh = v as { year?: string; make?: string; model?: string; trim?: string };
    return [veh.year, veh.make, veh.model, veh.trim].filter(Boolean).join(" ");
  }
  return "";
}

function QuoteHistoryPanel({
  history,
  searchTerm,
  onSearch,
  onLoadQuote,
  onDeleteQuote,
  page,
  onPageChange,
}: {
  history: QuoteIndexEntry[];
  searchTerm: string;
  onSearch: (term: string) => void;
  onLoadQuote: (id: string) => void;
  onDeleteQuote: (id: string) => void;
  page: number;
  onPageChange: (page: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(history.length / PAGE_SIZE));
  const paginated = history.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <div className="page-search">
        <input
          type="text"
          placeholder="Search quotes by customer, vehicle…"
          value={searchTerm}
          onChange={(e) => { onSearch(e.target.value); onPageChange(1); }}
        />
      </div>

      <div className="page-list">
        {history.length === 0 ? (
          <div className="page-empty">No saved quotes yet.</div>
        ) : paginated.length === 0 ? (
          <div className="page-empty">No quotes match your search.</div>
        ) : (
          paginated.map((item) => {
            const vehicleStr = formatVehicle(item.vehicle);
            return (
              <div key={item.id} className="page-item page-card quote-history-item">
                <button
                  type="button"
                  className="quote-history-item-select"
                  onClick={() => onLoadQuote(item.id)}
                >
                  <div className="page-item-name-row">
                    <strong className="page-item-name">{item.customer || "Unknown Customer"}</strong>
                    <span className="history-quote-num">#{item.id}</span>
                  </div>
                  <span className="page-item-meta">
                    {[
                      vehicleStr,
                      new Date(item.updatedAt ?? item.createdAt).toLocaleDateString(),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </button>
                <div className="page-item-actions">
                  <span className="history-total">${item.total.toFixed(2)}</span>
                  <button
                    type="button"
                    className="btn-small btn-danger-sm"
                    onClick={() => onDeleteQuote(item.id)}
                  >
                    Delete
                  </button>
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
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
          >
            ← Prev
          </button>
          <span className="templates-pagination-info">
            Page {page} of {pageCount}
            <span className="templates-pagination-count"> ({history.length} total)</span>
          </span>
          <button
            type="button"
            className="btn-small btn-secondary"
            onClick={() => onPageChange(Math.min(pageCount, page + 1))}
            disabled={page === pageCount}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

export default QuoteHistoryPanel;
