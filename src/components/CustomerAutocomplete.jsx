import { useState, useEffect, useRef } from "react";
import { searchCustomers, saveCustomer } from "../storage";
import { formatPhone, formatPhoneInput } from "../utils/formatPhone";

export function CustomerAutocomplete({ customerName, phone, onNameChange, onPhoneChange, onCustomerSelect }) {
  const [nameQuery, setNameQuery] = useState(customerName);
  const [phoneQuery, setPhoneQuery] = useState(phone);
  const [activeField, setActiveField] = useState(null); // 'name' | 'phone'
  const [results, setResults] = useState([]);
  const containerRef = useRef(null);

  // Keep local state in sync when parent resets the form
  useEffect(() => { setNameQuery(customerName); }, [customerName]);
  useEffect(() => { setPhoneQuery(formatPhone(phone)); }, [phone]);

  const runSearch = (term, field) => {
    if (term.trim().length === 0) {
      setResults([]);
      return;
    }
    setResults(searchCustomers(term));
    setActiveField(field);
  };

  const selectCustomer = (c) => {
    const formatted = formatPhone(c.phone);
    setNameQuery(c.name);
    setPhoneQuery(formatted);
    onNameChange(c.name);
    onPhoneChange(formatted);
    onCustomerSelect?.(c);
    setResults([]);
    setActiveField(null);
  };

  const createNew = () => {
    const name = nameQuery.trim();
    const ph = phoneQuery.trim();
    if (!name) return;
    const c = saveCustomer({ name, phone: ph });
    selectCustomer(c);
  };

  const handleNameChange = (e) => {
    const v = e.target.value;
    setNameQuery(v);
    onNameChange(v);
    if (!v.trim()) onCustomerSelect?.(null);
    runSearch(v, "name");
  };

  const handlePhoneChange = (e) => {
    const v = formatPhoneInput(e.target.value);
    setPhoneQuery(v);
    onPhoneChange(v);
    runSearch(v, "phone");
  };

  const closeDropdown = () => {
    setResults([]);
    setActiveField(null);
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        closeDropdown();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const showDropdown = activeField !== null && (results.length > 0 || nameQuery.trim().length > 0);
  const digits = (s) => String(s || "").replace(/\D/g, "");
  const hasExactMatch = results.some(
    (c) =>
      c.name.toLowerCase() === nameQuery.trim().toLowerCase() &&
      digits(c.phone) === digits(phoneQuery)
  );

  return (
    <div className="customer-autocomplete" ref={containerRef}>
      <div className="form-group customer-name-group">
        <label htmlFor="customer-name">Customer Name</label>
        <input
          id="customer-name"
          type="text"
          placeholder="Enter customer name"
          value={nameQuery}
          autoComplete="off"
          onChange={handleNameChange}
          onFocus={() => nameQuery.trim() && runSearch(nameQuery, "name")}
        />
      </div>
      <div className="form-group phone-group">
        <label htmlFor="customer-phone">Phone</label>
        <input
          id="customer-phone"
          type="tel"
          placeholder="Phone number"
          value={phoneQuery}
          autoComplete="off"
          onChange={handlePhoneChange}
          onFocus={() => phoneQuery.trim() && runSearch(phoneQuery, "phone")}
        />
      </div>

      {showDropdown && (
        <div className="customer-dropdown">
          {results.map((c) => (
            <button
              key={c.id}
              type="button"
              className="customer-dropdown-item"
              onMouseDown={() => selectCustomer(c)}
            >
              <span className="customer-dropdown-name">{c.name}</span>
              {c.phone && (
                <span className="customer-dropdown-phone">{formatPhone(c.phone)}</span>
              )}
            </button>
          ))}

          {!hasExactMatch && nameQuery.trim() && (
            <button
              type="button"
              className="customer-dropdown-item customer-dropdown-new"
              onMouseDown={createNew}
            >
              <span>Save &ldquo;{nameQuery.trim()}&rdquo; as new customer</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
