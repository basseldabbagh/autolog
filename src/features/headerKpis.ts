import { VEHICLE_TYPE_ICONS } from "../config/profiles";
import {
  getActiveProfileKey,
  getAppData,
  getCustomProfilesMap,
  getFilteredHistory,
  setActiveProfileKey,
} from "../state/store";
import type { PeriodicScheduleItem } from "../types";
import { escapeHtml, formatCurrency, formatNumber } from "../utils/format";
import { updateDynamicSEO } from "../utils/seo";
import { updateFilterSummaryUI } from "../utils/urlFilters";
import { computeItemStatus } from "./periodicSchedule";

export function updateVehicleIcons(profileKey: string): void {
  const svgHtml = VEHICLE_TYPE_ICONS[profileKey] || VEHICLE_TYPE_ICONS["default"];
  const headerBox = document.getElementById("headerVehicleIcon");
  const selectIcon = document.getElementById("headerVehicleSelectIcon");
  if (headerBox) headerBox.innerHTML = svgHtml;
  if (selectIcon) selectIcon.innerHTML = svgHtml;
}

export function syncProfileSelectOptions(): void {
  const labelEl = document.getElementById("headerActiveCarLabel");
  const customMap = getCustomProfilesMap();
  const savedKeys = Object.keys(customMap);
  let activeProfileKey = getActiveProfileKey();

  if (activeProfileKey && !customMap[activeProfileKey]) {
    activeProfileKey = savedKeys.length > 0 ? savedKeys[0] : null;
    setActiveProfileKey(activeProfileKey);
  } else if (!activeProfileKey && savedKeys.length > 0) {
    activeProfileKey = savedKeys[0];
    setActiveProfileKey(activeProfileKey);
  }

  if (labelEl) {
    labelEl.textContent = activeProfileKey && customMap[activeProfileKey] ? customMap[activeProfileKey] : "My Garage";
  }

  updateVehicleIcons(activeProfileKey || "default");
}

export function renderOfficialDocumentsWidget(): void {
  const appData = getAppData();
  if (!appData || !appData.vehicle) return;

  const v = appData.vehicle;
  const roadTaxExpiry = v.roadTaxExpiry || (v.registrationDate ? "2027-01-20" : null);
  const insuranceExpiry = v.insuranceExpiry || (v.registrationDate ? "2027-01-20" : null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getDocDays = (expStr: string | null): number | null => {
    if (!expStr) return null;
    const expDate = new Date(expStr);
    if (isNaN(expDate.getTime())) return null;
    expDate.setHours(0, 0, 0, 0);
    return Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const rtDays = getDocDays(roadTaxExpiry);
  const insDays = getDocDays(insuranceExpiry);

  const rtDaysEl = document.getElementById("kpiRoadTaxDays");
  const rtBarEl = document.getElementById("kpiRoadTaxBar");
  const insDaysEl = document.getElementById("kpiInsuranceDays");
  const insBarEl = document.getElementById("kpiInsuranceBar");
  const docsSubEl = document.getElementById("kpiDocsSub");

  if (rtDays !== null && rtDaysEl && rtBarEl) {
    if (rtDays <= 0) {
      rtDaysEl.textContent = `${Math.abs(rtDays)}d Overdue`;
      rtDaysEl.className = "font-mono font-bold text-rose-400 text-xs";
      rtBarEl.className = "h-full bg-rose-500 rounded-full transition-all";
      rtBarEl.style.width = "100%";
    } else if (rtDays <= 30) {
      rtDaysEl.textContent = `${rtDays}d left`;
      rtDaysEl.className = "font-mono font-bold text-amber-400 text-xs";
      rtBarEl.className = "h-full bg-amber-500 rounded-full transition-all";
      rtBarEl.style.width = `${Math.max(10, Math.min(100, (rtDays / 365) * 100))}%`;
    } else {
      rtDaysEl.textContent = `${rtDays}d left`;
      rtDaysEl.className = "font-mono font-bold text-emerald-400 text-xs";
      rtBarEl.className = "h-full bg-emerald-500 rounded-full transition-all";
      rtBarEl.style.width = `${Math.max(10, Math.min(100, (rtDays / 365) * 100))}%`;
    }
  } else if (rtDaysEl) {
    rtDaysEl.textContent = "Unset";
    rtDaysEl.className = "font-mono font-medium text-slate-500 text-xs";
    if (rtBarEl) rtBarEl.style.width = "0%";
  }

  if (insDays !== null && insDaysEl && insBarEl) {
    if (insDays <= 0) {
      insDaysEl.textContent = `${Math.abs(insDays)}d Overdue`;
      insDaysEl.className = "font-mono font-bold text-rose-400 text-xs";
      insBarEl.className = "h-full bg-rose-500 rounded-full transition-all";
      insBarEl.style.width = "100%";
    } else if (insDays <= 30) {
      insDaysEl.textContent = `${insDays}d left`;
      insDaysEl.className = "font-mono font-bold text-amber-400 text-xs";
      insBarEl.className = "h-full bg-amber-500 rounded-full transition-all";
      insBarEl.style.width = `${Math.max(10, Math.min(100, (insDays / 365) * 100))}%`;
    } else {
      insDaysEl.textContent = `${insDays}d left`;
      insDaysEl.className = "font-mono font-bold text-cyan-400 text-xs";
      insBarEl.className = "h-full bg-cyan-500 rounded-full transition-all";
      insBarEl.style.width = `${Math.max(10, Math.min(100, (insDays / 365) * 100))}%`;
    }
  } else if (insDaysEl) {
    insDaysEl.textContent = "Unset";
    insDaysEl.className = "font-mono font-medium text-slate-500 text-xs";
    if (insBarEl) insBarEl.style.width = "0%";
  }

  if (docsSubEl) {
    docsSubEl.textContent = roadTaxExpiry ? `Expires: ${roadTaxExpiry}` : "Click pencil to set dates";
  }
}

export function renderHeaderAndKPIs(): void {
  const appData = getAppData();
  if (!appData || !appData.vehicle) return;

  const v = appData.vehicle;
  const curKm = Number(v.currentMileageKm) || 0;
  const currency = appData.currency || "MYR";

  const setText = (id: string, val: string): void => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setText("headerCarTitle", `${v.make || ""} ${v.model || ""}`.trim() || "Vehicle");
  setText("headerPlateBadge", v.plateNumber || "N/A");
  setText("headerEngineSub", `${v.year || ""} • ${v.engine || ""} • ${v.transmission || ""}`);
  setText("lastUpdatedChip", `Updated: ${appData.lastUpdated || "—"}`);

  const mileageInput = document.getElementById("currentMileageInput") as HTMLInputElement | null;
  if (mileageInput) mileageInput.value = String(curKm);

  setText("latestServiceDateText", v.latestServiceDate || "—");

  const sortedHist = [...(appData.maintenanceHistory || [])].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const latestRecordWithMech = sortedHist.find((r) => r.mechanic && r.mechanic.trim());
  setText("latestMechanicText", latestRecordWithMech?.mechanic || "—");

  const sched = appData.periodicSchedule || [];
  let activeCount = 0;
  let nearestItem: PeriodicScheduleItem | null = null;
  let nearestRemaining = Infinity;

  sched.forEach((item) => {
    const st = computeItemStatus(item, curKm);
    if (st.state !== "pending") {
      activeCount++;
      if (st.remainingKm !== null && st.remainingKm < nearestRemaining) {
        nearestRemaining = st.remainingKm;
        nearestItem = item;
      }
    }
  });

  const pendingCount = sched.length - activeCount;
  setText("kpiActiveCount", `${activeCount} / ${sched.length}`);
  setText("kpiActiveSub", pendingCount > 0 ? `${pendingCount} unset` : "All tracked");

  if (nearestItem) {
    const itemRef = nearestItem as PeriodicScheduleItem;
    setText("kpiNextDueKm", nearestRemaining <= 0 ? "Overdue" : `${formatNumber(nearestRemaining)} km`);
    setText("kpiNextDueItem", itemRef.name);
  } else {
    setText("kpiNextDueKm", "—");
    setText("kpiNextDueItem", "Enter km below");
  }

  const filteredHist = getFilteredHistory();
  const totalCost = filteredHist.reduce((acc, r) => acc + (Number(r.costMyr) || 0), 0);
  const totalPaid = filteredHist.reduce((acc, r) => acc + (Number(r.paidMyr) || 0), 0);
  const uniqueMechanics = new Set(
    (appData.maintenanceHistory || []).map((r) => (r.mechanic || "").trim()).filter(Boolean),
  );

  setText("kpiTotalCost", formatCurrency(totalCost, currency));
  setText(
    "kpiTotalRecords",
    `${filteredHist.length} logs • ${uniqueMechanics.size} workshop${uniqueMechanics.size === 1 ? "" : "s"}`,
  );
  setText("kpiTotalPaid", formatCurrency(totalPaid, currency));

  const diff = totalCost - totalPaid;
  setText(
    "kpiBalanceSub",
    diff > 0 ? `${formatCurrency(diff, currency)} workshop fees` : "Settled (incl. workshop fees)",
  );

  renderOfficialDocumentsWidget();
  updateFilterSummaryUI();
  updateDynamicSEO();
}

export function renderFooterSpecs(): void {
  const appData = getAppData();
  if (!appData || !appData.vehicle) return;

  const footer = document.getElementById("vehicleSpecsFooter");
  if (!footer) return;

  const v = appData.vehicle;
  footer.innerHTML = `
    <div>
      <span class="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">Vehicle</span>
      <div class="mt-0.5 text-slate-200 font-medium">${escapeHtml(v.year || "")} ${escapeHtml(v.make || "")} ${escapeHtml(v.model || "")} (${escapeHtml(v.plateNumber || "")})</div>
    </div>
    <div>
      <span class="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">Engine &amp; Number</span>
      <div class="mt-0.5 font-mono text-slate-200">${escapeHtml(v.engine || "—")} / ${escapeHtml(v.engineNumber || "—")}</div>
    </div>
    <div>
      <span class="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">Transmission &amp; Chassis</span>
      <div class="mt-0.5 font-mono text-slate-200">${escapeHtml(v.transmission || "—")} / ${escapeHtml(v.chassisNumber || "—")}</div>
    </div>
    <div>
      <span class="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">Registration / Status</span>
      <div class="mt-0.5 text-slate-200 font-medium">${escapeHtml(v.registrationDate || "—")} • Active</div>
    </div>
  `;
}
