import { useState, useEffect, useRef } from "react";
import { calculateProration } from "../utils/proration";
import { getPartsLibrary, getWarrantyPolicies } from "../storage";
import type { LibraryPart, WarrantyPolicy } from "../types/index";

const fmt = (n: number) => `$${n.toFixed(2)}`;

function badgeClass(warrantyPct: number): string {
  if (warrantyPct === 100) return "proration-badge--green";
  if (warrantyPct >= 50)   return "proration-badge--amber";
  return "proration-badge--red";
}

function PartSearch({
  onSelect,
}: {
  onSelect: (part: LibraryPart) => void;
}) {
  const [query, setQuery] = useState("");
  const [parts, setParts] = useState<LibraryPart[]>([]);
  const [results, setResults] = useState<LibraryPart[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getPartsLibrary().then(setParts);
  }, []);

  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) { setResults([]); return; }
    setResults(
      parts
        .filter((p) =>
          p.name.toLowerCase().includes(q) ||
          p.partNumber.toLowerCase().includes(q),
        )
        .slice(0, 8),
    );
  }, [query, parts]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setResults([]);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = (p: LibraryPart) => {
    onSelect(p);
    setQuery(p.name);
    setResults([]);
  };

  return (
    <div className="proration-part-search" ref={wrapRef}>
      <input
        type="text"
        placeholder="Search inventory by name or part #…"
        value={query}
        autoComplete="off"
        onChange={(e) => setQuery(e.target.value)}
      />
      {results.length > 0 && (
        <div className="dropdown-list">
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              className="dropdown-item"
              onMouseDown={() => select(p)}
            >
              <span className="proration-part-name">{p.name}</span>
              <span className="proration-part-meta">
                {p.partNumber && <span>{p.partNumber}</span>}
                <span>Cost: {fmt(p.cost)}</span>
                <span>List: {fmt(p.price)}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProrationCalculator() {
  const [policies, setPolicies] = useState<WarrantyPolicy[]>([]);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>("");
  const [dateBilled, setDateBilled] = useState("");
  const [mileage, setMileage] = useState("");
  const [cost, setCost] = useState("");
  const [list, setList] = useState("");
  const [laborCost, setLaborCost] = useState("");
  const [laborList, setLaborList] = useState("");

  useEffect(() => {
    getWarrantyPolicies().then((p) => {
      setPolicies(p);
      if (p.length > 0) setSelectedPolicyId(p[0].id);
    });
  }, []);

  const selectedPolicy = policies.find((p) => p.id === selectedPolicyId) ?? null;
  const hasMileageTiers = selectedPolicy?.tiers.some((t) => t.maxMiles !== null) ?? false;

  const costNum      = parseFloat(cost)      || 0;
  const listNum      = parseFloat(list)      || 0;
  const laborCostNum = parseFloat(laborCost) || 0;
  const laborListNum = parseFloat(laborList) || 0;
  const milesNum     = mileage ? parseFloat(mileage) : undefined;

  const ready = selectedPolicy && dateBilled && costNum > 0;

  const result = ready
    ? calculateProration(selectedPolicy, dateBilled, costNum, listNum, laborCostNum, laborListNum, milesNum)
    : null;

  const handlePartSelect = (p: LibraryPart) => {
    setCost(p.cost.toFixed(2));
    setList(p.price.toFixed(2));
    if (p.category && policies.length > 0) {
      const catLower = p.category.toLowerCase();
      const subLower = (p.subcategory ?? "").toLowerCase();
      const match = policies.find((pol) => {
        if (!pol.category || pol.category.toLowerCase() !== catLower) return false;
        if (pol.subcategory.length > 0 && !pol.subcategory.some((s) => s.toLowerCase() === subLower)) return false;
        return true;
      });
      if (match) setSelectedPolicyId(match.id);
    }
  };

  const showLaborResult = !!(result && laborCostNum > 0);

  return (
    <div className="page-card proration-card">
      <div className="proration-card-header">
        <h3>Proration Calculator</h3>
        <p className="proration-desc">
          Calculates warranty vs. customer pay amounts based on time and/or mileage elapsed since installation.
        </p>
      </div>

      <div className="proration-inputs">
        {policies.length > 0 && (
          <div className="proration-field">
            <label>Warranty Policy</label>
            <select
              aria-label="Warranty policy"
              className="proration-policy-select"
              value={selectedPolicyId}
              onChange={(e) => setSelectedPolicyId(e.target.value)}
            >
              {policies.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>
        )}

        <div className="proration-field">
          <label>Look Up from Inventory</label>
          <PartSearch onSelect={handlePartSelect} />
        </div>

        <div className="proration-field">
          <label>Date Billed / Installed</label>
          <input
            aria-label="Date Billed"
            type="date"
            value={dateBilled}
            max={new Date().toISOString().split("T")[0]}
            onChange={(e) => setDateBilled(e.target.value)}
          />
        </div>

        {hasMileageTiers && (
          <div className="proration-field">
            <label>Current Mileage</label>
            <input
              aria-label="Current vehicle mileage"
              type="number"
              min="0"
              step="1"
              placeholder="e.g. 45000"
              value={mileage}
              onChange={(e) => setMileage(e.target.value)}
            />
          </div>
        )}

        <div className="proration-row-two">
          <div className="proration-field">
            <label>Part Cost</label>
            <div className="proration-dollar-wrap">
              <span className="proration-dollar">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
              />
            </div>
          </div>
          <div className="proration-field">
            <label>Part Sell Price</label>
            <div className="proration-dollar-wrap">
              <span className="proration-dollar">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={list}
                onChange={(e) => setList(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="proration-row-two">
          <div className="proration-field">
            <label>
              Labor Cost
              <span className="proration-optional"> (optional)</span>
            </label>
            <div className="proration-dollar-wrap">
              <span className="proration-dollar">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={laborCost}
                onChange={(e) => setLaborCost(e.target.value)}
              />
            </div>
          </div>
          <div className="proration-field">
            <label>
              Labor Sell Price
              <span className="proration-optional"> (optional)</span>
            </label>
            <div className="proration-dollar-wrap">
              <span className="proration-dollar">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={laborList}
                onChange={(e) => setLaborList(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {result && (
        <div className="proration-result">
          <div className="proration-result-header">
            <div className="proration-months">
              <span className="proration-months-num">{result.monthsElapsed.toFixed(1)}</span>
              <span className="proration-months-label">months elapsed</span>
            </div>
            {milesNum !== undefined && (
              <div className="proration-months">
                <span className="proration-months-num">{milesNum.toLocaleString()}</span>
                <span className="proration-months-label">miles</span>
              </div>
            )}
            <span className={`proration-badge ${badgeClass(result.partsPct)}`}>
              {result.statusLabel}
            </span>
          </div>

          {result.tier === null ? (
            <div className="proration-none-msg">
              Out of warranty. Customer is responsible for the full amount.
            </div>
          ) : (
            <table className="proration-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Parts %</th>
                  <th>At Cost</th>
                  {listNum > 0 && <th>At List</th>}
                  {showLaborResult && <th>Labor %</th>}
                  {showLaborResult && <th>Labor Cost</th>}
                  {showLaborResult && laborListNum > 0 && <th>Labor List</th>}
                </tr>
              </thead>
              <tbody>
                <tr className="proration-row-warranty">
                  <td>Warranty Pays</td>
                  <td>{result.partsPct}%</td>
                  <td>{fmt(result.warrantyPaysCost)}</td>
                  {listNum > 0 && <td>—</td>}
                  {showLaborResult && <td>{result.laborPct}%</td>}
                  {showLaborResult && <td>{fmt(result.warrantyPaysLaborCost)}</td>}
                  {showLaborResult && laborListNum > 0 && <td>—</td>}
                </tr>
                <tr className="proration-row-customer">
                  <td>Customer Pays</td>
                  <td>{result.customerPartsPct}%</td>
                  <td>{fmt(result.customerPaysCost)}</td>
                  {listNum > 0 && <td>{fmt(result.customerPaysList)}</td>}
                  {showLaborResult && <td>{result.customerLaborPct}%</td>}
                  {showLaborResult && <td>{fmt(result.customerPaysLaborCost)}</td>}
                  {showLaborResult && laborListNum > 0 && <td>{fmt(result.customerPaysLaborList)}</td>}
                </tr>
              </tbody>
            </table>
          )}

        </div>
      )}
    </div>
  );
}
