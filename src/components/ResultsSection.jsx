const fmt = (n) => `$${n.toFixed(2)}`;

function ResultsSection({ totals }) {
  return (
    <div className="results-section">
      <h3>Quote Summary</h3>
      <div className="job-summaries">
        {totals.jobSummaries.map((s) => (
          <div key={s.id} className="job-summary">
            <strong>{s.name}</strong>
            <span>
              Labor: {fmt(s.laborCost)} ({s.laborHrs.toFixed(1)} hrs) | Parts: {fmt(s.partsTotal)} | SS: {fmt(s.ssTotal)}
            </span>
          </div>
        ))}
      </div>
      <div className="totals-grid">
        <div className="total-row">
          <span>Total Labor Cost:</span>
          <span>{fmt(totals.laborCost)}</span>
        </div>
        <div className="total-row">
          <span>Total Labor Hours:</span>
          <span>{totals.laborHours.toFixed(1)} hrs</span>
        </div>
        <div className="total-row">
          <span>Total Parts:</span>
          <span>{fmt(totals.partsTotal)}</span>
        </div>
        <div className="total-row">
          <span>Total Shop Supplies:</span>
          <span>{fmt(totals.ssTotal)}</span>
        </div>
        <div className="total-row">
          <span>Total Tax:</span>
          <span>{fmt(totals.taxTotal)}</span>
        </div>
        {totals.discountAmount > 0 && (
          <div className="total-row discount-row">
            <span>
              Discount
              {totals.discount?.type === "percentage"
                ? ` (${totals.discount.value}% on ${totals.discount.appliesTo})`
                : ` (on ${totals.discount?.appliesTo})`}
              :
            </span>
            <span>−{fmt(totals.discountAmount)}</span>
          </div>
        )}
        <div className="total-row grand-total">
          <span>Grand Total:</span>
          <span>{fmt(totals.grandTotal)}</span>
        </div>
      </div>
    </div>
  );
}

export default ResultsSection;
