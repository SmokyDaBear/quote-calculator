function HistorySidebar({ history, searchTerm, onSearch, onLoadQuote, onDeleteQuote }) {
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
        {history.length === 0 ? (
          <div className="history-empty">No saved quotes yet.</div>
        ) : (
          history.map((item) => (
            <div
              key={item.id}
              className="history-item"
              onClick={() => onLoadQuote(item.id)}
            >
              <div className="history-item-header">
                <span className="history-quote-num">#{item.id}</span>
                <div className="history-item-actions">
                  <span className="history-total">${item.grandTotal.toFixed(2)}</span>
                  <button
                    className="btn-remove history-delete-btn"
                    title="Delete quote"
                    onClick={(e) => { e.stopPropagation(); onDeleteQuote(item.id); }}
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="history-customer">{item.customerName}</div>
              {item.phone && <div className="history-phone">{item.phone}</div>}
              <div className="history-date">
                {new Date(item.timestamp).toLocaleDateString()}
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

export default HistorySidebar;
