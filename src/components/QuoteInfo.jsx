function QuoteInfo({ quoteNumber, customerName, setCustomerName, phone, setPhone, onNewQuote }) {
  return (
    <div className="quote-info-section">
      <div className="quote-number">
        <span>Quote #</span>
        <span>{quoteNumber}</span>
      </div>
      <div className="form-group customer-name-group">
        <label htmlFor="customer-name">Customer Name</label>
        <input
          id="customer-name"
          type="text"
          placeholder="Enter customer name"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
        />
      </div>
      <div className="form-group phone-group">
        <label htmlFor="customer-phone">Phone</label>
        <input
          id="customer-phone"
          type="tel"
          placeholder="Phone number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      <button type="button" className="btn-small btn-secondary" onClick={onNewQuote}>
        New Quote
      </button>
    </div>
  );
}

export default QuoteInfo;
