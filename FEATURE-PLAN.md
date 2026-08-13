# Feature Plan — Orders, Invoicing, Payments, Purchase Orders & Sublets

> Companion to [todo.md](./todo.md). todo.md is the **requirements**; this is the **implementation plan**.
> Everything here is 100% offline (IndexedDB). Payments are records only — no real processing.

## Guiding decisions (assumptions — flag if wrong)

- **State management:** keep the existing lightweight pattern (React hooks + `src/storage.ts` + `src/db/index.ts`). No Redux in `quote-calculator` — the Redux question in CLAUDE.md is scoped to `torque-track-web-v2`. Each new domain gets a `use*` hook + storage functions, mirroring `useQuote` / `storage.ts`.
- **Numbering:** orders/invoices/POs each get their own counter in the `settings` store, mirroring `getNextQuoteNumber()` (`quoteCounter`). New keys: `orderCounter`, `invoiceCounter`, `poCounter`, `appointmentCounter`.
- **Immutability:** an order, once `finalized` (invoiced + billed), is read-only (jobs included). Orders are never deleted — only `voidedAt`.
- **Customer balance:** `balance = Σ(payments for customer) − Σ(invoice totals for customer)`. Positive = credit/overpayment, negative = amount due. (Per todo.md.)

---

## 0. Foundation — DB & types (do this first; everything depends on it)

### 0.1 Bump IndexedDB version + add stores — [src/db/index.ts](./src/db/index.ts)

`DB_VERSION` is `1`. Bump to `2`. In `onupgradeneeded`, the existing code is additive and idempotent (guards every `createObjectStore` with `.contains`), so we just add new stores. Add to `StoreName` union and create:

| Store | keyPath | Indexes | Notes |
|-------|---------|---------|-------|
| `appointments` | `id` | `customerId`, `vehicleId`, `quoteId`, `dropoffAt` | quote → appointment |
| `orders` | `id` | `customerId`, `vehicleId`, `createdAt` | order header |
| `orderJobs` | `id` | `orderId` | jobs per order |
| `orderJobParts` | `id` | `orderId`, `jobId`, `inventoryId` | parts per job |
| `orderSublets` | `id` | `orderId` | sublet lines per order |
| `invoices` | `id` | `customerId`, `orderId` | one per finalized order |
| `payments` | `id` | `customerId`, `invoiceId` | cash / check / charge |
| `purchaseOrders` | `id` | `vendorId`, `status` | PO header |
| `purchaseOrderLines` | `id` | `poId`, `inventoryId` | PO lines |

> ⚠️ IndexedDB `onupgradeneeded` only fires on version change. Anyone with v1 data must upgrade cleanly — since we only *add* stores, no migration of existing rows is needed. Add the new stores inside the existing `idxStores`/index-creation blocks. Add `.createIndex(...)` calls for the secondary indexes (the current schema only indexes `quoteIndex.updatedAt`; we now need real secondary indexes — add helper `dbGetAllByIndex(store, index, key)` to `db/index.ts`).

### 0.2 New helper in [src/db/index.ts](./src/db/index.ts)

```ts
export async function dbGetAllByIndex<T>(store: StoreName, index: string, key: IDBValidKey): Promise<T[]>
```
Used everywhere we query by `customerId` / `orderId` / `vehicleId` instead of `getAll().filter(...)` (the current `getCustomerVehicles` pattern at [storage.ts:253](./src/storage.ts) does in-memory filter — acceptable for vehicles, but orders/parts will grow, so index these).

### 0.3 New types — [src/types/index.ts](./src/types/index.ts)

```ts
export type TransportType = 'waiter' | 'dropoff' | 'loaner' | 'shuttle' | undefined;
export type PayType = 'customer' | 'warranty' | 'internal';
export type PaymentMethod = 'cash' | 'check' | 'charge';
export type OrderStatus = 'open' | 'invoiced' | 'paid' | 'void';

export interface Appointment {
  id: string; customerId: string; vehicleId: string; quoteId?: string;
  createdAt: number; dropoffAt: number; promisedAt?: number;
  transportType: TransportType; notes: string;
}

export interface Order {
  id: string; vehicleId: string; customerId: string;
  mileageIn: string; mileageOut: string; transportType: TransportType;
  quotedTotal: number;        // parts+labor subtotal at creation, no tax/fees
  shopCharges: number; taxTotal: number;
  orderSubtotal: number;      // live parts+labor+sublets, no tax/fees
  discountAmount: number; discountType: 'flat' | 'pct';
  rates: GlobalRates;         // snapshot rates at creation (like SavedQuote)
  createdAt: number; updatedAt: number;
  invoicedAt?: number; voidedAt?: number;
  finalized: boolean; paidInFull: boolean;
}

export interface OrderJob {
  id: string; orderId: string; opCode?: string;
  name: string; description: string;
  laborHrs: number; laborPrice: number;
  quotedLaborPrice: number; quotedPartsPrice: number;  // frozen at approval
  partsTotal: number;
  addOn: boolean;            // true if added after order creation (recommendation)
  payType: PayType;
  warrantyPolicyId?: string; warrantyDateBilled?: string; warrantyMileage?: string;
}

export interface OrderJobPart {
  id: string; orderId: string; jobId: string;
  inventoryId?: string;      // null = miscellaneous / non-stock
  partNumber: string; name: string;
  quantity: number; unitPrice: number; cost?: number;
  eta?: string;              // special-order ETA
}

export interface Sublet {
  id: string; description: string; vendorId?: string;
  cost: number; sellPrice: number;     // sellPrice default = matrix-marked-up cost, overridable
  taxable: boolean;                     // default from settings.subletTaxable
  poId?: string;                        // link to vendor PO (orders only)
}
export interface OrderSublet extends Sublet { orderId: string; }

export interface Invoice {
  id: string; orderId: string; customerId: string;
  total: number; createdAt: number;
}

export interface Payment {
  id: string; customerId: string; invoiceId?: string;
  method: PaymentMethod; amount: number; createdAt: number;
  checkNumber?: string;                 // method === 'check'
  poNumber?: string; paidAt?: number; billedAt?: number;  // method === 'charge'
  note?: string;
}

export interface PurchaseOrder {
  id: string; vendorId: string; status: 'draft' | 'ordered' | 'partial' | 'received' | 'cancelled';
  orderId?: string;          // optional link to the work order it's for
  createdAt: number; orderedAt?: number; receivedAt?: number; notes: string;
}
export interface PurchaseOrderLine {
  id: string; poId: string; inventoryId?: string;
  partNumber: string; name: string;
  quantityOrdered: number; quantityReceived: number;
  unitCost: number; addToInventory: boolean;   // false = miscellaneous/sublet/labor
}
```

Extend existing types:
```ts
// LibraryPart — add:
qtyOnHand?: number;        // default 0
binLocation?: string;
// qtyAvailable is COMPUTED, not stored: qtyOnHand - Σ open-order reservations

// GlobalRates — add:
subletMarkupMatrix: MarkupBracket[];   // mirrors partsMarkupMatrix
laborTaxRate?: number;                  // states that tax labor; default 0
subletTaxable?: boolean;               // default false (most states)
```

---

## 1. Bug fix — VIN/recall clipping on quote screen (quick win, do early)

**Root cause** ([src/index.css](./src/index.css)):
- `.vin-table-value` (line ~4117) has **no** `overflow-wrap`/`word-break` (unlike `.info-card-text` at 702–707 which does). Long unbroken decode values / recall text overflow horizontally.
- Containers `.vin-stored-data` (4123) and `.vin-recalls` (4180) set `overflow: hidden`, so the overflow is **clipped** instead of wrapping/scrolling.
- The section sits in `.quote-info-vehicle-row > * { flex: 1; min-width: 0 }` (615–625) — half width, so space is tight.
- `--radius` is **used** at 4126/4183/4460 but **never defined** in `:root` (only a fallback at 1656). Those `border-radius` rules silently no-op.

**Fix:**
1. `.vin-table { table-layout: fixed; width: 100%; }` so cells respect container width.
2. `.vin-table-value { overflow-wrap: anywhere; word-break: break-word; }`; relax `.vin-table-label { white-space: normal }` (or keep nowrap but it's fine fixed).
3. Add `overflow-wrap: anywhere` to `.vin-recall-body p` and `.vin-recall-component`.
4. Define `--radius` in both `:root` blocks (light ~line 6, dark ~line 23 area) e.g. `--radius: 8px;` — or replace the no-fallback usages with `var(--radius, 8px)`.
5. Verify the `DecodeDialog` modal table (`.vin-table` reused) also benefits — it does, via #1/#2.

No JS changes needed. Verify in both light/dark and the narrow `@container (max-width: 560px)` breakpoint.

---

## 2. Quote screen — customer create + VIN search + order history

### 2.1 Create/save customer from the quote form — [src/components/QuoteInfo.tsx](./src/components/QuoteInfo.tsx)
Currently the quote form holds free-text `customerData` and only links if you pick from `CustomerSearch`. Add a **"Save Customer"** button in the form view (`showForm` branch, near the existing "Done" button):
- Calls `saveCustomer()` ([storage.ts:208](./src/storage.ts)) (or `updateCustomer` if `selectedCustomer` set) with `customerData`.
- On success: `onCustomerSelect(created)` → sets `selectedCustomer` + `customerId`, and flips to the read-only `CustomerCard`. Per todo.md §Customer Updates: "Saving a customer should set the selectedCustomer to the created one which should show the details component."
- The `CustomerCard` then shows the vehicle list + add-vehicle (see 2.3), so the user need not re-search to add a vehicle.
- `saveCustomer` currently ignores `taxable`/`taxId` — extend it to persist those (the `Customer` type already has them).

### 2.2 VIN search on quote screen — [src/components/CustomerAutocomplete.tsx](./src/components/CustomerAutocomplete.tsx) + new logic
Add VIN as a third search axis (today: name + phone). New `searchVehiclesByVin(vin)` in storage (uses `vehicles` store; add a `vin` index in 0.1 or filter). On match → load the vehicle into `vehicle` state, resolve its `customerId`, and auto-populate customer + vehicle (set `selectedCustomer`, `customerId`, `decodedVinData`). Wire through `QuoteInfo`/`VehicleSection`.

### 2.3 Order history for a vehicle (new shared component)
`<VehicleOrderHistory vehicleId>` querying `orders` by `vehicleId` index. Surface in 3 places (per todo.md): quote screen vehicle card, Customers → vehicle detail, Vehicles page row/detail. Read-only list: order #, date, total, status; click → open order.

---

## 3. Orders lifecycle — quote → (appointment) → order → invoice → payment

### 3.1 New nav + pages — [src/App.tsx](./src/App.tsx)
Add nav tabs (`NAV_TABS`, line 83) and views: **Orders** (`orders`) and optionally **Appointments** (`appointments`). New components:
- `OrdersPage.tsx` — list (paginated like `QuoteHistoryPanel`) + filters (open/invoiced/paid/void) + search.
- `OrderEditor.tsx` — the work-order screen: header (customer/vehicle/mileage/transport), jobs (reuse `JobsSection`/`JobCard` patterns), sublets (4.x), totals (reuse `ResultsSection`), and lifecycle actions.
- `useOrder.ts` hook mirroring `useQuote.ts` (totals memo, job/part/sublet handlers, save/finalize).

### 3.2 Quote → Order / Appointment — [src/hooks/useQuote.ts](./src/hooks/useQuote.ts)
Add `handleConvertToOrder()` and `handleConvertToAppointment()`:
- **To order:** create `Order` (snapshot `rates`, `quotedTotal` = current parts+labor subtotal), explode `jobs` → `orderJobs` (+ `quotedLaborPrice`/`quotedPartsPrice` frozen, `addOn=false`, `payType='customer'`), parts → `orderJobParts`, quote sublets → `orderSublets`. Reserve inventory for parts with `inventoryId` (affects `qtyAvailable`, see 5). Navigate to `OrderEditor`.
- **To appointment:** create `Appointment` referencing `quoteId` + `customerId` + `vehicleId`, capture dropoff/promised/transport. Appointment can later be converted to an order.
- Buttons live in the quote aside actions ([App.tsx:460](./src/App.tsx)).

### 3.3 Order totals (in `useOrder` memo, adapted from [useQuote.ts:106](./src/hooks/useQuote.ts))
`orderSubtotal` = Σ job (laborPrice + partsTotal) + Σ sublet sellPrice. Tax = parts taxable + (sublet sellPrice if `subletTaxable`) + (labor × `laborTaxRate` if set) + shop supplies, all × `taxRate`. Honor warranty proration (existing `calculateProration`) and `payType` (warranty/internal jobs don't bill the customer). Keep `quotedTotal` frozen.

### 3.4 Finalize → Invoice → Payment
- **Invoice:** `finalizeOrder(orderId)` → set `orderSubtotal`/`taxTotal`/`shopCharges` final, create `Invoice {orderId, customerId, total}`, set `order.invoicedAt`, `finalized=true`. Order becomes read-only.
- **Payment:** `addPayment(invoiceId, {...})` supporting:
  - `cash` — amount.
  - `check` — amount + `checkNumber`.
  - `charge` — amount + `poNumber` (customer P.O.) + `paidAt` + `billedAt`.
- After payments, if Σ payments for order ≥ invoice total → `order.paidInFull = true`, status `paid`.
- **Void:** `voidOrder(orderId)` sets `voidedAt`, releases inventory reservations. Allowed only before finalize.

---

## 4. Sublets (quotes + orders)

- **Quote side:** add `sublets: Sublet[]` to quote working state + persist in the quote doc (`buildQuoteData` at [useQuote.ts:238](./src/hooks/useQuote.ts) and load path at 313). New `SubletsSection.tsx` (description, vendor select, cost, sellPrice w/ matrix default + override, taxable). Warn when `sellPrice < cost` (per todo.md).
- **Order side:** `orderSublets` table; in orders a sublet can link to a vendor PO (`poId`).
- **Markup:** `subletMarkupMatrix` in `GlobalRates`; reuse `calculateSellPrice` ([partsMarkup.ts:50](./src/utils/partsMarkup.ts)). Settings UI: clone the parts-matrix editor for sublets.
- **Tax:** default non-taxable; `subletTaxable` global toggle + per-line `taxable` override. Add `laborTaxRate` to settings ([RatesSection.tsx](./src/components/RatesSection.tsx)) for labor-taxing states.

---

## 5. Inventory — qty on hand, qty available, bin location — [src/components/PartForm.tsx](./src/components/PartForm.tsx) / [InventoryPage.tsx](./src/components/InventoryPage.tsx)

- `PartForm`: add **Qty On Hand** + **Bin Location** inputs; persist via `saveLibraryPart`/`updateLibraryPart` ([storage.ts:358](./src/storage.ts) — add the two fields to the builder).
- **Qty available** (computed, not stored) = `qtyOnHand − Σ quantity` from `orderJobParts` with that `inventoryId` on **open** (non-void, non-paid) orders. Add `getPartReservations()` helper; show On hand / Available / Bin columns in the inventory list.
- Reservation lifecycle: created when a part is added to an open order; released on void; **consumed** (decrement `qtyOnHand`) when order is finalized OR keep reservation model and only decrement on invoice — pick one (recommend: decrement `qtyOnHand` at finalize, drop reservation).

---

## 6. Purchase Orders + receiving

- **Pages:** `PurchaseOrdersPage.tsx` (list by status) + `PurchaseOrderEditor.tsx` (vendor, lines, optional link to an order).
- **Lines:** each line = part (existing `LibraryPart` via `PartPickerModal`, or free-text miscellaneous), `quantityOrdered`, `unitCost`, `addToInventory` flag.
- **Receiving:** `receivePurchaseOrder(poId, receipts[])` sets `quantityReceived` per line; for lines with `addToInventory && inventoryId` → increment `qtyOnHand` (and optionally re-cost / re-price via matrix). Status → `partial`/`received`. Miscellaneous lines (no inventory, or sublet/labor) just record receipt. (Per todo.md "optional since they might be miscellaneous.")
- Reuse `VendorsPage`/vendor select; numbering via `poCounter`.

---

## 7. Customer balance & detail — [src/components/CustomersPage.tsx](./src/components/CustomersPage.tsx)

- `getCustomerBalance(customerId)` = `Σ payments(customerId) − Σ invoices(customerId).total` (indexed lookups). Positive → "Credit $X", negative → "Balance due $X".
- Show on customer card/detail + a column in the customers list. Show invoice + payment history in customer detail.

---

## 8. CSS / styling cleanup (incremental, per CLAUDE.md tailwind-like direction)

New screens (Orders/PO/Payments) should lean on utility classes (`flex gap-sm p-sm`, etc.) rather than bespoke per-component classes, **except** genuinely special cases (e.g. `HorizontalScrollContainer`). If a utility set doesn't exist yet, introduce a small one (`.flex`, `.gap-*`, `.p-*`, `.grid-*`) in `index.css` and use it for the new code; don't rewrite existing screens in this pass.

---

## Suggested build order

1. **§1 VIN/recall CSS bug** — isolated, immediate value, no schema risk.
2. **§0 foundation** — DB v2 + types + `dbGetAllByIndex`. Gates everything below.
3. **§2.1 customer create-on-quote** + §7 balance scaffolding (small, high value).
4. **§5 inventory** qtyOnHand/bin (needed before PO receiving & order reservations).
5. **§3 orders** (quote→order→invoice→payment) — the core.
6. **§4 sublets** (quote first, then order) + settings (matrix, laborTax, subletTaxable).
7. **§6 purchase orders** + receiving (ties into §5).
8. **§2.2 VIN search**, **§2.3 order history**, **§3.2 appointments**.
9. **§8 CSS utilities** — ongoing, applied to each new screen.

## Open questions

- Reservation model: decrement `qtyOnHand` at **finalize** vs at **part receipt/consumption**? (Plan assumes finalize.)
- Should appointments be a full calendar view or a simple list for now? (Plan assumes list.)
- Partial payments across multiple invoices / applying customer credit to a new invoice — in scope now, or after? (Plan records payments per-invoice; credit is display-only for v1.)
- Tax base for shop supplies/labor already exists for quotes; confirm states' rules before enabling `laborTaxRate`.
