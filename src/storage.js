const STORAGE_KEY = "quote_calculator_history";
const QUOTE_COUNTER_KEY = "quote_calculator_counter";
const RATES_KEY = "quote_calculator_rates";

export const DEFAULT_RATES = {
  taxRate: 8.52,
  laborRate: 215,
  ssRate: 15,
  ssMax: 54.95,
};

export const saveGlobalRates = (rates) => {
  localStorage.setItem(RATES_KEY, JSON.stringify(rates));
};

export const loadGlobalRates = () => {
  const saved = localStorage.getItem(RATES_KEY);
  if (saved) {
    const parsed = JSON.parse(saved);
    return {
      taxRate: parsed.taxRate ?? DEFAULT_RATES.taxRate,
      laborRate: parsed.laborRate ?? DEFAULT_RATES.laborRate,
      ssRate: parsed.ssRate ?? DEFAULT_RATES.ssRate,
      ssMax: parsed.ssMax ?? DEFAULT_RATES.ssMax,
    };
  }
  return { ...DEFAULT_RATES };
};

export const getNextQuoteNumber = () => {
  const current = localStorage.getItem(QUOTE_COUNTER_KEY);
  const next = current ? parseInt(current, 10) + 1 : 1001;
  localStorage.setItem(QUOTE_COUNTER_KEY, next.toString());
  return next;
};

export const getCurrentQuoteNumber = () => {
  const current = localStorage.getItem(QUOTE_COUNTER_KEY);
  return current ? parseInt(current, 10) + 1 : 1001;
};

export const getHistoryIndex = () => {
  const history = localStorage.getItem(STORAGE_KEY);
  return history ? JSON.parse(history) : [];
};

export const clearHistory = () => {
  const history = getHistoryIndex();
  for (const { id } of history) {
    localStorage.removeItem(`quote_${id}`);
  }
  localStorage.removeItem(STORAGE_KEY);
};

export const saveQuote = (quoteData) => {
  const history = getHistoryIndex();
  const quoteNumber = getNextQuoteNumber();
  const timestamp = Date.now();

  const indexEntry = {
    id: quoteNumber,
    customerName: quoteData.customerName || "Unknown",
    phone: quoteData.phone || "",
    timestamp,
    grandTotal: quoteData.grandTotal || 0,
  };

  history.push(indexEntry);

  localStorage.setItem(
    `quote_${quoteNumber}`,
    JSON.stringify({ ...quoteData, quoteNumber, timestamp })
  );

  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  return quoteNumber;
};

export const getQuote = (quoteNumber) => {
  const data = localStorage.getItem(`quote_${quoteNumber}`);
  return data ? JSON.parse(data) : null;
};

export const updateQuote = (quoteId, quoteData) => {
  const history = getHistoryIndex();
  const idx = history.findIndex((h) => h.id === quoteId);
  if (idx === -1) return;

  const originalTimestamp = history[idx].timestamp;

  history[idx] = {
    id: quoteId,
    customerName: quoteData.customerName || "Unknown",
    phone: quoteData.phone || "",
    grandTotal: quoteData.grandTotal || 0,
    timestamp: originalTimestamp,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  localStorage.setItem(
    `quote_${quoteId}`,
    JSON.stringify({ ...quoteData, quoteNumber: quoteId, timestamp: originalTimestamp })
  );
};

export const deleteQuote = (quoteNumber) => {
  const history = getHistoryIndex();
  const filtered = history.filter((h) => h.id !== quoteNumber);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  localStorage.removeItem(`quote_${quoteNumber}`);
};

export const searchQuotes = (searchTerm) => {
  const history = getHistoryIndex();
  const term = searchTerm.toLowerCase();
  return history.filter(
    (h) =>
      h.customerName.toLowerCase().includes(term) ||
      h.id.toString().includes(term) ||
      (h.phone || "").toLowerCase().includes(term)
  );
};

// ── Tasks ────────────────────────────────────────────────────────────────────

const TASKS_KEY = "quote_calculator_tasks";

export const getTasks = () => {
  const data = localStorage.getItem(TASKS_KEY);
  return data ? JSON.parse(data) : [];
};

const persistTasks = (tasks) => {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
};

export const addTask = (taskData) => {
  const tasks = getTasks();
  const task = {
    id: crypto.randomUUID(),
    orderNumber: taskData.orderNumber || "",
    label: taskData.label || "",
    note: taskData.note || "",
    createdAt: Date.now(),
    completed: false,
  };
  tasks.unshift(task);
  persistTasks(tasks);
  return task;
};

export const toggleTask = (id) => {
  const tasks = getTasks().map((t) =>
    t.id === id ? { ...t, completed: !t.completed } : t
  );
  persistTasks(tasks);
};

export const removeTask = (id) => {
  const tasks = getTasks().filter((t) => t.id !== id);
  persistTasks(tasks);
};

// ── Customers ────────────────────────────────────────────────────────────────

const CUSTOMERS_KEY = "quote_calculator_customers";

export const getCustomers = () => {
  const data = localStorage.getItem(CUSTOMERS_KEY);
  if (!data) return [];
  const customers = JSON.parse(data);
  // Backfill IDs for records saved before this field existed
  let dirty = false;
  for (const c of customers) {
    if (!c.id) { c.id = crypto.randomUUID(); dirty = true; }
  }
  if (dirty) localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));
  return customers;
};

const persistCustomers = (customers) =>
  localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));

export const saveCustomer = (data) => {
  const customers = getCustomers();
  const customer = {
    id: crypto.randomUUID(),
    name: data.name?.trim() || "",
    phone: data.phone?.trim() || "",
    createdAt: Date.now(),
  };
  customers.push(customer);
  persistCustomers(customers);
  return customer;
};

export const updateCustomer = (id, data) => {
  persistCustomers(
    getCustomers().map((c) =>
      c.id === id ? { ...c, name: data.name?.trim() || "", phone: data.phone?.trim() || "" } : c
    )
  );
};

export const deleteCustomer = (id) => {
  persistCustomers(getCustomers().filter((c) => c.id !== id));
};

export const searchCustomers = (term) => {
  const q = term.toLowerCase();
  const qDigits = term.replace(/\D/g, "");
  return getCustomers().filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      (qDigits && c.phone.replace(/\D/g, "").includes(qDigits))
  );
};

// ── Customer Vehicles ────────────────────────────────────────────────────────

const vehicleKey = (customerId) => `${customerId}-vehicles`;

export const getCustomerVehicles = (customerId) => {
  const data = localStorage.getItem(vehicleKey(customerId));
  return data ? JSON.parse(data) : [];
};

const persistVehicles = (customerId, vehicles) =>
  localStorage.setItem(vehicleKey(customerId), JSON.stringify(vehicles));

export const saveCustomerVehicle = (customerId, data) => {
  const vehicles = getCustomerVehicles(customerId);
  const vehicle = {
    id: crypto.randomUUID(),
    year: data.year || "",
    make: data.make || "",
    model: data.model || "",
    trim: data.trim || "",
    vin: data.vin || "",
    mileage: data.mileage || "",
    createdAt: Date.now(),
  };
  vehicles.push(vehicle);
  persistVehicles(customerId, vehicles);
  return vehicle;
};

export const updateCustomerVehicle = (customerId, vehicleId, data) => {
  persistVehicles(
    customerId,
    getCustomerVehicles(customerId).map((v) =>
      v.id === vehicleId
        ? { ...v, year: data.year || "", make: data.make || "", model: data.model || "",
            trim: data.trim || "", vin: data.vin || "", mileage: data.mileage || "" }
        : v
    )
  );
};

export const deleteCustomerVehicle = (customerId, vehicleId) => {
  persistVehicles(
    customerId,
    getCustomerVehicles(customerId).filter((v) => v.id !== vehicleId)
  );
};

// ── Business Info ─────────────────────────────────────────────────────────────

const BUSINESS_KEY = 'quote_calculator_business';

export const loadBusinessInfo = () => {
  const defaults = { name: '', address: '', phone: '', logo: '', printMessage: '' };
  const data = localStorage.getItem(BUSINESS_KEY);
  return data ? { ...defaults, ...JSON.parse(data) } : defaults;
};

export const saveBusinessInfo = (info) => {
  localStorage.setItem(BUSINESS_KEY, JSON.stringify(info));
};

// ── Job Templates ─────────────────────────────────────────────────────────────

const JOB_TEMPLATES_KEY = "quote_calculator_job_templates";

export const getJobTemplates = () => {
  const data = localStorage.getItem(JOB_TEMPLATES_KEY);
  return data ? JSON.parse(data) : [];
};

const persistTemplates = (templates) =>
  localStorage.setItem(JOB_TEMPLATES_KEY, JSON.stringify(templates));

export const saveJobTemplate = (data) => {
  const templates = getJobTemplates();
  const template = {
    id: crypto.randomUUID(),
    name: data.name || "Template",
    description: data.description || "",
    laborHrs: Number(data.laborHrs) || 0,
    laborCost: Number(data.laborCost) || 0,
    parts: data.parts || [],
    createdAt: Date.now(),
  };
  templates.push(template);
  persistTemplates(templates);
  return template;
};

export const updateJobTemplate = (id, data) => {
  persistTemplates(
    getJobTemplates().map((t) => (t.id === id ? { ...t, ...data, id } : t))
  );
};

export const deleteJobTemplate = (id) => {
  persistTemplates(getJobTemplates().filter((t) => t.id !== id));
};

// ── Parts Library ─────────────────────────────────────────────────────────────

const PARTS_LIBRARY_KEY = "quote_calculator_parts_library";

export const getPartsLibrary = () => {
  const data = localStorage.getItem(PARTS_LIBRARY_KEY);
  return data ? JSON.parse(data) : [];
};

const persistLibraryParts = (parts) =>
  localStorage.setItem(PARTS_LIBRARY_KEY, JSON.stringify(parts));

export const saveLibraryPart = (data) => {
  const parts = getPartsLibrary();
  const part = {
    id: crypto.randomUUID(),
    partNumber: data.partNumber || "",
    name: data.name || "",
    price: Number(data.price) || 0,
    description: data.description || "",
    createdAt: Date.now(),
  };
  parts.push(part);
  persistLibraryParts(parts);
  return part;
};

export const updateLibraryPart = (id, data) => {
  persistLibraryParts(
    getPartsLibrary().map((p) => (p.id === id ? { ...p, ...data, id } : p))
  );
};

export const deleteLibraryPart = (id) => {
  persistLibraryParts(getPartsLibrary().filter((p) => p.id !== id));
};
