import { formatPhone } from "./formatPhone";
import type { BusinessInfo, Customer, Payment } from "../types/index";

const ACCENT = "#1b3127";
const fmt = (n: number) => `$${Number(n).toFixed(2)}`;

const METHOD_LABEL: Record<Payment["method"], string> = {
  cash: "Cash",
  check: "Check",
  charge: "Charge / Account",
};

export function printReceipt({
  payment,
  orderId,
  invoiceId,
  orderTotal,
  paidTotal,
  businessInfo = {},
  customer = null,
}: {
  payment: Payment;
  orderId: string;
  invoiceId?: string;
  orderTotal: number;
  paidTotal: number;
  businessInfo?: Partial<BusinessInfo>;
  customer?: Customer | null;
}): void {
  const date = new Date(payment.createdAt).toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const balance = orderTotal - paidTotal;
  const logoTag = businessInfo.logo ? `<img src="${businessInfo.logo}" class="biz-logo" alt="Logo"/>` : "";
  const bizInfo = [
    businessInfo.name ? `<div class="biz-name">${businessInfo.name}</div>` : "",
    businessInfo.phone ? `<div class="biz-detail">${formatPhone(businessInfo.phone)}</div>` : "",
    businessInfo.address ? `<div class="biz-detail">${businessInfo.address.replace(/\n/g, "<br/>")}</div>` : "",
  ].join("");

  const custName = customer?.name || "";
  const custPhone = customer?.phones?.[0]?.number ? formatPhone(customer.phones[0].number) : "";

  const methodExtra =
    payment.method === "check" && payment.checkNumber
      ? `<tr><td class="tl">Check #</td><td>${payment.checkNumber}</td></tr>`
      : payment.method === "charge"
        ? [
            payment.poNumber ? `<tr><td class="tl">Customer P.O.</td><td>${payment.poNumber}</td></tr>` : "",
            payment.billedAt ? `<tr><td class="tl">Billed</td><td>${new Date(payment.billedAt).toLocaleDateString("en-US")}</td></tr>` : "",
            payment.paidAt ? `<tr><td class="tl">Paid</td><td>${new Date(payment.paidAt).toLocaleDateString("en-US")}</td></tr>` : "",
          ].join("")
        : "";

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Receipt — Payment ${payment.id.slice(0, 8)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;font-size:11pt;color:#222;padding:36px;max-width:520px;margin:0 auto}
.top{display:flex;justify-content:space-between;align-items:flex-start;gap:18px;margin-bottom:18px}
.biz-logo{max-height:60px;max-width:150px;object-fit:contain}
.biz-name{font-size:14pt;font-weight:bold;color:${ACCENT}}
.biz-detail{font-size:9.5pt;color:#555;margin-top:2px;white-space:pre-line}
.doc-title{text-align:right}
.doc-title h1{font-size:16pt;color:${ACCENT};letter-spacing:.5px}
.doc-title .sub{font-size:9.5pt;color:#666;margin-top:2px}
.deposit-flag{display:inline-block;margin-top:4px;font-size:8.5pt;font-weight:bold;text-transform:uppercase;letter-spacing:.5px;color:#92400e;background:#fef3c7;border-radius:3px;padding:2px 6px}
.meta{display:flex;justify-content:space-between;gap:16px;font-size:9.5pt;color:#555;border-top:1px solid #ddd;border-bottom:1px solid #ddd;padding:10px 0;margin-bottom:14px}
.meta .label{font-size:8pt;text-transform:uppercase;letter-spacing:.5px;color:#999}
table{width:100%;border-collapse:collapse;font-size:10.5pt}
td{padding:6px 4px;border-bottom:1px solid #eee}
td:last-child{text-align:right;font-weight:bold}
.tl{color:#555;font-weight:normal}
.amount td{font-size:13pt;border-top:2px solid #222;border-bottom:2px solid #222;color:${ACCENT}}
.balance td{font-weight:bold}
.thanks{margin-top:24px;text-align:center;font-style:italic;color:#555;font-size:10pt}
@media print{body{padding:0}@page{margin:1.5cm}}
</style>
</head>
<body>
<div class="top">
  <div>${logoTag}${bizInfo}</div>
  <div class="doc-title">
    <h1>RECEIPT</h1>
    <div class="sub">${date}</div>
    ${payment.isDeposit ? `<div class="deposit-flag">Deposit</div>` : ""}
  </div>
</div>
<div class="meta">
  <div><div class="label">Receipt #</div>${payment.id.slice(0, 8).toUpperCase()}</div>
  <div><div class="label">Order #</div>${orderId}${invoiceId ? ` · Inv #${invoiceId}` : ""}</div>
  <div style="text-align:right"><div class="label">Customer</div>${custName}${custPhone ? `<br/>${custPhone}` : ""}</div>
</div>
<table>
  <tr><td class="tl">Payment Method</td><td>${METHOD_LABEL[payment.method]}</td></tr>
  ${methodExtra}
  <tr class="amount"><td>Amount Paid</td><td>${fmt(payment.amount)}</td></tr>
  <tr><td class="tl">Order Total</td><td>${fmt(orderTotal)}</td></tr>
  <tr><td class="tl">Total Paid To Date</td><td>${fmt(paidTotal)}</td></tr>
  <tr class="balance"><td>${balance > 0.005 ? "Balance Due" : balance < -0.005 ? "Credit" : "Balance"}</td><td>${fmt(Math.abs(balance))}</td></tr>
</table>
<div class="thanks">${businessInfo.printMessage?.trim() || "Thank you for your business!"}</div>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}
