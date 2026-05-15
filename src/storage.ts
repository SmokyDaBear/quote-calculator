import { DEFAULT_MARKUP_MATRIX, calculateSellPrice } from './utils/partsMarkup';
import { dbGet, dbGetAll, dbPut, dbDelete, dbClear, settingsGet, settingsPut, openDB } from './db/index';
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
} from './types/index';

// ── Rates ────────────────────────────────────────────────────────────────────

export const DEFAULT_RATES: GlobalRates = {
  taxRate: 8.52,
  laborRate: 215,
  ssRate: 15,
  ssMax: 54.95,
  partsMarkupMatrix: DEFAULT_MARKUP_MATRIX,
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

export async function getCustomerVehicles(customerId: string): Promise<Vehicle[]> {
  const all = await dbGetAll<Vehicle>('vehicles');
  return all.filter((v) => v.customerId === customerId);
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

// ── Accent ────────────────────────────────────────────────────────────────────

export async function loadAccent(): Promise<string> {
  return (await settingsGet<string>('accent')) ?? 'green';
}

export async function saveAccent(id: string): Promise<void> {
  await settingsPut('accent', id);
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
