import { useState } from "react";
import type { Payment, PaymentMethod } from "../types/index";

export type PaymentInput = Omit<
  Payment,
  "id" | "createdAt" | "customerId" | "orderId" | "invoiceId" | "isDeposit"
>;

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "check", label: "Check" },
  { value: "charge", label: "Charge / Account" },
];

const toTs = (dateStr: string): number | undefined =>
  dateStr ? new Date(dateStr + "T00:00:00").getTime() : undefined;

const todayStr = () => new Date().toISOString().slice(0, 10);

function PaymentModal({
  title = "Record Payment",
  defaultAmount,
  onSubmit,
  onClose,
}: {
  title?: string;
  defaultAmount: number;
  onSubmit: (data: PaymentInput, alsoPrint: boolean) => void | Promise<void>;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState(defaultAmount > 0 ? defaultAmount.toFixed(2) : "");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [checkNumber, setCheckNumber] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [billedAt, setBilledAt] = useState(todayStr());
  const [paidAt, setPaidAt] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const amt = Number(amount) || 0;
  const valid =
    amt > 0 && (method !== "check" || checkNumber.trim().length > 0);

  const build = (): PaymentInput => ({
    method,
    amount: amt,
    ...(method === "check" ? { checkNumber: checkNumber.trim() } : {}),
    ...(method === "charge"
      ? {
          poNumber: poNumber.trim() || undefined,
          billedAt: toTs(billedAt),
          paidAt: toTs(paidAt),
        }
      : {}),
    ...(note.trim() ? { note: note.trim() } : {}),
  });

  const submit = async (alsoPrint: boolean) => {
    if (!valid || busy) return;
    setBusy(true);
    try {
      await onSubmit(build(), alsoPrint);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="modal-overlay show"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal payment-modal">
        <div className="library-modal-header">
          <h3>{title}</h3>
          <button type="button" className="btn-remove" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="payment-modal-body">
          <div className="lib-form-group">
            <label>Amount ($) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              autoFocus
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="lib-form-group">
            <label>Method</label>
            <div className="payment-method-row">
              {METHODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  className={`payment-method-btn${method === m.value ? " payment-method-btn--active" : ""}`}
                  onClick={() => setMethod(m.value)}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {method === "check" && (
            <div className="lib-form-group">
              <label>Check # *</label>
              <input
                type="text"
                placeholder="Check number"
                value={checkNumber}
                onChange={(e) => setCheckNumber(e.target.value)}
              />
            </div>
          )}

          {method === "charge" && (
            <>
              <div className="lib-form-group">
                <label>Customer P.O.</label>
                <input
                  type="text"
                  placeholder="Purchase order number"
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                />
              </div>
              <div className="lib-form-row two-col">
                <div className="lib-form-group">
                  <label>Billed</label>
                  <input type="date" value={billedAt} onChange={(e) => setBilledAt(e.target.value)} />
                </div>
                <div className="lib-form-group">
                  <label>Paid</label>
                  <input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
                </div>
              </div>
            </>
          )}

          <div className="lib-form-group">
            <label>Note</label>
            <input
              type="text"
              placeholder="Optional note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <div className="payment-modal-actions">
          <button type="button" className="btn-small btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-small"
            disabled={!valid || busy}
            onClick={() => submit(true)}
          >
            Record & Print
          </button>
          <button
            type="button"
            className="btn-small btn-success"
            disabled={!valid || busy}
            onClick={() => submit(false)}
          >
            Record Payment
          </button>
        </div>
      </div>
    </div>
  );
}

export default PaymentModal;
