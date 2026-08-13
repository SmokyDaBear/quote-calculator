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
  taxable?: boolean;   // undefined / true = taxable (default); false = tax-exempt
  taxId?: string;      // tax-exempt certificate number
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
  qtyOnHand?: number;   // stocked quantity; undefined/0 = not stocked
  binLocation?: string; // shelf / bin identifier
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
  opCode?: string;
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
  warrantyPolicyId?: string;
  warrantyPolicyName?: string;
  warrantyDateBilled?: string;
  warrantyMileage?: string;
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
  subletMarkupMatrix?: MarkupBracket[]; // markup applied to sublet cost
  laborTaxRate?: number;                // % of labor taxed (states that tax labor); default 0
  subletTaxable?: boolean;              // whether sublets are taxable by default; default false
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
  /** Authorization text printed above the signature line on work orders. */
  workOrderDisclaimer?: string;
  /** Warranty text printed above the signature line on invoices. */
  invoiceWarranty?: string;
  /** Weekly operating hours, used to schedule and estimate promise times. */
  storeHours?: StoreHours;
}

// ── Store Hours ──────────────────────────────────────────────────────────────

/** One weekday's operating window, in minutes past midnight. */
export interface StoreDayHours {
  closed: boolean;
  open: number;
  close: number;
}

/** Seven entries indexed by `Date.getDay()` — index 0 is Sunday. */
export type StoreHours = StoreDayHours[];

// ── Warranty Policies ────────────────────────────────────────────────────────

export interface WarrantyTier {
  id: string;
  label: string;
  maxMonths: number | null;
  maxMiles: number | null;
  partsPct: number;    // warranty % for parts cost
  laborPct: number;    // warranty % for labor cost
}

export interface WarrantyPolicy {
  id: string;
  label: string;
  description?: string;
  category: string;         // maps to LibraryPart.category for auto-selection
  subcategory: string[];    // empty = match any subcategory; otherwise match any listed
  tiers: WarrantyTier[];
  // swapMaxMonths / billOutMultiplier / billOutMaxMonths kept for stored-data compat; no longer used
  swapMaxMonths?: number | null;
  billOutMultiplier?: number;
  billOutMaxMonths?: number | null;
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

// ── Orders / Invoicing / Payments / Purchase Orders ───────────────────────────

export type TransportType = 'waiter' | 'dropoff' | 'loaner' | 'shuttle' | undefined;
/** customer = normal pay; warranty = manufacturer warranty; internal = shop-covered */
export type PayType = 'customer' | 'warranty' | 'internal';
export type PaymentMethod = 'cash' | 'check' | 'charge';
/** User-settable status while an order is still being worked (pre-invoice). */
export type OrderWorkStatus = 'open' | 'pending_authorization' | 'awaiting_parts';
/** Full derived status: work statuses + invoiced (awaiting pickup) + closed (paid) + void. */
export type OrderStatus = OrderWorkStatus | 'invoiced' | 'closed' | 'void';
export type PoStatus = 'draft' | 'ordered' | 'partial' | 'received' | 'cancelled';

/**
 * What a purchase-order line represents:
 * - inventory:      restock an existing inventory part (qty on hand += received)
 * - special_order:  a part not yet stocked — creates an inventory item on receipt
 * - sublet:         outside work linked to a work order's sublet (record-keeping)
 * - expense:        a categorized shop expense tracked over time (not inventoried)
 * - misc:           shop supplies / misc charge with a note (not inventoried)
 */
export type PoLineType = 'inventory' | 'special_order' | 'sublet' | 'expense' | 'misc';

export const EXPENSE_CATEGORIES = [
  'Landscaping',
  'Site Maintenance',
  'Store Meetings',
  'Store Parties',
  'Training',
  'Internet/IT',
  'Shop Security',
  'Insurance',
  'Uniforms',
  'Janitorial',
  'Equipment',
  'Other',
] as const;
export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];

export interface Appointment {
  id: string;
  customerId: string;
  vehicleId: string;
  quoteId?: string;       // FK → SavedQuote.id (if rolled from a quote)
  orderId?: string;       // FK → Order.id (set once converted to an order)
  createdAt: number;
  dropoffAt: number;      // scheduled drop-off / appointment time
  promisedAt?: number;    // promised-by time
  transportType: TransportType;
  notes: string;
}

export interface Order {
  id: string;
  vehicleId: string;
  customerId: string;
  mileageIn: string;
  mileageOut: string;
  transportType: TransportType;
  workStatus?: OrderWorkStatus;  // active-phase status (open/pending auth/awaiting parts)
  quotedTotal: number;    // parts+labor subtotal at creation (no tax/fees), frozen
  shopCharges: number;    // shop supplies / fees
  taxTotal: number;
  orderSubtotal: number;  // live parts+labor+sublets (no tax/fees)
  discountAmount: number;
  discountType: 'flat' | 'pct';
  discountValue?: number;            // raw discount input (preserved across reload)
  discountAppliesTo?: 'both' | 'parts' | 'labor';
  taxable?: boolean;                 // order-level taxable flag; default true
  rates: GlobalRates;     // rate snapshot at creation
  notes: string;
  createdAt: number;
  updatedAt: number;
  invoicedAt?: number;
  voidedAt?: number;
  finalized: boolean;     // invoiced & billed → read-only
  paidInFull: boolean;
}

export interface OrderJob {
  id: string;
  orderId: string;
  opCode?: string;        // null for custom recommendations
  name: string;
  description: string;
  laborHrs: number;
  laborPrice: number;
  quotedLaborPrice: number;  // frozen at approval / from quote
  quotedPartsPrice: number;  // frozen at approval / from quote
  partsTotal: number;
  addOn: boolean;            // true = added after order creation (recommendation)
  payType: PayType;
  warrantyPolicyId?: string;
  warrantyPolicyName?: string;
  warrantyDateBilled?: string;
  warrantyMileage?: string;
}

export interface OrderJobPart {
  id: string;
  orderId: string;
  jobId: string;          // FK → OrderJob.id
  inventoryId?: string;   // FK → LibraryPart.id; undefined = miscellaneous / non-stock
  partNumber: string;
  name: string;
  quantity: number;
  unitPrice: number;
  cost?: number;
  eta?: string;           // ETA for special-ordered parts
}

/** Persisted sublet (numeric) — embedded in quote docs and stored in orderSublets. */
export interface Sublet {
  id: string;
  description: string;
  vendorId?: string;
  cost: number;
  sellPrice: number;      // default = matrix-marked-up cost; overridable
  taxable: boolean;       // default from GlobalRates.subletTaxable
  poId?: string;          // FK → PurchaseOrder.id (orders only)
}

export interface OrderSublet extends Sublet {
  orderId: string;
}

/** In-quote/in-order sublet editing model (string-backed for controlled inputs). */
export interface WorkingSublet {
  id: string;
  description: string;
  vendorId?: string;
  cost: string;
  sellPrice: string;
  taxable: boolean;
  poId?: string;   // set when linked to a purchase order
}

export interface Invoice {
  id: string;
  orderId: string;
  customerId: string;
  total: number;
  createdAt: number;
}

export interface Payment {
  id: string;
  customerId: string;
  orderId?: string;        // FK → Order.id (deposits are taken against the order)
  invoiceId?: string;      // FK → Invoice.id (set once the order is invoiced)
  method: PaymentMethod;
  amount: number;
  createdAt: number;
  isDeposit?: boolean;     // true = taken before the order was invoiced
  checkNumber?: string;    // method === 'check'
  poNumber?: string;       // method === 'charge' — customer P.O.
  paidAt?: number;         // method === 'charge'
  billedAt?: number;       // method === 'charge'
  note?: string;
}

export interface PurchaseOrder {
  id: string;
  vendorId: string;
  status: PoStatus;
  orderId?: string;        // optional FK → Order.id (PO raised for a work order)
  createdAt: number;
  orderedAt?: number;
  receivedAt?: number;
  notes: string;
}

export interface PurchaseOrderLine {
  id: string;
  poId: string;            // FK → PurchaseOrder.id
  lineType: PoLineType;
  inventoryId?: string;    // FK → LibraryPart.id (inventory restock / created special-order part)
  partNumber: string;
  name: string;            // part name / sublet desc / expense name / misc note
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: number;
  addToInventory: boolean; // true for inventory + special_order
  sellPrice?: number;      // special_order: menu price for the created inventory item
  category?: string;       // special_order: part category
  subcategory?: string;    // special_order: part subcategory
  expenseCategory?: string;// expense lines
  orderId?: string;        // sublet line → work order
  subletId?: string;       // sublet line → OrderSublet.id
  note?: string;           // misc / general note
}
