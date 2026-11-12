import { getAppData, getCurrentScheduleFilter, saveToLocal, setCurrentScheduleFilter } from "../state/store";
import type { ItemConditionState, ItemStatusResult, PeriodicScheduleItem, ScheduleFilter } from "../types";
import { escapeHtml, formatNumber, getSelectOrOtherVal, showToast, wireSelectOther } from "../utils/format";
import { syncFiltersToUrl } from "../utils/urlFilters";

export function computeItemStatus(item: PeriodicScheduleItem, currentMileage: number): ItemStatusResult {
  const lastKm = item.lastServicedKm;
  const intervalKm = Number(item.intervalKm) || 10000;
  const intervalMonths = item.intervalMonths
    ? Number(item.intervalMonths)
    : item.interval_months
      ? Number(item.interval_months)
      : null;
  const lastDateStr = item.lastServicedDate || item.last_serviced_date || null;

  const hasKm = lastKm !== null && lastKm !== undefined && String(lastKm) !== "" && !isNaN(Number(lastKm));
  const hasDate = Boolean(lastDateStr && intervalMonths);

  if (!hasKm && !hasDate) {
    return {
      state: "pending",
      label: "Unset",
      nextDueKm: null,
      nextDueDate: null,
      remainingKm: null,
      daysRemaining: null,
      drivenKm: null,
      progressPct: 0,
      badgeClass: "badge-status-pending",
      barColor: "bar-status-pending",
      iconSvg: `<svg class="w-3 h-3 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
      dueTrigger: "none",
    };
  }

  let nextDueKm: number | null = null;
  let drivenKm: number | null = null;
  let remainingKm: number | null = null;
  let kmPct = 0;
  let kmState: ItemConditionState = "good";

  if (hasKm) {
    nextDueKm = Number(lastKm) + intervalKm;
    drivenKm = Math.max(0, Number(currentMileage) - Number(lastKm));
    remainingKm = nextDueKm - Number(currentMileage);
    kmPct = Math.min(100, Math.max(0, (drivenKm / intervalKm) * 100));

    if (remainingKm <= 0) kmState = "overdue";
    else if (remainingKm <= Math.min(1500, intervalKm * 0.2) || remainingKm <= 1000) kmState = "soon";
    else kmState = "good";
  }

  let nextDueDate: string | null = null;
  let daysRemaining: number | null = null;
  let timePct = 0;
  let timeState: ItemConditionState = "good";

  if (hasDate && lastDateStr && intervalMonths) {
    const lastDate = new Date(lastDateStr);
    if (!isNaN(lastDate.getTime())) {
      const d = new Date(lastDate);
      d.setMonth(d.getMonth() + intervalMonths);
      nextDueDate = d.toISOString().slice(0, 10);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const due = new Date(d);
      due.setHours(0, 0, 0, 0);

      daysRemaining = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const totalDays = intervalMonths * 30.4375;
      const elapsedDays = Math.max(0, totalDays - daysRemaining);
      timePct = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));

      if (daysRemaining <= 0) timeState = "overdue";
      else if (daysRemaining <= 30) timeState = "soon";
      else timeState = "good";
    }
  }

  let state: ItemConditionState = "good";
  let label = "";
  let dueTrigger: ItemStatusResult["dueTrigger"] = "km";

  if (kmState === "overdue" || timeState === "overdue") {
    state = "overdue";
    if (kmState === "overdue" && timeState === "overdue" && remainingKm !== null && daysRemaining !== null) {
      label = `Overdue (${formatNumber(Math.abs(remainingKm))} km & ${Math.abs(daysRemaining)}d)`;
      dueTrigger = "both";
    } else if (timeState === "overdue" && daysRemaining !== null) {
      label = `Overdue ${Math.abs(daysRemaining)}d ago`;
      dueTrigger = "date";
    } else if (remainingKm !== null) {
      label = `Overdue ${formatNumber(Math.abs(remainingKm))} km`;
      dueTrigger = "km";
    }
  } else if (kmState === "soon" || timeState === "soon") {
    state = "soon";
    if (kmState === "soon" && timeState === "soon" && remainingKm !== null && daysRemaining !== null) {
      label = `Due Soon (${formatNumber(remainingKm)} km / ${daysRemaining}d)`;
      dueTrigger = "both";
    } else if (timeState === "soon" && daysRemaining !== null) {
      label = `Due in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}`;
      dueTrigger = "date";
    } else if (remainingKm !== null) {
      label = `Due in ${formatNumber(remainingKm)} km`;
      dueTrigger = "km";
    }
  } else {
    state = "good";
    if (remainingKm !== null && daysRemaining !== null) {
      label = `${formatNumber(remainingKm)} km / ${daysRemaining}d left`;
    } else if (remainingKm !== null) {
      label = `${formatNumber(remainingKm)} km left`;
    } else if (daysRemaining !== null) {
      label = `${daysRemaining} days left`;
    } else {
      label = "Good";
    }
  }

  const progressPct = Math.min(
    100,
    Math.max(state === "good" ? 6 : state === "soon" ? 8 : 100, Math.max(kmPct, timePct)),
  );

  const badgeClass =
    state === "overdue"
      ? "badge-status-critical"
      : state === "soon"
        ? "badge-status-warning"
        : "badge-status-good";

  const barColor =
    state === "overdue"
      ? "bar-status-critical"
      : state === "soon"
        ? "bar-status-warning"
        : "bar-status-good";

  const iconSvg =
    state === "overdue"
      ? `<svg class="w-3 h-3 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`
      : state === "soon"
        ? `<svg class="w-3 h-3 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`
        : `<svg class="w-3 h-3 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;

  return {
    state,
    label,
    nextDueKm,
    nextDueDate,
    remainingKm,
    daysRemaining,
    drivenKm,
    progressPct,
    badgeClass,
    barColor,
    iconSvg,
    dueTrigger,
  };
}

export function renderPeriodicTable(onAfterMutate: () => void): void {
  const appData = getAppData();
  if (!appData || !appData.vehicle) return;

  const tbody = document.getElementById("periodicTableBody");
  if (!tbody) return;

  const curKm = Number(appData.vehicle.currentMileageKm) || 0;
  const sched = appData.periodicSchedule || [];
  const filter = getCurrentScheduleFilter();

  const filtered = sched.filter((item) => {
    const st = computeItemStatus(item, curKm);
    if (filter === "active") return st.state !== "pending";
    if (filter === "pending") return st.state === "pending";
    if (filter === "due") return st.state === "overdue" || st.state === "soon";
    return true;
  });

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400 text-xs">No items in this filter.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered
    .map((item, idx) => {
      const st = computeItemStatus(item, curKm);
      const lastKmVal = item.lastServicedKm !== null && item.lastServicedKm !== undefined ? item.lastServicedKm : "";
      const nextDueDisplay =
        st.nextDueKm !== null
          ? `<div class="font-mono font-bold text-sm text-white">${formatNumber(st.nextDueKm)} <span class="text-xs font-normal text-slate-400">km</span></div>`
          : `<span class="text-xs text-slate-500">—</span>`;

      const daysRem = st.daysRemaining ?? 0;
      const nextDateDisplay =
        st.nextDueDate !== null
          ? `<div><div class="font-mono font-bold text-xs text-white">${st.nextDueDate}</div><div class="text-[10px] font-mono mt-0.5 ${daysRem <= 0 ? "text-rose-400 font-bold" : daysRem <= 30 ? "text-amber-400 font-semibold" : "text-slate-400"}">${daysRem <= 0 ? Math.abs(daysRem) + "d overdue" : "in " + daysRem + "d"}</div></div>`
          : `<span class="text-xs text-slate-500">—</span>`;

      const timeText = item.intervalMonths
        ? ` <span class="text-[11px] text-slate-400">/ ${item.intervalMonths % 12 === 0 ? item.intervalMonths / 12 + "y" : item.intervalMonths + "m"}</span>`
        : "";

      const oemBadge = item.oemPartNumber
        ? `<div class="mt-1 flex items-center gap-1 text-[11px] font-mono text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40 w-fit" title="OEM Part Number / Specification"><svg class="w-3 h-3 text-indigo-400 shrink-0" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg><span>${escapeHtml(item.oemPartNumber)}</span></div>`
        : "";

      const lastDateBadge = item.lastServicedDate
        ? `<div class="text-[10px] font-mono text-slate-400 mt-1 flex items-center gap-1"><svg class="w-2.5 h-2.5 text-slate-500 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg><span>${escapeHtml(item.lastServicedDate)}</span></div>`
        : "";

      return `
        <tr class="motion-enter hover:bg-slate-800/40 transition" style="animation-delay: ${idx * 25}ms">
          <td class="py-3.5 ps-5 pe-3 align-middle">
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 text-[10px] font-mono uppercase font-semibold rounded bg-slate-800 text-slate-300 border border-slate-700 shrink-0">${escapeHtml(item.category || "Part")}</span>
              <span class="font-semibold text-white text-sm">${escapeHtml(item.name)}</span>
            </div>
            ${oemBadge}
          </td>

          <td class="py-3.5 px-3 align-middle font-mono text-xs text-slate-200">
            ${formatNumber(item.intervalKm)} km${timeText}
          </td>

          <td class="py-3.5 px-3 align-middle">
            <div class="flex items-center gap-1.5 max-w-[175px]">
              <div class="relative flex-1">
                <input
                  type="number"
                  step="100"
                  min="0"
                  data-sched-id="${item.id}"
                  value="${lastKmVal}"
                  placeholder="km..."
                  class="sched-km-input w-full bg-slate-950 text-white font-mono text-xs font-semibold rounded-xl ps-2.5 pe-7 py-1.5 border ${st.state === "pending" ? "border-slate-700/80" : "border-indigo-500/50"} focus:outline-none focus:border-indigo-400 transition"
                />
                <span class="absolute inset-y-0 end-2 flex items-center text-[10px] font-mono text-slate-500 pointer-events-none">km</span>
              </div>
              <button
                type="button"
                data-fill-current="${item.id}"
                title="Set to current mileage (${formatNumber(curKm)} km)"
                class="fill-cur-km-btn px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white text-[10px] font-mono font-semibold border border-slate-700 transition shrink-0"
              >Now</button>
            </div>
            ${lastDateBadge}
          </td>

          <td class="py-3.5 px-3 align-middle">
            ${nextDueDisplay}
          </td>

          <td class="py-3.5 px-3 align-middle">
            ${nextDateDisplay}
          </td>

          <td class="py-3.5 px-3 align-middle">
            <input
              type="number"
              step="5"
              min="0"
              data-cost-id="${item.id}"
              value="${item.estimatedCostMyr !== null && item.estimatedCostMyr !== undefined ? item.estimatedCostMyr : ""}"
              placeholder="RM"
              class="sched-cost-input w-20 bg-slate-950/70 text-slate-200 font-mono text-xs rounded-lg px-2 py-1 border border-slate-800 focus:outline-none focus:border-indigo-400"
            />
          </td>

          <td class="py-3.5 ps-3 pe-5 align-middle">
            <div class="flex items-center justify-between gap-2 mb-1">
              <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold border ${st.badgeClass}">
                ${st.iconSvg}
                <span>${st.label}</span>
              </span>
              ${st.progressPct !== null ? `<span class="text-[10px] font-mono text-slate-400">${Math.round(st.progressPct)}%</span>` : ""}
            </div>
            <div class="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800/90">
              <div class="motion-bar h-full rounded-full ${st.barColor}" style="width: ${st.progressPct}%"></div>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  document.querySelectorAll<HTMLInputElement>(".sched-km-input").forEach((inp) => {
    inp.addEventListener("change", (e) => {
      const targetEl = e.target as HTMLInputElement;
      const id = targetEl.getAttribute("data-sched-id");
      const raw = targetEl.value.trim();
      const target = appData.periodicSchedule.find((x) => x.id === id);
      if (target) {
        target.lastServicedKm = raw === "" ? null : Number(raw);
        target.lastServicedDate = raw === "" ? null : new Date().toISOString().slice(0, 10);
        saveToLocal(true);
        onAfterMutate();
        showToast(`Saved ${target.name}`);
      }
    });
  });

  document.querySelectorAll<HTMLInputElement>(".sched-cost-input").forEach((inp) => {
    inp.addEventListener("change", (e) => {
      const targetEl = e.target as HTMLInputElement;
      const id = targetEl.getAttribute("data-cost-id");
      const raw = targetEl.value.trim();
      const target = appData.periodicSchedule.find((x) => x.id === id);
      if (target) {
        target.estimatedCostMyr = raw === "" ? null : Number(raw);
        saveToLocal(true);
        onAfterMutate();
        showToast(`Saved cost for ${target.name}`);
      }
    });
  });

  document.querySelectorAll<HTMLButtonElement>(".fill-cur-km-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-fill-current");
      const target = appData.periodicSchedule.find((x) => x.id === id);
      if (target) {
        target.lastServicedKm = curKm;
        target.lastServicedDate = new Date().toISOString().slice(0, 10);
        saveToLocal(true);
        onAfterMutate();
        showToast(`Set ${target.name} to ${formatNumber(curKm)} km`);
      }
    });
  });
}

export function initPeriodicScheduleListeners(onRenderTable: () => void, onRenderAll: () => void): void {
  document.querySelectorAll<HTMLButtonElement>(".sched-filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const nextFilter = (btn.getAttribute("data-filter") || "all") as ScheduleFilter;
      setCurrentScheduleFilter(nextFilter);
      document.querySelectorAll<HTMLButtonElement>(".sched-filter-btn").forEach((b) => {
        b.className =
          "sched-filter-btn px-2.5 py-1.5 rounded-xl text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 transition";
      });
      btn.className =
        "sched-filter-btn px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white transition";
      onRenderTable();
      syncFiltersToUrl();
    });
  });

  wireSelectOther("newSchedNameSelect", "newSchedNameOther");
  wireSelectOther("newSchedCatSelect", "newSchedCatOther");
  wireSelectOther("newSchedIntervalSelect", "newSchedIntervalOther");
  wireSelectOther("newSchedMonthsSelect", "newSchedMonthsOther");
  wireSelectOther("newSchedLastKmSelect", "newSchedLastKmOther");
  wireSelectOther("newSchedCostSelect", "newSchedCostOther");

  const addScheduleModal = document.getElementById("addScheduleModal");
  const closeSchedModal = (): void => {
    addScheduleModal?.classList.add("hidden");
    addScheduleModal?.classList.remove("flex");
  };

  document.getElementById("addScheduleItemBtn")?.addEventListener("click", () => {
    const appData = getAppData();
    if (!appData || !appData.vehicle) {
      showToast("Please add or select a vehicle first.");
      return;
    }
    [
      "newSchedNameOther",
      "newSchedCatOther",
      "newSchedIntervalOther",
      "newSchedMonthsOther",
      "newSchedLastKmOther",
      "newSchedCostOther",
    ].forEach((id) => {
      const el = document.getElementById(id) as HTMLInputElement | null;
      if (el) {
        el.classList.add("hidden");
        el.required = false;
        el.value = "";
      }
    });
    const lastDateEl = document.getElementById("newSchedLastDate") as HTMLInputElement | null;
    if (lastDateEl) lastDateEl.value = "";
    const oemEl = document.getElementById("newSchedOemPart") as HTMLInputElement | null;
    if (oemEl) oemEl.value = "";
    addScheduleModal?.classList.remove("hidden");
    addScheduleModal?.classList.add("flex");
  });

  document.getElementById("closeAddScheduleModalBtn")?.addEventListener("click", closeSchedModal);
  document.getElementById("cancelAddScheduleBtn")?.addEventListener("click", closeSchedModal);

  document.getElementById("addScheduleForm")?.addEventListener("submit", (e: SubmitEvent) => {
    e.preventDefault();
    const appData = getAppData();
    if (!appData) return;

    const name = getSelectOrOtherVal("newSchedNameSelect", "newSchedNameOther") || "Periodic Service";
    const category = getSelectOrOtherVal("newSchedCatSelect", "newSchedCatOther") || "Part";
    const intervalKm = Number(getSelectOrOtherVal("newSchedIntervalSelect", "newSchedIntervalOther")) || 10000;
    const monthsVal = getSelectOrOtherVal("newSchedMonthsSelect", "newSchedMonthsOther");
    const intervalMonths = monthsVal && monthsVal !== "none" ? Number(monthsVal) : null;
    const lastDateVal = (document.getElementById("newSchedLastDate") as HTMLInputElement | null)?.value || null;
    const oemPartVal = (document.getElementById("newSchedOemPart") as HTMLInputElement | null)?.value.trim() || null;

    const lastVal = getSelectOrOtherVal("newSchedLastKmSelect", "newSchedLastKmOther");
    let lastServicedKm: number | null = null;
    if (lastVal === "current") lastServicedKm = Number(appData.vehicle?.currentMileageKm) || 0;
    else if (lastVal !== "unset" && lastVal !== "") lastServicedKm = Number(lastVal);

    const costVal = getSelectOrOtherVal("newSchedCostSelect", "newSchedCostOther");
    const estimatedCostMyr = costVal === "unset" || costVal === "" ? null : Number(costVal);

    appData.periodicSchedule.push({
      id: "sched-" + Date.now(),
      name,
      category,
      intervalKm,
      intervalMonths,
      lastServicedKm,
      lastServicedDate: lastDateVal || (lastServicedKm !== null ? new Date().toISOString().slice(0, 10) : null),
      estimatedCostMyr,
      oemPartNumber: oemPartVal,
    });

    saveToLocal(true);
    onRenderAll();
    (e.target as HTMLFormElement).reset();
    closeSchedModal();
    showToast("Schedule item added");
  });
}
