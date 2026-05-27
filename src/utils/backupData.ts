import { zipSync, unzipSync, strToU8, strFromU8 } from "fflate";
import {
  loadBusinessInfo,
  loadGlobalRates,
  getEstimatedPriceMap,
  loadAccent,
  getCustomers,
  getAllVehicles,
  getVendors,
  getPartsLibrary,
  getJobTemplates,
  getWarrantyPolicies,
} from "../storage";
import { dbPut, dbClear, settingsPut } from "../db/index";

const THEME_KEY = "quote_calculator_theme";

function toJson(data: unknown): Uint8Array {
  return strToU8(JSON.stringify(data, null, 2));
}

// ── Download ──────────────────────────────────────────────────────────────────

export async function downloadBackup(): Promise<void> {
  const [
    businessInfo,
    rates,
    estimatedPriceMap,
    accent,
    warrantyPolicies,
    customers,
    vehicles,
    vendors,
    inventory,
    templates,
  ] = await Promise.all([
    loadBusinessInfo(),
    loadGlobalRates(),
    getEstimatedPriceMap(),
    loadAccent(),
    getWarrantyPolicies(),
    getCustomers(),
    getAllVehicles(),
    getVendors(),
    getPartsLibrary(),
    getJobTemplates(),
  ]);

  const theme = {
    mode: localStorage.getItem(THEME_KEY) ?? "light",
    accent,
  };

  const manifest = {
    version: "1",
    createdAt: new Date().toISOString(),
    counts: {
      customers: customers.length,
      vehicles: vehicles.length,
      vendors: vendors.length,
      inventory: inventory.length,
      templates: templates.length,
    },
  };

  const zipData = zipSync({
    "manifest.json": toJson(manifest),
    "settings/business-info.json": toJson(businessInfo),
    "settings/rates.json": toJson(rates),
    "settings/estimated-price-map.json": toJson(estimatedPriceMap),
    "settings/theme.json": toJson(theme),
    "settings/warranty-policies.json": toJson(warrantyPolicies),
    "data/customers.json": toJson(customers),
    "data/vehicles.json": toJson(vehicles),
    "data/vendors.json": toJson(vendors),
    "data/inventory.json": toJson(inventory),
    "data/templates.json": toJson(templates),
  });

  const date = new Date().toISOString().split("T")[0];
  const blob = new Blob([zipData.buffer as ArrayBuffer], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `backup-${date}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Restore ───────────────────────────────────────────────────────────────────

export type RestoreCounts = {
  customers: number;
  vehicles: number;
  vendors: number;
  inventory: number;
  templates: number;
};

export async function restoreBackup(file: File): Promise<RestoreCounts> {
  const buffer = await file.arrayBuffer();
  const files = unzipSync(new Uint8Array(buffer));

  const parse = <T>(path: string): T | null => {
    const data = files[path];
    if (!data) return null;
    try {
      return JSON.parse(strFromU8(data)) as T;
    } catch {
      return null;
    }
  };

  // Clear all entity stores before restoring
  await Promise.all([
    dbClear("customers"),
    dbClear("vehicles"),
    dbClear("vendors"),
    dbClear("parts"),
    dbClear("templates"),
  ]);

  // Settings
  const businessInfo = parse<Record<string, unknown>>("settings/business-info.json");
  if (businessInfo) await settingsPut("businessInfo", businessInfo);

  const rates = parse<Record<string, unknown>>("settings/rates.json");
  if (rates) await settingsPut("rates", rates);

  const estimatedPriceMap = parse<Record<string, unknown>>("settings/estimated-price-map.json");
  if (estimatedPriceMap) await settingsPut("estimatedPriceMap", estimatedPriceMap);

  const warrantyPolicies = parse<unknown[]>("settings/warranty-policies.json");
  if (warrantyPolicies) await settingsPut("warrantyPolicies", warrantyPolicies);

  const theme = parse<{ mode?: string; accent?: string }>("settings/theme.json");
  if (theme) {
    if (theme.accent) await settingsPut("accent", theme.accent);
    if (theme.mode) localStorage.setItem(THEME_KEY, theme.mode);
  }

  // Entity data
  const customers = parse<Record<string, unknown>[]>("data/customers.json") ?? [];
  const vehicles  = parse<Record<string, unknown>[]>("data/vehicles.json")  ?? [];
  const vendors   = parse<Record<string, unknown>[]>("data/vendors.json")   ?? [];
  const inventory = parse<Record<string, unknown>[]>("data/inventory.json") ?? [];
  const templates = parse<Record<string, unknown>[]>("data/templates.json") ?? [];

  await Promise.all([
    ...customers.map((r) => dbPut("customers", r)),
    ...vehicles .map((r) => dbPut("vehicles",  r)),
    ...vendors  .map((r) => dbPut("vendors",   r)),
    ...inventory.map((r) => dbPut("parts",     r)),
    ...templates.map((r) => dbPut("templates", r)),
  ]);

  return {
    customers: customers.length,
    vehicles:  vehicles.length,
    vendors:   vendors.length,
    inventory: inventory.length,
    templates: templates.length,
  };
}
