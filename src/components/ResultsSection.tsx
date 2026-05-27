type JobSummary = { id: number; name: string; laborCost: number; laborHrs: number; partsTotal: number; subtotal: number };
type Discount = { type?: string; value?: string; appliesTo?: string };
type Totals = {
  jobSummaries: JobSummary[];
  laborCost: number;
  laborHours: number;
  partsTotal: number;
  ssTotal: number;
  autoSsTotal?: number;
  taxTotal: number;
  discountAmount: number;
  discount: Discount;
  warrantyTotal?: number;
  grandTotal: number;
};

const fmt = (n: number) => `$${n.toFixed(2)}`;

function ResultsSection({ totals }: { totals: Totals }) {
  return (
    <div className="results-section">
      <h3>Quote Summary</h3>
      <div className="job-summaries">
        {totals.jobSummaries.map((s) => (
          <div key={s.id} className="job-summary">
            <strong>{s.name}</strong>
            <span>
              Labor: {fmt(s.laborCost)} ({s.laborHrs.toFixed(1)} hrs) | Parts: {fmt(s.partsTotal)} | Subtotal: {fmt(s.subtotal)}
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
          <span>
            Total Shop Supplies:
            {totals.autoSsTotal != null && totals.ssTotal !== totals.autoSsTotal && (
              <span className="ss-override-badge">override</span>
            )}
          </span>
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
        {(totals.warrantyTotal ?? 0) > 0 && (
          <div className="total-row warranty-row">
            <span>Warranty Coverage:</span>
            <span>−{fmt(totals.warrantyTotal!)}</span>
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
