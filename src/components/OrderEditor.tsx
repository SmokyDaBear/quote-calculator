import { useState } from "react";
import QuoteInfo from "./QuoteInfo";
import VehicleSection from "./VehicleSection";
import JobsSection from "./JobsSection";
import NotesSection from "./NotesSection";
import ResultsSection from "./ResultsSection";
import DiscountSection from "./DiscountSection";
import ShopSuppliesOverride from "./ShopSuppliesOverride";
import { ToggleField } from "./forms/ToggleField";
import PaymentModal from "./PaymentModal";
import type { PaymentInput } from "./PaymentModal";
import { useOrder } from "../hooks/useOrder";
import type { OrderDraft } from "../hooks/useOrder";
import { orderStatus, saveCustomer, updateCustomer } from "../storage";
import { printReceipt } from "../utils/printReceipt";
import { printQuote } from "../utils/printQuote";
import { formatPhone } from "../utils/formatPhone";
import type {
  GlobalRates,
  BusinessInfo,
  WarrantyPolicy,
  Customer,
  Vendor,
  TransportType,
  OrderWorkStatus,
  Payment,
} from "../types/index";

const fmt = (n: number) => `$${Number(n).toFixed(2)}`;

const TRANSPORTS: { value: TransportType; label: string }[] = [
  { value: undefined, label: "—" },
  { value: "waiter", label: "Waiter" },
  { value: "dropoff", label: "Drop-Off" },
  { value: "loaner", label: "Loaner" },
  { value: "shuttle", label: "Shuttle" },
];

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  pending_authorization: "Pending Authorization",
  awaiting_parts: "Awaiting Parts",
  invoiced: "Invoiced",
  closed: "Closed",
  void: "Voided",
};

const WORK_STATUSES: { value: OrderWorkStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "pending_authorization", label: "Pending Authorization" },
  { value: "awaiting_parts", label: "Awaiting Parts" },
];

const METHOD_LABEL: Record<Payment["method"], string> = {
  cash: "Cash",
  check: "Check",
  charge: "Charge",
};

function OrderEditor({
  orderId,
  initialDraft,
  rates,
  warrantyPolicies,
  businessInfo,
  vendors,
  toast,
  onBack,
  onChanged,
}: {
  orderId: string | null;
  initialDraft?: OrderDraft | null;
  rates: GlobalRates;
  warrantyPolicies: WarrantyPolicy[];
  businessInfo: Partial<BusinessInfo>;
  vendors: Vendor[];
  toast: (msg: string, type?: string) => void;
  onBack: () => void;
  onChanged: () => void;
}) {
  const o = useOrder({
    orderId,
    initialDraft,
    defaultRates: rates,
    warrantyPolicies,
    businessInfo,
    toast,
    onChanged,
  });

  const [payOpen, setPayOpen] = useState(false);

  if (o.loading) {
    return <div className="app-loading">Loading order…</div>;
  }

  // When the order is still editable, reflect the live work-status selection;
  // once invoiced/voided the derived status wins.
  const status =
    o.order && o.readOnly ? orderStatus(o.order) : o.workStatus;
  const orderTotal = o.invoice ? o.invoice.total : o.totals.grandTotal;

  const handleSaveCustomer = async () => {
    if (!o.customerData.name.trim()) return;
    const payload = {
      name: o.customerData.name,
      phones: o.customerData.phones,
      email: o.customerData.email,
      address: o.customerData.address,
      notes: o.customerData.notes,
      taxable: o.customerData.taxable,
      taxId: o.customerData.taxId,
    };
    if (o.customerId) {
      await updateCustomer(o.customerId, payload);
      toast("Customer updated.");
    } else {
      const c = await saveCustomer(payload);
      o.setCustomerId(c.id);
      o.setSelectedCustomer(c);
      toast("Customer saved.");
    }
  };

  const handlePaymentSubmit = async (data: PaymentInput, alsoPrint: boolean) => {
    const prevPaid = o.paidTotal;
    const payment = await o.handleRecordPayment(data);
    setPayOpen(false);
    if (payment && alsoPrint) {
      printReceipt({
        payment,
        orderId: payment.orderId!,
        invoiceId: o.invoice?.id,
        orderTotal,
        paidTotal: prevPaid + payment.amount,
        businessInfo,
        customer: o.selectedCustomer,
      });
    }
  };

  const handlePrintOrder = () => {
    const isInvoice = o.finalized;
    printQuote({
      quoteNumber: Number(o.order?.id ?? 0),
      docLabel: isInvoice ? "Invoice" : "Order",
      disclaimer: isInvoice ? businessInfo.invoiceWarranty : businessInfo.workOrderDisclaimer,
      customerName: o.customerData.name,
      phone: o.customerData.phones[0]?.number ?? "",
      notes: o.notes,
      vehicle: o.vehicle,
      jobs: o.jobs,
      rates: o.rates,
      totals: o.totals,
      discount: o.discount,
      businessInfo,
      customer: o.selectedCustomer,
    });
  };

  const handleInvoice = async () => {
    if (
      !window.confirm(
        "Invoice this order? It will be locked from further edits once invoiced.",
      )
    )
      return;
    await o.handleInvoiceOrder();
  };

  const handleVoid = async () => {
    if (!window.confirm(`Void order #${o.order?.id}? This cannot be undone.`)) return;
    await o.handleVoidOrder();
  };

  return (
    <div className="calculator-container">
      <div className="order-editor-topbar">
        <button type="button" className="btn-small btn-secondary" onClick={onBack}>
          ← Orders
        </button>
        <div className="order-editor-title">
          {o.order ? `Order #${o.order.id}` : "New Work Order"}
          <span className={`order-status-badge order-status--${status}`}>
            {STATUS_LABEL[status]}
          </span>
        </div>
      </div>

      <div className="quote-compose-layout">
        <div className="quote-compose-main">
          <div className="quote-info-vehicle-row">
            <QuoteInfo
              customerData={o.customerData}
              onCustomerDataChange={(d) => {
                o.setCustomerData(d);
                o.setIsTaxable(d.taxable);
              }}
              onCustomerSelect={(c: Customer | null) => {
                o.setCustomerId(c ? c.id : null);
                o.setSelectedCustomer(c);
              }}
              selectedCustomer={o.selectedCustomer}
              onSaveCustomer={handleSaveCustomer}
            />
            <VehicleSection
              vehicle={o.vehicle}
              onChange={o.setVehicle}
              customerId={o.customerId}
              onVehicleIdChange={o.order ? undefined : o.setVehicleId}
            />
          </div>

          <div className="order-details-row page-card">
            {!o.readOnly && (
              <div className="lib-form-group">
                <label>Status</label>
                <select
                  aria-label="Order status"
                  value={o.workStatus}
                  onChange={(e) => o.setWorkStatus(e.target.value as OrderWorkStatus)}
                >
                  {WORK_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="lib-form-group">
              <label>Mileage In</label>
              <input
                type="text"
                placeholder="e.g. 45000"
                value={o.mileageIn}
                disabled={o.readOnly}
                onChange={(e) => o.setMileageIn(e.target.value)}
              />
            </div>
            <div className="lib-form-group">
              <label>Mileage Out</label>
              <input
                type="text"
                placeholder="e.g. 45010"
                value={o.mileageOut}
                disabled={o.readOnly}
                onChange={(e) => o.setMileageOut(e.target.value)}
              />
            </div>
            <div className="lib-form-group">
              <label>Transport</label>
              <select
                aria-label="Transport type"
                value={o.transportType ?? ""}
                disabled={o.readOnly}
                onChange={(e) =>
                  o.setTransportType((e.target.value || undefined) as TransportType)
                }
              >
                {TRANSPORTS.map((t) => (
                  <option key={t.label} value={t.value ?? ""}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <JobsSection
            jobs={o.jobs}
            totals={o.totals}
            onAddJob={o.handleAddJob}
            onUpdateJob={o.handleUpdateJob}
            onRemoveJob={o.handleRemoveJob}
            onSaveAsTemplate={o.handleSaveAsTemplate}
            onApplyTemplate={o.handleApplyTemplate}
            sublets={o.sublets}
            vendors={vendors}
            subletMarkupMatrix={rates.subletMarkupMatrix}
            onAddSublet={o.handleAddSublet}
            onUpdateSublet={o.handleUpdateSublet}
            onRemoveSublet={o.handleRemoveSublet}
            onCreatePoForSublet={o.handleCreatePoForSublet}
          />

          <div className="quote-modifiers">
            <DiscountSection discount={o.discount} onChange={o.setDiscount} />
            <ShopSuppliesOverride
              override={o.ssOverride}
              onChange={o.setSsOverride}
              autoAmount={o.totals.autoSsTotal}
            />
            <div className="quote-taxable-section">
              <ToggleField
                checked={o.isTaxable}
                onChange={o.setIsTaxable}
                label="Taxable"
                badge={
                  !o.isTaxable && o.customerData.taxId
                    ? `Exempt ID: ${o.customerData.taxId}`
                    : undefined
                }
              />
            </div>
          </div>

          <NotesSection notes={o.notes} onChange={o.setNotes} />
        </div>

        <div className="quote-compose-aside">
          <div className="quote-aside-actions">
            {!o.readOnly && (
              <button type="button" className="btn btn-success" onClick={o.handleSaveOrder}>
                {o.order ? "Save Changes" : "Create Work Order"}
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={handlePrintOrder}>
              Print
            </button>
            {!o.order?.voidedAt && (
              <button type="button" className="btn btn-secondary" onClick={() => setPayOpen(true)}>
                {o.finalized ? "Record Payment" : "Take Deposit"}
              </button>
            )}
            {o.order && !o.finalized && !o.order.voidedAt && (
              <button type="button" className="btn btn-warning" onClick={handleInvoice}>
                Invoice (Complete)
              </button>
            )}
            {o.order && !o.finalized && !o.order.voidedAt && (
              <button type="button" className="btn btn-danger-text" onClick={handleVoid}>
                Void Order
              </button>
            )}
          </div>

          <div className="order-balance-card">
            <div className="order-balance-row">
              <span>{o.invoice ? "Invoice Total" : "Order Total"}</span>
              <span>{fmt(orderTotal)}</span>
            </div>
            <div className="order-balance-row">
              <span>Paid {o.paidTotal > 0 ? "" : ""}</span>
              <span>{fmt(o.paidTotal)}</span>
            </div>
            <div
              className={`order-balance-row order-balance-due${o.balanceDue <= 0.005 ? " order-balance-due--clear" : ""}`}
            >
              <span>{o.balanceDue < -0.005 ? "Credit" : "Balance Due"}</span>
              <span>{fmt(Math.abs(o.balanceDue))}</span>
            </div>
          </div>

          {o.payments.length > 0 && (
            <div className="order-payments-card">
              <div className="order-payments-title">Payments</div>
              {o.payments.map((p) => (
                <div key={p.id} className="order-payment-row">
                  <span className="order-payment-meta">
                    {new Date(p.createdAt).toLocaleDateString("en-US")} · {METHOD_LABEL[p.method]}
                    {p.method === "check" && p.checkNumber ? ` #${p.checkNumber}` : ""}
                    {p.isDeposit ? " · deposit" : ""}
                  </span>
                  <span className="order-payment-amt">{fmt(p.amount)}</span>
                </div>
              ))}
            </div>
          )}

          <ResultsSection totals={o.totals} />
        </div>
      </div>

      {payOpen && (
        <PaymentModal
          title={o.finalized ? "Record Payment" : "Take Deposit"}
          defaultAmount={o.balanceDue > 0 ? o.balanceDue : 0}
          onSubmit={handlePaymentSubmit}
          onClose={() => setPayOpen(false)}
        />
      )}
    </div>
  );
}

export default OrderEditor;

// Re-export for callers that build a draft to roll a quote into an order.
export type { OrderDraft };

export function customerLabel(c: Customer | null): string {
  if (!c) return "";
  const phone = c.phones[0]?.number ? ` · ${formatPhone(c.phones[0].number)}` : "";
  return `${c.name}${phone}`;
}
