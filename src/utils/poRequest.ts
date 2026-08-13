import type { PoLineType } from "../types/index";

/** Prefill describing the first line of a purchase order to open. */
export interface PoPrefill {
  /** Omit to open an empty PO — used when starting from a vendor. */
  lineType?: PoLineType;
  inventoryId?: string;
  name?: string;
  partNumber?: string;
  unitCost?: number;
  sellPrice?: number;
  category?: string;
  subcategory?: string;
  vendorId?: string;
  orderId?: string;
  subletId?: string;
}

type Listener = (prefill: PoPrefill) => void;

let listener: Listener | null = null;

/** App registers a single listener that opens the PO editor with the prefill. */
export function onPurchaseOrderRequest(l: Listener | null): void {
  listener = l;
}

/** Called from anywhere (part rows, sublet cards) to open a prefilled PO. */
export function requestPurchaseOrder(prefill: PoPrefill): void {
  listener?.(prefill);
}
