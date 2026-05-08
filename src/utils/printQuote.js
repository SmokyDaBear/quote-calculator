const ACCENT = '#2e9e6b';

const fmt = (n) => `$${Number(n).toFixed(2)}`;

function partsTableHTML(parts) {
  if (!parts || parts.length === 0) return '';
  const rows = parts.map((p) => {
    const extended = (Number(p.price) || 0) * (Number(p.quantity) || 1);
    return `<tr>
      <td>${p.partNumber || ''}</td>
      <td>${p.name || ''}</td>
      <td class="r">${fmt(p.price)}</td>
      <td class="r">${p.quantity ?? 1}</td>
      <td class="r">${fmt(extended)}</td>
    </tr>`;
  }).join('');
  return `<table class="parts">
    <thead><tr>
      <th>Part #</th><th>Name</th><th>Price</th><th>Qty</th><th>Extended</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function jobsHTML(jobs, totals) {
  return jobs.map((job, i) => {
    const s = totals.jobSummaries.find((x) => x.id === job.id);
    const laborLine = s?.laborCost > 0
      ? `<span>Labor${s.laborHrs > 0 ? ` (${s.laborHrs} hrs)` : ''}: ${fmt(s.laborCost)}</span>`
      : '';
    const ssLine = s?.ssTotal > 0
      ? `<span>Shop Supplies: ${fmt(s.ssTotal)}</span>`
      : '';
    return `<div class="job">
      <div class="job-title">${job.name || `Job ${i + 1}`}</div>
      ${job.description ? `<div class="job-desc">${job.description}</div>` : ''}
      ${partsTableHTML(job.parts)}
      <div class="job-meta">
        ${laborLine}${ssLine}
        <span class="job-sub">Subtotal: ${fmt(s?.subtotal ?? 0)}</span>
      </div>
    </div>`;
  }).join('');
}

function totalsHTML(totals, rates) {
  const rows = [
    ['Total Labor', totals.laborCost],
    ['Total Parts', totals.partsTotal],
    ...(totals.ssTotal > 0 ? [['Shop Supplies', totals.ssTotal]] : []),
    ...(totals.taxTotal > 0 ? [[`Tax (${rates.taxRate}%)`, totals.taxTotal]] : []),
  ].map(([label, val]) => `<tr><td class="tl">${label}</td><td>${fmt(val)}</td></tr>`).join('');

  return `<table class="totals">
    ${rows}
    <tr class="grand"><td>Grand Total</td><td>${fmt(totals.grandTotal)}</td></tr>
  </table>`;
}

function businessHeaderHTML(biz) {
  if (!biz.name && !biz.logo) return '';
  const logoTag = biz.logo ? `<img src="${biz.logo}" class="biz-logo" alt="Logo"/>` : '';
  const info = [
    biz.name ? `<div class="biz-name">${biz.name}</div>` : '',
    biz.phone ? `<div class="biz-detail">${biz.phone}</div>` : '',
    biz.address ? `<div class="biz-detail">${biz.address.replace(/\n/g, '<br/>')}</div>` : '',
  ].join('');
  return `<div class="biz-header">${logoTag}<div class="biz-info">${info}</div></div>`;
}

function vehicleHTML(v) {
  if (!v || (!v.make && !v.model && !v.vin && !v.mileage && !v.year)) return '';
  const label = [v.year, v.make, v.model, v.trim].filter(Boolean).join(' ');
  return `<div class="vehicle-block">
    <div class="vehicle-label">Vehicle</div>
    <div class="vehicle-details">
      ${label ? `<span>${label}</span>` : ''}
      ${v.vin ? `<span>VIN: ${v.vin}</span>` : ''}
      ${v.mileage ? `<span>Mileage: ${Number(v.mileage).toLocaleString()}</span>` : ''}
    </div>
  </div>`;
}

export function printQuote({ quoteNumber, customerName, phone, notes, vehicle, jobs, rates, totals, businessInfo = {} }) {
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Quote #${quoteNumber}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;font-size:11pt;color:#222;padding:36px}

.biz-header{display:flex;align-items:flex-start;gap:14px;margin-bottom:18px}
.biz-logo{max-height:64px;max-width:160px;object-fit:contain}
.biz-name{font-size:14pt;font-weight:bold;color:${ACCENT}}
.biz-detail{font-size:9.5pt;color:#555;margin-top:2px;white-space:pre-line}

.head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px}
.qnum{font-size:20pt;font-weight:bold;color:${ACCENT}}
.qdate{font-size:10pt;color:#666}

.customer{padding-left:10px;margin-bottom:12px}
.cname{font-size:13pt;font-weight:bold}
.cphone{font-size:10pt;color:#555;margin-top:2px}

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
.parts th{background:${ACCENT};color:#fff;padding:5px 8px;text-align:left;font-weight:bold}
.parts th:nth-child(3),.parts th:nth-child(4),.parts th:nth-child(5){text-align:right}
.parts td{padding:4px 8px;border-bottom:1px solid #eee}
.parts tr:nth-child(even) td{background:#f9f9f9}
.r{text-align:right}

.job-meta{display:flex;flex-wrap:wrap;gap:16px;font-size:9.5pt;color:#555;margin-top:4px}
.job-sub{font-weight:bold;color:#222;margin-left:auto}

.totals{width:230px;margin-left:auto;border-collapse:collapse;font-size:10pt;margin-top:8px}
.totals td{padding:4px 8px}
.totals td:last-child{text-align:right;font-weight:bold}
.tl{color:#666;font-weight:normal}
.grand td{background:${ACCENT};color:#fff;font-size:11pt;font-weight:bold;padding:6px 8px}

@media print{body{padding:0}@page{margin:1.5cm}}
</style>
</head>
<body>
${businessHeaderHTML(businessInfo)}
<div class="head">
  <div class="qnum">Quote #${quoteNumber}</div>
  <div class="qdate">${date}</div>
</div>
<div class="customer">
  <div class="cname">${customerName || 'Customer'}</div>
  ${phone ? `<div class="cphone">${phone}</div>` : ''}
</div>
${vehicleHTML(vehicle)}
${notes && notes.trim() ? `<div class="notes-box"><div class="notes-label">Notes</div>${notes.trim()}</div>` : ''}
<hr/>
${jobsHTML(jobs, totals)}
<hr/>
${totalsHTML(totals, rates)}
</body>
</html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}
