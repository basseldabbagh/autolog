import { getAppData, saveToLocal } from "../state/store";
import type { FuelEntryComputed, FuelLog, FuelStats } from "../types";
import { escapeHtml, formatNumber, showToast } from "../utils/format";

export function getFuelLogs(): FuelLog[] {
  const appData = getAppData();
  if (!appData) return [];
  if (!Array.isArray(appData.fuelLogs)) {
    appData.fuelLogs = [];
  }
  return appData.fuelLogs;
}

const getLogMileage = (log: FuelLog): number => Number(log.mileageKm ?? log.odometerKm) || 0;

export function computeFuelStats(): FuelStats {
  const logs = [...getFuelLogs()].sort((a, b) => getLogMileage(a) - getLogMileage(b));
  if (logs.length < 2) {
    const singleTotalSpend = logs.reduce((a, b) => a + (Number(b.costMyr) || 0), 0);
    const singleTotalLiters = logs.reduce((a, b) => a + (Number(b.liters) || 0), 0);
    return {
      avgKmL: null,
      latestKmL: null,
      totalDist: 0,
      totalLiters: singleTotalLiters,
      totalSpend: singleTotalSpend,
      costPerKm: null,
      entries: logs.map((l) => ({ ...l, kmL: null, distKm: null })),
    };
  }

  let totalDist = 0;
  let totalLiters = 0;
  let totalSpend = 0;
  const entries: FuelEntryComputed[] = [];

  for (let i = 0; i < logs.length; i++) {
    const cur = logs[i];
    totalSpend += Number(cur.costMyr) || 0;
    if (i === 0) {
      entries.push({ ...cur, kmL: null, distKm: null });
      continue;
    }
    const prev = logs[i - 1];
    const dist = getLogMileage(cur) - getLogMileage(prev);
    const liters = Number(cur.liters) || 0;
    const kmL = dist > 0 && liters > 0 ? dist / liters : null;
    if (dist > 0 && liters > 0) {
      totalDist += dist;
      totalLiters += liters;
    }
    entries.push({ ...cur, kmL, distKm: dist });
  }

  const avgKmL = totalDist > 0 && totalLiters > 0 ? totalDist / totalLiters : null;
  const latestValid = [...entries].reverse().find((e) => e.kmL !== null);
  const latestKmL = latestValid ? latestValid.kmL : null;
  const costPerKm = totalDist > 0 && totalSpend > 0 ? totalSpend / totalDist : null;

  return {
    avgKmL,
    latestKmL,
    totalDist,
    totalLiters,
    totalSpend,
    costPerKm,
    entries,
  };
}

export function renderFuelSvgChart(stats: FuelStats): void {
  const container = document.getElementById("svgFuelTrendChart");
  if (!container) return;

  const validEntries = (stats.entries || []).filter((e): e is FuelEntryComputed & { kmL: number } => e.kmL !== null && !isNaN(e.kmL));

  if (validEntries.length < 2) {
    container.innerHTML = `<div class="py-8 text-center text-slate-500 text-xs font-mono">Log 2 or more fill-up receipts to generate fuel efficiency trend line.</div>`;
    return;
  }

  const width = 450;
  const height = 130;
  const padLeft = 40;
  const padRight = 20;
  const padTop = 15;
  const padBottom = 25;

  const maxVal = Math.max(20, ...validEntries.map((e) => e.kmL)) + 1;
  const minVal = Math.max(5, Math.min(10, ...validEntries.map((e) => e.kmL)) - 1);
  const targetKmL = 15.0;

  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const getY = (val: number): number => padTop + plotH - ((val - minVal) / (maxVal - minVal)) * plotH;
  const getX = (idx: number): number => padLeft + (idx / (validEntries.length - 1)) * plotW;

  const targetY = getY(targetKmL);
  const pointsStr = validEntries.map((e, idx) => `${getX(idx).toFixed(1)},${getY(e.kmL).toFixed(1)}`).join(" ");

  const dotsHtml = validEntries
    .map(
      (e, idx) => `
      <circle cx="${getX(idx).toFixed(1)}" cy="${getY(e.kmL).toFixed(1)}" r="4" fill="#10b981" stroke="#0f172a" stroke-width="2">
        <title>${escapeHtml(e.date || "")}: ${e.kmL.toFixed(1)} KM/L (${formatNumber(getLogMileage(e))} km)</title>
      </circle>
      <text x="${getX(idx).toFixed(1)}" y="${(getY(e.kmL) - 7).toFixed(1)}" text-anchor="middle" font-size="9" font-family="monospace" fill="#e2e8f0" font-weight="bold">${e.kmL.toFixed(1)}</text>
    `,
    )
    .join("");

  const xLabelsHtml = validEntries
    .map((e, idx) => {
      const dateStr = (e.date || "").slice(5);
      return `<text x="${getX(idx).toFixed(1)}" y="${height - 5}" text-anchor="middle" font-size="9" font-family="monospace" fill="#94a3b8">${escapeHtml(dateStr)}</text>`;
    })
    .join("");

  container.innerHTML = `
    <svg class="w-full h-auto overflow-visible" viewBox="0 0 ${width} ${height}">
      <line x1="${padLeft}" y1="${targetY}" x2="${width - padRight}" y2="${targetY}" stroke="#10b981" stroke-width="1.25" stroke-dasharray="4,4" opacity="0.6" />
      <text x="${width - padRight}" y="${targetY - 3}" text-anchor="end" font-size="8" font-family="monospace" fill="#10b981">Target: 15 km/L</text>
      <line x1="${padLeft}" y1="${padTop + plotH}" x2="${width - padRight}" y2="${padTop + plotH}" stroke="#334155" stroke-width="1" />
      <polyline points="${pointsStr}" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
      ${dotsHtml}
      ${xLabelsHtml}
    </svg>
  `;
}

export function renderFuelReceiptsList(stats: FuelStats): void {
  const container = document.getElementById("fuelReceiptsList");
  if (!container) return;

  const entries = [...(stats.entries || [])].reverse();

  if (!entries.length) {
    container.innerHTML = `<div class="py-6 text-center text-slate-500 text-xs">No fuel receipts recorded yet. Click "+ Log Fuel Receipt" above.</div>`;
    return;
  }

  container.innerHTML = entries
    .map((entry) => {
      const kmLBadge =
        entry.kmL !== null
          ? `<span class="px-2 py-0.5 rounded font-mono font-bold text-xs ${entry.kmL >= 14 ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800" : entry.kmL >= 12 ? "bg-amber-950/80 text-amber-300 border border-amber-800" : "bg-rose-950/80 text-rose-300 border border-rose-800"}">${entry.kmL.toFixed(1)} KM/L</span>`
          : `<span class="px-1.5 py-0.5 rounded font-mono text-[10px] text-slate-500 bg-slate-900 border border-slate-800">First Tank</span>`;

      const grade = entry.fuelGrade || entry.grade;
      return `
        <div class="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs hover:border-slate-700 transition">
          <div>
            <div class="flex items-center gap-2">
              <span class="font-mono font-bold text-white">${formatNumber(getLogMileage(entry))} km</span>
              <span class="text-[10px] text-slate-400 font-mono">${escapeHtml(entry.date || "—")}</span>
              ${grade ? `<span class="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">${escapeHtml(grade)}</span>` : ""}
            </div>
            <div class="text-[11px] text-slate-400 mt-0.5">
              ${entry.liters} L • RM ${Number(entry.costMyr || 0).toFixed(2)} ${entry.notes ? `• <span class="text-slate-300">${escapeHtml(entry.notes)}</span>` : ""}
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            ${kmLBadge}
            <button type="button" data-delete-fuel="${escapeHtml(entry.id)}" class="text-slate-500 hover:text-rose-400 p-1 transition" title="Delete fuel record">
              <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
        </div>
      `;
    })
    .join("");

  container.querySelectorAll<HTMLButtonElement>("[data-delete-fuel]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-delete-fuel");
      const appData = getAppData();
      if (id && appData?.fuelLogs) {
        appData.fuelLogs = appData.fuelLogs.filter((f) => f.id !== id);
        saveToLocal(true);
        renderFuelEfficiencySection();
        showToast("Fuel receipt deleted");
      }
    });
  });
}

export function renderFuelEfficiencySection(): void {
  const stats = computeFuelStats();
  const avgEl = document.getElementById("fuelAvgKmL");
  const latestEl = document.getElementById("fuelLatestKmL");
  const latestSubEl = document.getElementById("fuelLatestDistSub");
  const costEl = document.getElementById("fuelCostPerKm");
  const spendSubEl = document.getElementById("fuelSpendSub");
  const badgeEl = document.getElementById("fuelIgnitionBadge");
  const countBadgeEl = document.getElementById("fuelLogCountBadge");

  if (countBadgeEl) countBadgeEl.textContent = `${stats.entries.length} receipt${stats.entries.length === 1 ? "" : "s"}`;

  if (stats.avgKmL !== null) {
    if (avgEl) avgEl.textContent = `${stats.avgKmL.toFixed(1)} KM/L`;
    if (costEl) costEl.textContent = stats.costPerKm !== null ? `RM ${stats.costPerKm.toFixed(2)}` : "—";
    if (spendSubEl) spendSubEl.textContent = `Total: RM ${stats.totalSpend.toFixed(2)} (${stats.totalDist} km)`;
  } else {
    if (avgEl) avgEl.textContent = "—";
    if (costEl) costEl.textContent = "—";
    if (spendSubEl) spendSubEl.textContent = "Add 2+ receipts to calculate";
  }

  if (stats.latestKmL !== null) {
    if (latestEl) latestEl.textContent = `${stats.latestKmL.toFixed(1)} KM/L`;
    const lastEntry = [...stats.entries].reverse().find((e) => e.kmL !== null);
    if (latestSubEl && lastEntry) {
      latestSubEl.textContent = `${lastEntry.distKm} km on ${lastEntry.liters}L`;
    }
  } else {
    if (latestEl) latestEl.textContent = "—";
    if (latestSubEl) latestSubEl.textContent = "Needs consecutive fill-ups";
  }

  if (badgeEl) {
    if (stats.avgKmL === null) {
      badgeEl.innerHTML = `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700"><span>Awaiting fuel data...</span></span>`;
    } else if (stats.avgKmL >= 14.0) {
      badgeEl.innerHTML = `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800"><svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg><span>Nominal (8 Plugs Healthy)</span></span>`;
    } else if (stats.avgKmL >= 12.0) {
      badgeEl.innerHTML = `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-800"><svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg><span>Fair (Monitor Rear Coils)</span></span>`;
    } else {
      badgeEl.innerHTML = `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold bg-rose-950/80 text-rose-300 border border-rose-800"><svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg><span>Warning (Check Ignition &amp; Plugs)</span></span>`;
    }
  }

  renderFuelSvgChart(stats);
  renderFuelReceiptsList(stats);
}

export function initFuelListeners(onRenderAll: () => void): void {
  const fuelReceiptModal = document.getElementById("fuelReceiptModal");

  const openFuelReceiptModal = (): void => {
    const appData = getAppData();
    if (!appData || !appData.vehicle) {
      showToast("Please add or select a vehicle first.");
      return;
    }
    const curKm = appData.vehicle.currentMileageKm || "";
    const dateEl = document.getElementById("fuelInputDate") as HTMLInputElement | null;
    if (dateEl) dateEl.value = new Date().toISOString().slice(0, 10);
    const kmEl = document.getElementById("fuelInputMileage") as HTMLInputElement | null;
    if (kmEl) kmEl.value = String(curKm);
    const lEl = document.getElementById("fuelInputLiters") as HTMLInputElement | null;
    if (lEl) lEl.value = "";
    const cEl = document.getElementById("fuelInputCost") as HTMLInputElement | null;
    if (cEl) cEl.value = "";
    const gEl = document.getElementById("fuelInputGrade") as HTMLSelectElement | null;
    if (gEl) gEl.value = "RON 95";
    const ftEl = document.getElementById("fuelInputFullTank") as HTMLInputElement | null;
    if (ftEl) ftEl.checked = true;
    const nEl = document.getElementById("fuelInputNotes") as HTMLInputElement | null;
    if (nEl) nEl.value = "";

    fuelReceiptModal?.classList.remove("hidden");
    fuelReceiptModal?.classList.add("flex");
  };

  const closeFuelReceiptModal = (): void => {
    fuelReceiptModal?.classList.add("hidden");
    fuelReceiptModal?.classList.remove("flex");
  };

  document.getElementById("addFuelReceiptBtn")?.addEventListener("click", openFuelReceiptModal);
  document.getElementById("closeFuelReceiptModalBtn")?.addEventListener("click", closeFuelReceiptModal);
  document.getElementById("cancelFuelReceiptBtn")?.addEventListener("click", closeFuelReceiptModal);
  fuelReceiptModal?.addEventListener("click", (e) => {
    if (e.target === fuelReceiptModal) closeFuelReceiptModal();
  });

  document.getElementById("fuelReceiptForm")?.addEventListener("submit", (e: SubmitEvent) => {
    e.preventDefault();
    const appData = getAppData();
    if (!appData) return;

    const fDate = (document.getElementById("fuelInputDate") as HTMLInputElement | null)?.value || new Date().toISOString().slice(0, 10);
    const fMileage = Number((document.getElementById("fuelInputMileage") as HTMLInputElement | null)?.value) || 0;
    const fLiters = Number((document.getElementById("fuelInputLiters") as HTMLInputElement | null)?.value) || 0;
    const fCost = Number((document.getElementById("fuelInputCost") as HTMLInputElement | null)?.value) || 0;
    const fGrade = (document.getElementById("fuelInputGrade") as HTMLSelectElement | null)?.value || "RON 95";
    const fFullTank = (document.getElementById("fuelInputFullTank") as HTMLInputElement | null)?.checked ?? true;
    const fNotes = (document.getElementById("fuelInputNotes") as HTMLInputElement | null)?.value.trim() || "";

    if (fMileage <= 0 || fLiters <= 0) {
      showToast("Please enter valid mileage and liters filled.");
      return;
    }

    if (!Array.isArray(appData.fuelLogs)) appData.fuelLogs = [];
    appData.fuelLogs.push({
      id: "fuel-" + Date.now(),
      date: fDate,
      mileageKm: fMileage,
      odometerKm: fMileage,
      liters: fLiters,
      costMyr: fCost > 0 ? fCost : null,
      grade: fGrade,
      fuelGrade: fGrade,
      fullTank: fFullTank,
      station: fNotes || null,
      notes: fNotes || null,
    });

    appData.fuelLogs.sort((a, b) => getLogMileage(a) - getLogMileage(b));

    if (fMileage > (appData.vehicle.currentMileageKm || 0)) {
      appData.vehicle.currentMileageKm = fMileage;
      appData.vehicle.latestServiceDate = fDate;
    }

    saveToLocal(true);
    onRenderAll();
    closeFuelReceiptModal();
    showToast("Fuel receipt logged & saved");
  });

  document.getElementById("loadSampleFuelBtn")?.addEventListener("click", () => {
    const appData = getAppData();
    if (!appData || !appData.vehicle) return;
    appData.fuelLogs = [
      { id: "fuel-101", date: "2026-10-18", mileageKm: 195380, odometerKm: 195380, liters: 34.2, costMyr: 70.11, fullTank: true, station: "Petronas Primax 95", notes: "Highway commute" },
      { id: "fuel-102", date: "2026-10-29", mileageKm: 195910, odometerKm: 195910, liters: 33.1, costMyr: 67.85, fullTank: true, station: "Shell FuelSave 95", notes: "City driving" },
      { id: "fuel-103", date: "2026-11-07", mileageKm: 196441, odometerKm: 196441, liters: 32.8, costMyr: 67.24, fullTank: true, station: "Petronas Primax 95", notes: "Post-tire replacement & alignment run" },
    ];
    saveToLocal(true);
    renderFuelEfficiencySection();
    showToast("Loaded sample fuel logs");
  });
}
