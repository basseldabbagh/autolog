import {
  getAppData,
  getExpenseDonutMode,
  getFilteredHistory,
  setExpenseDonutMode,
} from "../state/store";
import { escapeHtml, formatCurrency, formatNumber, getThemeColor } from "../utils/format";
import { computeItemStatus } from "./periodicSchedule";

export function renderCountdownSvg(): void {
  const appData = getAppData();
  const container = document.getElementById("svgCountdownChart");
  if (!appData || !container) return;

  const curKm = Number(appData.vehicle?.currentMileageKm) || 0;
  const sched = appData.periodicSchedule || [];
  const maxInterval = Math.max(...sched.map((s) => Number(s.intervalKm) || 10000), 80000);

  const goodColor = getThemeColor("--color-status-good", "#10b981");
  const soonColor = getThemeColor("--color-status-warning", "#f59e0b");
  const overdueColor = getThemeColor("--color-status-critical", "#f43f5e");
  const pendingColor = getThemeColor("--color-status-pending", "#64748b");

  const rowsHtml = sched
    .map((item) => {
      const st = computeItemStatus(item, curKm);
      let widthPct = 0;
      let fillHex = pendingColor;
      let rightLabel = "Unset";

      if (st.state !== "pending" && st.remainingKm !== null) {
        widthPct = Math.max(4, Math.min(100, (Math.max(0, st.remainingKm) / maxInterval) * 100));
        rightLabel =
          st.remainingKm <= 0
            ? `Overdue (${formatNumber(Math.abs(st.remainingKm))} km)`
            : `${formatNumber(st.remainingKm)} km`;
        fillHex = st.state === "overdue" ? overdueColor : st.state === "soon" ? soonColor : goodColor;
      }

      return `
        <div class="space-y-1">
          <div class="flex items-center justify-between text-xs">
            <span class="font-medium text-slate-200 truncate pe-2">${escapeHtml(item.name)}</span>
            <span class="font-mono text-[11px] text-slate-400 shrink-0">${rightLabel}</span>
          </div>
          <svg class="w-full h-3 rounded-lg bg-slate-950 border border-slate-800/80 overflow-hidden" viewBox="0 0 400 12" preserveAspectRatio="none">
            <rect x="0" y="0" width="${(widthPct * 4).toFixed(1)}" height="12" rx="3" fill="${fillHex}" />
          </svg>
        </div>
      `;
    })
    .join("");

  container.innerHTML = `<div class="space-y-2">${rowsHtml}</div>`;
}

export function renderExpenseDonutSvg(): void {
  const appData = getAppData();
  const container = document.getElementById("svgExpenseDonut");
  if (!appData || !container) return;

  const expenseDonutMode = getExpenseDonutMode();
  const hist = getFilteredHistory();
  const totalsByGroup: Record<string, number> = {};
  const countByGroup: Record<string, number> = {};
  let grandTotal = 0;

  hist.forEach((r) => {
    const cost = Number(r.costMyr) || 0;
    const groupKey =
      expenseDonutMode === "mechanic"
        ? (r.mechanic && r.mechanic.trim()) || "Unspecified Workshop"
        : r.category || "Workshop Fees";

    if (cost > 0) {
      totalsByGroup[groupKey] = (totalsByGroup[groupKey] || 0) + cost;
      grandTotal += cost;
    }
    countByGroup[groupKey] = (countByGroup[groupKey] || 0) + 1;
  });

  const uniqueMechanics = new Set(
    (appData.maintenanceHistory || []).map((r) => (r.mechanic || "").trim()).filter(Boolean),
  );

  const footerTotalEl = document.getElementById("donutFooterTotal");
  if (footerTotalEl) {
    footerTotalEl.textContent = `Total: ${formatCurrency(grandTotal, appData.currency)} • ${uniqueMechanics.size} Workshop${uniqueMechanics.size === 1 ? "" : "s"}`;
  }

  const palette = [
    getThemeColor("--color-brand-primary", "#6366f1"),
    getThemeColor("--color-status-good", "#10b981"),
    getThemeColor("--color-status-warning", "#f59e0b"),
    getThemeColor("--color-accent-cyan", "#06b6d4"),
    "#ec4899",
    "#8b5cf6",
    getThemeColor("--color-status-critical", "#f43f5e"),
    "#14b8a6",
    "#f97316",
  ];
  const entries = Object.entries(totalsByGroup).sort((a, b) => b[1] - a[1]);

  if (!entries.length) {
    container.innerHTML = `<div class="text-xs text-slate-500 py-8">No costs logged yet.</div>`;
    return;
  }

  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPct = 0;

  const circlesSvg = entries
    .map(([, amount], idx) => {
      const pct = amount / grandTotal;
      const strokeLen = pct * circumference;
      const dashArray = `${strokeLen.toFixed(2)} ${(circumference - strokeLen).toFixed(2)}`;
      const dashOffset = -(accumulatedPct * circumference).toFixed(2);
      accumulatedPct += pct;
      const color = palette[idx % palette.length];
      return `<circle cx="80" cy="80" r="${radius}" fill="transparent" stroke="${color}" stroke-width="20" stroke-dasharray="${dashArray}" stroke-dashoffset="${dashOffset}" />`;
    })
    .join("");

  const legendHtml = entries
    .map(([group, amount], idx) => {
      const pct = ((amount / grandTotal) * 100).toFixed(0);
      const count = countByGroup[group] || 0;
      const countLabel =
        expenseDonutMode === "mechanic"
          ? `<span class="text-slate-400 text-[10px]">(${count} ${count === 1 ? "service" : "services"})</span>`
          : "";
      const color = palette[idx % palette.length];
      return `
        <div class="flex items-center justify-between gap-2 text-xs py-1">
          <div class="flex items-center gap-2 truncate">
            <span class="w-2.5 h-2.5 rounded-sm shrink-0" style="background-color:${color}"></span>
            <span class="text-slate-200 truncate" title="${escapeHtml(group)}">${escapeHtml(group)} ${countLabel}</span>
          </div>
          <div class="font-mono text-slate-300 shrink-0 text-end">
            ${formatCurrency(amount, appData.currency)} <span class="text-slate-500 text-[10px]">(${pct}%)</span>
          </div>
        </div>
      `;
    })
    .join("");

  container.innerHTML = `
    <div class="relative w-40 h-40 shrink-0 flex items-center justify-center">
      <svg class="w-40 h-40 -rotate-90" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r="${radius}" fill="transparent" stroke="#1e293b" stroke-width="20" />
        ${circlesSvg}
      </svg>
      <div class="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
        <span class="text-[10px] uppercase tracking-wider text-slate-400">Total</span>
        <span class="text-xs font-mono font-bold text-white mt-0.5">${formatCurrency(grandTotal, appData.currency)}</span>
      </div>
    </div>
    <div class="flex-1 w-full divide-y divide-slate-800/60 max-h-48 overflow-y-auto">${legendHtml}</div>
  `;
}

export function renderSvgCharts(): void {
  const appData = getAppData();
  if (!appData || !appData.vehicle) return;
  renderCountdownSvg();
  renderExpenseDonutSvg();
}

export function initChartListeners(): void {
  document.getElementById("donutModeCatBtn")?.addEventListener("click", () => {
    setExpenseDonutMode("category");
    const catBtn = document.getElementById("donutModeCatBtn");
    const mechBtn = document.getElementById("donutModeMechBtn");
    if (catBtn) catBtn.className = "px-2 py-0.5 rounded-md font-medium transition text-white bg-indigo-600";
    if (mechBtn) mechBtn.className = "px-2 py-0.5 rounded-md font-medium transition text-slate-400 hover:text-slate-200";
    renderExpenseDonutSvg();
  });

  document.getElementById("donutModeMechBtn")?.addEventListener("click", () => {
    setExpenseDonutMode("mechanic");
    const catBtn = document.getElementById("donutModeCatBtn");
    const mechBtn = document.getElementById("donutModeMechBtn");
    if (mechBtn) mechBtn.className = "px-2 py-0.5 rounded-md font-medium transition text-white bg-indigo-600";
    if (catBtn) catBtn.className = "px-2 py-0.5 rounded-md font-medium transition text-slate-400 hover:text-slate-200";
    renderExpenseDonutSvg();
  });
}
