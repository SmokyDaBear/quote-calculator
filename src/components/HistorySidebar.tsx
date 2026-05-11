import type { QuoteIndexEntry } from "../types/index";

function formatVehicle(v: unknown): string {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object") {
    const veh = v as {
      year?: string;
      make?: string;
      model?: string;
      trim?: string;
    };
    return [veh.year, veh.make, veh.model, veh.trim].filter(Boolean).join(" ");
  }
  return "";
}

type THistorySidebarProps = {
  history: QuoteIndexEntry[];
  searchTerm: string;
  onSearch: (term: string) => void;
  onLoadQuote: (id: string) => void;
  onDeleteQuote: (id: string) => void;
};

function HistorySidebar({
  history,
  searchTerm,
  onSearch,
  onLoadQuote,
  onDeleteQuote,
}: THistorySidebarProps) {
  return (
    <aside className="history-sidebar">
      <div className="history-header">
        <h3>Quote History</h3>
        <input
          id="history-search"
          type="text"
          placeholder="Search quotes..."
          value={searchTerm}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
      <div className="history-list">
        {history.length === 0 ?
          <div className="history-empty">No saved quotes yet.</div>
        : history.map((item) => (
            <div
              key={item.id}
              className="history-item"
              onClick={() => onLoadQuote(item.id)}
            >
              <div className="history-item-header">
                <span className="history-quote-num">#{item.id}</span>
                <div className="history-item-actions">
                  <span className="history-total">
                    ${item.total.toFixed(2)}
                  </span>
                  <button
                    type="button"
                    className="btn-remove history-delete-btn"
                    title="Delete quote"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteQuote(item.id);
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="history-customer">{item.customer}</div>
              {formatVehicle(item.vehicle) && (
                <div className="history-phone">
                  {formatVehicle(item.vehicle)}
                </div>
              )}
              <div className="history-date">
                {new Date(item.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))
        }
      </div>
    </aside>
  );
}

export default HistorySidebar;
