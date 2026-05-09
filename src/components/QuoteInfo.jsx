import { CustomerAutocomplete } from "./CustomerAutocomplete";

function QuoteInfo({ quoteNumber, customerName, setCustomerName, phone, setPhone, onNewQuote, onCustomerSelect }) {
  return (
    <div className="quote-info-section">
      <div className="quote-number">
        <span>Quote #</span>
        <span>{quoteNumber}</span>
      </div>
      <CustomerAutocomplete
        customerName={customerName}
        phone={phone}
        onNameChange={setCustomerName}
        onPhoneChange={setPhone}
        onCustomerSelect={onCustomerSelect}
      />
      <button type="button" className="btn-small btn-secondary" onClick={onNewQuote}>
        New Quote
      </button>
    </div>
  );
}

export default QuoteInfo;
