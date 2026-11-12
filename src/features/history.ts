import {
  getAppData,
  getCurrentHistorySearch,
  getFilteredHistory,
  saveToLocal,
  setCurrentHistorySearch,
} from "../state/store";
import { escapeHtml, formatCurrency, formatNumber, getSelectOrOtherVal, showToast, wireSelectOther } from "../utils/format";
import { syncFiltersToUrl } from "../utils/urlFilters";

export function renderHistoryList(): void {
  const appData = getAppData();
  if (!appData || !appData.vehicle) return;

  const container = document.getElementById("historyListContainer");
  if (!container) return;

  const filteredHist = getFilteredHistory();
  const sortedHist = [...filteredHist].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const countBadge = document.getElementById("historyCountBadge");
  if (countBadge) countBadge.textContent = `${sortedHist.length}`;

  const uniqueMechanics = new Set(
    (appData.maintenanceHistory || []).map((r) => (r.mechanic || "").trim()).filter(Boolean),
  );
  const mechBadgeText = document.getElementById("historyMechanicCountText");
  if (mechBadgeText) {
    mechBadgeText.textContent = `${uniqueMechanics.size} Workshop${uniqueMechanics.size === 1 ? "" : "s"}`;
  }

  const q = getCurrentHistorySearch().toLowerCase().trim();
  const filtered = sortedHist.filter((r) => {
    if (!q) return true;
    return (
      (r.title && r.title.toLowerCase().includes(q)) ||
      (r.category && r.category.toLowerCase().includes(q)) ||
      (r.mechanic && r.mechanic.toLowerCase().includes(q)) ||
      (r.date && r.date.toLowerCase().includes(q)) ||
      (r.notes && r.notes.toLowerCase().includes(q))
    );
  });

  if (!filtered.length) {
    container.innerHTML = `<div class="p-6 text-center text-xs text-slate-400">No records found.</div>`;
    return;
  }

  container.innerHTML = filtered
    .map((rec) => {
      const costText =
        rec.costMyr !== null && rec.costMyr !== undefined && String(rec.costMyr) !== ""
          ? formatCurrency(rec.costMyr, appData.currency)
          : "Workshop Fees";
      const paidText =
        rec.paidMyr !== null && rec.paidMyr !== undefined && String(rec.paidMyr) !== ""
          ? formatCurrency(rec.paidMyr, appData.currency)
          : "Workshop Fees";

      return `
        <div class="px-5 py-3.5 hover:bg-slate-800/30 transition flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div class="space-y-0.5 max-w-3xl">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-950 text-indigo-300 border border-slate-800">${escapeHtml(rec.date || "—")}</span>
              ${rec.mileageKm ? `<span class="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-200">${formatNumber(rec.mileageKm)} km</span>` : ""}
              <span class="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-800/80 text-slate-300">${escapeHtml(rec.category || "Service")}</span>
              ${rec.mechanic ? `<span class="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-800/50"><svg class="w-3 h-3 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>${escapeHtml(rec.mechanic)}</span>` : ""}
            </div>
            <h4 class="text-sm font-bold text-white pt-0.5">${escapeHtml(rec.title)}</h4>
            ${rec.notes ? `<p class="text-xs text-slate-400">${escapeHtml(rec.notes)}</p>` : ""}
          </div>

          <div class="flex sm:flex-row md:flex-col items-start md:items-end justify-between gap-1 shrink-0">
            <div class="text-xs text-slate-400">Cost: <span class="font-mono text-sm font-bold text-white">${costText}</span></div>
            <div class="text-[11px] text-slate-400">Paid: <span class="font-mono font-semibold text-cyan-300">${paidText}</span> <span class="text-slate-500">(${escapeHtml(rec.paymentMethod || "Workshop Fees")})</span></div>
          </div>
        </div>
      `;
    })
    .join("");
}

export function populateMechanicSelect(): void {
  const sel = document.getElementById("newRecMechanicSelect") as HTMLSelectElement | null;
  const appData = getAppData();
  if (!sel || !appData) return;

  const hist = appData.maintenanceHistory || [];
  const mechanics = Array.from(new Set(hist.map((r) => (r.mechanic || "").trim()).filter(Boolean)));
  let html = '<option value="">— Unspecified / DIY —</option>';
  if (mechanics.length > 0) {
    html += `<optgroup label="Saved Workshops & Mechanics">`;
    mechanics.forEach((m) => {
      html += `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`;
    });
    html += `</optgroup>`;
  }
  html += `<option value="__other__">Other (Enter new workshop / mechanic)...</option>`;
  sel.innerHTML = html;
}

export function populateLinkedItemSelect(): void {
  const appData = getAppData();
  if (!appData || !appData.vehicle) return;

  populateMechanicSelect();
  const sel = document.getElementById("newRecLinkedItem") as HTMLSelectElement | null;
  const titleSel = document.getElementById("newRecTitleSelect") as HTMLSelectElement | null;
  const mileageSel = document.getElementById("newRecMileageSelect") as HTMLSelectElement | null;
  const curKm = Number(appData.vehicle.currentMileageKm) || 0;
  const sched = appData.periodicSchedule || [];

  if (sel) {
    sel.innerHTML =
      `<option value="">— None —</option>` +
      sched.map((s) => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)} (${formatNumber(s.intervalKm)} km)</option>`).join("");
  }

  if (titleSel) {
    const schedOptions = sched
      .map(
        (s) =>
          `<option value="${escapeHtml(s.name)}" data-linked-id="${escapeHtml(s.id)}" data-est-cost="${s.estimatedCostMyr || ""}">${escapeHtml(s.name)}</option>`,
      )
      .join("");
    const extraOptions = [
      "Brake Pads Replacement",
      "Battery Replacement",
      "Tire Rotation & Alignment",
      "A/C Gas Refill & Service",
      "Suspension / Mounting Repair",
      "General Workshop Inspection",
    ]
      .map((t) => `<option value="${t}">${t}</option>`)
      .join("");

    titleSel.innerHTML = `
      <optgroup label="Periodic Schedule Items">${schedOptions}</optgroup>
      <optgroup label="Common Workshop Services">${extraOptions}</optgroup>
      <option value="__other__">Other (Type custom title)...</option>
    `;
  }

  if (mileageSel) {
    mileageSel.innerHTML = `
      <option value="${curKm}">Current Odometer (${formatNumber(curKm)} km)</option>
      <option value="${curKm + 1000}">${formatNumber(curKm + 1000)} km (+1,000 km)</option>
      <option value="${curKm + 5000}">${formatNumber(curKm + 5000)} km (+5,000 km)</option>
      <option value="unlogged">Unlogged / N/A</option>
      <option value="__other__">Other (Enter km)...</option>
    `;
  }
}

export function initHistoryListeners(onRenderAll: () => void): void {
  document.getElementById("historySearchInput")?.addEventListener("input", (e) => {
    setCurrentHistorySearch((e.target as HTMLInputElement).value);
    renderHistoryList();
    syncFiltersToUrl();
  });

  const addRecordModal = document.getElementById("addRecordModal");
  const closeAddModal = (): void => {
    addRecordModal?.classList.add("hidden");
    addRecordModal?.classList.remove("flex");
  };

  wireSelectOther("newRecMileageSelect", "newRecMileageOther");
  wireSelectOther("newRecTitleSelect", "newRecTitleOther", (selEl) => {
    const opt = selEl.options[selEl.selectedIndex];
    const linkedId = opt ? opt.getAttribute("data-linked-id") || "" : "";
    const estCost = opt ? opt.getAttribute("data-est-cost") || "" : "";
    const linkSel = document.getElementById("newRecLinkedItem") as HTMLSelectElement | null;
    if (linkSel) linkSel.value = linkedId;
    if (estCost) {
      const costSel = document.getElementById("newRecCostSelect") as HTMLSelectElement | null;
      const costOther = document.getElementById("newRecCostOther") as HTMLInputElement | null;
      if (costSel && costOther) {
        if ([...costSel.options].some((o) => o.value === estCost)) {
          costSel.value = estCost;
          costOther.classList.add("hidden");
          costOther.required = false;
        } else {
          costSel.value = "__other__";
          costOther.value = estCost;
          costOther.classList.remove("hidden");
          costOther.required = true;
        }
      }
    }
  });
  wireSelectOther("newRecCategorySelect", "newRecCategoryOther");
  wireSelectOther("newRecStatusSelect", "newRecStatusOther");
  wireSelectOther("newRecCostSelect", "newRecCostOther");
  wireSelectOther("newRecPaidSelect", "newRecPaidOther");
  wireSelectOther("newRecMethodSelect", "newRecMethodOther");
  wireSelectOther("newRecMechanicSelect", "newRecMechanicOther");
  wireSelectOther("newRecNotesSelect", "newRecNotesOther");

  document.getElementById("addRecordBtn")?.addEventListener("click", () => {
    const appData = getAppData();
    if (!appData || !appData.vehicle) {
      showToast("Please add or select a vehicle first.");
      return;
    }
    populateLinkedItemSelect();
    const dateInput = document.getElementById("newRecDate") as HTMLInputElement | null;
    if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);

    [
      "newRecMileageOther",
      "newRecTitleOther",
      "newRecCategoryOther",
      "newRecStatusOther",
      "newRecCostOther",
      "newRecPaidOther",
      "newRecMethodOther",
      "newRecMechanicOther",
      "newRecNotesOther",
    ].forEach((id) => {
      const el = document.getElementById(id) as HTMLInputElement | null;
      if (el) {
        el.classList.add("hidden");
        el.required = false;
        el.value = "";
      }
    });

    const titleSel = document.getElementById("newRecTitleSelect") as HTMLSelectElement | null;
    const firstOpt = titleSel?.options[titleSel.selectedIndex];
    const linkedEl = document.getElementById("newRecLinkedItem") as HTMLSelectElement | null;
    if (firstOpt && firstOpt.getAttribute("data-linked-id") && linkedEl) {
      linkedEl.value = firstOpt.getAttribute("data-linked-id") || "";
    }

    addRecordModal?.classList.remove("hidden");
    addRecordModal?.classList.add("flex");
  });

  document.getElementById("closeAddRecordModalBtn")?.addEventListener("click", closeAddModal);
  document.getElementById("cancelAddRecordBtn")?.addEventListener("click", closeAddModal);

  document.getElementById("addRecordForm")?.addEventListener("submit", (e: SubmitEvent) => {
    e.preventDefault();
    const appData = getAppData();
    if (!appData) return;

    const date = (document.getElementById("newRecDate") as HTMLInputElement | null)?.value || "";
    const mileageVal = getSelectOrOtherVal("newRecMileageSelect", "newRecMileageOther");
    const mileageKm =
      mileageVal === "unlogged" || mileageVal === ""
        ? null
        : mileageVal === "current"
          ? Number(appData.vehicle?.currentMileageKm) || 0
          : Number(mileageVal);

    const title = getSelectOrOtherVal("newRecTitleSelect", "newRecTitleOther") || "Service Record";
    const category = getSelectOrOtherVal("newRecCategorySelect", "newRecCategoryOther") || "General Service";
    const status = getSelectOrOtherVal("newRecStatusSelect", "newRecStatusOther") || "Completed";

    const costVal = getSelectOrOtherVal("newRecCostSelect", "newRecCostOther");
    const costMyr = costVal === "workshop" || costVal === "" ? null : Number(costVal);

    const paidSelVal = (document.getElementById("newRecPaidSelect") as HTMLSelectElement | null)?.value || "";
    let paidMyr: number | null = null;
    if (paidSelVal === "same") paidMyr = costMyr;
    else if (paidSelVal === "workshop") paidMyr = null;
    else if (paidSelVal === "__other__") {
      const rawP = ((document.getElementById("newRecPaidOther") as HTMLInputElement | null)?.value || "").trim();
      paidMyr = rawP !== "" ? Number(rawP) : null;
    } else {
      paidMyr = Number(paidSelVal);
    }

    const paymentMethod = getSelectOrOtherVal("newRecMethodSelect", "newRecMethodOther") || "Workshop Fees";
    const mechanic = getSelectOrOtherVal("newRecMechanicSelect", "newRecMechanicOther");
    const linkedItemId = (document.getElementById("newRecLinkedItem") as HTMLSelectElement | null)?.value || "";
    const notes = getSelectOrOtherVal("newRecNotesSelect", "newRecNotesOther");

    appData.maintenanceHistory.unshift({
      id: "rec-" + Date.now(),
      date,
      mileageKm,
      title,
      category,
      mechanic: mechanic || null,
      costMyr,
      paidMyr,
      paymentMethod,
      status,
      notes,
    });

    if (mileageKm && mileageKm > (appData.vehicle.currentMileageKm || 0)) {
      appData.vehicle.currentMileageKm = mileageKm;
      appData.vehicle.latestServiceDate = date;
    }

    if (linkedItemId && mileageKm) {
      const item = appData.periodicSchedule.find((x) => x.id === linkedItemId);
      if (item) {
        item.lastServicedKm = mileageKm;
        item.lastServicedDate = date;
        if (costMyr !== null) item.estimatedCostMyr = costMyr;
      }
    }

    saveToLocal(true);
    onRenderAll();
    (e.target as HTMLFormElement).reset();
    closeAddModal();
    showToast("Record added & saved");
  });
}
