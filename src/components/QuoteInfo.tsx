import { CustomerAutocomplete } from "./CustomerAutocomplete";
import { formatPhone } from "../utils/formatPhone";
import type { Customer } from "../types/index";

function QuoteInfo({ quoteNumber, customerName, setCustomerName, phone, setPhone, onNewQuote, onCustomerSelect, selectedCustomer }: {
  quoteNumber: number;
  customerName: string;
  setCustomerName: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  onNewQuote: () => void;
  onCustomerSelect: (c: Customer | null) => void;
  selectedCustomer?: Customer | null;
}) {
  const hasDetails = selectedCustomer && (
    selectedCustomer.email ||
    selectedCustomer.address ||
    selectedCustomer.notes ||
    selectedCustomer.phones.length > 1
  );

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
      {hasDetails && (
        <div className="quote-customer-panel">
          {selectedCustomer.phones.slice(1).map((p, i) => (
            <div key={i} className="quote-customer-detail">
              <span className="quote-customer-detail-label">{p.label}</span>
              <span>{formatPhone(p.number)}</span>
            </div>
          ))}
          {selectedCustomer.email && (
            <div className="quote-customer-detail">
              <span className="quote-customer-detail-label">Email</span>
              <span>{selectedCustomer.email}</span>
            </div>
          )}
          {selectedCustomer.address && (
            <div className="quote-customer-detail">
              <span className="quote-customer-detail-label">Address</span>
              <span>{selectedCustomer.address}</span>
            </div>
          )}
          {selectedCustomer.notes && (
            <div className="quote-customer-detail quote-customer-notes">
              <span className="quote-customer-detail-label">Notes</span>
              <span>{selectedCustomer.notes}</span>
            </div>
          )}
        </div>
      )}
      <button type="button" className="btn-small btn-secondary" onClick={onNewQuote}>
        New Quote
      </button>
    </div>
  );
}

export default QuoteInfo;
