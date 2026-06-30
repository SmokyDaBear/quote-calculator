import { DEFAULT_MARKUP_MATRIX, calculateSellPrice } from './utils/partsMarkup';
import {
  dbGet, dbGetAll, dbGetAllByIndex, dbPut, dbDelete, dbClear,
  settingsGet, settingsPut, openDB,
} from './db/index';
import type {
  Customer,
  Vendor,
  LibraryPart,
  JobTemplate,
  TemplatePart,
  GlobalRates,
  BusinessInfo,
  Vehicle,
  QuoteIndexEntry,
  MarkupBracket,
  EstimatedPriceMap,
  WarrantyPolicy,
  Appointment,
  Order,
  OrderJob,
  OrderJobPart,
  OrderSublet,
  Invoice,
  Payment,
  PurchaseOrder,
  PurchaseOrderLine,
  PoStatus,
  OrderStatus,
} from './types/index';

// ── Rates ────────────────────────────────────────────────────────────────────

export const DEFAULT_RATES: GlobalRates = {
  taxRate: 8.52,
  laborRate: 215,
  ssRate: 15,
  ssMax: 54.95,
  partsMarkupMatrix: DEFAULT_MARKUP_MATRIX,
  subletMarkupMatrix: DEFAULT_MARKUP_MATRIX,
  laborTaxRate: 0,
  subletTaxable: false,
};

export async function loadGlobalRates(): Promise<GlobalRates> {
  const saved = await settingsGet<GlobalRates>('rates');
  if (!saved) return { ...DEFAULT_RATES };
  return {
    taxRate: saved.taxRate ?? DEFAULT_RATES.taxRate,
    laborRate: saved.laborRate ?? DEFAULT_RATES.laborRate,
    ssRate: saved.ssRate ?? DEFAULT_RATES.ssRate,
    ssMax: saved.ssMax ?? DEFAULT_RATES.ssMax,
    partsMarkupMatrix: saved.partsMarkupMatrix ?? DEFAULT_MARKUP_MATRIX,
    subletMarkupMatrix: saved.subletMarkupMatrix ?? saved.partsMarkupMatrix ?? DEFAULT_MARKUP_MATRIX,
    laborTaxRate: saved.laborTaxRate ?? DEFAULT_RATES.laborTaxRate,
    subletTaxable: saved.subletTaxable ?? DEFAULT_RATES.subletTaxable,
  };
}

export async function saveGlobalRates(rates: GlobalRates): Promise<void> {
  await settingsPut('rates', rates);
}

// ── Quote counter ─────────────────────────────────────────────────────────────

export async function getNextQuoteNumber(): Promise<number> {
  const current = await settingsGet<number>('quoteCounter');
  const next = current ? current + 1 : 1001;
  await settingsPut('quoteCounter', next);
  return next;
}

export async function getCurrentQuoteNumber(): Promise<number> {
  const current = await settingsGet<number>('quoteCounter');
  return current ? current + 1 : 1001;
}

// ── Quotes ────────────────────────────────────────────────────────────────────

export async function getHistoryIndex(): Promise<QuoteIndexEntry[]> {
  const entries = await dbGetAll<QuoteIndexEntry>('quoteIndex');
  return entries.sort((a, b) => b.updatedAt - a.updatedAt);
}

function formatVehicleLabel(v: unknown): string {
  if (!v) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'object') {
    const veh = v as { year?: string; make?: string; model?: string; trim?: string };
    return [veh.year, veh.make, veh.model, veh.trim].filter(Boolean).join(' ');
  }
  return '';
}

export async function saveQuote(quoteData: Record<string, unknown>): Promise<number> {
  const quoteNumber = await getNextQuoteNumber();
  const now = Date.now();

  const indexEntry: QuoteIndexEntry = {
    id: String(quoteNumber),
    createdAt: now,
    updatedAt: now,
    customer: (quoteData.customerName as string) || 'Unknown',
    vehicle: formatVehicleLabel(quoteData.vehicle),
    total: (quoteData.grandTotal as number) || 0,
  };

  await Promise.all([
    dbPut('quoteIndex', indexEntry),
    dbPut('quotes', { ...quoteData, id: String(quoteNumber), quoteNumber, timestamp: now }),
  ]);

  return quoteNumber;
}

export async function getQuote(quoteNumber: number | string): Promise<Record<string, unknown> | null> {
  const result = await dbGet<Record<string, unknown>>('quotes', String(quoteNumber));
  return result ?? null;
}

export async function updateQuote(quoteId: number | string, quoteData: Record<string, unknown>): Promise<void> {
  const id = String(quoteId);
  const existing = await dbGet<QuoteIndexEntry>('quoteIndex', id);
  if (!existing) return;

  const updatedIndex: QuoteIndexEntry = {
    ...existing,
    updatedAt: Date.now(),
    customer: (quoteData.customerName as string) || 'Unknown',
    vehicle: formatVehicleLabel(quoteData.vehicle),
    total: (quoteData.grandTotal as number) || 0,
  };

  await Promise.all([
    dbPut('quoteIndex', updatedIndex),
    dbPut('quotes', { ...quoteData, id, quoteNumber: quoteId, timestamp: existing.createdAt }),
  ]);
}

export async function deleteQuote(quoteNumber: number | string): Promise<void> {
  const id = String(quoteNumber);
  await Promise.all([
    dbDelete('quoteIndex', id),
    dbDelete('quotes', id),
  ]);
}

export async function clearHistory(): Promise<void> {
  await Promise.all([
    dbClear('quoteIndex'),
    dbClear('quotes'),
  ]);
}

export async function clearAllData(): Promise<void> {
  await Promise.all([
    dbClear('quotes'),
    dbClear('quoteIndex'),
    dbClear('customers'),
    dbClear('vehicles'),
    dbClear('vendors'),
    dbClear('parts'),
    dbClear('templates'),
    dbClear('tasks'),
    dbClear('settings'),
    dbClear('appointments'),
    dbClear('orders'),
    dbClear('orderJobs'),
    dbClear('orderJobParts'),
    dbClear('orderSublets'),
    dbClear('invoices'),
    dbClear('payments'),
    dbClear('purchaseOrders'),
    dbClear('purchaseOrderLines'),
  ]);
  localStorage.clear();
}

export async function searchQuotes(searchTerm: string): Promise<QuoteIndexEntry[]> {
  const all = await getHistoryIndex();
  const term = searchTerm.toLowerCase();
  const digits = searchTerm.replace(/\D/g, '');
  return all.filter(
    (h) =>
      h.customer.toLowerCase().includes(term) ||
      h.id.includes(term) ||
      (digits && h.customer.replace(/\D/g, '').includes(digits))
  );
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

export interface Task {
  id: string;
  orderNumber: string;
  label: string;
  note: string;
  createdAt: number;
  completed: boolean;
}

export async function getTasks(): Promise<Task[]> {
  const all = await dbGetAll<Task>('tasks');
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function addTask(taskData: Partial<Task>): Promise<Task> {
  const task: Task = {
    id: crypto.randomUUID(),
    orderNumber: taskData.orderNumber || '',
    label: taskData.label || '',
    note: taskData.note || '',
    createdAt: Date.now(),
    completed: false,
  };
  await dbPut('tasks', task);
  return task;
}

export async function toggleTask(id: string): Promise<void> {
  const task = await dbGet<Task>('tasks', id);
  if (!task) return;
  await dbPut('tasks', { ...task, completed: !task.completed });
}

export async function removeTask(id: string): Promise<void> {
  await dbDelete('tasks', id);
}

// ── Customers ─────────────────────────────────────────────────────────────────

export async function getCustomers(): Promise<Customer[]> {
  const all = await dbGetAll<Customer>('customers');
  return all.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getCustomer(id: string): Promise<Customer | null> {
  return (await dbGet<Customer>('customers', id)) ?? null;
}

/**
 * Ensure a customer + vehicle record exist for an order/appointment draft,
 * creating them if needed. Returns their ids, or null if there isn't enough
 * data (no customer name / no vehicle).
 */
export async function ensureCustomerAndVehicle(d: {
  customerId: string | null;
  customer: Partial<Customer> & { name: string };
  vehicleId: string | null;
  vehicle: Omit<Vehicle, 'id' | 'customerId' | 'createdAt' | 'color' | 'notes' | 'decodedVinData'>;
}): Promise<{ customerId: string; vehicleId: string; createdCustomer?: Customer } | null> {
  let cid = d.customerId;
  let createdCustomer: Customer | undefined;
  if (!cid) {
    if (!d.customer.name.trim()) return null;
    createdCustomer = await saveCustomer(d.customer);
    cid = createdCustomer.id;
  }
  let vid = d.vehicleId;
  const hasVehicle = !!(d.vehicle.year || d.vehicle.make || d.vehicle.model || d.vehicle.vin);
  if (!vid) {
    if (!hasVehicle) return null;
    const v = await saveCustomerVehicle(cid, { ...d.vehicle, color: '', notes: '' });
    vid = v.id;
  }
  return { customerId: cid, vehicleId: vid, createdCustomer };
}

export async function saveCustomer(data: Partial<Customer> & { name: string }): Promise<Customer> {
  const customer: Customer = {
    id: crypto.randomUUID(),
    name: data.name.trim(),
    phones: data.phones ?? (
      (data as unknown as { phone?: string }).phone
        ? [{ label: 'Phone', number: (data as unknown as { phone: string }).phone }]
        : []
    ),
    email: data.email ?? '',
    address: data.address ?? '',
    notes: data.notes ?? '',
    taxable: data.taxable,
    taxId: data.taxId,
    createdAt: Date.now(),
  };
  await dbPut('customers', customer);
  return customer;
}

export async function updateCustomer(id: string, data: Partial<Customer>): Promise<void> {
  const existing = await dbGet<Customer>('customers', id);
  if (!existing) return;
  await dbPut('customers', { ...existing, ...data, id });
}

export async function deleteCustomer(id: string): Promise<void> {
  await dbDelete('customers', id);
}

export async function searchCustomers(term: string): Promise<Customer[]> {
  const all = await getCustomers();
  const q = term.toLowerCase();
  const digits = term.replace(/\D/g, '');
  return all.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      (digits && c.phones.some((p) => p.number.replace(/\D/g, '').includes(digits)))
  );
}

// ── Vehicles ──────────────────────────────────────────────────────────────────

export async function getAllVehicles(): Promise<Vehicle[]> {
  return dbGetAll<Vehicle>('vehicles');
}

export async function getVehicle(id: string): Promise<Vehicle | null> {
  return (await dbGet<Vehicle>('vehicles', id)) ?? null;
}

export async function getCustomerVehicles(customerId: string): Promise<Vehicle[]> {
  return dbGetAllByIndex<Vehicle>('vehicles', 'customerId', customerId);
}

/** Find a saved vehicle by exact VIN (case-insensitive). Returns the most recent match. */
export async function findVehicleByVin(vin: string): Promise<Vehicle | null> {
  const normalized = vin.trim().toUpperCase();
  if (!normalized) return null;
  const all = await dbGetAll<Vehicle>('vehicles');
  const matches = all.filter((v) => (v.vin || '').trim().toUpperCase() === normalized);
  if (matches.length === 0) return null;
  return matches.sort((a, b) => b.createdAt - a.createdAt)[0];
}

export async function saveCustomerVehicle(
  customerId: string,
  data: Omit<Vehicle, 'id' | 'customerId' | 'createdAt'>
): Promise<Vehicle> {
  const vehicle: Vehicle = {
    id: crypto.randomUUID(),
    customerId,
    year: data.year || '',
    make: data.make || '',
    model: data.model || '',
    trim: data.trim || '',
    vin: data.vin || '',
    mileage: data.mileage || '',
    color: data.color || '',
    notes: data.notes || '',
    ...(data.decodedVinData ? { decodedVinData: data.decodedVinData } : {}),
    createdAt: Date.now(),
  };
  await dbPut('vehicles', vehicle);
  return vehicle;
}

export async function updateCustomerVehicle(
  customerId: string,
  vehicleId: string,
  data: Partial<Vehicle>
): Promise<void> {
  const existing = await dbGet<Vehicle>('vehicles', vehicleId);
  if (!existing || existing.customerId !== customerId) return;
  await dbPut('vehicles', { ...existing, ...data, id: vehicleId, customerId });
}

export async function deleteCustomerVehicle(customerId: string, vehicleId: string): Promise<void> {
  const existing = await dbGet<Vehicle>('vehicles', vehicleId);
  if (!existing || existing.customerId !== customerId) return;
  await dbDelete('vehicles', vehicleId);
}

export async function saveVehicle(data: Omit<Vehicle, 'id' | 'createdAt'>): Promise<Vehicle> {
  const vehicle: Vehicle = {
    id: crypto.randomUUID(),
    customerId: data.customerId || '',
    year: data.year || '', make: data.make || '', model: data.model || '',
    trim: data.trim || '', vin: data.vin || '', mileage: data.mileage || '',
    color: data.color || '', notes: data.notes || '',
    ...(data.decodedVinData ? { decodedVinData: data.decodedVinData } : {}),
    createdAt: Date.now(),
  };
  await dbPut('vehicles', vehicle);
  return vehicle;
}

export async function updateVehicle(vehicleId: string, data: Partial<Vehicle>): Promise<void> {
  const existing = await dbGet<Vehicle>('vehicles', vehicleId);
  if (!existing) return;
  await dbPut('vehicles', { ...existing, ...data, id: vehicleId });
}

export async function deleteVehicle(vehicleId: string): Promise<void> {
  await dbDelete('vehicles', vehicleId);
}

// ── Vendors ───────────────────────────────────────────────────────────────────

export async function getVendors(): Promise<Vendor[]> {
  const all = await dbGetAll<Vendor>('vendors');
  return all.sort((a, b) => a.name.localeCompare(b.name));
}

export async function saveVendor(data: Partial<Vendor> & { name: string }): Promise<Vendor> {
  const vendor: Vendor = {
    id: crypto.randomUUID(),
    name: data.name.trim(),
    phones: data.phones ?? [],
    address: data.address ?? '',
    contact: data.contact ?? '',
    notes: data.notes ?? '',
    createdAt: Date.now(),
  };
  await dbPut('vendors', vendor);
  return vendor;
}

export async function updateVendor(id: string, data: Partial<Vendor>): Promise<void> {
  const existing = await dbGet<Vendor>('vendors', id);
  if (!existing) return;
  await dbPut('vendors', { ...existing, ...data, id });
}

export async function deleteVendor(id: string): Promise<void> {
  await dbDelete('vendors', id);
}

// ── Parts Library ─────────────────────────────────────────────────────────────

export async function getPartsLibrary(): Promise<LibraryPart[]> {
  const all = await dbGetAll<LibraryPart>('parts');
  return all.sort((a, b) => a.name.localeCompare(b.name));
}

export async function saveLibraryPart(data: Partial<LibraryPart> & { name: string }): Promise<LibraryPart> {
  const part: LibraryPart = {
    id: data.id || crypto.randomUUID(),
    partNumber: data.partNumber || '',
    name: data.name,
    cost: Number(data.cost) || 0,
    price: Number(data.price) || 0,
    msrp: Number(data.msrp) || 0,
    description: data.description || '',
    category: data.category || '',
    subcategory: data.subcategory || '',
    vendorId: data.vendorId,
    qtyOnHand: data.qtyOnHand != null ? Number(data.qtyOnHand) || 0 : undefined,
    binLocation: data.binLocation,
    createdAt: Date.now(),
  };
  await dbPut('parts', part);
  return part;
}

export async function updateLibraryPart(id: string, data: Partial<LibraryPart>): Promise<void> {
  const existing = await dbGet<LibraryPart>('parts', id);
  if (!existing) return;
  await dbPut('parts', { ...existing, ...data, id });
}

export async function deleteLibraryPart(id: string): Promise<void> {
  await dbDelete('parts', id);
}

export async function repricePartsLibrary(markupMatrix: MarkupBracket[]): Promise<number> {
  const parts = await getPartsLibrary();
  const toUpdate = parts.filter((p) => !p.menuPrice && p.cost > 0);
  await Promise.all(
    toUpdate.map((p) =>
      dbPut('parts', { ...p, price: parseFloat(calculateSellPrice(p.cost, markupMatrix).toFixed(2)) }),
    ),
  );
  return toUpdate.length;
}

export async function searchPartsLibrary(term: string): Promise<LibraryPart[]> {
  const all = await getPartsLibrary();
  const q = term.toLowerCase();
  return all.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.partNumber.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
  );
}

// ── Job Templates ─────────────────────────────────────────────────────────────

export async function getJobTemplates(): Promise<JobTemplate[]> {
  const all = await dbGetAll<JobTemplate>('templates');
  return all.sort((a, b) => a.name.localeCompare(b.name));
}

export async function saveJobTemplate(
  data: Partial<JobTemplate> & { name: string }
): Promise<JobTemplate> {
  const rawParts = (data.parts ?? []) as Array<TemplatePart | Record<string, unknown>>;
  const parts: TemplatePart[] = rawParts.map((p) => {
    if ('type' in p && (p.type === 'specific' || p.type === 'category')) {
      return p as TemplatePart;
    }
    return { type: 'specific', partId: '', quantity: Number((p as Record<string, unknown>).quantity) || 1 };
  });

  const template: JobTemplate = {
    id: data.id || crypto.randomUUID(),
    name: data.name,
    description: data.description || '',
    laborHrs: Number(data.laborHrs) || 0,
    laborCost: Number(data.laborCost) || 0,
    parts,
    jobCategory: data.jobCategory,
    mileageInterval: data.mileageInterval ?? null,
    quickJob: data.quickJob ?? false,
    createdAt: Date.now(),
  };
  await dbPut('templates', template);
  return template;
}

export async function updateJobTemplate(id: string, data: Partial<JobTemplate>): Promise<void> {
  const existing = await dbGet<JobTemplate>('templates', id);
  if (!existing) return;
  await dbPut('templates', { ...existing, ...data, id });
}

export async function deleteJobTemplate(id: string): Promise<void> {
  await dbDelete('templates', id);
}

// ── Estimated Price Map ───────────────────────────────────────────────────────

export async function getEstimatedPriceMap(): Promise<EstimatedPriceMap> {
  return (await settingsGet<EstimatedPriceMap>('estimatedPriceMap')) ?? {};
}

export async function saveEstimatedPriceMap(map: EstimatedPriceMap): Promise<void> {
  await settingsPut('estimatedPriceMap', map);
}

// ── Warranty Policies ─────────────────────────────────────────────────────────

export const DEFAULT_WARRANTY_POLICIES: WarrantyPolicy[] = [
  {
    id: "default-batteries",
    label: "Batteries",
    category: "Electrical",
    subcategory: ["Batteries (Lead-Acid)", "Batteries (Lithium-Ion)", "Batteries (AGM)"],
    tiers: [
      { id: "bat-t1", label: "SWAP",         maxMonths: 18, maxMiles: null, partsPct: 100, laborPct: 0 },
      { id: "bat-t2", label: "Bill Out",     maxMonths: 24, maxMiles: null, partsPct: 100, laborPct: 0 },
      { id: "bat-t3", label: "75% Warranty", maxMonths: 32, maxMiles: null, partsPct: 75,  laborPct: 0 },
      { id: "bat-t4", label: "50% Warranty", maxMonths: 50, maxMiles: null, partsPct: 50,  laborPct: 0 },
      { id: "bat-t5", label: "25% Warranty", maxMonths: 84, maxMiles: null, partsPct: 25,  laborPct: 0 },
    ],
  },
];

export async function getWarrantyPolicies(): Promise<WarrantyPolicy[]> {
  const saved = await settingsGet<WarrantyPolicy[]>('warrantyPolicies');
  if (!saved) return DEFAULT_WARRANTY_POLICIES;
  // Migrate: old data had subcategory as a string
  return saved.map((p) => ({
    ...p,
    subcategory: Array.isArray(p.subcategory)
      ? p.subcategory
      : p.subcategory ? [p.subcategory as unknown as string] : [],
  }));
}

export async function saveWarrantyPolicies(policies: WarrantyPolicy[]): Promise<void> {
  await settingsPut('warrantyPolicies', policies);
}

// ── Accent ────────────────────────────────────────────────────────────────────

export async function loadAccent(): Promise<string> {
  return (await settingsGet<string>('accent')) ?? 'green';
}

export async function saveAccent(id: string): Promise<void> {
  await settingsPut('accent', id);
}

// ── Custom Theme ──────────────────────────────────────────────────────────────

const CUSTOM_THEME_KEY = 'quote_calculator_custom_theme';

export function loadCustomTheme(): import('./utils/customTheme').CustomTheme | null {
  try {
    const raw = localStorage.getItem(CUSTOM_THEME_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function saveCustomTheme(theme: import('./utils/customTheme').CustomTheme): void {
  localStorage.setItem(CUSTOM_THEME_KEY, JSON.stringify(theme));
}

// ── Business Info ─────────────────────────────────────────────────────────────

const BIZ_DEFAULTS: BusinessInfo = { name: '', address: '', phone: '', logo: '', printMessage: '' };

export async function loadBusinessInfo(): Promise<BusinessInfo> {
  const saved = await settingsGet<BusinessInfo>('businessInfo');
  return saved ? { ...BIZ_DEFAULTS, ...saved } : { ...BIZ_DEFAULTS };
}

export async function saveBusinessInfo(info: BusinessInfo): Promise<void> {
  await settingsPut('businessInfo', info);
}

// ── Migration ─────────────────────────────────────────────────────────────────

const MIGRATION_FLAG = 'quote_calculator_migrated_v1';

/** Migrates localStorage data to IndexedDB. Returns true if legacy data was found and migrated. */
export async function migrateFromLocalStorage(): Promise<boolean> {
  if (localStorage.getItem(MIGRATION_FLAG)) return false;

  await openDB();

  // Check if there is any legacy data worth migrating
  const hasLegacyQuotes = !!localStorage.getItem('quote_calculator_history');
  const hasLegacyParts  = !!localStorage.getItem('quote_calculator_parts_library');
  const hasLegacyData   = hasLegacyQuotes || hasLegacyParts;

  const migrations: Promise<unknown>[] = [];

  // Rates
  const rawRates = localStorage.getItem('quote_calculator_rates');
  if (rawRates) {
    try {
      const parsed = JSON.parse(rawRates) as Partial<GlobalRates>;
      await saveGlobalRates({
        taxRate: parsed.taxRate ?? DEFAULT_RATES.taxRate,
        laborRate: parsed.laborRate ?? DEFAULT_RATES.laborRate,
        ssRate: parsed.ssRate ?? DEFAULT_RATES.ssRate,
        ssMax: parsed.ssMax ?? DEFAULT_RATES.ssMax,
        partsMarkupMatrix: parsed.partsMarkupMatrix ?? DEFAULT_MARKUP_MATRIX,
      });
    } catch { /* ignore */ }
  }

  // Quote counter
  const rawCounter = localStorage.getItem('quote_calculator_counter');
  if (rawCounter) await settingsPut('quoteCounter', parseInt(rawCounter, 10));

  // Business info
  const rawBiz = localStorage.getItem('quote_calculator_business');
  if (rawBiz) {
    try { await settingsPut('businessInfo', JSON.parse(rawBiz)); } catch { /* ignore */ }
  }

  // Accent
  const rawAccent = localStorage.getItem('quote_calculator_accent');
  if (rawAccent) await settingsPut('accent', rawAccent);

  // Customers
  const rawCustomers = localStorage.getItem('quote_calculator_customers');
  if (rawCustomers) {
    try {
      const customers = JSON.parse(rawCustomers) as Array<Record<string, unknown>>;
      for (const c of customers) {
        const id = (c.id as string) || crypto.randomUUID();
        const legacyPhone = c.phone as string | undefined;
        const customer: Customer = {
          id,
          name: (c.name as string) || '',
          phones: legacyPhone ? [{ label: 'Phone', number: legacyPhone }] : [],
          email: (c.email as string) || '',
          address: (c.address as string) || '',
          notes: (c.notes as string) || '',
          createdAt: (c.createdAt as number) || Date.now(),
        };
        migrations.push(dbPut('customers', customer));
      }
    } catch { /* ignore */ }
  }

  // Vehicles
  const vehicleKeys = Object.keys(localStorage).filter((k) => k.endsWith('-vehicles'));
  for (const key of vehicleKeys) {
    const customerId = key.replace(/-vehicles$/, '');
    try {
      const vehicles = JSON.parse(localStorage.getItem(key)!) as Array<Record<string, unknown>>;
      for (const v of vehicles) {
        const vehicle: Vehicle = {
          id: (v.id as string) || crypto.randomUUID(),
          customerId,
          year: (v.year as string) || '',
          make: (v.make as string) || '',
          model: (v.model as string) || '',
          trim: (v.trim as string) || '',
          vin: (v.vin as string) || '',
          mileage: (v.mileage as string) || '',
          color: (v.color as string) || '',
          notes: (v.notes as string) || '',
          createdAt: (v.createdAt as number) || Date.now(),
        };
        migrations.push(dbPut('vehicles', vehicle));
      }
    } catch { /* ignore */ }
  }

  // Tasks
  const rawTasks = localStorage.getItem('quote_calculator_tasks');
  if (rawTasks) {
    try {
      const tasks = JSON.parse(rawTasks) as Array<Record<string, unknown>>;
      for (const t of tasks) {
        migrations.push(dbPut('tasks', { id: (t.id as string) || crypto.randomUUID(), ...t }));
      }
    } catch { /* ignore */ }
  }

  // Parts library
  const rawParts = localStorage.getItem('quote_calculator_parts_library');
  if (rawParts) {
    try {
      const parts = JSON.parse(rawParts) as Array<Record<string, unknown>>;
      for (const p of parts) {
        const part: LibraryPart = {
          id: (p.id as string) || crypto.randomUUID(),
          partNumber: (p.partNumber as string) || '',
          name: (p.name as string) || '',
          cost: Number(p.cost) || 0,
          price: Number(p.price) || 0,
          msrp: Number(p.msrp) || 0,
          description: (p.description as string) || '',
          category: (p.category as string) || '',
          subcategory: (p.subcategory as string) || '',
          createdAt: (p.createdAt as number) || Date.now(),
        };
        migrations.push(dbPut('parts', part));
      }
    } catch { /* ignore */ }
  }

  // Job templates
  const rawTemplates = localStorage.getItem('quote_calculator_job_templates');
  if (rawTemplates) {
    try {
      const templates = JSON.parse(rawTemplates) as Array<Record<string, unknown>>;
      for (const t of templates) {
        const rawParts = (t.parts ?? []) as Array<Record<string, unknown>>;
        const parts: TemplatePart[] = rawParts.map((p) => ({
          type: 'specific' as const,
          partId: (p.id as string) || '',
          quantity: Number(p.quantity) || 1,
        }));
        const template: JobTemplate = {
          id: (t.id as string) || crypto.randomUUID(),
          name: (t.name as string) || 'Template',
          description: (t.description as string) || '',
          laborHrs: Number(t.laborHrs) || 0,
          laborCost: Number(t.laborCost) || 0,
          parts,
          createdAt: (t.createdAt as number) || Date.now(),
        };
        migrations.push(dbPut('templates', template));
      }
    } catch { /* ignore */ }
  }

  // Quotes
  const rawIndex = localStorage.getItem('quote_calculator_history');
  if (rawIndex) {
    try {
      const index = JSON.parse(rawIndex) as Array<Record<string, unknown>>;
      for (const entry of index) {
        const id = String(entry.id);
        const ts = (entry.timestamp as number) || Date.now();

        const indexEntry: QuoteIndexEntry = {
          id,
          createdAt: ts,
          updatedAt: ts,
          customer: (entry.customerName as string) || 'Unknown',
          vehicle: '',
          total: (entry.grandTotal as number) || 0,
        };
        migrations.push(dbPut('quoteIndex', indexEntry));

        const rawQuote = localStorage.getItem(`quote_${id}`);
        if (rawQuote) {
          try {
            const q = JSON.parse(rawQuote) as Record<string, unknown>;
            migrations.push(dbPut('quotes', { ...q, id }));
          } catch { /* ignore */ }
        }
      }
    } catch { /* ignore */ }
  }

  await Promise.all(migrations);
  localStorage.setItem(MIGRATION_FLAG, '1');
  // Preserve localStorage data as a read-only backup — do not delete it

  return hasLegacyData;
}

// ── Sequential number counters ─────────────────────────────────────────────────

async function nextCounter(key: string, start: number): Promise<number> {
  const current = await settingsGet<number>(key);
  const next = current ? current + 1 : start;
  await settingsPut(key, next);
  return next;
}

export const getNextOrderNumber = () => nextCounter('orderCounter', 1);
export const getNextInvoiceNumber = () => nextCounter('invoiceCounter', 1);
export const getNextPoNumber = () => nextCounter('poCounter', 1001);

// ── Appointments ───────────────────────────────────────────────────────────────

export async function getAppointments(): Promise<Appointment[]> {
  const all = await dbGetAll<Appointment>('appointments');
  return all.sort((a, b) => a.dropoffAt - b.dropoffAt);
}

export async function getCustomerAppointments(customerId: string): Promise<Appointment[]> {
  return dbGetAllByIndex<Appointment>('appointments', 'customerId', customerId);
}

export async function saveAppointment(
  data: Partial<Appointment> & { customerId: string; vehicleId: string; dropoffAt: number },
): Promise<Appointment> {
  const appointment: Appointment = {
    id: data.id || crypto.randomUUID(),
    customerId: data.customerId,
    vehicleId: data.vehicleId,
    quoteId: data.quoteId,
    orderId: data.orderId,
    createdAt: data.createdAt ?? Date.now(),
    dropoffAt: data.dropoffAt,
    promisedAt: data.promisedAt,
    transportType: data.transportType,
    notes: data.notes ?? '',
  };
  await dbPut('appointments', appointment);
  return appointment;
}

export async function updateAppointment(id: string, data: Partial<Appointment>): Promise<void> {
  const existing = await dbGet<Appointment>('appointments', id);
  if (!existing) return;
  await dbPut('appointments', { ...existing, ...data, id });
}

export async function deleteAppointment(id: string): Promise<void> {
  await dbDelete('appointments', id);
}

// ── Orders ──────────────────────────────────────────────────────────────────────

export async function getOrders(): Promise<Order[]> {
  const all = await dbGetAll<Order>('orders');
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getOrder(id: string): Promise<Order | null> {
  return (await dbGet<Order>('orders', id)) ?? null;
}

export async function getCustomerOrders(customerId: string): Promise<Order[]> {
  const all = await dbGetAllByIndex<Order>('orders', 'customerId', customerId);
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getVehicleOrders(vehicleId: string): Promise<Order[]> {
  const all = await dbGetAllByIndex<Order>('orders', 'vehicleId', vehicleId);
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function createOrder(
  data: Partial<Order> & { customerId: string; vehicleId: string },
): Promise<Order> {
  const now = Date.now();
  const order: Order = {
    id: String(await getNextOrderNumber()),
    vehicleId: data.vehicleId,
    customerId: data.customerId,
    mileageIn: data.mileageIn ?? '',
    mileageOut: data.mileageOut ?? '',
    transportType: data.transportType,
    workStatus: data.workStatus ?? 'open',
    quotedTotal: data.quotedTotal ?? 0,
    shopCharges: data.shopCharges ?? 0,
    taxTotal: data.taxTotal ?? 0,
    orderSubtotal: data.orderSubtotal ?? 0,
    discountAmount: data.discountAmount ?? 0,
    discountType: data.discountType ?? 'flat',
    discountValue: data.discountValue ?? 0,
    discountAppliesTo: data.discountAppliesTo ?? 'both',
    taxable: data.taxable ?? true,
    rates: data.rates ?? (await loadGlobalRates()),
    notes: data.notes ?? '',
    createdAt: now,
    updatedAt: now,
    finalized: false,
    paidInFull: false,
  };
  await dbPut('orders', order);
  return order;
}

/** Update mutable order header fields. Refuses edits once finalized (except via finalize/void). */
export async function updateOrder(id: string, data: Partial<Order>): Promise<void> {
  const existing = await dbGet<Order>('orders', id);
  if (!existing) return;
  if (existing.finalized) return;
  await dbPut('orders', { ...existing, ...data, id, updatedAt: Date.now() });
}

export async function voidOrder(id: string): Promise<void> {
  const existing = await dbGet<Order>('orders', id);
  if (!existing || existing.finalized || existing.voidedAt) return;
  await dbPut('orders', { ...existing, voidedAt: Date.now(), updatedAt: Date.now() });
}

/**
 * Derived status: voided/closed(paid)/invoiced take precedence, otherwise the
 * order's active-phase workStatus (open / pending authorization / awaiting parts).
 */
export function orderStatus(o: Order): OrderStatus {
  if (o.voidedAt) return 'void';
  if (o.paidInFull) return 'closed';
  if (o.finalized) return 'invoiced';
  return o.workStatus ?? 'open';
}

/** Customer-facing order total: parts+labor+sublets + fees + tax − discount. */
export function orderGrandTotal(o: Order): number {
  return o.orderSubtotal + o.shopCharges + o.taxTotal - o.discountAmount;
}

// ── Order jobs ──────────────────────────────────────────────────────────────────

export async function getOrderJobs(orderId: string): Promise<OrderJob[]> {
  return dbGetAllByIndex<OrderJob>('orderJobs', 'orderId', orderId);
}

export async function saveOrderJob(
  data: Partial<OrderJob> & { orderId: string },
): Promise<OrderJob> {
  const job: OrderJob = {
    id: data.id || crypto.randomUUID(),
    orderId: data.orderId,
    opCode: data.opCode,
    name: data.name ?? '',
    description: data.description ?? '',
    laborHrs: Number(data.laborHrs) || 0,
    laborPrice: Number(data.laborPrice) || 0,
    quotedLaborPrice: Number(data.quotedLaborPrice) || 0,
    quotedPartsPrice: Number(data.quotedPartsPrice) || 0,
    partsTotal: Number(data.partsTotal) || 0,
    addOn: data.addOn ?? false,
    payType: data.payType ?? 'customer',
    warrantyPolicyId: data.warrantyPolicyId,
    warrantyPolicyName: data.warrantyPolicyName,
    warrantyDateBilled: data.warrantyDateBilled,
    warrantyMileage: data.warrantyMileage,
  };
  await dbPut('orderJobs', job);
  return job;
}

export async function updateOrderJob(id: string, data: Partial<OrderJob>): Promise<void> {
  const existing = await dbGet<OrderJob>('orderJobs', id);
  if (!existing) return;
  await dbPut('orderJobs', { ...existing, ...data, id });
}

/** Deletes a job and cascades to its parts. */
export async function deleteOrderJob(id: string): Promise<void> {
  const parts = await dbGetAllByIndex<OrderJobPart>('orderJobParts', 'jobId', id);
  await Promise.all([
    dbDelete('orderJobs', id),
    ...parts.map((p) => dbDelete('orderJobParts', p.id)),
  ]);
}

// ── Order job parts ───────────────────────────────────────────────────────────

export async function getOrderJobParts(orderId: string): Promise<OrderJobPart[]> {
  return dbGetAllByIndex<OrderJobPart>('orderJobParts', 'orderId', orderId);
}

export async function getJobParts(jobId: string): Promise<OrderJobPart[]> {
  return dbGetAllByIndex<OrderJobPart>('orderJobParts', 'jobId', jobId);
}

export async function saveOrderJobPart(
  data: Partial<OrderJobPart> & { orderId: string; jobId: string },
): Promise<OrderJobPart> {
  const part: OrderJobPart = {
    id: data.id || crypto.randomUUID(),
    orderId: data.orderId,
    jobId: data.jobId,
    inventoryId: data.inventoryId,
    partNumber: data.partNumber ?? '',
    name: data.name ?? '',
    quantity: Number(data.quantity) || 0,
    unitPrice: Number(data.unitPrice) || 0,
    cost: data.cost != null ? Number(data.cost) : undefined,
    eta: data.eta,
  };
  await dbPut('orderJobParts', part);
  return part;
}

export async function updateOrderJobPart(id: string, data: Partial<OrderJobPart>): Promise<void> {
  const existing = await dbGet<OrderJobPart>('orderJobParts', id);
  if (!existing) return;
  await dbPut('orderJobParts', { ...existing, ...data, id });
}

export async function deleteOrderJobPart(id: string): Promise<void> {
  await dbDelete('orderJobParts', id);
}

// ── Order sublets ─────────────────────────────────────────────────────────────

export async function getOrderSublets(orderId: string): Promise<OrderSublet[]> {
  return dbGetAllByIndex<OrderSublet>('orderSublets', 'orderId', orderId);
}

export async function saveOrderSublet(
  data: Partial<OrderSublet> & { orderId: string },
): Promise<OrderSublet> {
  const sublet: OrderSublet = {
    id: data.id || crypto.randomUUID(),
    orderId: data.orderId,
    description: data.description ?? '',
    vendorId: data.vendorId,
    cost: Number(data.cost) || 0,
    sellPrice: Number(data.sellPrice) || 0,
    taxable: data.taxable ?? false,
    poId: data.poId,
  };
  await dbPut('orderSublets', sublet);
  return sublet;
}

export async function updateOrderSublet(id: string, data: Partial<OrderSublet>): Promise<void> {
  const existing = await dbGet<OrderSublet>('orderSublets', id);
  if (!existing) return;
  await dbPut('orderSublets', { ...existing, ...data, id });
}

export async function deleteOrderSublet(id: string): Promise<void> {
  await dbDelete('orderSublets', id);
}

// ── Inventory reservations / availability ───────────────────────────────────────

/** inventoryId → quantity reserved by parts on OPEN (not finalized/void) orders. */
export async function getPartReservations(): Promise<Record<string, number>> {
  const [orders, parts] = await Promise.all([
    dbGetAll<Order>('orders'),
    dbGetAll<OrderJobPart>('orderJobParts'),
  ]);
  const openIds = new Set(
    orders.filter((o) => !o.finalized && !o.voidedAt).map((o) => o.id),
  );
  const reserved: Record<string, number> = {};
  for (const p of parts) {
    if (!p.inventoryId || !openIds.has(p.orderId)) continue;
    reserved[p.inventoryId] = (reserved[p.inventoryId] ?? 0) + (Number(p.quantity) || 0);
  }
  return reserved;
}

/** qtyOnHand − reserved for a single part. */
export async function getPartAvailability(inventoryId: string): Promise<number> {
  const [part, reservations] = await Promise.all([
    dbGet<LibraryPart>('parts', inventoryId),
    getPartReservations(),
  ]);
  const onHand = part?.qtyOnHand ?? 0;
  return onHand - (reservations[inventoryId] ?? 0);
}

// ── Invoicing ───────────────────────────────────────────────────────────────────

export async function getInvoice(id: string): Promise<Invoice | null> {
  return (await dbGet<Invoice>('invoices', id)) ?? null;
}

export async function getOrderInvoice(orderId: string): Promise<Invoice | null> {
  const matches = await dbGetAllByIndex<Invoice>('invoices', 'orderId', orderId);
  return matches[0] ?? null;
}

export async function getCustomerInvoices(customerId: string): Promise<Invoice[]> {
  const all = await dbGetAllByIndex<Invoice>('invoices', 'customerId', customerId);
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Finalize an order: create its invoice, lock the order, and consume stocked
 * parts (decrement qtyOnHand). No-op if already finalized or voided.
 */
export async function finalizeOrder(orderId: string): Promise<Invoice | null> {
  const order = await dbGet<Order>('orders', orderId);
  if (!order || order.finalized || order.voidedAt) return null;
  const now = Date.now();

  const invoice: Invoice = {
    id: String(await getNextInvoiceNumber()),
    orderId,
    customerId: order.customerId,
    total: orderGrandTotal(order),
    createdAt: now,
  };

  // Consume stocked parts.
  const parts = await getOrderJobParts(orderId);
  const consumed: Record<string, number> = {};
  for (const p of parts) {
    if (p.inventoryId) consumed[p.inventoryId] = (consumed[p.inventoryId] ?? 0) + (Number(p.quantity) || 0);
  }
  const writes: Promise<unknown>[] = [
    dbPut('invoices', invoice),
    dbPut('orders', { ...order, finalized: true, invoicedAt: now, updatedAt: now }),
  ];
  for (const [pid, qty] of Object.entries(consumed)) {
    const lib = await dbGet<LibraryPart>('parts', pid);
    if (lib && lib.qtyOnHand != null) {
      writes.push(dbPut('parts', { ...lib, qtyOnHand: lib.qtyOnHand - qty }));
    }
  }
  // Attach existing deposits to the new invoice for record-keeping.
  const deposits = await getOrderPayments(orderId);
  for (const dep of deposits) {
    if (!dep.invoiceId) writes.push(dbPut('payments', { ...dep, invoiceId: invoice.id }));
  }
  await Promise.all(writes);
  await refreshOrderPaid(orderId);
  return invoice;
}

// ── Payments ────────────────────────────────────────────────────────────────────

export async function getCustomerPayments(customerId: string): Promise<Payment[]> {
  const all = await dbGetAllByIndex<Payment>('payments', 'customerId', customerId);
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getInvoicePayments(invoiceId: string): Promise<Payment[]> {
  return dbGetAllByIndex<Payment>('payments', 'invoiceId', invoiceId);
}

/** All payments (deposits + final) recorded against an order. */
export async function getOrderPayments(orderId: string): Promise<Payment[]> {
  const all = await dbGetAll<Payment>('payments');
  return all
    .filter((p) => p.orderId === orderId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function getOrderPaidTotal(orderId: string): Promise<number> {
  const payments = await getOrderPayments(orderId);
  return payments.reduce((s, p) => s + (p.amount || 0), 0);
}

export async function addPayment(
  data: Partial<Payment> & { customerId: string; method: Payment['method']; amount: number },
): Promise<Payment> {
  const payment: Payment = {
    id: data.id || crypto.randomUUID(),
    customerId: data.customerId,
    orderId: data.orderId,
    invoiceId: data.invoiceId,
    method: data.method,
    amount: Number(data.amount) || 0,
    createdAt: data.createdAt ?? Date.now(),
    isDeposit: data.isDeposit,
    checkNumber: data.checkNumber,
    poNumber: data.poNumber,
    paidAt: data.paidAt,
    billedAt: data.billedAt,
    note: data.note,
  };
  await dbPut('payments', payment);
  if (payment.orderId) await refreshOrderPaid(payment.orderId);
  return payment;
}

export async function deletePayment(id: string): Promise<void> {
  const payment = await dbGet<Payment>('payments', id);
  await dbDelete('payments', id);
  if (payment?.orderId) await refreshOrderPaid(payment.orderId);
}

/**
 * Recompute an order's paidInFull from the sum of its payments vs the invoice
 * total (or the order grand total if not yet invoiced).
 */
async function refreshOrderPaid(orderId: string): Promise<void> {
  const order = await dbGet<Order>('orders', orderId);
  if (!order) return;
  const paid = await getOrderPaidTotal(orderId);
  const invoice = await getOrderInvoice(orderId);
  const target = invoice ? invoice.total : orderGrandTotal(order);
  const paidInFull = order.finalized && paid + 1e-9 >= target;
  if (order.paidInFull !== paidInFull) {
    await dbPut('orders', { ...order, paidInFull, updatedAt: Date.now() });
  }
}

/**
 * Customer balance = Σ payments − Σ invoices.
 * Positive → credit / overpayment; negative → amount due.
 */
export async function getCustomerBalance(customerId: string): Promise<number> {
  const [invoices, payments] = await Promise.all([
    getCustomerInvoices(customerId),
    getCustomerPayments(customerId),
  ]);
  const invoiced = invoices.reduce((s, i) => s + (i.total || 0), 0);
  const paid = payments.reduce((s, p) => s + (p.amount || 0), 0);
  return paid - invoiced;
}

// ── Purchase Orders ─────────────────────────────────────────────────────────────

export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
  const all = await dbGetAll<PurchaseOrder>('purchaseOrders');
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getPurchaseOrder(id: string): Promise<PurchaseOrder | null> {
  return (await dbGet<PurchaseOrder>('purchaseOrders', id)) ?? null;
}

export async function getVendorPurchaseOrders(vendorId: string): Promise<PurchaseOrder[]> {
  return dbGetAllByIndex<PurchaseOrder>('purchaseOrders', 'vendorId', vendorId);
}

export async function createPurchaseOrder(
  data: Partial<PurchaseOrder> & { vendorId: string },
): Promise<PurchaseOrder> {
  const po: PurchaseOrder = {
    id: String(await getNextPoNumber()),
    vendorId: data.vendorId,
    status: data.status ?? 'draft',
    orderId: data.orderId,
    createdAt: Date.now(),
    orderedAt: data.orderedAt,
    receivedAt: data.receivedAt,
    notes: data.notes ?? '',
  };
  await dbPut('purchaseOrders', po);
  return po;
}

export async function updatePurchaseOrder(id: string, data: Partial<PurchaseOrder>): Promise<void> {
  const existing = await dbGet<PurchaseOrder>('purchaseOrders', id);
  if (!existing) return;
  await dbPut('purchaseOrders', { ...existing, ...data, id });
}

/** Deletes a PO and cascades to its lines. Intended for drafts. */
export async function deletePurchaseOrder(id: string): Promise<void> {
  const lines = await getPoLines(id);
  await Promise.all([
    dbDelete('purchaseOrders', id),
    ...lines.map((l) => dbDelete('purchaseOrderLines', l.id)),
  ]);
}

// ── Purchase Order lines ────────────────────────────────────────────────────────

export async function getPoLines(poId: string): Promise<PurchaseOrderLine[]> {
  return dbGetAllByIndex<PurchaseOrderLine>('purchaseOrderLines', 'poId', poId);
}

export async function getAllPoLines(): Promise<PurchaseOrderLine[]> {
  return dbGetAll<PurchaseOrderLine>('purchaseOrderLines');
}

/** Extended cost of a PO line (qty applies to stockable/sublet lines). */
export function poLineTotal(l: PurchaseOrderLine): number {
  const qtyApplies =
    l.lineType === 'inventory' || l.lineType === 'special_order' || l.lineType === 'sublet';
  return l.unitCost * (qtyApplies ? l.quantityOrdered : 1);
}

export async function savePoLine(
  data: Partial<PurchaseOrderLine> & { poId: string },
): Promise<PurchaseOrderLine> {
  const lineType = data.lineType ?? (data.inventoryId ? 'inventory' : 'misc');
  const line: PurchaseOrderLine = {
    id: data.id || crypto.randomUUID(),
    poId: data.poId,
    lineType,
    inventoryId: data.inventoryId,
    partNumber: data.partNumber ?? '',
    name: data.name ?? '',
    quantityOrdered: Number(data.quantityOrdered) || 0,
    quantityReceived: Number(data.quantityReceived) || 0,
    unitCost: Number(data.unitCost) || 0,
    addToInventory:
      data.addToInventory ?? (lineType === 'inventory' || lineType === 'special_order'),
    sellPrice: data.sellPrice,
    category: data.category,
    subcategory: data.subcategory,
    expenseCategory: data.expenseCategory,
    orderId: data.orderId,
    subletId: data.subletId,
    note: data.note,
  };
  await dbPut('purchaseOrderLines', line);
  return line;
}

export async function updatePoLine(id: string, data: Partial<PurchaseOrderLine>): Promise<void> {
  const existing = await dbGet<PurchaseOrderLine>('purchaseOrderLines', id);
  if (!existing) return;
  await dbPut('purchaseOrderLines', { ...existing, ...data, id });
}

export async function deletePoLine(id: string): Promise<void> {
  await dbDelete('purchaseOrderLines', id);
}

/**
 * Receive quantities against a PO.
 * - inventory lines: increment the part's qty on hand.
 * - special_order lines: create the inventory item on first receipt (menu price if
 *   a sell price was set, otherwise matrix-priced from cost), then stock it.
 * - sublet / expense / misc lines: just record the received quantity.
 * Recomputes PO status.
 */
export async function receivePurchaseOrder(
  poId: string,
  receipts: Array<{ lineId: string; quantityReceived: number }>,
): Promise<void> {
  const po = await dbGet<PurchaseOrder>('purchaseOrders', poId);
  if (!po) return;
  const lines = await getPoLines(poId);
  const receiptMap = new Map(receipts.map((r) => [r.lineId, Number(r.quantityReceived) || 0]));
  const matrix = (await loadGlobalRates()).partsMarkupMatrix;
  const writes: Promise<unknown>[] = [];

  for (const line of lines) {
    const received = receiptMap.get(line.id);
    if (!received || received <= 0) continue;

    let linePatch: PurchaseOrderLine = {
      ...line,
      quantityReceived: line.quantityReceived + received,
    };

    if (line.lineType === 'special_order' && !line.inventoryId) {
      // Create the inventory item the first time a special order is received.
      const cost = line.unitCost;
      const price =
        line.sellPrice != null && line.sellPrice > 0
          ? line.sellPrice
          : parseFloat(calculateSellPrice(cost, matrix).toFixed(2));
      const created = await saveLibraryPart({
        partNumber: line.partNumber,
        name: line.name || 'Special Order Part',
        cost,
        price,
        msrp: 0,
        description: '',
        category: line.category || '',
        subcategory: line.subcategory || '',
        menuPrice: line.sellPrice != null && line.sellPrice > 0,
        qtyOnHand: received,
        binLocation: undefined,
      });
      linePatch = { ...linePatch, inventoryId: created.id };
    } else if (line.addToInventory && line.inventoryId) {
      const lib = await dbGet<LibraryPart>('parts', line.inventoryId);
      if (lib) {
        writes.push(dbPut('parts', { ...lib, qtyOnHand: (lib.qtyOnHand ?? 0) + received }));
      }
    }

    writes.push(dbPut('purchaseOrderLines', linePatch));
  }

  const projected = lines.map((l) => l.quantityReceived + (receiptMap.get(l.id) ?? 0));
  const allReceived = lines.length > 0 && lines.every((l, i) => projected[i] >= l.quantityOrdered);
  const anyReceived = projected.some((q) => q > 0);
  const status: PoStatus = allReceived ? 'received' : anyReceived ? 'partial' : po.status;

  writes.push(
    dbPut('purchaseOrders', {
      ...po,
      status,
      receivedAt: allReceived ? Date.now() : po.receivedAt,
    }),
  );
  await Promise.all(writes);
}

/** All expense/misc PO lines across all POs, for spend tracking over time. */
export async function getExpenseLines(): Promise<
  Array<{ line: PurchaseOrderLine; po: PurchaseOrder }>
> {
  const [lines, pos] = await Promise.all([
    dbGetAll<PurchaseOrderLine>('purchaseOrderLines'),
    dbGetAll<PurchaseOrder>('purchaseOrders'),
  ]);
  const poById = new Map(pos.map((p) => [p.id, p]));
  return lines
    .filter((l) => l.lineType === 'expense' || l.lineType === 'misc')
    .map((line) => ({ line, po: poById.get(line.poId)! }))
    .filter((x) => x.po)
    .sort((a, b) => b.po.createdAt - a.po.createdAt);
}
