import { useState, useMemo } from "react";
import {
  getCurrentQuoteNumber,
  saveQuote,
  updateQuote,
  getQuote,
  getPartsLibrary,
  saveJobTemplate,
  loadGlobalRates,
} from "../storage";
import { calculateProration } from "../utils/proration";
import { printQuote } from "../utils/printQuote";
import { EMPTY_CUSTOMER_FORM_DATA } from "../components/CustomerFormFields";
import type { CustomerFormData } from "../components/CustomerFormFields";
import type { SsOverride } from "../components/ShopSuppliesOverride";
import type {
  GlobalRates,
  BusinessInfo,
  JobTemplate,
  WorkingJob,
  WorkingPart,
  TemplatePart_Specific,
  Customer,
  WarrantyPolicy,
} from "../types/index";

// ── Shared constants / helpers ───────────────────────────────────────────────

export type DiscountState = {
  type: "percentage" | "flat";
  value: string;
  appliesTo: "both" | "parts" | "labor";
};

export const EMPTY_DISCOUNT: DiscountState = {
  type: "percentage",
  value: "",
  appliesTo: "both",
};

export const EMPTY_VEHICLE = {
  year: "", make: "", model: "", trim: "", vin: "", mileage: "",
};

export const EMPTY_JOB = (id: number): WorkingJob => ({
  id,
  name: `Job ${id}`,
  parts: [] as WorkingPart[],
  laborHrs: "",
  laborCost: "",
  description: "",
  priceAtList: false,
});

export const migrateJobParts = (parts: unknown): WorkingPart[] => {
  if (Array.isArray(parts)) {
    return (parts as Array<Record<string, unknown>>).map((p) => ({
      partNumber: (p.partNumber as string) ?? "",
      name: (p.name as string) ?? "",
      price: (p.price as string) ?? "",
      quantity: Number(p.quantity) || 1,
      cost: p.cost as string | undefined,
      msrp: p.msrp as string | undefined,
    }));
  }
  const num = Number(parts) || 0;
  return num > 0 ? [{ partNumber: "", name: "Parts", price: String(num), quantity: 1 }] : [];
};

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useQuote({
  rates,
  warrantyPolicies,
  businessInfo,
  toast,
  refreshHistory,
  onRatesChange,
  onNavigateToCompose,
  onApplyTemplateWithSlots,
}: {
  rates: GlobalRates;
  warrantyPolicies: WarrantyPolicy[];
  businessInfo: Partial<BusinessInfo>;
  toast: (msg: string, type?: string) => void;
  refreshHistory: () => Promise<void>;
  onRatesChange: (rates: GlobalRates) => void;
  onNavigateToCompose: () => void;
  onApplyTemplateWithSlots: () => void;
}) {
  const [jobs, setJobs] = useState<WorkingJob[]>([]);
  const [customerData, setCustomerData] = useState<CustomerFormData>(EMPTY_CUSTOMER_FORM_DATA);
  const [isTaxable, setIsTaxable] = useState(true);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [notes, setNotes] = useState("");
  const [vehicle, setVehicle] = useState(EMPTY_VEHICLE);
  const [currentQuoteId, setCurrentQuoteId] = useState<string | null>(null);
  const [quoteNumber, setQuoteNumber] = useState(1001);
  const [discount, setDiscount] = useState<DiscountState>(EMPTY_DISCOUNT);
  const [ssOverride, setSsOverride] = useState<SsOverride>({ enabled: false, value: "" });
  const [fillModal, setFillModal] = useState<{ template: JobTemplate } | null>(null);
  const jobCounter = jobs.length > 0 ? Math.max(...jobs.map((j) => j.id)) : 0;
  // ── Totals ───────────────────────────────────────────────────────────────

  const totals = useMemo(() => {
    let grandLaborCost = 0;
    let grandLaborHours = 0;
    let grandPartsTotal = 0;
    let grandSsTotal = 0;
    let grandWarrantyTotal = 0;
    let grandWarrantyPartsTotal = 0;

    const jobSummaries = jobs.map((job) => {
      const partsTotal = job.parts.reduce(
        (sum, p) => sum + (Number(p.price) || 0) * (Number(p.quantity) || 0),
        0,
      );
      const laborHrs = Number(job.laborHrs) || 0;
      const laborCost = Number(job.laborCost) || 0;
      const subtotal = laborCost + partsTotal;

      grandLaborCost += laborCost;
      grandLaborHours += laborHrs;
      grandPartsTotal += partsTotal;
      grandSsTotal += rates.ssRate * 0.01 * laborCost;

      let warrantyPartsAmount = 0;
      let warrantyLaborAmount = 0;
      let warrantyTierLabel = "";
      let warrantyPolicyName = job.warrantyPolicyName ?? "";

      if (job.warrantyPolicyId && job.warrantyDateBilled && warrantyPolicies.length > 0) {
        const policy = warrantyPolicies.find((p) => p.id === job.warrantyPolicyId);
        if (policy) {
          const milesNum = job.warrantyMileage ? parseFloat(job.warrantyMileage) : undefined;
          const result = calculateProration(
            policy,
            job.warrantyDateBilled,
            partsTotal,
            partsTotal,
            laborCost,
            laborCost,
            milesNum,
          );
          warrantyPartsAmount = result.warrantyPaysCost;
          warrantyLaborAmount = result.warrantyPaysLaborCost;
          warrantyTierLabel = result.tier?.label ?? "";
          warrantyPolicyName = policy.label;
        }
      }

      grandWarrantyTotal += warrantyPartsAmount + warrantyLaborAmount;
      grandWarrantyPartsTotal += warrantyPartsAmount;

      return {
        id: job.id,
        name: job.name || `Job ${job.id}`,
        laborCost,
        laborHrs,
        partsTotal,
        subtotal,
        warrantyPartsAmount,
        warrantyLaborAmount,
        warrantyPolicyName,
        warrantyTierLabel,
      };
    });

    const autoSsTotal = Math.min(grandSsTotal, rates.ssMax);
    const ssTotal = ssOverride.enabled ? Number(ssOverride.value) || 0 : autoSsTotal;
    const taxableAmount = grandPartsTotal - grandWarrantyPartsTotal + ssTotal;
    const taxTotal = isTaxable ? taxableAmount * (rates.taxRate * 0.01) : 0;

    const discountValue = Number(discount.value) || 0;
    let discountAmount = 0;
    if (discountValue > 0) {
      const base =
        discount.appliesTo === "parts" ? grandPartsTotal
        : discount.appliesTo === "labor" ? grandLaborCost
        : grandLaborCost + grandPartsTotal;
      discountAmount =
        discount.type === "percentage" ? base * (discountValue / 100) : Math.min(discountValue, base);
    }

    const grandTotal =
      grandLaborCost + grandPartsTotal + ssTotal + taxTotal - discountAmount - grandWarrantyTotal;

    return {
      jobSummaries,
      laborCost: grandLaborCost,
      laborHours: grandLaborHours,
      partsTotal: grandPartsTotal,
      ssTotal,
      autoSsTotal,
      taxTotal,
      discountAmount,
      discount,
      warrantyTotal: grandWarrantyTotal,
      grandTotal,
    };
  }, [jobs, rates, discount, ssOverride, warrantyPolicies, isTaxable]);

  // ── Job handlers ─────────────────────────────────────────────────────────

  const handleAddJob = () => {
    const newId = jobCounter + 1;
    setJobs((prev) => [...prev, EMPTY_JOB(newId)]);
  };

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

  const handleRemoveJob = (id: number) =>
    setJobs((prev) => prev.filter((j) => j.id !== id));

  // ── Quote lifecycle ───────────────────────────────────────────────────────

  const buildQuoteData = () => ({
    customerName: customerData.name.trim(),
    phone: customerData.phones[0]?.number ?? "",
    customerPhones: customerData.phones,
    customerEmail: customerData.email,
    customerAddress: customerData.address,
    customerNotes: customerData.notes,
    isTaxable,
    customerId,
    notes,
    vehicle,
    rates,
    discount,
    ssOverride,
    jobs: jobs.map((j) => ({
      name: j.name,
      parts: j.parts.map((p) => ({
        partNumber: p.partNumber || "",
        name: p.name,
        price: Number(p.price) || 0,
        quantity: Number(p.quantity) || 1,
        cost: p.cost,
        msrp: p.msrp,
      })),
      laborHrs: Number(j.laborHrs) || 0,
      laborCost: Number(j.laborCost) || 0,
      description: j.description,
      priceAtList: j.priceAtList,
      warrantyPolicyId: j.warrantyPolicyId,
      warrantyPolicyName: j.warrantyPolicyName,
      warrantyDateBilled: j.warrantyDateBilled,
      warrantyMileage: j.warrantyMileage,
    })),
    grandTotal: totals.grandTotal,
  });

  const handleNewQuote = async () => {
    setCurrentQuoteId(null);
    setQuoteNumber(await getCurrentQuoteNumber());
    setCustomerData(EMPTY_CUSTOMER_FORM_DATA);
    setIsTaxable(true);
    setCustomerId(null);
    setSelectedCustomer(null);
    setNotes("");
    setVehicle(EMPTY_VEHICLE);
    setJobs([EMPTY_JOB(1)]);
    setDiscount(EMPTY_DISCOUNT);
    setSsOverride({ enabled: false, value: "" });
    onRatesChange(await loadGlobalRates());
    onNavigateToCompose();
  };

  const handleSaveQuote = async () => {
    if (!customerData.name.trim()) {
      toast("Please enter a customer name before saving.", "error");
      return;
    }
    const savedNumber = await saveQuote(buildQuoteData());
    setCurrentQuoteId(String(savedNumber));
    setQuoteNumber(savedNumber);
    await refreshHistory();
    toast(`Quote #${savedNumber} saved successfully!`);
  };

  const handleUpdateQuote = async () => {
    if (!currentQuoteId) return;
    if (!customerData.name.trim()) {
      toast("Please enter a customer name before saving.", "error");
      return;
    }
    await updateQuote(currentQuoteId, buildQuoteData());
    await refreshHistory();
    toast(`Quote #${currentQuoteId} updated successfully!`);
  };

  const handleLoadQuote = async (quoteId: string) => {
    const saved = await getQuote(quoteId);
    if (!saved) {
      toast("Quote not found.", "error");
      return;
    }
    setCurrentQuoteId(quoteId);
    setQuoteNumber(Number(quoteId));
    const savedPhone = (saved.phone as string) || "";
    const savedPhones =
      (saved.customerPhones as typeof EMPTY_CUSTOMER_FORM_DATA.phones) ||
      (savedPhone ? [{ label: "Phone", number: savedPhone }] : EMPTY_CUSTOMER_FORM_DATA.phones);
    setCustomerData({
      name: (saved.customerName as string) || "",
      phones: savedPhones,
      email: (saved.customerEmail as string) || "",
      address: (saved.customerAddress as string) || "",
      notes: (saved.customerNotes as string) || "",
      taxable: (saved.isTaxable as boolean) !== false,
      taxId: "",
    });
    setIsTaxable((saved.isTaxable as boolean) !== false);
    setCustomerId((saved.customerId as string) || null);
    setNotes((saved.notes as string) || "");
    setVehicle((saved.vehicle as typeof EMPTY_VEHICLE) || EMPTY_VEHICLE);
    if (saved.rates) onRatesChange(saved.rates as GlobalRates);
    setDiscount((saved.discount as DiscountState) || EMPTY_DISCOUNT);
    setSsOverride((saved.ssOverride as SsOverride) || { enabled: false, value: "" });
    if (saved.jobs && (saved.jobs as unknown[]).length > 0) {
      const loaded = (saved.jobs as Array<Record<string, unknown>>).map((jobData, i) => ({
        id: i + 1,
        name: (jobData.name as string) || `Job ${i + 1}`,
        parts: migrateJobParts(jobData.parts),
        laborHrs: (jobData.laborHrs as string)?.toString() || "",
        laborCost: (jobData.laborCost as string)?.toString() || "",
        description: (jobData.description as string) || "",
        priceAtList: (jobData.priceAtList as boolean) || false,
        warrantyPolicyId: (jobData.warrantyPolicyId as string) || undefined,
        warrantyPolicyName: (jobData.warrantyPolicyName as string) || undefined,
        warrantyDateBilled: (jobData.warrantyDateBilled as string) || undefined,
        warrantyMileage: (jobData.warrantyMileage as string) || undefined,
      }));
      setJobs(loaded);
    } else {
      setJobs([EMPTY_JOB(1)]);
    }
    onNavigateToCompose();
  };

  const handlePrint = () => {
    printQuote({
      quoteNumber,
      customerName: customerData.name,
      phone: customerData.phones[0]?.number ?? "",
      notes,
      vehicle,
      jobs,
      rates,
      totals,
      discount,
      businessInfo,
      customer: selectedCustomer,
    });
  };

  const handleSaveAsTemplate = async (job: WorkingJob) => {
    await saveJobTemplate({
      name: job.name,
      description: job.description || "",
      laborHrs: Number(job.laborHrs) || 0,
      laborCost: Number(job.laborCost) || 0,
      parts: [],
    });
    toast(`Template "${job.name}" saved.`);
  };

  const applyTemplateWithParts = (template: JobTemplate, resolvedParts: WorkingPart[]) => {
    const newId = jobCounter + 1;
    setJobs((prev) => [
      ...prev,
      {
        id: newId,
        name: template.name,
        parts: resolvedParts.map((p) => ({
          partNumber: p.partNumber || "",
          name: p.name || "",
          price: p.price?.toString() || "",
          quantity: p.quantity ?? 1,
          cost: p.cost,
          msrp: p.msrp,
        })),
        laborHrs: template.laborHrs ? template.laborHrs.toString() : "",
        laborCost: template.laborCost ? template.laborCost.toString() : "",
        description: template.description || "",
        priceAtList: false,
      },
    ]);
  };

  const handleApplyTemplate = async (template: JobTemplate) => {
    const hasSlots = (template.parts || []).some((p) => p.type === "category");
    if (hasSlots) {
      setFillModal({ template });
      onApplyTemplateWithSlots();
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

  return {
    // State
    jobs, setJobs,
    customerData, setCustomerData,
    isTaxable, setIsTaxable,
    customerId, setCustomerId,
    selectedCustomer, setSelectedCustomer,
    notes, setNotes,
    vehicle, setVehicle,
    currentQuoteId,
    quoteNumber, setQuoteNumber,
    discount, setDiscount,
    ssOverride, setSsOverride,
    fillModal, setFillModal,
    // Computed
    totals,
    // Handlers
    handleNewQuote,
    handleSaveQuote,
    handleUpdateQuote,
    handleLoadQuote,
    handlePrint,
    handleAddJob,
    handleUpdateJob,
    handleRemoveJob,
    handleSaveAsTemplate,
    applyTemplateWithParts,
    handleApplyTemplate,
  };
}
