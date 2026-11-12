import {
  getAppData,
  getFilteredHistory,
  getGlobalCategory,
  getGlobalDateEnd,
  getGlobalDatePreset,
  getGlobalDateStart,
} from "../state/store";
import { escapeHtml, formatCurrency, formatNumber, showToast } from "../utils/format";
import { computeItemStatus } from "./periodicSchedule";

export function openReportInNewTab(html: string): void {
  const win = window.open("", "_blank");
  if (win) {
    win.document.open();
    win.document.write(html);
    win.document.close();
  } else {
    alert("Please allow pop-ups to open the A4 Report in a new tab.");
  }
}

export function generateA4StatusReportTab(): void {
  const appData = getAppData();
  if (!appData || !appData.vehicle) {
    showToast("Please add or select a vehicle first");
    return;
  }

  const v = appData.vehicle;
  const curKm = Number(v.currentMileageKm) || 0;
  const sched = appData.periodicSchedule || [];

  let goodCount = 0;
  let soonCount = 0;
  let overdueCount = 0;

  sched.forEach((item) => {
    const st = computeItemStatus(item, curKm);
    if (st.state === "good") goodCount++;
    else if (st.state === "soon") soonCount++;
    else if (st.state === "overdue") overdueCount++;
  });

  const overallCondition =
    overdueCount > 0
      ? { label: "ACTION REQUIRED (OVERDUE ITEMS)", color: "#dc2626", bg: "#fef2f2" }
      : soonCount > 0
        ? { label: "FAIR — UPCOMING SERVICE SOON", color: "#d97706", bg: "#fffbeb" }
        : { label: "EXCELLENT — UP TO DATE", color: "#059669", bg: "#ecfdf5" };

  const schedRowsHtml = sched
    .map((item) => {
      const st = computeItemStatus(item, curKm);
      const statusColor =
        st.state === "overdue"
          ? "#dc2626"
          : st.state === "soon"
            ? "#d97706"
            : st.state === "good"
              ? "#059669"
              : "#64748b";
      const oemText = item.oemPartNumber
        ? `<div style="font-size:10px;font-family:monospace;color:#0284c7;font-weight:600;">OEM: ${escapeHtml(item.oemPartNumber)}</div>`
        : "";
      const intervalText = `${formatNumber(item.intervalKm)} km${item.intervalMonths ? ` / ${item.intervalMonths} mo` : ""}`;
      const lastText = `${item.lastServicedKm ? formatNumber(item.lastServicedKm) + " km" : "—"}${item.lastServicedDate ? `<div style="font-size:10px;color:#64748b;">${escapeHtml(item.lastServicedDate)}</div>` : ""}`;
      const nextDueText = `${st.nextDueKm ? formatNumber(st.nextDueKm) + " km" : "—"}${st.nextDueDate ? `<div style="font-size:10px;color:#475569;font-weight:600;">${escapeHtml(st.nextDueDate)}</div>` : ""}`;
      return `
        <tr>
          <td><strong>${escapeHtml(item.name)}</strong> <span style="color:#64748b;font-size:10px;">(${escapeHtml(item.category || "Part")})</span>${oemText}</td>
          <td style="font-family:monospace;">${intervalText}</td>
          <td style="font-family:monospace;">${lastText}</td>
          <td style="font-family:monospace;font-weight:700;">${nextDueText}</td>
          <td style="font-family:monospace;">${formatCurrency(item.estimatedCostMyr, appData.currency)}</td>
          <td><span style="color:${statusColor};font-weight:700;font-size:11px;">${escapeHtml(st.label)}</span></td>
        </tr>
      `;
    })
    .join("");

  const reportHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(v.year || "")} ${escapeHtml(v.make || "")} ${escapeHtml(v.model || "")} (${escapeHtml(v.plateNumber || "")}) — Vehicle Status & Condition Report</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Inter, system-ui, -apple-system, sans-serif; color: #0f172a; background: #f1f5f9; padding: 24px; font-size: 12px; line-height: 1.4; }
    .page { max-width: 210mm; margin: 0 auto; background: #ffffff; padding: 14mm; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); }
    .toolbar { max-width: 210mm; margin: 0 auto 14px auto; display: flex; justify-content: space-between; align-items: center; background: #0f172a; color: #fff; padding: 10px 16px; border-radius: 8px; }
    .btn { background: #4f46e5; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 12px; }
    .btn:hover { background: #4338ca; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 14px; }
    .title { font-size: 20px; font-weight: 800; letter-spacing: -0.3px; }
    .subtitle { color: #475569; font-size: 12px; margin-top: 2px; }
    .condition-badge { display: inline-block; padding: 6px 12px; border-radius: 6px; font-weight: 800; font-size: 11px; background: ${overallCondition.bg}; color: ${overallCondition.color}; border: 1px solid ${overallCondition.color}; }
    .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
    .stat-box { border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px; background: #f8fafc; }
    .stat-label { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700; }
    .stat-val { font-size: 15px; font-weight: 800; font-family: monospace; margin-top: 2px; color: #0f172a; }
    h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #0f172a; margin: 14px 0 8px 0; border-left: 3px solid #4f46e5; padding-left: 8px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 11px; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #f1f5f9; font-weight: 700; color: #334155; font-size: 10px; text-transform: uppercase; }
    tr:nth-child(even) td { background: #f8fafc; }
    .alert-box { background: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; padding: 10px 14px; border-radius: 6px; margin-bottom: 14px; font-size: 11px; color: #92400e; }
    .alert-box.danger { background: #fef2f2; border: 1px solid #fee2e2; border-left: 4px solid #ef4444; color: #991b1b; }
    .footer { margin-top: 16px; padding-top: 10px; border-top: 1px solid #cbd5e1; display: flex; justify-content: space-between; font-size: 10px; color: #64748b; }
    @media print {
      body { background: #fff; padding: 0; }
      .page { box-shadow: none; padding: 0; max-width: 100%; }
      .toolbar { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <span><strong>Vehicle Status &amp; Condition Report</strong> — Ready to Save as A4 PDF</span>
    <button class="btn" onclick="window.print()" style="display:inline-flex;align-items:center;gap:6px;"><svg style="width:14px;height:14px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>Print / Save as A4 PDF</button>
  </div>
  <div class="page">
    <div class="header">
      <div>
        <div class="title">${escapeHtml(v.year || "")} ${escapeHtml(v.make || "")} ${escapeHtml(v.model || "")} — ${escapeHtml(v.plateNumber || "NO PLATE")}</div>
        <div class="subtitle">${escapeHtml(v.engine || "")} • ${escapeHtml(v.transmission || "")} • Chassis: ${escapeHtml(v.chassisNumber || "—")} • Engine No: ${escapeHtml(v.engineNumber || "—")}</div>
        <div style="font-size:11px;color:#475569;margin-top:3px;">Road Tax Expiry: <strong>${escapeHtml(v.roadTaxExpiry || "—")}</strong> • Insurance Expiry: <strong>${escapeHtml(v.insuranceExpiry || "—")}</strong></div>
      </div>
      <div style="text-align:right;">
        <div class="condition-badge">${overallCondition.label}</div>
        <div style="font-size:10px;color:#64748b;margin-top:4px;">Report Date: ${escapeHtml(appData.lastUpdated || new Date().toISOString().slice(0, 10))}</div>
      </div>
    </div>

    <div class="grid-4">
      <div class="stat-box">
        <div class="stat-label">Current Odometer</div>
        <div class="stat-val">${formatNumber(curKm)} km</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Tracked Items</div>
        <div class="stat-val">${sched.length} Total</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Schedule Health</div>
        <div class="stat-val">${goodCount} OK / ${soonCount} Soon</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Overdue Alerts</div>
        <div class="stat-val" style="color:${overdueCount > 0 ? "#dc2626" : "#059669"};">${overdueCount} Overdue</div>
      </div>
    </div>

    ${overdueCount > 0 ? `<div class="alert-box danger"><strong>Attention Required:</strong> You have ${overdueCount} periodic maintenance item(s) currently overdue for service. Immediate inspection or replacement is recommended.</div>` : soonCount > 0 ? `<div class="alert-box"><strong>Upcoming Maintenance:</strong> You have ${soonCount} item(s) due for service within the next 1,000 km or upcoming period.</div>` : ""}

    <h2>Periodic Maintenance &amp; Replacement Schedule Status (${sched.length} Items)</h2>
    <table>
      <thead>
        <tr>
          <th>Item / Service Name &amp; OEM Part</th>
          <th>Interval</th>
          <th>Last Serviced</th>
          <th>Next Service Due</th>
          <th>Est. Cost</th>
          <th>Condition Status</th>
        </tr>
      </thead>
      <tbody>${schedRowsHtml || '<tr><td colspan="6">No periodic schedule items configured.</td></tr>'}</tbody>
    </table>

    <div class="footer">
      <span>Vehicle: ${escapeHtml(v.year || "")} ${escapeHtml(v.make || "")} ${escapeHtml(v.model || "")} (${escapeHtml(v.plateNumber || "")})</span>
      <span>MotoFolio Private Client-Side Vehicle Report • ${new Date().toLocaleDateString()}</span>
    </div>
  </div>
</body>
</html>`;

  openReportInNewTab(reportHtml);
}

export function generateA4HistoryReportTab(): void {
  const appData = getAppData();
  if (!appData || !appData.vehicle) {
    showToast("Please add or select a vehicle first");
    return;
  }

  const v = appData.vehicle;
  const curKm = Number(v.currentMileageKm) || 0;

  const filteredHist = getFilteredHistory();
  const searchTerm = ((document.getElementById("historySearchInput") as HTMLInputElement | null)?.value || "")
    .toLowerCase()
    .trim();
  const finalHist = searchTerm
    ? filteredHist.filter(
        (r) =>
          (r.title || "").toLowerCase().includes(searchTerm) ||
          (r.mechanic || "").toLowerCase().includes(searchTerm) ||
          (r.category || "").toLowerCase().includes(searchTerm) ||
          (r.notes || "").toLowerCase().includes(searchTerm),
      )
    : filteredHist;

  const sortedHist = [...finalHist].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  let totalCost = 0;
  let totalPaid = 0;
  sortedHist.forEach((r) => {
    totalCost += Number(r.costMyr) || 0;
    totalPaid += Number(r.paidMyr) || 0;
  });

  const globalDatePreset = getGlobalDatePreset();
  let filterPresetLabel = "This Year (" + new Date().getFullYear() + ")";
  if (globalDatePreset === "all-time") filterPresetLabel = "All Time";
  else if (globalDatePreset === "last-year") filterPresetLabel = "Last Year (" + (new Date().getFullYear() - 1) + ")";
  else if (globalDatePreset === "last-6m") filterPresetLabel = "Last 6 Months";
  else if (globalDatePreset === "custom") {
    filterPresetLabel = `${getGlobalDateStart() || "Start"} to ${getGlobalDateEnd() || "End"}`;
  }

  const globalCategory = getGlobalCategory();
  const filterCategoryLabel = globalCategory === "all" ? "All Categories" : globalCategory;
  const filterSearchLabel = searchTerm ? `Search: "${searchTerm}"` : "";
  const filterSummaryStr = [filterPresetLabel, filterCategoryLabel, filterSearchLabel].filter(Boolean).join(" • ");

  const histRowsHtml = sortedHist
    .map(
      (r) => `
        <tr>
          <td style="font-family:monospace;white-space:nowrap;">${escapeHtml(r.date || "—")}</td>
          <td style="font-family:monospace;white-space:nowrap;">${r.mileageKm ? formatNumber(r.mileageKm) + " km" : "—"}</td>
          <td>
            <strong>${escapeHtml(r.title)}</strong>
            ${r.notes ? `<div style="color:#475569;font-size:10px;margin-top:2px;">${escapeHtml(r.notes)}</div>` : ""}
          </td>
          <td>${escapeHtml(r.mechanic || "—")}</td>
          <td><span style="display:inline-block;padding:2px 6px;border-radius:4px;background:#f1f5f9;color:#334155;font-size:10px;font-weight:600;">${escapeHtml(r.category || "General")}</span></td>
          <td style="font-family:monospace;font-weight:700;white-space:nowrap;text-align:right;">${formatCurrency(r.costMyr, appData.currency)}</td>
        </tr>
      `,
    )
    .join("");

  const reportHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(v.year || "")} ${escapeHtml(v.make || "")} ${escapeHtml(v.model || "")} (${escapeHtml(v.plateNumber || "")}) — Service History & Expense Report</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Inter, system-ui, -apple-system, sans-serif; color: #0f172a; background: #f1f5f9; padding: 24px; font-size: 12px; line-height: 1.4; }
    .page { max-width: 210mm; margin: 0 auto; background: #ffffff; padding: 14mm; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); }
    .toolbar { max-width: 210mm; margin: 0 auto 14px auto; display: flex; justify-content: space-between; align-items: center; background: #0f172a; color: #fff; padding: 10px 16px; border-radius: 8px; }
    .btn { background: #059669; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 12px; }
    .btn:hover { background: #047857; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 14px; }
    .title { font-size: 20px; font-weight: 800; letter-spacing: -0.3px; }
    .subtitle { color: #475569; font-size: 12px; margin-top: 2px; }
    .filter-badge { display: inline-block; padding: 6px 12px; border-radius: 6px; font-weight: 600; font-size: 11px; background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; }
    .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
    .stat-box { border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px; background: #f8fafc; }
    .stat-label { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700; }
    .stat-val { font-size: 15px; font-weight: 800; font-family: monospace; margin-top: 2px; color: #0f172a; }
    h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #0f172a; margin: 14px 0 8px 0; border-left: 3px solid #059669; padding-left: 8px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 11px; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #f1f5f9; font-weight: 700; color: #334155; font-size: 10px; text-transform: uppercase; }
    tr:nth-child(even) td { background: #f8fafc; }
    .footer { margin-top: 16px; padding-top: 10px; border-top: 1px solid #cbd5e1; display: flex; justify-content: space-between; font-size: 10px; color: #64748b; }
    @media print {
      body { background: #fff; padding: 0; }
      .page { box-shadow: none; padding: 0; max-width: 100%; }
      .toolbar { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <span><strong>Workshop Service History &amp; Expense Report</strong> — Ready to Save as A4 PDF</span>
    <button class="btn" onclick="window.print()" style="display:inline-flex;align-items:center;gap:6px;"><svg style="width:14px;height:14px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>Print / Save as A4 PDF</button>
  </div>
  <div class="page">
    <div class="header">
      <div>
        <div class="title">${escapeHtml(v.year || "")} ${escapeHtml(v.make || "")} ${escapeHtml(v.model || "")} — ${escapeHtml(v.plateNumber || "NO PLATE")}</div>
        <div class="subtitle">${escapeHtml(v.engine || "")} • ${escapeHtml(v.transmission || "")} • Current Mileage: ${formatNumber(curKm)} km</div>
        <div style="font-size:11px;color:#475569;margin-top:3px;">Filter Applied: <strong>${escapeHtml(filterSummaryStr)}</strong></div>
      </div>
      <div style="text-align:right;">
        <div class="filter-badge">${sortedHist.length} Records Filtered</div>
        <div style="font-size:10px;color:#64748b;margin-top:4px;">Report Date: ${escapeHtml(appData.lastUpdated || new Date().toISOString().slice(0, 10))}</div>
      </div>
    </div>

    <div class="grid-4">
      <div class="stat-box">
        <div class="stat-label">Filtered Records</div>
        <div class="stat-val">${sortedHist.length}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Total Expense</div>
        <div class="stat-val" style="color:#4f46e5;">${formatCurrency(totalCost, appData.currency)}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Total Settled</div>
        <div class="stat-val" style="color:#059669;">${formatCurrency(totalPaid, appData.currency)}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Balance Pending</div>
        <div class="stat-val" style="color:${totalCost - totalPaid > 0 ? "#dc2626" : "#64748b"};">${formatCurrency(Math.max(0, totalCost - totalPaid), appData.currency)}</div>
      </div>
    </div>

    <h2>Workshop Service &amp; Maintenance Ledger (${sortedHist.length} Records)</h2>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Mileage</th>
          <th>Service / Repair Description &amp; Notes</th>
          <th>Workshop / Mechanic</th>
          <th>Category</th>
          <th style="text-align:right;">Cost</th>
        </tr>
      </thead>
      <tbody>${histRowsHtml || '<tr><td colspan="6" style="text-align:center;padding:16px;color:#64748b;">No maintenance records matched the selected filters.</td></tr>'}</tbody>
    </table>

    <div class="footer">
      <span>Vehicle: ${escapeHtml(v.year || "")} ${escapeHtml(v.make || "")} ${escapeHtml(v.model || "")} (${escapeHtml(v.plateNumber || "")})</span>
      <span>MotoFolio Private Client-Side Vehicle Report • ${new Date().toLocaleDateString()}</span>
    </div>
  </div>
</body>
</html>`;

  openReportInNewTab(reportHtml);
}

export function initReportListeners(): void {
  document.getElementById("openStatusReportBtn")?.addEventListener("click", generateA4StatusReportTab);
  document.getElementById("openStatusReportInlineBtn")?.addEventListener("click", generateA4StatusReportTab);
  document.getElementById("openHistoryReportBtn")?.addEventListener("click", generateA4HistoryReportTab);
  document.getElementById("openHistoryReportInlineBtn")?.addEventListener("click", generateA4HistoryReportTab);
  document.getElementById("openA4ReportBtn")?.addEventListener("click", generateA4StatusReportTab);
}
