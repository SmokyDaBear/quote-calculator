import { formatPhone } from "./formatPhone";
import type { GlobalRates, BusinessInfo, Customer } from "../types/index";

const ACCENT = "#1b3127";

const fmt = (n: number) => `$${Number(n).toFixed(2)}`;

type PrintPart = { partNumber?: string; name?: string; price?: number | string; quantity?: number; isEstimate?: boolean };
type PrintJobSummary = {
  id: number;
  laborCost: number;
  laborHrs: number;
  subtotal: number;
  warrantyPartsAmount?: number;
  warrantyLaborAmount?: number;
  warrantyPolicyName?: string;
  warrantyTierLabel?: string;
};
type PrintTotals = {
  jobSummaries: PrintJobSummary[];
  laborCost: number;
  partsTotal: number;
  ssTotal: number;
  taxTotal: number;
  discountAmount: number;
  warrantyTotal?: number;
  grandTotal: number;
  discount?: { type?: string; value?: string; appliesTo?: string };
};
type PrintJob = { id: number; name?: string; description?: string; parts: PrintPart[] };
type PrintVehicle = { year?: string; make?: string; model?: string; trim?: string; vin?: string; mileage?: string };

function partsTableHTML(parts: PrintPart[]): string {
  if (!parts || parts.length === 0) return "";
  const hasEstimates = parts.some((p) => p.isEstimate);
  const rows = parts
    .map((p) => {
      const extended = (Number(p.price) || 0) * (Number(p.quantity) || 1);
      const nameSuffix = p.isEstimate ? ' <span class="est-mark">*est.</span>' : "";
      const priceStr = p.isEstimate ? `<span class="est-mark">~${fmt(Number(p.price) || 0)}</span>` : fmt(Number(p.price) || 0);
      const extStr = p.isEstimate ? `<span class="est-mark">~${fmt(extended)}</span>` : fmt(extended);
      return `<tr${p.isEstimate ? ' class="est-row"' : ""}>
      <td>${p.partNumber || ""}</td>
      <td>${p.name || ""}${nameSuffix}</td>
      <td class="r">${priceStr}</td>
      <td class="r">${p.quantity ?? 1}</td>
      <td class="r">${extStr}</td>
    </tr>`;
    })
    .join("");
  const footnote = hasEstimates
    ? `<div class="est-footnote">* estimated price — subject to change</div>`
    : "";
  return `<table class="parts">
    <thead><tr>
      <th>Part #</th><th>Name</th><th>Price</th><th>Qty</th><th>Extended</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>${footnote}`;
}

function jobsHTML(jobs: PrintJob[], totals: PrintTotals): string {
  return jobs
    .map((job, i) => {
      const s = totals.jobSummaries.find((x) => x.id === job.id);
      const laborLine =
        (s?.laborCost ?? 0) > 0 ?
          `<span>Labor${(s?.laborHrs ?? 0) > 0 ? ` (${s!.laborHrs} hrs)` : ""}: ${fmt(s!.laborCost)}</span>`
        : "";
      const warrantyCovered = (s?.warrantyPartsAmount ?? 0) + (s?.warrantyLaborAmount ?? 0);
      const warrantyLine = (warrantyCovered > 0 && s?.warrantyPolicyName)
        ? `<div class="warranty-info">
            <span class="warranty-label">Warranty:</span>
            <span class="warranty-policy">${s.warrantyPolicyName}</span>
            ${s.warrantyTierLabel ? `<span class="warranty-sep">—</span><span class="warranty-tier">${s.warrantyTierLabel}</span>` : ""}
            <span class="warranty-covered">Covers ${fmt(warrantyCovered)}</span>
          </div>`
        : "";
      return `<div class="job">
      <div class="job-title">${job.name || `Job ${i + 1}`}</div>
      ${job.description ? `<div class="job-desc">${job.description}</div>` : ""}
      ${partsTableHTML(job.parts)}
      ${warrantyLine}
      <div class="job-meta">
        ${laborLine}
        <span class="job-sub">Subtotal: ${fmt(s?.subtotal ?? 0)}</span>
      </div>
    </div>`;
    })
    .join("");
}

function totalsHTML(totals: PrintTotals, rates: GlobalRates): string {
  const rows: [string, number][] = [
    ["Total Labor", totals.laborCost],
    ["Total Parts", totals.partsTotal],
    ...(totals.ssTotal > 0 ? [["Shop Supplies", totals.ssTotal] as [string, number]] : []),
    ...(totals.taxTotal > 0 ? [[`Tax (${rates.taxRate}%)`, totals.taxTotal] as [string, number]] : []),
  ];

  const rowsHTML = rows
    .map(([label, val]) => `<tr><td class="tl">${label}</td><td>${fmt(val)}</td></tr>`)
    .join("");

  const discountRow =
    totals.discountAmount > 0 ?
      (() => {
        const d = totals.discount;
        const appliesTo = d?.appliesTo === "both" ? "parts and labor" : d?.appliesTo || "";
        const label =
          d?.type === "percentage" ?
            `Discount (${d.value}% on ${appliesTo})`
          : `Discount (on ${appliesTo})`;
        return `<tr><td class="tl disc-lbl">${label}</td><td class="disc-val">−${fmt(totals.discountAmount)}</td></tr>`;
      })()
    : "";

  const warrantyRow = (totals.warrantyTotal ?? 0) > 0
    ? `<tr><td class="tl warranty-lbl">Warranty Coverage</td><td class="warranty-val">−${fmt(totals.warrantyTotal!)}</td></tr>`
    : "";

  return `<table class="totals">
    ${rowsHTML}
    ${discountRow}
    ${warrantyRow}
    <tr class="grand"><td>Grand Total</td><td>${fmt(totals.grandTotal)}</td></tr>
  </table>`;
}

function topHeaderHTML(biz: Partial<BusinessInfo>, customer: Customer | null, customerName: string, phone: string): string {
  const logoTag = biz.logo ? `<img src="${biz.logo}" class="biz-logo" alt="Logo"/>` : "";
  const bizInfo = [
    biz.name ? `<div class="biz-name">${biz.name}</div>` : "",
    biz.phone ? `<div class="biz-detail">${formatPhone(biz.phone)}</div>` : "",
    biz.address ? `<div class="biz-detail">${biz.address.replace(/\n/g, "<br/>")}</div>` : "",
  ].join("");
  const bizCol = (biz.name || biz.logo) ? `<div class="top-biz">${logoTag}<div class="biz-info">${bizInfo}</div></div>` : `<div class="top-biz"></div>`;

  const displayName = customer?.name || customerName;
  const displayPhone = customer ? (customer.phones[0]?.number ? formatPhone(customer.phones[0].number) : "") : (phone ? formatPhone(phone) : "");
  const displayEmail = customer?.email || "";
  const displayAddress = customer?.address || "";

  const customerLines = [
    displayName ? `<div class="cust-name">${displayName}</div>` : "",
    displayPhone ? `<div class="cust-detail">${displayPhone}</div>` : "",
    displayEmail ? `<div class="cust-detail">${displayEmail}</div>` : "",
    displayAddress ? `<div class="cust-detail">${displayAddress.replace(/\n/g, "<br/>")}</div>` : "",
  ].join("");

  const custCol = customerLines ? `<div class="top-cust"><div class="cust-label">Bill To</div>${customerLines}</div>` : `<div class="top-cust"></div>`;

  return `<div class="top-header">${bizCol}${custCol}</div>`;
}

function vehicleHTML(v: PrintVehicle): string {
  if (!v || (!v.make && !v.model && !v.vin && !v.mileage && !v.year)) return "";
  const label = [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ");
  return `<div class="vehicle-block">
    <div class="vehicle-label">Vehicle</div>
    <div class="vehicle-details">
      ${label ? `<span>${label}</span>` : ""}
      ${v.vin ? `<span>VIN: ${v.vin}</span>` : ""}
      ${v.mileage ? `<span>Mileage: ${Number(v.mileage).toLocaleString()}</span>` : ""}
    </div>
  </div>`;
}

function printFooterHTML(businessInfo: Partial<BusinessInfo>, disclaimer: string | undefined, totalsHtml: string): string {
  const message = businessInfo.printMessage?.trim();
  const disc = disclaimer?.trim();
  return `<div class="print-footer">
    ${message ? `<div class="print-message">${message}</div>` : ""}
    <div class="summary-row">
      <div class="summary-disclaimer">${disc ?? ""}</div>
      ${totalsHtml}
    </div>
    <div class="sig-block">
      <div class="sig-line">
        <div class="sig-line-rule"></div>
        <div class="sig-label">Customer Signature</div>
      </div>
      <div class="sig-line">
        <div class="sig-line-rule"></div>
        <div class="sig-label">Date</div>
      </div>
      <div class="sig-line">
        <div class="sig-line-rule"></div>
        <div class="sig-label">Printed Name</div>
      </div>
    </div>
  </div>`;
}

export function printQuote({
  quoteNumber,
  docLabel = "Quote",
  disclaimer,
  customerName,
  phone,
  notes,
  vehicle,
  jobs,
  rates,
  totals,
  discount,
  businessInfo = {},
  customer = null,
}: {
  quoteNumber: number;
  docLabel?: string;
  disclaimer?: string;
  customerName: string;
  phone: string;
  notes: string;
  vehicle: PrintVehicle;
  jobs: PrintJob[];
  rates: GlobalRates;
  totals: PrintTotals;
  discount: { type?: string; value?: string; appliesTo?: string };
  businessInfo?: Partial<BusinessInfo>;
  customer?: Customer | null;
}): void {
  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const totalsWithDiscount: PrintTotals = { ...totals, discount };

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>${docLabel} #${quoteNumber}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%}
body{font-family:Arial,sans-serif;font-size:11pt;color:#222;padding:36px}
.print-doc{width:100%;height:100%;border-collapse:collapse}
.print-doc>thead>tr>td,.print-doc>tbody>tr>td{padding:0}
.doc-header{display:table-header-group;break-inside:avoid;page-break-inside:avoid}
.running-header{padding-bottom:12px;border-bottom:1px solid #ddd;margin-bottom:14px}
.body-fill{height:100%}
.body-fill>td{vertical-align:top}

.top-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px;gap:24px}
.top-biz{display:flex;align-items:flex-start;gap:14px}
.biz-logo{max-height:64px;max-width:160px;object-fit:contain}
.biz-name{font-size:14pt;font-weight:bold;color:${ACCENT}}
.biz-detail{font-size:9.5pt;color:#555;margin-top:2px;white-space:pre-line}
.top-cust{text-align:right}
.cust-label{font-size:8pt;font-weight:bold;text-transform:uppercase;letter-spacing:.5px;color:#999;margin-bottom:4px}
.cust-name{font-size:12pt;font-weight:bold;color:#222}
.cust-detail{font-size:9.5pt;color:#555;margin-top:2px;white-space:pre-line}

.head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px}
.qnum{font-size:12pt;font-weight:bold;color:${ACCENT}}
.qdate{font-size:10pt;color:#666}

.vehicle-block{margin-bottom:12px;font-size:10pt}
.vehicle-label{font-size:8pt;font-weight:bold;text-transform:uppercase;letter-spacing:.5px;color:#999;margin-bottom:3px}
.vehicle-details{display:flex;flex-wrap:wrap;gap:12px;color:#333}

.notes-box{background:#f5f5f5;border-radius:4px;padding:10px 12px;margin-bottom:14px;font-size:10pt;color:#555;white-space:pre-wrap}
.notes-label{font-size:8pt;font-weight:bold;text-transform:uppercase;letter-spacing:.5px;color:#999;margin-bottom:4px}

hr{border:none;border-top:1px solid #ddd;margin:14px 0}

.job{margin-bottom:18px}
.job-title{font-size:12pt;font-weight:bold;color:${ACCENT};margin-bottom:3px}
.job-desc{font-size:9.5pt;color:#666;font-style:italic;margin-bottom:6px}

.parts{width:100%;border-collapse:collapse;margin-bottom:6px;font-size:9.5pt}
.parts th{background:#fff;color:#222;padding:5px 8px;text-align:left;font-weight:bold;border-top:2px solid #222;border-bottom:1px solid #222}
.parts th:nth-child(3),.parts th:nth-child(4),.parts th:nth-child(5){text-align:right}
.parts td{padding:4px 8px;border-bottom:1px solid #ddd}
.r{text-align:right}
.est-row td{color:#92400e}
.est-mark{color:#92400e;font-style:italic}
.est-footnote{font-size:8.5pt;color:#92400e;font-style:italic;margin-top:3px;margin-bottom:6px}

.job-meta{display:flex;flex-wrap:wrap;gap:16px;font-size:9.5pt;color:#555;margin-top:4px}
.job-sub{font-weight:bold;color:#222;margin-left:auto}

.totals{width:260px;flex:0 0 260px;margin-left:auto;border-collapse:collapse;font-size:10pt}
.totals td{padding:4px 8px;border-bottom:1px solid #eee}
.totals td:last-child{text-align:right;font-weight:bold}
.tl{color:#555;font-weight:normal}
.disc-lbl{color:#c0392b;font-weight:normal}.disc-val{color:#c0392b}
.warranty-info{font-size:9pt;color:${ACCENT};background:#f0fdf4;border-radius:3px;padding:4px 8px;margin:4px 0;display:flex;flex-wrap:wrap;gap:8px;align-items:baseline}
.warranty-label{font-size:8pt;font-weight:bold;text-transform:uppercase;letter-spacing:.4px;color:#6b7280}
.warranty-policy{font-weight:bold;color:${ACCENT}}
.warranty-sep{color:#9ca3af}
.warranty-tier{color:#555;font-style:italic}
.warranty-covered{font-weight:bold;color:${ACCENT};margin-left:auto}
.warranty-lbl{color:${ACCENT};font-weight:normal}.warranty-val{color:${ACCENT}}
.grand td{border-top:2px solid #222;border-bottom:2px solid #222;background:#fff;color:#222;font-size:11pt;font-weight:bold;padding:6px 8px}

.summary-block{break-inside:avoid;page-break-inside:avoid}
.print-footer{padding-top:14px}
.print-message{font-size:10.5pt;color:#333;text-align:center;font-style:italic;margin-bottom:14px}
.summary-row{display:flex;gap:32px;align-items:flex-start;margin-bottom:24px}
.summary-disclaimer{flex:1;font-size:8.5pt;color:#555;line-height:1.5;white-space:pre-line}
.sig-block{display:flex;gap:48px;margin-top:8px}
.sig-line{flex:1}
.sig-line-rule{border-top:1px solid #555;margin-bottom:5px}
.sig-label{font-size:8.5pt;color:#666}

@media print{body{padding:0}@page{margin:1.5cm}}
</style>
</head>
<body>
<table class="print-doc">
<thead class="doc-header"><tr><td>
<div class="running-header">
${topHeaderHTML(businessInfo, customer, customerName, phone)}
<div class="head">
  <div class="qnum">${docLabel} #${quoteNumber}</div>
  <div class="qdate">${date}</div>
</div>
${vehicleHTML(vehicle)}
</div>
</td></tr></thead>
<tbody>
<tr class="body-fill"><td>
${notes && notes.trim() ? `<div class="notes-box"><div class="notes-label">Notes</div>${notes.trim()}</div>` : ""}
${jobsHTML(jobs, totalsWithDiscount)}
</td></tr>
<tr><td>
<div class="summary-block">
<hr/>
${printFooterHTML(businessInfo, disclaimer, totalsHTML(totalsWithDiscount, rates))}
</div>
</td></tr>
</tbody>
</table>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}
