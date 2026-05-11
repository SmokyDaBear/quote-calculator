import { useState, useEffect, useRef } from "react";
import { searchCustomers, saveCustomer } from "../storage";
import { formatPhone, formatPhoneInput } from "../utils/formatPhone";
import type { Customer } from "../types/index";

export function CustomerAutocomplete({ customerName, phone, onNameChange, onPhoneChange, onCustomerSelect }: {
  customerName: string;
  phone: string;
  onNameChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  onCustomerSelect?: (c: Customer | null) => void;
}) {
  const [nameQuery, setNameQuery] = useState(customerName);
  const [phoneQuery, setPhoneQuery] = useState(phone);
  const [activeField, setActiveField] = useState<'name' | 'phone' | null>(null);
  const [results, setResults] = useState<Customer[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const seqRef = useRef(0);

  useEffect(() => { setNameQuery(customerName); }, [customerName]);
  useEffect(() => { setPhoneQuery(formatPhone(phone)); }, [phone]);

  const runSearch = (term: string, field: 'name' | 'phone') => {
    if (term.trim().length === 0) { setResults([]); return; }
    const seq = ++seqRef.current;
    searchCustomers(term).then((found) => {
      if (seq !== seqRef.current) return;
      setResults(found);
      setActiveField(field);
    });
  };

  const primaryPhone = (c: Customer) =>
    c.phones.length > 0 ? c.phones[0].number : '';

  const selectCustomer = (c: Customer) => {
    const formatted = formatPhone(primaryPhone(c));
    setNameQuery(c.name);
    setPhoneQuery(formatted);
    onNameChange(c.name);
    onPhoneChange(formatted);
    onCustomerSelect?.(c);
    setResults([]);
    setActiveField(null);
  };

  const createNew = async () => {
    const name = nameQuery.trim();
    const ph = phoneQuery.trim();
    if (!name) return;
    const c = await saveCustomer({
      name,
      phones: ph ? [{ label: 'Phone', number: ph }] : [],
    });
    selectCustomer(c);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setNameQuery(v);
    onNameChange(v);
    if (!v.trim()) onCustomerSelect?.(null);
    runSearch(v, "name");
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = formatPhoneInput(e.target.value);
    setPhoneQuery(v);
    onPhoneChange(v);
    runSearch(v, "phone");
  };

  const closeDropdown = () => { setResults([]); setActiveField(null); };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeDropdown();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const showDropdown = activeField !== null && (results.length > 0 || nameQuery.trim().length > 0);
  const digits = (s: string) => String(s || "").replace(/\D/g, "");
  const hasExactMatch = results.some(
    (c) =>
      c.name.toLowerCase() === nameQuery.trim().toLowerCase() &&
      digits(primaryPhone(c)) === digits(phoneQuery)
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
              {c.phones.length > 0 && (
                <span className="customer-dropdown-phone">{formatPhone(c.phones[0].number)}</span>
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
