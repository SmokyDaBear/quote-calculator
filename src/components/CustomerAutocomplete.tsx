import { useState, useEffect, useRef } from "react";
import { searchCustomers } from "../storage";
import { formatPhone } from "../utils/formatPhone";
import type { Customer } from "../types/index";

export function CustomerSearch({
  selectedCustomer,
  onSelect,
  onClear,
}: {
  selectedCustomer: Customer | null;
  onSelect: (c: Customer) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const seqRef = useRef(0);

  const runSearch = (term: string) => {
    if (!term.trim()) { setResults([]); return; }
    const seq = ++seqRef.current;
    searchCustomers(term).then((found) => {
      if (seq !== seqRef.current) return;
      setResults(found);
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    setOpen(true);
    runSearch(v);
  };

  const handleSelect = (c: Customer) => {
    setQuery("");
    setResults([]);
    setOpen(false);
    onSelect(c);
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setOpen(false);
    onClear();
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const primaryPhone = (c: Customer) =>
    c.phones.length > 0 ? c.phones[0].number : "";

  const showDropdown = open && query.trim().length > 0;

  return (
    <div className="customer-search-wrap" ref={containerRef}>
      {selectedCustomer ? (
        <div className="customer-linked-badge">
          <span className="customer-linked-name">{selectedCustomer.name}</span>
          <button
            type="button"
            className="customer-linked-clear"
            onClick={handleClear}
            title="Unlink customer"
          >
            ×
          </button>
        </div>
      ) : (
        <div className="customer-search-input-wrap">
          <input
            type="text"
            className="customer-search-input"
            placeholder="Search customers by name or phone…"
            value={query}
            autoComplete="off"
            onChange={handleChange}
            onFocus={() => query.trim() && setOpen(true)}
          />
        </div>
      )}

      {showDropdown && (
        <div className="dropdown-list">
          {results.map((c) => (
            <button
              key={c.id}
              type="button"
              className="dropdown-item customer-dropdown-item"
              onMouseDown={() => handleSelect(c)}
            >
              <span className="customer-dropdown-name">{c.name}</span>
              {c.phones.length > 0 && (
                <span className="customer-dropdown-phone">{formatPhone(primaryPhone(c))}</span>
              )}
            </button>
          ))}
          {results.length === 0 && query.trim() && (
            <div className="customer-dropdown-empty">No customers found for "{query}"</div>
          )}
        </div>
      )}
    </div>
  );
}
