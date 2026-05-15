// ── Shared primitives ───────────────────────────────────────────────────────

export interface PhoneEntry {
  label: string;  // e.g. "Mobile", "Work"
  number: string;
}

// ── Domain entities ──────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  name: string;
  phones: PhoneEntry[];
  email: string;
  address: string;
  notes: string;
  createdAt: number;
}

export interface Vendor {
  id: string;
  name: string;
  phones: PhoneEntry[];
  address: string;
  contact: string;  // contact person name
  notes: string;
  createdAt: number;
}

export interface LibraryPart {
  id: string;
  partNumber: string;
  name: string;
  cost: number;
  price: number;   // sell price (markup applied)
  msrp: number;    // manufacturer list price
  description: string;
  category: string;
  subcategory: string;
  menuPrice?: boolean; // true = manually set price, skip matrix repricing
  vendorId?: string;  // FK → Vendor.id
  createdAt: number;
}

// ── Template relational parts ────────────────────────────────────────────────

export interface TemplatePart_Specific {
  type: 'specific';
  partId: string;      // FK → LibraryPart.id
  quantity: number;
}

export interface TemplatePart_Category {
  type: 'category';
  category: string;
  subcategory: string;
  quantity: number;
  estimatedPrice?: number;
}

export type TemplatePart = TemplatePart_Specific | TemplatePart_Category;

export const JOB_CATEGORIES = [
  "Scheduled Maintenance",
  "Steering/Suspension",
  "Brakes",
  "Electrical",
  "Engine",
  "Transmission",
  "Differential",
  "Driveability",
  "Tires",
  "Paint & Body",
  "Detail",
  "Trim",
  "Wiper/Washer",
  "Radio/Navigation",
] as const;

export type JobCategory = typeof JOB_CATEGORIES[number];

export interface JobTemplate {
  id: string;
  name: string;
  description: string;
  laborHrs: number;
  laborCost: number;
  parts: TemplatePart[];
  mileageInterval?: number | null;
  quickJob?: boolean;
  jobCategory?: JobCategory;
  createdAt: number;
}

// ── Working (in-quote) models ─────────────────────────────────────────────────

export interface WorkingPart {
  partNumber: string;
  name: string;
  price: string;       // string for controlled input
  quantity: number;
  cost?: string;
  msrp?: string;
  basePrice?: string;  // original sell price saved when priceAtList is enabled
  isEstimate?: boolean;
}

export interface WorkingJob {
  id: number;
  name: string;
  parts: WorkingPart[];
  laborHrs: string;
  laborCost: string;
  description: string;
  priceAtList?: boolean;
}

// ── Quote ────────────────────────────────────────────────────────────────────

export interface QuoteTotals {
  partsSubtotal: number;
  laborSubtotal: number;
  shopSupplies: number;
  subtotal: number;
  discount: number;
  taxable: number;
  tax: number;
  total: number;
}

export interface SavedQuote {
  id: string;
  createdAt: number;
  updatedAt: number;
  customer: string;
  customerId?: string;   // FK → Customer.id
  vehicle: string;
  jobs: WorkingJob[];
  rates: GlobalRates;
  notes: string;
  discount: number;
  discountType: 'flat' | 'pct';
  totals: QuoteTotals;
}

export interface QuoteIndexEntry {
  id: string;
  createdAt: number;
  updatedAt: number;
  customer: string;
  vehicle: string;
  total: number;
}

// ── Settings / Rates ─────────────────────────────────────────────────────────

export interface MarkupBracket {
  max: number | null;   // null = unbounded (last bracket)
  markupPct: number;
}

export interface GlobalRates {
  taxRate: number;
  laborRate: number;
  ssRate: number;
  ssMax: number;
  partsMarkupMatrix: MarkupBracket[];
}

// ── Estimated price map ───────────────────────────────────────────────────────

/** category → subcategory → estimated price */
export type EstimatedPriceMap = Record<string, Record<string, number>>;

export interface BusinessInfo {
  name: string;
  phone: string;
  address: string;
  logo: string;
  printMessage?: string;
}

// ── Vehicle ──────────────────────────────────────────────────────────────────

/** Ordered pairs of [label, value] from a NHTSA VIN decode */
export type DecodedVinData = Array<[string, string]>;

export interface Vehicle {
  id: string;
  customerId: string;   // FK → Customer.id
  year: string;
  make: string;
  model: string;
  trim: string;
  vin: string;
  mileage: string;
  color: string;
  notes: string;
  decodedVinData?: DecodedVinData;
  createdAt: number;
}
