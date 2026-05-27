import type { WarrantyPolicy, WarrantyTier } from "../types/index";

export type ProrationResult = {
  monthsElapsed: number;
  tier: WarrantyTier | null;
  statusLabel: string;
  // Parts
  partsPct: number;
  customerPartsPct: number;
  warrantyPaysCost: number;
  billOutAmount: number;
  customerPaysCost: number;
  customerPaysList: number;
  // Labor
  laborPct: number;
  customerLaborPct: number;
  warrantyPaysLaborCost: number;
  customerPaysLaborCost: number;
  customerPaysLaborList: number;
  // Flags
  isSwap: boolean;
  isBillOut: boolean;
};

const DAYS_PER_MONTH = 365 / 12;

export function calculateProration(
  policy: WarrantyPolicy,
  dateBilled: string,
  cost: number,
  list: number,
  laborCost = 0,
  laborList = 0,
  miles?: number,
): ProrationResult {
  const msElapsed = Date.now() - new Date(dateBilled).getTime();
  const monthsElapsed = msElapsed / (1000 * 60 * 60 * 24 * DAYS_PER_MONTH);

  const match = policy.tiers.find(
    (t) =>
      (t.maxMonths === null || monthsElapsed < t.maxMonths) &&
      (t.maxMiles === null || miles === undefined || miles < t.maxMiles),
  );

  const partsPct        = match?.partsPct ?? 0;
  const laborPct        = match?.laborPct ?? 0;
  const customerPartsPct = 100 - partsPct;
  const customerLaborPct = 100 - laborPct;
  const statusLabel     = match?.label ?? "No Warranty";

  const isSwap = match !== undefined &&
    policy.swapMaxMonths !== null &&
    monthsElapsed < policy.swapMaxMonths;

  const isBillOut = match !== undefined &&
    !isSwap &&
    policy.billOutMaxMonths !== null &&
    monthsElapsed <= policy.billOutMaxMonths &&
    partsPct === 100;

  const warrantyPaysCost     = cost * (partsPct / 100);
  const billOutAmount        = isBillOut
    ? warrantyPaysCost * policy.billOutMultiplier
    : warrantyPaysCost;
  const customerPaysCost     = cost * (customerPartsPct / 100);
  const customerPaysList     = list * (customerPartsPct / 100);

  const warrantyPaysLaborCost   = laborCost * (laborPct / 100);
  const customerPaysLaborCost   = laborCost * (customerLaborPct / 100);
  const customerPaysLaborList   = laborList * (customerLaborPct / 100);

  return {
    monthsElapsed,
    tier: match ?? null,
    statusLabel,
    partsPct,
    customerPartsPct,
    warrantyPaysCost,
    billOutAmount,
    customerPaysCost,
    customerPaysList,
    laborPct,
    customerLaborPct,
    warrantyPaysLaborCost,
    customerPaysLaborCost,
    customerPaysLaborList,
    isSwap,
    isBillOut,
  };
}
