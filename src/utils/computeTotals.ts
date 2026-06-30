import { calculateProration } from "./proration";
import type { GlobalRates, WarrantyPolicy, WorkingJob } from "../types/index";

// Shared quote/order totals computation. Keeping this in one place guarantees
// orders and quotes price identically. Sublets and labor tax are optional and
// default to no-ops, so quote behavior is unchanged when they are absent.

export type TotalsDiscount = {
  type: "percentage" | "flat";
  value: string;
  appliesTo: "both" | "parts" | "labor";
};

export type TotalsSsOverride = { enabled: boolean; value: string };

export type TotalsSublet = { sellPrice: number; taxable: boolean };

export interface ComputedTotals {
  jobSummaries: Array<{
    id: number;
    name: string;
    laborCost: number;
    laborHrs: number;
    partsTotal: number;
    subtotal: number;
    warrantyPartsAmount: number;
    warrantyLaborAmount: number;
    warrantyPolicyName: string;
    warrantyTierLabel: string;
  }>;
  laborCost: number;
  laborHours: number;
  partsTotal: number;
  subletsTotal: number;
  ssTotal: number;
  autoSsTotal: number;
  taxTotal: number;
  discountAmount: number;
  discount: TotalsDiscount;
  warrantyTotal: number;
  grandTotal: number;
}

export function computeTotals({
  jobs,
  rates,
  discount,
  ssOverride,
  warrantyPolicies,
  isTaxable,
  sublets = [],
}: {
  jobs: WorkingJob[];
  rates: GlobalRates;
  discount: TotalsDiscount;
  ssOverride: TotalsSsOverride;
  warrantyPolicies: WarrantyPolicy[];
  isTaxable: boolean;
  sublets?: TotalsSublet[];
}): ComputedTotals {
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

  const subletsTotal = sublets.reduce((s, x) => s + (Number(x.sellPrice) || 0), 0);
  const subletTaxableBase = sublets.reduce(
    (s, x) => s + (x.taxable ? Number(x.sellPrice) || 0 : 0),
    0,
  );

  const autoSsTotal = Math.min(grandSsTotal, rates.ssMax);
  const ssTotal = ssOverride.enabled ? Number(ssOverride.value) || 0 : autoSsTotal;

  const taxableAmount = grandPartsTotal - grandWarrantyPartsTotal + ssTotal;
  const taxRate = rates.taxRate * 0.01;
  const laborTaxRate = (rates.laborTaxRate ?? 0) * 0.01;
  const baseTax = taxableAmount * taxRate;
  const laborTax = grandLaborCost * laborTaxRate;
  const subletTax = subletTaxableBase * taxRate;
  const taxTotal = isTaxable ? baseTax + laborTax + subletTax : 0;

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
    grandLaborCost +
    grandPartsTotal +
    subletsTotal +
    ssTotal +
    taxTotal -
    discountAmount -
    grandWarrantyTotal;

  return {
    jobSummaries,
    laborCost: grandLaborCost,
    laborHours: grandLaborHours,
    partsTotal: grandPartsTotal,
    subletsTotal,
    ssTotal,
    autoSsTotal,
    taxTotal,
    discountAmount,
    discount,
    warrantyTotal: grandWarrantyTotal,
    grandTotal,
  };
}
