import type { RecallResponse } from "../utils/VehicleApi";
import type { BusinessInfo } from "../types/index";
import { formatPhone } from "./formatPhone";
import { linkifyForHtml } from "./linkifyRecall";

const ACCENT = "#1b3127";

type PrintVehicle = {
  year?: string;
  make?: string;
  model?: string;
  trim?: string;
  vin?: string;
};

function headerHTML(biz: Partial<BusinessInfo>, vehicle: PrintVehicle, date: string): string {
  const logoTag = biz.logo ? `<img src="${biz.logo}" class="biz-logo" alt="Logo"/>` : "";
  const bizBlock = [
    biz.name ? `<div class="biz-name">${biz.name}</div>` : "",
    biz.phone ? `<div class="biz-detail">${formatPhone(biz.phone)}</div>` : "",
    biz.address ? `<div class="biz-detail">${biz.address.replace(/\n/g, "<br/>")}</div>` : "",
  ].join("");

  const vehicleLabel = [vehicle.year, vehicle.make, vehicle.model, vehicle.trim]
    .filter(Boolean)
    .join(" ");

  return `<div class="page-header">
  <div class="header-biz">
    ${biz.logo ? `<div class="biz-logo-wrap">${logoTag}</div>` : ""}
    <div class="biz-info">${bizBlock}</div>
  </div>
  <div class="header-right">
    <div class="doc-title">Safety Recall Report</div>
    <div class="doc-date">${date}</div>
    ${vehicleLabel ? `<div class="vehicle-line">${vehicleLabel}</div>` : ""}
    ${vehicle.vin ? `<div class="vin-line">VIN: ${vehicle.vin}</div>` : ""}
  </div>
</div>
<hr/>`;
}

function recallCardHTML(r: RecallResponse, index: number): string {
  const urgent = r.parkIt || r.parkOutSide;
  const urgentBadge = urgent
    ? `<span class="urgent-badge">${r.parkIt ? "PARK IT" : "PARK OUTSIDE"}</span>`
    : "";

  const rows: [string, string][] = [
    ["Component", r.Component],
    ["Date Reported", r.ReportReceivedDate],
    ["Manufacturer", r.Manufacturer],
    ["NHTSA Campaign #", r.NHTSACampaignNumber],
  ].filter(([, v]) => v) as [string, string][];

  const metaHTML = rows
    .map(([label, val]) => `<div class="meta-row"><span class="meta-label">${label}</span><span class="meta-val">${val}</span></div>`)
    .join("");

  const sections: [string, string][] = [
    ["Summary", r.Summary ? linkifyForHtml(r.Summary) : ""],
    ["Consequence", r.Consequence ? linkifyForHtml(r.Consequence) : ""],
    ["Remedy", r.Remedy ? linkifyForHtml(r.Remedy) : ""],
    ["Notes", r.Notes ? linkifyForHtml(r.Notes) : ""],
  ].filter(([, v]) => v) as [string, string][];

  const sectionsHTML = sections
    .map(([label, text]) => `<div class="recall-section">
      <div class="recall-section-label">${label}</div>
      <div class="recall-section-text">${text}</div>
    </div>`)
    .join("");

  return `<div class="recall-card${urgent ? " recall-card--urgent" : ""}">
  <div class="recall-card-header">
    <div class="recall-num-row">
      <span class="recall-index">#${index + 1}</span>
      <span class="recall-campaign">${r.NHTSACampaignNumber}</span>
      ${urgentBadge}
    </div>
    <div class="recall-component">${r.Component}</div>
  </div>
  <div class="recall-meta">${metaHTML}</div>
  ${sectionsHTML}
</div>`;
}

export function printRecalls({
  recalls,
  vehicle,
  businessInfo = {},
}: {
  recalls: RecallResponse[];
  vehicle: PrintVehicle;
  businessInfo?: Partial<BusinessInfo>;
}): void {
  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const vehicleLabel = [vehicle.year, vehicle.make, vehicle.model, vehicle.trim]
    .filter(Boolean)
    .join(" ");

  const recallsHTML =
    recalls.length === 0
      ? `<div class="no-recalls">No open recalls found for this vehicle.</div>`
      : recalls.map((r, i) => recallCardHTML(r, i)).join("\n");

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Recall Report — ${vehicleLabel || "Vehicle"}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
html{height:100%}
body{font-family:Arial,sans-serif;font-size:11pt;color:#222;padding:36px;min-height:100%}

.page-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;gap:24px}
.header-biz{display:flex;align-items:flex-start;gap:12px}
.biz-logo{max-height:60px;max-width:150px;object-fit:contain}
.biz-name{font-size:13pt;font-weight:bold;color:${ACCENT}}
.biz-detail{font-size:9.5pt;color:#555;margin-top:2px}
.header-right{text-align:right}
.doc-title{font-size:15pt;font-weight:bold;color:${ACCENT}}
.doc-date{font-size:9.5pt;color:#777;margin-top:3px}
.vehicle-line{font-size:11pt;font-weight:bold;margin-top:6px;color:#222}
.vin-line{font-size:9pt;color:#555;font-family:monospace;margin-top:2px}

hr{border:none;border-top:1px solid #ddd;margin:14px 0}

.recall-count{font-size:10.5pt;color:#555;margin-bottom:18px}
.recall-count strong{color:#222}

.no-recalls{font-size:11pt;color:#555;font-style:italic;margin-top:12px}

.recall-card{border:1px solid #d1d5db;border-radius:6px;padding:14px 16px;margin-bottom:16px;page-break-inside:avoid}
.recall-card--urgent{border-color:#dc2626;border-width:2px}

.recall-card-header{margin-bottom:10px}
.recall-num-row{display:flex;align-items:center;gap:8px;margin-bottom:4px}
.recall-index{font-size:9pt;font-weight:bold;color:#999}
.recall-campaign{font-family:monospace;font-size:10pt;font-weight:bold;color:#374151}
.urgent-badge{font-size:8.5pt;font-weight:800;padding:2px 7px;border-radius:4px;background:#dc2626;color:#fff;letter-spacing:.04em}
.recall-component{font-size:11.5pt;font-weight:bold;color:${ACCENT}}

.recall-meta{display:flex;flex-wrap:wrap;gap:4px 24px;margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid #e5e7eb}
.meta-row{display:flex;gap:6px;font-size:9pt}
.meta-label{color:#6b7280;white-space:nowrap}
.meta-val{color:#374151;font-weight:600}

.recall-section{margin-bottom:8px}
.recall-section:last-child{margin-bottom:0}
.recall-section-label{font-size:8.5pt;font-weight:bold;text-transform:uppercase;letter-spacing:.5px;color:#6b7280;margin-bottom:3px}
.recall-section-text{font-size:10pt;color:#374151;line-height:1.55}

.print-footer{margin-top:28px;padding-top:14px;border-top:1px solid #ddd;font-size:8.5pt;color:#888;text-align:center}

@media print{body{padding:0}@page{margin:1.5cm}.recall-card{page-break-inside:avoid}}
</style>
</head>
<body>
${headerHTML(businessInfo, vehicle, date)}
<div class="recall-count">
  <strong>${recalls.length} recall${recalls.length !== 1 ? "s" : ""}</strong> found for ${vehicleLabel || "this vehicle"}
</div>
${recallsHTML}
<div class="print-footer">
  Source: NHTSA Vehicle Safety Database &mdash; safercar.gov &mdash; Generated ${date}
</div>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}
