import { CustomerAutocomplete } from "./CustomerAutocomplete";

function QuoteInfo({ quoteNumber, customerName, setCustomerName, phone, setPhone, onNewQuote, onCustomerSelect }: {
  quoteNumber: number;
  customerName: string;
  setCustomerName: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  onNewQuote: () => void;
  onCustomerSelect: (c: { id: string } | null) => void;
}) {
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
