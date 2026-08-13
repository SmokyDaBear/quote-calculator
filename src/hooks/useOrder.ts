import { useState, useMemo, useEffect, useCallback } from "react";
import {
  getOrder,
  createOrder,
  updateOrder,
  voidOrder as voidOrderStorage,
  finalizeOrder,
  getOrderJobs,
  getOrderJobParts,
  saveOrderJob,
  saveOrderJobPart,
  deleteOrderJob,
  getOrderPayments,
  getOrderInvoice,
  addPayment,
  getCustomer,
  getVehicle,
  ensureCustomerAndVehicle,
  getOrderSublets,
  saveOrderSublet,
  deleteOrderSublet,
  getPartsLibrary,
  loadGlobalRates,
} from "../storage";
import { computeTotals } from "../utils/computeTotals";
import { requestPurchaseOrder } from "../utils/poRequest";
import { EMPTY_CUSTOMER_FORM_DATA } from "../components/CustomerFormFields";
import type { CustomerFormData } from "../components/CustomerFormFields";
import type { SsOverride } from "../components/ShopSuppliesOverride";
import type { VehicleFields } from "../components/VehicleSection";
import type { DiscountState } from "./useQuote";
import { EMPTY_DISCOUNT, nextJobId } from "./useQuote";
import type {
  GlobalRates,
  BusinessInfo,
  JobTemplate,
  WorkingJob,
  WorkingPart,
  TemplatePart_Specific,
  Customer,
  WarrantyPolicy,
  Order,
  Invoice,
  Payment,
  TransportType,
  OrderWorkStatus,
  WorkingSublet,
} from "../types/index";

const EMPTY_VEHICLE: VehicleFields = {
  year: "", make: "", model: "", trim: "", vin: "", mileage: "", notes: "",
};

const EMPTY_JOB = (id: number): WorkingJob => ({
  id,
  name: `Job ${id}`,
  parts: [],
  laborHrs: "",
  laborCost: "",
  description: "",
  priceAtList: false,
});

/** Prefill payload when rolling a quote (or appointment) into an order. */
export interface OrderDraft {
  customerData: CustomerFormData;
  customerId: string | null;
  selectedCustomer: Customer | null;
  vehicle: VehicleFields;
  vehicleId?: string | null;
  jobs: WorkingJob[];
  discount: DiscountState;
  ssOverride: SsOverride;
  isTaxable: boolean;
  notes: string;
  quoteId?: string;
}

const numToStr = (n: number) => (n ? String(n) : "");

export function useOrder({
  orderId,
  initialDraft,
  defaultRates,
  warrantyPolicies,
  businessInfo,
  toast,
  onChanged,
}: {
  orderId: string | null;
  initialDraft?: OrderDraft | null;
  defaultRates: GlobalRates;
  warrantyPolicies: WarrantyPolicy[];
  businessInfo: Partial<BusinessInfo>;
  toast: (msg: string, type?: string) => void;
  onChanged?: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [rates, setRates] = useState<GlobalRates>(defaultRates);

  const [customerData, setCustomerData] = useState<CustomerFormData>(
    initialDraft?.customerData ?? EMPTY_CUSTOMER_FORM_DATA,
  );
  const [customerId, setCustomerId] = useState<string | null>(initialDraft?.customerId ?? null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    initialDraft?.selectedCustomer ?? null,
  );
  const [vehicle, setVehicle] = useState<VehicleFields>(initialDraft?.vehicle ?? EMPTY_VEHICLE);
  const [vehicleId, setVehicleId] = useState<string | null>(initialDraft?.vehicleId ?? null);
  const [jobs, setJobs] = useState<WorkingJob[]>(
    initialDraft && initialDraft.jobs.length > 0 ? initialDraft.jobs : [EMPTY_JOB(1)],
  );
  const [discount, setDiscount] = useState<DiscountState>(initialDraft?.discount ?? EMPTY_DISCOUNT);
  const [ssOverride, setSsOverride] = useState<SsOverride>(
    initialDraft?.ssOverride ?? { enabled: false, value: "" },
  );
  const [sublets, setSublets] = useState<WorkingSublet[]>([]);
  const [isTaxable, setIsTaxable] = useState(initialDraft?.isTaxable ?? true);
  const [notes, setNotes] = useState(initialDraft?.notes ?? "");
  const [mileageIn, setMileageIn] = useState("");
  const [mileageOut, setMileageOut] = useState("");
  const [transportType, setTransportType] = useState<TransportType>(undefined);
  const [workStatus, setWorkStatus] = useState<OrderWorkStatus>("open");
  const [quoteId] = useState<string | undefined>(initialDraft?.quoteId);
  // Set when a template has category slots that need picking before it can apply.
  const [fillModal, setFillModal] = useState<{ template: JobTemplate } | null>(null);

  const finalized = !!order?.finalized;
  const readOnly = finalized || !!order?.voidedAt;

  // ── Totals (shared with quotes) ────────────────────────────────────────────
  const subletTotalsInput = useMemo(
    () => sublets.map((s) => ({ sellPrice: Number(s.sellPrice) || 0, taxable: s.taxable })),
    [sublets],
  );
  const totals = useMemo(
    () =>
      computeTotals({
        jobs, rates, discount, ssOverride, warrantyPolicies, isTaxable,
        sublets: subletTotalsInput,
      }),
    [jobs, rates, discount, ssOverride, warrantyPolicies, isTaxable, subletTotalsInput],
  );

  const paidTotal = useMemo(
    () => payments.reduce((s, p) => s + (p.amount || 0), 0),
    [payments],
  );
  const balanceDue = (invoice ? invoice.total : totals.grandTotal) - paidTotal;

  // ── Load an existing order ─────────────────────────────────────────────────
  const refreshPayments = useCallback(async (id: string) => {
    const [pmts, inv] = await Promise.all([getOrderPayments(id), getOrderInvoice(id)]);
    setPayments(pmts);
    setInvoice(inv);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      if (!orderId) {
        // New order — mileage seeded from the drafted vehicle if present.
        setMileageIn(initialDraft?.vehicle.mileage ?? "");
        setLoading(false);
        return;
      }
      const o = await getOrder(orderId);
      if (!o || cancelled) {
        setLoading(false);
        return;
      }
      const [ojobs, oparts, osublets, cust, veh] = await Promise.all([
        getOrderJobs(orderId),
        getOrderJobParts(orderId),
        getOrderSublets(orderId),
        o.customerId ? getCustomer(o.customerId) : Promise.resolve(null),
        o.vehicleId ? getVehicle(o.vehicleId) : Promise.resolve(null),
      ]);
      if (cancelled) return;

      setOrder(o);
      setRates(o.rates);
      setCustomerId(o.customerId);
      setVehicleId(o.vehicleId);
      setMileageIn(o.mileageIn);
      setMileageOut(o.mileageOut);
      setTransportType(o.transportType);
      setWorkStatus(o.workStatus ?? "open");
      setNotes(o.notes);
      setIsTaxable(o.taxable !== false);
      setDiscount({
        type: o.discountType === "pct" ? "percentage" : "flat",
        value: o.discountValue ? String(o.discountValue) : "",
        appliesTo: o.discountAppliesTo ?? "both",
      });
      if (cust) {
        setSelectedCustomer(cust);
        setCustomerData({
          name: cust.name,
          phones: cust.phones.length ? cust.phones : [{ label: "Mobile", number: "" }],
          email: cust.email,
          address: cust.address,
          notes: cust.notes,
          taxable: cust.taxable !== false,
          taxId: cust.taxId ?? "",
        });
      }
      if (veh) {
        setVehicle({
          year: veh.year, make: veh.make, model: veh.model,
          trim: veh.trim, vin: veh.vin, mileage: veh.mileage,
        });
      }
      setSublets(
        osublets.map((s) => ({
          id: s.id,
          description: s.description,
          vendorId: s.vendorId,
          cost: s.cost ? String(s.cost) : "",
          sellPrice: s.sellPrice ? String(s.sellPrice) : "",
          taxable: s.taxable,
          poId: s.poId,
        })),
      );

      const mapped: WorkingJob[] = ojobs.map((oj, i) => ({
        id: i + 1,
        name: oj.name,
        parts: oparts
          .filter((p) => p.jobId === oj.id)
          .map((p) => ({
            partNumber: p.partNumber,
            name: p.name,
            price: numToStr(p.unitPrice),
            quantity: p.quantity,
            cost: p.cost != null ? String(p.cost) : undefined,
          })),
        laborHrs: numToStr(oj.laborHrs),
        laborCost: numToStr(oj.laborPrice),
        description: oj.description,
        priceAtList: false,
        warrantyPolicyId: oj.warrantyPolicyId,
        warrantyPolicyName: oj.warrantyPolicyName,
        warrantyDateBilled: oj.warrantyDateBilled,
        warrantyMileage: oj.warrantyMileage,
      }));
      setJobs(mapped.length ? mapped : [EMPTY_JOB(1)]);
      await refreshPayments(orderId);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Job handlers (mirror useQuote) ─────────────────────────────────────────
  const handleAddJob = () => setJobs((prev) => [...prev, EMPTY_JOB(nextJobId(prev))]);

  const handleUpdateJob = (id: number, field: string, value: unknown) => {
    setJobs((prev) =>
      prev.map((j) => {
        if (j.id !== id) return j;
        const updated = { ...j, [field]: value };
        if (field === "laborHrs") {
          const computed = (Number(value) || 0) * rates.laborRate;
          updated.laborCost = computed > 0 ? computed.toFixed(2) : "";
        }
        if (field === "priceAtList") {
          const on = value as boolean;
          updated.parts = j.parts.map((p) =>
            on
              ? { ...p, basePrice: p.price, price: p.msrp && Number(p.msrp) > 0 ? p.msrp : p.price }
              : { ...p, price: p.basePrice ?? p.price, basePrice: undefined },
          );
        }
        return updated;
      }),
    );
  };

  const handleRemoveJob = (id: number) => setJobs((prev) => prev.filter((j) => j.id !== id));

  const applyTemplateWithParts = (template: JobTemplate, resolved: WorkingPart[]) => {
    setJobs((prev) => [
      ...prev,
      {
        id: nextJobId(prev),
        name: template.name,
        parts: resolved,
        laborHrs: template.laborHrs ? String(template.laborHrs) : "",
        laborCost: template.laborCost ? String(template.laborCost) : "",
        description: template.description || "",
        priceAtList: false,
      },
    ]);
  };

  const handleApplyTemplate = async (template: JobTemplate) => {
    // Slots need a part chosen for each one; the modal resolves the whole
    // template (specific parts included) and hands back the finished list.
    if ((template.parts || []).some((p) => p.type === "category")) {
      setFillModal({ template });
      return;
    }
    const library = await getPartsLibrary();
    const resolved: WorkingPart[] = (template.parts || [])
      .filter((p): p is TemplatePart_Specific => p.type === "specific" && !!p.partId)
      .map((p) => {
        const found = library.find((lp) => lp.id === p.partId);
        return {
          partNumber: found?.partNumber || "",
          name: found?.name || "(unknown part)",
          price: found?.price?.toString() || "0",
          quantity: p.quantity,
          cost: found?.cost?.toString(),
          msrp: found?.msrp?.toString(),
        };
      });
    applyTemplateWithParts(template, resolved);
  };

  const handleSaveAsTemplate = () => {
    /* templates are managed from the quote screen; no-op placeholder kept for prop parity */
  };

  // ── Persistence ────────────────────────────────────────────────────────────

  /** Ensure a customer + vehicle record exist, returning their ids (or null on failure). */
  const ensureRecords = async (): Promise<{
    customerId: string;
    vehicleId: string;
  } | null> => {
    if (!customerId && !customerData.name.trim()) {
      toast("Select or add a customer first.", "error");
      return null;
    }
    const hasVehicle = !!(vehicle.year || vehicle.make || vehicle.model || vehicle.vin);
    if (!vehicleId && !hasVehicle) {
      toast("Select or add a vehicle first.", "error");
      return null;
    }
    const result = await ensureCustomerAndVehicle({
      customerId,
      customer: {
        name: customerData.name,
        phones: customerData.phones,
        email: customerData.email,
        address: customerData.address,
        notes: customerData.notes,
        taxable: customerData.taxable,
        taxId: customerData.taxId,
      },
      vehicleId,
      vehicle: {
        year: vehicle.year, make: vehicle.make, model: vehicle.model,
        trim: vehicle.trim, vin: vehicle.vin, mileage: vehicle.mileage,
      },
    });
    if (!result) return null;
    if (result.customerId !== customerId) setCustomerId(result.customerId);
    if (result.createdCustomer) setSelectedCustomer(result.createdCustomer);
    if (result.vehicleId !== vehicleId) setVehicleId(result.vehicleId);
    return { customerId: result.customerId, vehicleId: result.vehicleId };
  };

  /** Replace the order's persisted jobs/parts from the in-memory working jobs. */
  const persistJobs = async (oid: string) => {
    const existing = await getOrderJobs(oid);
    await Promise.all(existing.map((j) => deleteOrderJob(j.id)));
    for (const wj of jobs) {
      const partsTotal = wj.parts.reduce(
        (s, p) => s + (Number(p.price) || 0) * (Number(p.quantity) || 0),
        0,
      );
      const laborPrice = Number(wj.laborCost) || 0;
      const oj = await saveOrderJob({
        orderId: oid,
        name: wj.name,
        description: wj.description,
        laborHrs: Number(wj.laborHrs) || 0,
        laborPrice,
        quotedLaborPrice: laborPrice,
        quotedPartsPrice: partsTotal,
        partsTotal,
        addOn: false,
        payType: "customer",
        warrantyPolicyId: wj.warrantyPolicyId,
        warrantyPolicyName: wj.warrantyPolicyName,
        warrantyDateBilled: wj.warrantyDateBilled,
        warrantyMileage: wj.warrantyMileage,
      });
      for (const p of wj.parts) {
        if (!p.name && !p.partNumber && !(Number(p.price) > 0)) continue;
        await saveOrderJobPart({
          orderId: oid,
          jobId: oj.id,
          partNumber: p.partNumber || "",
          name: p.name || "",
          quantity: Number(p.quantity) || 1,
          unitPrice: Number(p.price) || 0,
          cost: p.cost != null && p.cost !== "" ? Number(p.cost) : undefined,
        });
      }
    }
  };

  /** Upsert sublets by id (preserving any PO link) and remove deleted ones. */
  const persistSublets = async (oid: string) => {
    const existing = await getOrderSublets(oid);
    const keepIds = new Set(sublets.map((s) => s.id));
    await Promise.all(
      existing.filter((e) => !keepIds.has(e.id)).map((e) => deleteOrderSublet(e.id)),
    );
    for (const s of sublets) {
      await saveOrderSublet({
        id: s.id,
        orderId: oid,
        description: s.description,
        vendorId: s.vendorId,
        cost: Number(s.cost) || 0,
        sellPrice: Number(s.sellPrice) || 0,
        taxable: s.taxable,
        poId: s.poId,
      });
    }
  };

  const handleSaveOrder = async (): Promise<Order | null> => {
    if (readOnly) return order;
    const ids = await ensureRecords();
    if (!ids) return null;

    const header = {
      orderSubtotal: totals.laborCost + totals.partsTotal + totals.subletsTotal,
      taxTotal: totals.taxTotal,
      shopCharges: totals.ssTotal,
      discountAmount: totals.discountAmount,
      discountType: (discount.type === "percentage" ? "pct" : "flat") as "pct" | "flat",
      discountValue: Number(discount.value) || 0,
      discountAppliesTo: discount.appliesTo,
      taxable: isTaxable,
      mileageIn,
      mileageOut,
      transportType,
      workStatus,
      notes,
    };

    let saved: Order;
    if (!order) {
      saved = await createOrder({
        customerId: ids.customerId,
        vehicleId: ids.vehicleId,
        quotedTotal: totals.laborCost + totals.partsTotal,
        rates,
        ...header,
      });
    } else {
      await updateOrder(order.id, header);
      saved = (await getOrder(order.id))!;
    }
    await persistJobs(saved.id);
    await persistSublets(saved.id);
    setOrder(saved);
    onChanged?.();
    toast(order ? `Order #${saved.id} updated.` : `Work order #${saved.id} created.`);
    return saved;
  };

  // ── Sublet handlers ──────────────────────────────────────────────────────
  const handleAddSublet = () =>
    setSublets((prev) => [
      ...prev,
      { id: crypto.randomUUID(), description: "", vendorId: undefined, cost: "", sellPrice: "", taxable: false },
    ]);
  const handleUpdateSublet = (id: string, field: keyof WorkingSublet, value: string | boolean) =>
    setSublets((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  const handleRemoveSublet = (id: string) =>
    setSublets((prev) => prev.filter((s) => s.id !== id));
  /** Save the order first so the sublet has a real id, then open a linked PO. */
  const handleCreatePoForSublet = async (s: WorkingSublet) => {
    const saved = await handleSaveOrder();
    requestPurchaseOrder({
      lineType: "sublet",
      name: s.description,
      unitCost: Number(s.cost) || 0,
      sellPrice: Number(s.sellPrice) || undefined,
      vendorId: s.vendorId,
      orderId: saved?.id,
      subletId: s.id,
    });
  };

  const handleRecordPayment = async (
    data: Omit<Payment, "id" | "createdAt" | "customerId" | "orderId" | "invoiceId">,
  ): Promise<Payment | null> => {
    // Make sure the order exists before attaching a payment.
    const saved = order ?? (await handleSaveOrder());
    if (!saved) return null;
    const payment = await addPayment({
      ...data,
      customerId: saved.customerId,
      orderId: saved.id,
      invoiceId: invoice?.id,
      isDeposit: !saved.finalized,
    });
    await refreshPayments(saved.id);
    const fresh = await getOrder(saved.id);
    if (fresh) setOrder(fresh);
    onChanged?.();
    return payment;
  };

  const handleInvoiceOrder = async (): Promise<Invoice | null> => {
    if (order?.finalized) {
      toast("Order is already invoiced.", "error");
      return invoice;
    }
    // Persist all current edits (header + jobs) before locking.
    const saved = await handleSaveOrder();
    if (!saved) return null;
    const inv = await finalizeOrder(saved.id);
    const fresh = await getOrder(saved.id);
    if (fresh) setOrder(fresh);
    if (inv) {
      setInvoice(inv);
      await refreshPayments(saved.id);
      toast(`Invoice #${inv.id} created for order #${saved.id}.`);
    }
    onChanged?.();
    return inv;
  };

  const handleVoidOrder = async () => {
    if (!order) return;
    await voidOrderStorage(order.id);
    const fresh = await getOrder(order.id);
    if (fresh) setOrder(fresh);
    onChanged?.();
    toast(`Order #${order.id} voided.`);
  };

  // Keep snapshot rates fresh for brand-new orders if globals change pre-save.
  useEffect(() => {
    if (!order && !initialDraft) loadGlobalRates().then(setRates);
  }, [order, initialDraft]);

  return {
    // status
    loading, order, invoice, payments, paidTotal, balanceDue,
    finalized, readOnly,
    // customer + vehicle
    customerData, setCustomerData,
    customerId, setCustomerId,
    selectedCustomer, setSelectedCustomer,
    vehicle, setVehicle,
    vehicleId, setVehicleId,
    // header
    mileageIn, setMileageIn,
    mileageOut, setMileageOut,
    transportType, setTransportType,
    workStatus, setWorkStatus,
    notes, setNotes,
    quoteId,
    // jobs + modifiers
    jobs, setJobs,
    discount, setDiscount,
    ssOverride, setSsOverride,
    isTaxable, setIsTaxable,
    sublets, setSublets,
    rates,
    // computed
    totals,
    // handlers
    handleAddJob, handleUpdateJob, handleRemoveJob,
    handleApplyTemplate, applyTemplateWithParts, handleSaveAsTemplate,
    fillModal, setFillModal,
    handleAddSublet, handleUpdateSublet, handleRemoveSublet, handleCreatePoForSublet,
    handleSaveOrder, handleRecordPayment, handleInvoiceOrder, handleVoidOrder,
    businessInfo,
  };
}
