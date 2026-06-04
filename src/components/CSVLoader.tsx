import { useState, useRef } from "react";
import {
  saveLibraryPart,
  getPartsLibrary,
  saveJobTemplate,
  getJobTemplates,
  saveCustomer,
  getCustomers,
  getAllVehicles,
  saveVehicle,
  saveVendor,
  getVendors,
} from "../storage";

type CsvField = {
  key: string;
  label: string;
  required: boolean;
  json?: boolean;
};

const PART_FIELDS: CsvField[] = [
  { key: "id", label: "ID", required: false },
  { key: "name", label: "Name", required: true },
  { key: "partNumber", label: "Part Number", required: false },
  { key: "cost", label: "Cost ($)", required: false },
  { key: "price", label: "Sell Price ($)", required: false },
  { key: "msrp", label: "MSRP ($)", required: false },
  { key: "category", label: "Category", required: false },
  { key: "subcategory", label: "Subcategory", required: false },
  { key: "description", label: "Description", required: false },
];

const TEMPLATE_FIELDS: CsvField[] = [
  { key: "id", label: "ID", required: false },
  { key: "name", label: "Name", required: true },
  { key: "jobCategory", label: "Job Category", required: false },
  { key: "description", label: "Description", required: false },
  { key: "laborHrs", label: "Labor Hours", required: false },
  { key: "laborCost", label: "Labor Cost ($)", required: false },
  { key: "opCode", label: "Op Code", required: false },
  { key: "mileageInterval", label: "Mileage Interval", required: false },
  { key: "quickJob", label: "Quick Job", required: false },
  { key: "parts", label: "Parts (JSON)", required: false, json: true },
];

const CUSTOMER_FIELDS: CsvField[] = [
  { key: "name", label: "Name", required: true },
  { key: "phone", label: "Phone", required: false },
  { key: "email", label: "Email", required: false },
  { key: "address", label: "Address", required: false },
  { key: "notes", label: "Notes", required: false },
];

const VEHICLE_FIELDS: CsvField[] = [
  { key: "customerId", label: "Customer ID", required: false },
  { key: "year", label: "Year", required: true },
  { key: "make", label: "Make", required: false },
  { key: "model", label: "Model", required: false },
  { key: "trim", label: "Trim", required: false },
  { key: "vin", label: "VIN", required: false },
  { key: "mileage", label: "Mileage", required: false },
  { key: "color", label: "Color", required: false },
  { key: "notes", label: "Notes", required: false },
];

const VENDOR_FIELDS: CsvField[] = [
  { key: "name", label: "Name", required: true },
  { key: "phone", label: "Phone", required: false },
  { key: "contact", label: "Contact Person", required: false },
  { key: "address", label: "Address", required: false },
  { key: "notes", label: "Notes", required: false },
];

const ALIASES: Record<string, string[]> = {
  name: [
    "title",
    "item",
    "partname",
    "part_name",
    "itemname",
    "label",
    "customer",
    "fullname",
    "full_name",
  ],
  partNumber: [
    "mpn",
    "sku",
    "partnumber",
    "part_number",
    "itemnumber",
    "alternatepn",
    "pn",
    "part#",
  ],
  cost: [
    "buycost",
    "buy_cost",
    "purchase_price",
    "wholesale",
    "dealer_cost",
    "net",
  ],
  price: [
    "sellprice",
    "sell_price",
    "unitprice",
    "unit_price",
    "retail",
    "selling_price",
  ],
  msrp: [
    "list",
    "listprice",
    "list_price",
    "manufacturer_price",
    "suggested_retail",
  ],
  category: ["cat", "type", "group", "part_type", "parttype"],
  subcategory: ["subcat", "sub_cat", "subtype", "sub_type", "sub_group"],
  description: ["desc", "notes", "details", "info", "summary"],
  jobCategory: ["category", "job_category", "service_category", "type", "servicetype"],
  laborHrs: [
    "hours",
    "labor_hrs",
    "labourhrs",
    "labour_hours",
    "labor_hours",
    "hrs",
    "time",
  ],
  laborCost: ["labor", "labour", "labor_cost", "labour_cost", "laborcost"],
  mileageInterval: [
    "mileage",
    "interval",
    "service_interval",
    "mi_interval",
    "miles",
  ],
  quickJob: ["quick", "quick_job", "favorite", "shortcut"],
  phone: [
    "tel",
    "telephone",
    "mobile",
    "cell",
    "phonenumber",
    "phone_number",
    "contact",
    "number",
  ],
  email: ["emailaddress", "email_address", "e_mail", "mail"],
  address: ["addr", "street", "streetaddress", "street_address", "location"],
  notes: ["note", "comments", "comment", "remarks", "memo", "internal_notes"],
  customerId: ["customer_id", "customerid", "ownerid", "owner_id"],
  year: ["modelyear", "model_year", "yr", "vehicleyear"],
  make: ["manufacturer", "brand", "carmake"],
  model: ["modelname", "model_name", "carmodel"],
  vin: ["vinnumber", "vin_number", "vehicleidentificationnumber"],
  mileage: ["miles", "odometer", "km", "kilometers", "odoreading"],
  color: ["colour", "exteriorcolor", "exterior_color", "paint"],
  contact: ["contactperson", "contact_person", "rep", "salesrep", "sales_rep"],
};

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function autoMatch(appKey: string, csvHeaders: string[]): string {
  const normApp = normalize(appKey);
  const exact = csvHeaders.find((h) => normalize(h) === normApp);
  if (exact) return exact;
  const aliases = ALIASES[appKey] || [];
  return csvHeaders.find((h) => aliases.includes(normalize(h))) || "";
}

export function parseCSV(text: string): {
  headers: string[];
  rows: Record<string, string>[];
} {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { headers: [], rows: [] };

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else inQuotes = !inQuotes;
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
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => {
        obj[h] = values[i] ?? "";
      });
      return obj;
    });
  return { headers, rows };
}

export function objectsToCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const keySet = new Set<string>();
  for (const row of rows) for (const k of Object.keys(row)) keySet.add(k);
  const headers = [...keySet];
  const escape = (val: unknown): string => {
    const s =
      val !== null && typeof val === "object" ?
        JSON.stringify(val)
      : String(val ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n") ?
        `"${s.replace(/"/g, '""')}"`
      : s;
  };
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
}

export function downloadCSV(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportAllDataCSV(): Promise<void> {
  const [parts, templates, customers, vehicles, vendors] = await Promise.all([
    getPartsLibrary(),
    getJobTemplates(),
    getCustomers(),
    getAllVehicles(),
    getVendors(),
  ]);
  downloadCSV('inventory.csv', objectsToCSV(parts as unknown as Record<string, unknown>[]));
  downloadCSV(
    'templates.csv',
    objectsToCSV(
      templates.map((t) => ({
        id: t.id,
        name: t.name,
        jobCategory: t.jobCategory || '',
        description: t.description || '',
        laborHrs: t.laborHrs,
        laborCost: t.laborCost,
        mileageInterval: t.mileageInterval ?? '',
        quickJob: t.quickJob ?? false,
        parts: JSON.stringify(t.parts),
      })),
    ),
  );
  downloadCSV(
    'customers.csv',
    objectsToCSV(
      customers.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phones?.[0]?.number || '',
        email: c.email || '',
        address: c.address || '',
        notes: c.notes || '',
      })),
    ),
  );
  downloadCSV(
    'vehicles.csv',
    objectsToCSV(
      vehicles.map((v) => ({
        id: v.id,
        customerId: v.customerId,
        year: v.year,
        make: v.make,
        model: v.model,
        trim: v.trim,
        vin: v.vin,
        mileage: v.mileage,
        color: v.color,
        notes: v.notes,
      })),
    ),
  );
  downloadCSV(
    'vendors.csv',
    objectsToCSV(
      vendors.map((v) => ({
        id: v.id,
        name: v.name,
        phone: v.phones?.[0]?.number || '',
        contact: v.contact || '',
        address: v.address || '',
        notes: v.notes || '',
      })),
    ),
  );
}

export function CSVLoader({
  type = "parts",
  onRefresh,
  onToast,
}: {
  type?: "parts" | "templates" | "customers" | "vehicles" | "vendors";
  onRefresh?: () => void;
  onToast?: (msg: string, type?: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<"idle" | "mapping" | "done">("idle");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importCount, setImportCount] = useState(0);

  const fields =
    type === "parts" ? PART_FIELDS
    : type === "customers" ? CUSTOMER_FIELDS
    : type === "vehicles" ? VEHICLE_FIELDS
    : type === "vendors" ? VENDOR_FIELDS
    : TEMPLATE_FIELDS;
  const mappableFields = fields.filter((f) => !f.json);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const { headers, rows } = parseCSV(
        (ev.target as FileReader).result as string,
      );
      if (!headers.length) {
        onToast?.("Could not parse CSV — check the file format.", "error");
        return;
      }
      setCsvHeaders(headers);
      setCsvRows(rows);
      const initial: Record<string, string> = {};
      fields
        .filter((f) => !f.json)
        .forEach(({ key }) => {
          initial[key] = autoMatch(key, headers);
        });
      setMapping(initial);
      setStage("mapping");
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleImport = async () => {
    const requiredKey = type === "vehicles" ? "year" : "name";
    const requiredLabel = type === "vehicles" ? "Year" : "Name";
    if (!mapping[requiredKey]) {
      onToast?.(`Map the "${requiredLabel}" field before importing.`, "error");
      return;
    }
    let count = 0;
    const saves: Promise<unknown>[] = [];
    for (const row of csvRows) {
      const primaryValue =
        type === "vehicles"
          ? row[mapping.year]?.trim()
          : row[mapping.name]?.trim();
      if (!primaryValue) continue;
      const name = primaryValue;
      if (type === "vehicles") {
        saves.push(
          saveVehicle({
            customerId: mapping.customerId ? row[mapping.customerId]?.trim() || "" : "",
            year: primaryValue,
            make: mapping.make ? row[mapping.make] || "" : "",
            model: mapping.model ? row[mapping.model] || "" : "",
            trim: mapping.trim ? row[mapping.trim] || "" : "",
            vin: mapping.vin ? row[mapping.vin] || "" : "",
            mileage: mapping.mileage ? row[mapping.mileage] || "" : "",
            color: mapping.color ? row[mapping.color] || "" : "",
            notes: mapping.notes ? row[mapping.notes] || "" : "",
          }),
        );
      } else if (type === "vendors") {
        const phone = mapping.phone ? row[mapping.phone] || "" : "";
        saves.push(
          saveVendor({
            name,
            phones: phone ? [{ label: "Phone", number: phone }] : [],
            contact: mapping.contact ? row[mapping.contact] || "" : "",
            address: mapping.address ? row[mapping.address] || "" : "",
            notes: mapping.notes ? row[mapping.notes] || "" : "",
          }),
        );
      } else if (type === "customers") {
        const phone = mapping.phone ? row[mapping.phone] || "" : "";
        saves.push(
          saveCustomer({
            name,
            phones: phone ? [{ label: "Phone", number: phone }] : [],
            email: mapping.email ? row[mapping.email] || "" : "",
            address: mapping.address ? row[mapping.address] || "" : "",
            notes: mapping.notes ? row[mapping.notes] || "" : "",
          }),
        );
      } else if (type === "parts") {
        const partId = mapping.id ? row[mapping.id]?.trim() : "";
        saves.push(
          saveLibraryPart({
            ...(partId ? { id: partId } : {}),
            name,
            partNumber: mapping.partNumber ? row[mapping.partNumber] || "" : "",
            cost: mapping.cost ? Number(row[mapping.cost]) || 0 : 0,
            price: mapping.price ? Number(row[mapping.price]) || 0 : 0,
            msrp: mapping.msrp ? Number(row[mapping.msrp]) || 0 : 0,
            category: mapping.category ? row[mapping.category] || "" : "",
            subcategory:
              mapping.subcategory ? row[mapping.subcategory] || "" : "",
            description:
              mapping.description ? row[mapping.description] || "" : "",
          }),
        );
      } else {
        const templateId = mapping.id ? row[mapping.id]?.trim() : "";
        const partsCol = csvHeaders.find((h) => normalize(h) === "parts");
        let parts: unknown[] = [];
        if (partsCol && row[partsCol]) {
          try {
            const parsed = JSON.parse(row[partsCol]);
            if (Array.isArray(parsed)) parts = parsed;
          } catch {
            /* malformed JSON — import without parts */
          }
        }
        const miRaw =
          mapping.mileageInterval ? row[mapping.mileageInterval] : "";
        const qjRaw =
          mapping.quickJob ? row[mapping.quickJob]?.toLowerCase() : "";
        const jobCategoryRaw =
          mapping.jobCategory ? row[mapping.jobCategory]?.trim() : "";
        const opCodeRaw =
          mapping.opCode ? row[mapping.opCode]?.trim().toUpperCase() : "";
        saves.push(
          saveJobTemplate({
            ...(templateId ? { id: templateId } : {}),
            name,
            description:
              mapping.description ? row[mapping.description] || "" : "",
            laborHrs: mapping.laborHrs ? Number(row[mapping.laborHrs]) || 0 : 0,
            laborCost:
              mapping.laborCost ? Number(row[mapping.laborCost]) || 0 : 0,
            mileageInterval: miRaw ? Number(miRaw) || null : null,
            quickJob: qjRaw === "true" || qjRaw === "1" || qjRaw === "yes",
            ...(jobCategoryRaw ? { jobCategory: jobCategoryRaw as never } : {}),
            ...(opCodeRaw ? { opCode: opCodeRaw } : {}),
            parts: parts as never[],
          }),
        );
      }
      count++;
    }
    await Promise.all(saves);
    setImportCount(count);
    setStage("done");
    onRefresh?.();
    const noun =
      type === "parts" ? "part"
      : type === "customers" ? "customer"
      : type === "vehicles" ? "vehicle"
      : type === "vendors" ? "vendor"
      : "template";
    onToast?.(`Imported ${count} ${noun}${count !== 1 ? "s" : ""}.`);
  };

  const handleDownload = async () => {
    if (type === "customers") {
      const rows = (await getCustomers()).map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phones?.[0]?.number || "",
        email: c.email || "",
        address: c.address || "",
        notes: c.notes || "",
      }));
      downloadCSV("customers.csv", objectsToCSV(rows));
    } else if (type === "vehicles") {
      const rows = (await getAllVehicles()).map((v) => ({
        id: v.id,
        customerId: v.customerId,
        year: v.year,
        make: v.make,
        model: v.model,
        trim: v.trim,
        vin: v.vin,
        mileage: v.mileage,
        color: v.color,
        notes: v.notes,
      }));
      downloadCSV("vehicles.csv", objectsToCSV(rows));
    } else if (type === "vendors") {
      const rows = (await getVendors()).map((v) => ({
        id: v.id,
        name: v.name,
        phone: v.phones?.[0]?.number || "",
        contact: v.contact || "",
        address: v.address || "",
        notes: v.notes || "",
      }));
      downloadCSV("vendors.csv", objectsToCSV(rows));
    } else if (type === "parts") {
      downloadCSV(
        "inventory.csv",
        objectsToCSV((await getPartsLibrary()) as unknown as Record<string, unknown>[]),
      );
    } else {
      downloadCSV(
        "templates.csv",
        objectsToCSV((await getJobTemplates()) as unknown as Record<string, unknown>[]),
      );
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
            <div
              key={key}
              className="csv-mapping-row"
            >
              <span className="csv-field-label">
                {label}
                {required && <span className="csv-required"> *</span>}
              </span>
              <span className="csv-arrow">→</span>
              <select
                className="csv-mapping-select"
                aria-label={`Map ${label} column`}
                value={mapping[key] || ""}
                onChange={(e) =>
                  setMapping((m) => ({ ...m, [key]: e.target.value }))
                }
              >
                <option value="">— skip —</option>
                {csvHeaders.map((h) => (
                  <option
                    key={h}
                    value={h}
                  >
                    {h}
                  </option>
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
                <div
                  key={i}
                  className="csv-preview-row"
                >
                  {mappableFields.map(({ key, label }) =>
                    mapping[key] ?
                      <span
                        key={key}
                        className="csv-preview-cell"
                      >
                        <span className="csv-preview-key">{label}:</span>
                        <span className="csv-preview-val">
                          {row[mapping[key]] || "—"}
                        </span>
                      </span>
                    : null,
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="csv-actions">
          <button
            type="button"
            className="btn-small btn-secondary"
            onClick={reset}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-small btn-success"
            onClick={handleImport}
          >
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
          {type === "parts" ? "part"
          : type === "customers" ? "customer"
          : type === "vehicles" ? "vehicle"
          : type === "vendors" ? "vendor"
          : "template"}
          {importCount !== 1 ? "s" : ""}.
        </span>
        <button
          type="button"
          className="btn-small btn-secondary"
          onClick={reset}
        >
          Import More
        </button>
      </div>
    );
  }

  return (
    <div className="csv-loader">
      <input
        aria-label={`Select CSV file to import ${
          type === "parts" ? "parts"
          : type === "customers" ? "customers"
          : type === "vehicles" ? "vehicles"
          : type === "vendors" ? "vendors"
          : "job templates"
        }`}
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="csv-file-input"
        onChange={handleFileChange}
      />
      <button
        type="button"
        className="btn-small btn-secondary"
        onClick={() => fileRef.current?.click()}
      >
        ↑ Import CSV
      </button>
      <button
        type="button"
        className="btn-small btn-secondary"
        onClick={handleDownload}
      >
        ↓ Export CSV
      </button>
    </div>
  );
}
