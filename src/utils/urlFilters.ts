import {
  getActiveProfileKey,
  getAppData,
  getCurrentHistorySearch,
  getCurrentScheduleFilter,
  getCustomProfilesMap,
  getFilteredHistory,
  getGlobalCategory,
  getGlobalDateEnd,
  getGlobalDatePreset,
  getGlobalDateStart,
  hasSavedCars,
  setActiveProfileKey,
  setCurrentHistorySearch,
  setCurrentScheduleFilter,
  setGlobalCategory,
  setGlobalDateEnd,
  setGlobalDateStart,
  setGlobalDatePreset,
} from "../state/store";
import type { DatePreset, ScheduleFilter } from "../types";
import { showToast } from "./format";

let isRestoringFromUrl = false;

export function syncCategoryFilterOptions(): void {
  const sel = document.getElementById("filterCategorySelect") as HTMLSelectElement | null;
  if (!sel) return;

  const appData = getAppData();
  const categories = new Set<string>();
  (appData?.maintenanceHistory || []).forEach((r) => {
    if (r.category) categories.add(r.category);
  });
  (appData?.periodicSchedule || []).forEach((s) => {
    if (s.category) categories.add(s.category);
  });

  const currentVal = getGlobalCategory();
  let html = '<option value="all">All Categories</option>';
  Array.from(categories)
    .sort()
    .forEach((cat) => {
      html += `<option value="${cat}">${cat}</option>`;
    });

  sel.innerHTML = html;
  sel.value = categories.has(currentVal) ? currentVal : "all";
  setGlobalCategory(sel.value);
}

export function updateFilterSummaryUI(): void {
  const txt = document.getElementById("filterSummaryText");
  if (!txt) return;

  const preset = getGlobalDatePreset();
  let dateLabel = "This Year (" + new Date().getFullYear() + ")";
  if (preset === "all-time") dateLabel = "All Time";
  else if (preset === "last-year") dateLabel = "Last Year (" + (new Date().getFullYear() - 1) + ")";
  else if (preset === "last-6m") dateLabel = "Last 6 Months";
  else if (preset === "custom") {
    dateLabel = `${getGlobalDateStart() || "Start"} to ${getGlobalDateEnd() || "End"}`;
  }

  const globalCategory = getGlobalCategory();
  const catLabel = globalCategory === "all" ? "All Categories" : globalCategory;
  const count = getFilteredHistory().length;
  txt.textContent = `Showing: ${dateLabel} • ${catLabel} (${count} records)`;
}

export function syncFiltersToUrl(): void {
  if (isRestoringFromUrl) return;
  try {
    const url = new URL(window.location.href);
    const params = url.searchParams;
    const activeProfileKey = getActiveProfileKey();

    if (activeProfileKey && hasSavedCars()) {
      params.set("car", activeProfileKey);
    } else {
      params.delete("car");
      params.delete("profile");
    }

    const globalDatePreset = getGlobalDatePreset();
    if (globalDatePreset && globalDatePreset !== "this-year") {
      params.set("period", globalDatePreset);
    } else {
      params.delete("period");
    }

    if (globalDatePreset === "custom") {
      const start = getGlobalDateStart();
      const end = getGlobalDateEnd();
      if (start) params.set("start", start);
      else params.delete("start");
      if (end) params.set("end", end);
      else params.delete("end");
    } else {
      params.delete("start");
      params.delete("end");
    }

    const globalCategory = getGlobalCategory();
    if (globalCategory && globalCategory !== "all") {
      params.set("cat", globalCategory);
    } else {
      params.delete("cat");
    }

    const currentScheduleFilter = getCurrentScheduleFilter();
    if (currentScheduleFilter && currentScheduleFilter !== "all") {
      params.set("sched", currentScheduleFilter);
    } else {
      params.delete("sched");
    }

    const q = (getCurrentHistorySearch() || "").trim();
    if (q) {
      params.set("q", q);
    } else {
      params.delete("q");
    }

    const newSearch = params.toString() ? `?${params.toString()}` : "";
    const targetUrl = url.pathname + newSearch + url.hash;
    if (window.location.search !== newSearch) {
      window.history.replaceState(null, "", targetUrl);
    }
  } catch (e) {
    console.warn("syncFiltersToUrl error:", e);
  }
}

export function restoreFiltersFromUrl(): void {
  isRestoringFromUrl = true;
  try {
    const params = new URLSearchParams(window.location.search);

    const urlCar = params.get("car") || params.get("profile");
    const customMap = getCustomProfilesMap();
    if (urlCar && customMap[urlCar]) {
      setActiveProfileKey(urlCar);
    }

    const urlPeriod = params.get("period") as DatePreset | null;
    if (urlPeriod && ["this-year", "last-year", "last-6m", "all-time", "custom"].includes(urlPeriod)) {
      setGlobalDatePreset(urlPeriod);
      const datePresetEl = document.getElementById("filterDatePreset") as HTMLSelectElement | null;
      if (datePresetEl) datePresetEl.value = urlPeriod;
    }

    const urlStart = params.get("start");
    const urlEnd = params.get("end");
    if (urlStart) setGlobalDateStart(urlStart);
    if (urlEnd) setGlobalDateEnd(urlEnd);

    const preset = getGlobalDatePreset();
    if (preset === "custom") {
      const customBoxEl = document.getElementById("filterCustomDateBox");
      const dateStartEl = document.getElementById("filterDateStart") as HTMLInputElement | null;
      const dateEndEl = document.getElementById("filterDateEnd") as HTMLInputElement | null;
      if (customBoxEl) {
        customBoxEl.classList.remove("hidden");
        customBoxEl.classList.add("flex");
      }
      if (dateStartEl && getGlobalDateStart()) dateStartEl.value = getGlobalDateStart() || "";
      if (dateEndEl && getGlobalDateEnd()) dateEndEl.value = getGlobalDateEnd() || "";
    } else if (preset) {
      const now = new Date();
      const year = now.getFullYear();
      if (preset === "this-year") {
        setGlobalDateStart(`${year}-01-01`);
        setGlobalDateEnd(`${year}-12-31`);
      } else if (preset === "last-year") {
        setGlobalDateStart(`${year - 1}-01-01`);
        setGlobalDateEnd(`${year - 1}-12-31`);
      } else if (preset === "last-6m") {
        const past = new Date();
        past.setMonth(past.getMonth() - 6);
        setGlobalDateStart(past.toISOString().slice(0, 10));
        setGlobalDateEnd(now.toISOString().slice(0, 10));
      } else if (preset === "all-time") {
        setGlobalDateStart(null);
        setGlobalDateEnd(null);
      }
    }

    const urlCat = params.get("cat");
    if (urlCat) {
      setGlobalCategory(urlCat);
      const catSelectEl = document.getElementById("filterCategorySelect") as HTMLSelectElement | null;
      if (catSelectEl) catSelectEl.value = urlCat;
    }

    const urlSched = params.get("sched") as ScheduleFilter | null;
    if (urlSched && ["all", "active", "pending", "due"].includes(urlSched)) {
      setCurrentScheduleFilter(urlSched);
      document.querySelectorAll(".sched-filter-btn").forEach((b) => {
        if (b.getAttribute("data-filter") === urlSched) {
          b.className = "sched-filter-btn px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white transition";
        } else {
          b.className = "sched-filter-btn px-2.5 py-1.5 rounded-xl text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 transition";
        }
      });
    }

    const urlQ = params.get("q");
    if (urlQ) {
      setCurrentHistorySearch(urlQ);
      const searchInput = document.getElementById("historySearchInput") as HTMLInputElement | null;
      if (searchInput) searchInput.value = urlQ;
    }
  } catch (e) {
    console.warn("restoreFiltersFromUrl error:", e);
  } finally {
    isRestoringFromUrl = false;
  }
}

export function initGlobalFilterListeners(onFilterChanged: () => void): void {
  const datePresetEl = document.getElementById("filterDatePreset") as HTMLSelectElement | null;
  const customBoxEl = document.getElementById("filterCustomDateBox");
  const dateStartEl = document.getElementById("filterDateStart") as HTMLInputElement | null;
  const dateEndEl = document.getElementById("filterDateEnd") as HTMLInputElement | null;
  const catSelectEl = document.getElementById("filterCategorySelect") as HTMLSelectElement | null;
  const resetFiltersBtn = document.getElementById("resetFiltersBtn");

  const applyDatePreset = (preset: DatePreset): void => {
    const now = new Date();
    const year = now.getFullYear();
    if (preset === "this-year") {
      setGlobalDateStart(`${year}-01-01`);
      setGlobalDateEnd(`${year}-12-31`);
      customBoxEl?.classList.add("hidden");
      customBoxEl?.classList.remove("flex");
    } else if (preset === "last-year") {
      setGlobalDateStart(`${year - 1}-01-01`);
      setGlobalDateEnd(`${year - 1}-12-31`);
      customBoxEl?.classList.add("hidden");
      customBoxEl?.classList.remove("flex");
    } else if (preset === "last-6m") {
      const past = new Date();
      past.setMonth(past.getMonth() - 6);
      setGlobalDateStart(past.toISOString().slice(0, 10));
      setGlobalDateEnd(now.toISOString().slice(0, 10));
      customBoxEl?.classList.add("hidden");
      customBoxEl?.classList.remove("flex");
    } else if (preset === "all-time") {
      setGlobalDateStart(null);
      setGlobalDateEnd(null);
      customBoxEl?.classList.add("hidden");
      customBoxEl?.classList.remove("flex");
    } else if (preset === "custom") {
      customBoxEl?.classList.remove("hidden");
      customBoxEl?.classList.add("flex");
      if (dateStartEl) {
        dateStartEl.value = getGlobalDateStart() || `${year}-01-01`;
        setGlobalDateStart(dateStartEl.value);
      }
      if (dateEndEl) {
        dateEndEl.value = getGlobalDateEnd() || now.toISOString().slice(0, 10);
        setGlobalDateEnd(dateEndEl.value);
      }
    }
    setGlobalDatePreset(preset);
    onFilterChanged();
  };

  datePresetEl?.addEventListener("change", (e) => {
    applyDatePreset((e.target as HTMLSelectElement).value as DatePreset);
    syncFiltersToUrl();
  });

  dateStartEl?.addEventListener("change", (e) => {
    setGlobalDateStart((e.target as HTMLInputElement).value);
    onFilterChanged();
    syncFiltersToUrl();
  });

  dateEndEl?.addEventListener("change", (e) => {
    setGlobalDateEnd((e.target as HTMLInputElement).value);
    onFilterChanged();
    syncFiltersToUrl();
  });

  catSelectEl?.addEventListener("change", (e) => {
    setGlobalCategory((e.target as HTMLSelectElement).value);
    onFilterChanged();
    syncFiltersToUrl();
  });

  resetFiltersBtn?.addEventListener("click", () => {
    if (datePresetEl) datePresetEl.value = "this-year";
    if (catSelectEl) catSelectEl.value = "all";
    setGlobalCategory("all");
    applyDatePreset("this-year");
    syncFiltersToUrl();
    showToast("Filters reset to This Year / All");
  });
}
