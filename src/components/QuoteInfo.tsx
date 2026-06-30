import { useState, useEffect } from "react";
import { CustomerSearch } from "./CustomerAutocomplete";
import { CustomerFormFields } from "./CustomerFormFields";
import type { CustomerFormData } from "./CustomerFormFields";
import { formatPhone } from "../utils/formatPhone";
import { PhoneCallIcon, EmailIcon } from "../icons";
import type { Customer } from "../types/index";

function CustomerCard({
  data,
  selectedCustomer,
  onEdit,
  onClear,
}: {
  data: CustomerFormData;
  selectedCustomer: Customer | null;
  onEdit: () => void;
  onClear: () => void;
}) {
  const phones = data.phones.filter((p) => p.number);
  return (
    <div className="info-card">
      <div className="info-card-header">
        <strong className="info-card-name">{data.name}</strong>
        <div className="info-card-actions">
          <button type="button" className="btn-small btn-secondary" onClick={onEdit}>
            Edit
          </button>
          <button type="button" className="btn-remove" onClick={onClear} title="Remove customer">
            ×
          </button>
        </div>
      </div>
      <div className="info-card-body">
        {phones.map((p, i) => (
          <div key={i} className="info-card-row">
            <span className="info-card-text">{formatPhone(p.number)}</span>
            <a
              href={`tel:${p.number.replace(/\D/g, "")}`}
              className="info-card-action-btn"
              title={`Call ${formatPhone(p.number)}`}
            >
              <PhoneCallIcon />
            </a>
          </div>
        ))}
        {data.email && (
          <div className="info-card-row">
            <span className="info-card-text">{data.email}</span>
            <a
              href={`mailto:${data.email}`}
              className="info-card-action-btn"
              title={`Email ${data.email}`}
            >
              <EmailIcon />
            </a>
          </div>
        )}
        {data.address && (
          <div className="info-card-row">
            <span className="info-card-text">{data.address}</span>
          </div>
        )}
        {data.notes && (
          <div className="info-card-row">
            <span className="info-card-text info-card-notes">{data.notes}</span>
          </div>
        )}
        {!data.taxable && (
          <div className="info-card-row">
            <span className="customer-tax-exempt-badge">
              Tax Exempt{data.taxId ? ` — ${data.taxId}` : ""}
            </span>
          </div>
        )}
        {selectedCustomer && (
          <div className="info-card-linked">Linked to customer record</div>
        )}
      </div>
    </div>
  );
}

function QuoteInfo({
  customerData,
  onCustomerDataChange,
  onCustomerSelect,
  selectedCustomer,
  onSaveCustomer,
}: {
  customerData: CustomerFormData;
  onCustomerDataChange: (d: CustomerFormData) => void;
  onCustomerSelect: (c: Customer | null) => void;
  selectedCustomer?: Customer | null;
  /** When provided, shows a Save/Update Customer button in the form view. */
  onSaveCustomer?: () => void | Promise<void>;
}) {
  const hasCustomer = !!customerData.name.trim();
  const [isEditing, setIsEditing] = useState(!hasCustomer);

  // When a quote is loaded / customer cleared, sync edit mode
  useEffect(() => {
    if (!customerData.name.trim()) setIsEditing(true);
  }, [customerData.name]);

  const handleCustomerSelect = (c: Customer) => {
    onCustomerDataChange({
      name: c.name,
      phones: c.phones?.length > 0 ? c.phones : [{ label: "Mobile", number: "" }],
      email: c.email || "",
      address: c.address || "",
      notes: c.notes || "",
      taxable: c.taxable !== false,
      taxId: c.taxId || "",
    });
    onCustomerSelect(c);
    setIsEditing(false);
  };

  const handleClear = () => {
    onCustomerSelect(null);
    onCustomerDataChange({ name: "", phones: [{ label: "Mobile", number: "" }], email: "", address: "", notes: "", taxable: true, taxId: "" });
    setIsEditing(true);
  };

  const showForm = isEditing || !hasCustomer;

  return (
    <div className="quote-info-section">
      <h3 className="section-heading">Customer</h3>

      {showForm ? (
        <>
          <CustomerSearch
            selectedCustomer={selectedCustomer ?? null}
            onSelect={handleCustomerSelect}
            onClear={() => onCustomerSelect(null)}
          />
          <CustomerFormFields
            value={customerData}
            onChange={onCustomerDataChange}
          />
          {hasCustomer && (
            <div className="info-form-actions">
              {onSaveCustomer && (
                <button
                  type="button"
                  className="btn-small btn-success"
                  onClick={() => onSaveCustomer()}
                >
                  {selectedCustomer ? "Update Customer" : "Save Customer"}
                </button>
              )}
              <button
                type="button"
                className="btn-small btn-secondary info-done-btn"
                onClick={() => setIsEditing(false)}
              >
                Done
              </button>
            </div>
          )}
        </>
      ) : (
        <CustomerCard
          data={customerData}
          selectedCustomer={selectedCustomer ?? null}
          onEdit={() => setIsEditing(true)}
          onClear={handleClear}
        />
      )}
    </div>
  );
}

export default QuoteInfo;
