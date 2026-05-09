import { useState, useRef } from "react";
import {
  saveLibraryPart,
  getPartsLibrary,
  saveJobTemplate,
  getJobTemplates,
  saveCustomer,
  getCustomers,
} from "../storage";

const PART_FIELDS = [
  { key: "name",        label: "Name",        required: true  },
  { key: "partNumber",  label: "Part Number",  required: false },
  { key: "price",       label: "Price",        required: false },
  { key: "description", label: "Description",  required: false },
];

const TEMPLATE_FIELDS = [
  { key: "name",        label: "Name",           required: true  },
  { key: "description", label: "Description",    required: false },
  { key: "laborHrs",    label: "Labor Hours",    required: false },
  { key: "laborCost",   label: "Labor Cost ($)", required: false },
  { key: "parts",       label: "Parts (JSON)",   required: false, json: true },
];

const CUSTOMER_FIELDS = [
  { key: "name",  label: "Name",  required: true  },
  { key: "phone", label: "Phone", required: false },
];

const ALIASES = {
  name:        ["title", "item", "partname", "part_name", "itemname", "label", "customer", "fullname", "full_name"],
  partNumber:  ["mpn", "sku", "partnumber", "part_number", "itemnumber", "alternatepn", "pn", "part#"],
  price:       ["cost", "sellprice", "sell_price", "unitprice", "unit_price", "retail", "msrp"],
  description: ["desc", "notes", "details", "info", "summary"],
  laborHrs:    ["hours", "labor_hrs", "labourhrs", "labour_hours", "labor_hours", "hrs", "time"],
  laborCost:   ["labor", "labour", "labor_cost", "labour_cost", "laborcost"],
  phone:       ["tel", "telephone", "mobile", "cell", "phonenumber", "phone_number", "contact", "number"],
};

function normalize(s) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function autoMatch(appKey, csvHeaders) {
  const normApp = normalize(appKey);
  const exact = csvHeaders.find((h) => normalize(h) === normApp);
  if (exact) return exact;
  const aliases = ALIASES[appKey] || [];
  return csvHeaders.find((h) => aliases.includes(normalize(h))) || "";
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { headers: [], rows: [] };

  const parseRow = (line) => {
    const result = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseRow(lines[0]);
  const rows = lines
    .slice(1)
    .filter((l) => l.trim())
    .map((line) => {
      const values = parseRow(line);
      const obj = {};
      headers.forEach((h, i) => { obj[h] = values[i] ?? ""; });
      return obj;
    });
  return { headers, rows };
}

function toCSV(rows, fields) {
  const headers = fields.map((f) => f.key);
  const escape = (val) => {
    const s =
      val !== null && typeof val === "object"
        ? JSON.stringify(val)
        : String(val ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
}

function downloadCSV(filename, content) {
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function CSVLoader({ type = "parts", onRefresh, onToast }) {
  const fileRef = useRef(null);
  const [stage, setStage] = useState("idle"); // idle | mapping | done
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvRows, setCsvRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [importCount, setImportCount] = useState(0);

  const fields = type === "parts" ? PART_FIELDS : type === "customers" ? CUSTOMER_FIELDS : TEMPLATE_FIELDS;
  const mappableFields = fields.filter((f) => !f.json);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const { headers, rows } = parseCSV(ev.target.result);
      if (!headers.length) {
        onToast?.("Could not parse CSV — check the file format.", "error");
        return;
      }
      setCsvHeaders(headers);
      setCsvRows(rows);
      const initial = {};
      fields.filter((f) => !f.json).forEach(({ key }) => { initial[key] = autoMatch(key, headers); });
      setMapping(initial);
      setStage("mapping");
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleImport = () => {
    if (!mapping.name) {
      onToast?.('Map the "Name" field before importing.', "error");
      return;
    }
    let count = 0;
    for (const row of csvRows) {
      const name = row[mapping.name]?.trim();
      if (!name) continue;
      if (type === "customers") {
        saveCustomer({
          name,
          phone: mapping.phone ? row[mapping.phone] || "" : "",
        });
      } else if (type === "parts") {
        saveLibraryPart({
          name,
          partNumber:  mapping.partNumber  ? row[mapping.partNumber]  || "" : "",
          price:       mapping.price       ? Number(row[mapping.price]) || 0 : 0,
          description: mapping.description ? row[mapping.description] || "" : "",
        });
      } else {
        const partsCol = csvHeaders.find((h) => normalize(h) === "parts");
        let parts = [];
        if (partsCol && row[partsCol]) {
          try {
            const parsed = JSON.parse(row[partsCol]);
            if (Array.isArray(parsed)) parts = parsed;
          } catch { /* malformed JSON — import without parts */ }
        }
        saveJobTemplate({
          name,
          description: mapping.description ? row[mapping.description] || "" : "",
          laborHrs:    mapping.laborHrs    ? Number(row[mapping.laborHrs])  || 0 : 0,
          laborCost:   mapping.laborCost   ? Number(row[mapping.laborCost]) || 0 : 0,
          parts,
        });
      }
      count++;
    }
    setImportCount(count);
    setStage("done");
    onRefresh?.();
    const noun = type === "parts" ? "part" : type === "customers" ? "customer" : "template";
    onToast?.(`Imported ${count} ${noun}${count !== 1 ? "s" : ""}.`);
  };

  const handleDownload = () => {
    if (type === "customers") {
      downloadCSV("customers.csv", toCSV(getCustomers(), CUSTOMER_FIELDS));
    } else if (type === "parts") {
      downloadCSV("inventory.csv", toCSV(getPartsLibrary(), PART_FIELDS));
    } else {
      downloadCSV("templates.csv", toCSV(getJobTemplates(), TEMPLATE_FIELDS));
    }
  };

  const reset = () => {
    setStage("idle");
    setCsvHeaders([]);
    setCsvRows([]);
    setMapping({});
  };

  if (stage === "mapping") {
    return (
      <div className="csv-panel page-card">
        <div className="csv-panel-header">
          <span className="csv-panel-title">Map CSV Columns</span>
          <span className="csv-panel-subtitle">
            {csvRows.length} row{csvRows.length !== 1 ? "s" : ""} detected —
            match each field to a column from your file.
          </span>
        </div>

        <div className="csv-mapping-table">
          {mappableFields.map(({ key, label, required }) => (
            <div key={key} className="csv-mapping-row">
              <span className="csv-field-label">
                {label}
                {required && <span className="csv-required"> *</span>}
              </span>
              <span className="csv-arrow">→</span>
              <select
                className="csv-mapping-select"
                value={mapping[key] || ""}
                onChange={(e) =>
                  setMapping((m) => ({ ...m, [key]: e.target.value }))
                }
              >
                <option value="">— skip —</option>
                {csvHeaders.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {csvRows.length > 0 && (
          <div className="csv-preview">
            <span className="csv-preview-label">Preview</span>
            <div className="csv-preview-rows">
              {csvRows.slice(0, 3).map((row, i) => (
                <div key={i} className="csv-preview-row">
                  {mappableFields.map(({ key, label }) =>
                    mapping[key] ? (
                      <span key={key} className="csv-preview-cell">
                        <span className="csv-preview-key">{label}:</span>
                        <span className="csv-preview-val">
                          {row[mapping[key]] || "—"}
                        </span>
                      </span>
                    ) : null
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="csv-actions">
          <button className="btn-small btn-secondary" onClick={reset}>
            Cancel
          </button>
          <button className="btn-small btn-success" onClick={handleImport}>
            Import {csvRows.length} Row{csvRows.length !== 1 ? "s" : ""}
          </button>
        </div>
      </div>
    );
  }

  if (stage === "done") {
    return (
      <div className="csv-done page-card">
        <span className="csv-done-msg">
          ✓ Imported {importCount}{" "}
          {type === "parts" ? "part" : type === "customers" ? "customer" : "template"}
          {importCount !== 1 ? "s" : ""}.
        </span>
        <button className="btn-small btn-secondary" onClick={reset}>
          Import More
        </button>
      </div>
    );
  }

  return (
    <div className="csv-loader">
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
      <button
        className="btn-small btn-secondary"
        onClick={() => fileRef.current.click()}
      >
        ↑ Import CSV
      </button>
      <button className="btn-small btn-secondary" onClick={handleDownload}>
        ↓ Export CSV
      </button>
    </div>
  );
}
