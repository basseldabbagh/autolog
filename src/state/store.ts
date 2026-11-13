import { BUILTIN_PROFILES, SAMPLE_PROFILE_KEYS } from "../config/profiles";
import type { DatePreset, DonutMode, MaintenanceRecord, ScheduleFilter, UserProfile, VehicleProfile } from "../types";

export const STORAGE_PREFIX = "car_tracker_v3_";
export const ACTIVE_KEY_STORAGE = "car_tracker_v3_active_profile";
export const CUSTOM_LIST_STORAGE = "car_tracker_v3_custom_profiles";
export const USER_PROFILE_STORAGE = "motofolio_user_profile";

interface StoreState {
  activeProfileKey: string | null;
  appData: VehicleProfile | null;
  currentScheduleFilter: ScheduleFilter;
  currentHistorySearch: string;
  globalDatePreset: DatePreset;
  globalDateStart: string | null;
  globalDateEnd: string | null;
  globalCategory: string;
  expenseDonutMode: DonutMode;
}

const currentYear = new Date().getFullYear();

const state: StoreState = {
  activeProfileKey: localStorage.getItem(ACTIVE_KEY_STORAGE) || null,
  appData: null,
  currentScheduleFilter: "all",
  currentHistorySearch: "",
  globalDatePreset: "this-year",
  globalDateStart: `${currentYear}-01-01`,
  globalDateEnd: `${currentYear}-12-31`,
  globalCategory: "all",
  expenseDonutMode: "category",
};

interface StoreCallbacks {
  onRenderAll?: () => void;
  onSyncProfileSelectOptions?: () => void;
  onUpdateSeo?: () => void;
  onAutoSyncDrive?: () => void;
}

const callbacks: StoreCallbacks = {};

export function registerStoreCallbacks(next: StoreCallbacks): void {
  Object.assign(callbacks, next);
}

export function getActiveProfileKey(): string | null {
  return state.activeProfileKey;
}

export function setActiveProfileKey(key: string | null): void {
  state.activeProfileKey = key;
  if (key) {
    localStorage.setItem(ACTIVE_KEY_STORAGE, key);
  } else {
    localStorage.removeItem(ACTIVE_KEY_STORAGE);
  }
}

export function getAppData(): VehicleProfile | null {
  return state.appData;
}

export function setAppData(data: VehicleProfile | null): void {
  state.appData = data;
}

export function getCurrentScheduleFilter(): ScheduleFilter {
  return state.currentScheduleFilter;
}

export function setCurrentScheduleFilter(filter: ScheduleFilter): void {
  state.currentScheduleFilter = filter;
}

export function getCurrentHistorySearch(): string {
  return state.currentHistorySearch;
}

export function setCurrentHistorySearch(query: string): void {
  state.currentHistorySearch = query;
}

export function getGlobalDatePreset(): DatePreset {
  return state.globalDatePreset;
}

export function setGlobalDatePreset(preset: DatePreset): void {
  state.globalDatePreset = preset;
}

export function getGlobalDateStart(): string | null {
  return state.globalDateStart;
}

export function setGlobalDateStart(date: string | null): void {
  state.globalDateStart = date;
}

export function getGlobalDateEnd(): string | null {
  return state.globalDateEnd;
}

export function setGlobalDateEnd(date: string | null): void {
  state.globalDateEnd = date;
}

export function getGlobalCategory(): string {
  return state.globalCategory;
}

export function setGlobalCategory(category: string): void {
  state.globalCategory = category;
}

export function getExpenseDonutMode(): DonutMode {
  return state.expenseDonutMode;
}

export function setExpenseDonutMode(mode: DonutMode): void {
  state.expenseDonutMode = mode;
}

export function getFilteredHistory(): MaintenanceRecord[] {
  const data = state.appData;
  if (!data || !data.maintenanceHistory) return [];
  return data.maintenanceHistory.filter((r) => {
    if (state.globalDateStart && r.date && r.date < state.globalDateStart) return false;
    if (state.globalDateEnd && r.date && r.date > state.globalDateEnd) return false;
    if (state.globalCategory !== "all" && (r.category || "General Service") !== state.globalCategory) return false;
    return true;
  });
}

export function getCustomProfilesMap(): Record<string, string> {
  try {
    const map = JSON.parse(localStorage.getItem(CUSTOM_LIST_STORAGE) || "{}") as Record<string, string>;
    let changed = false;

    SAMPLE_PROFILE_KEYS.forEach((k) => {
      if (k in map) {
        delete map[k];
        changed = true;
      }
    });

    if (
      map["car-primary"] &&
      (map["car-primary"] === "Toyota Camry 2.5V" ||
        map["car-primary"] === "Toyota Camry" ||
        map["car-primary"].toLowerCase().includes("toyota"))
    ) {
      delete map["car-primary"];
      localStorage.removeItem(STORAGE_PREFIX + "car-primary");
      changed = true;
    }

    if (map["honda-city-2003"]) {
      delete map["honda-city-2003"];
      localStorage.removeItem(STORAGE_PREFIX + "honda-city-2003");
      changed = true;
    }

    if (map["hyundai-elantra-2009"]) {
      delete map["hyundai-elantra-2009"];
      localStorage.removeItem(STORAGE_PREFIX + "hyundai-elantra-2009");
      changed = true;
    }

    if (changed) {
      localStorage.setItem(CUSTOM_LIST_STORAGE, JSON.stringify(map));
    }
    return map;
  } catch {
    return {};
  }
}

export function hasSavedCars(): boolean {
  const map = getCustomProfilesMap();
  return Object.keys(map).length > 0;
}

export function registerCustomProfileOption(id: string, label: string): void {
  const map = getCustomProfilesMap();
  map[id] = label;
  localStorage.setItem(CUSTOM_LIST_STORAGE, JSON.stringify(map));
  callbacks.onSyncProfileSelectOptions?.();
}

export function saveToLocal(touchDate = true): void {
  if (!state.appData || !state.activeProfileKey) return;
  if (touchDate) {
    state.appData.lastUpdated = new Date().toISOString().slice(0, 10);
  }
  localStorage.setItem(STORAGE_PREFIX + state.activeProfileKey, JSON.stringify(state.appData));
  localStorage.setItem(ACTIVE_KEY_STORAGE, state.activeProfileKey);

  const chip = document.getElementById("lastUpdatedChip");
  if (chip) chip.textContent = `Updated: ${state.appData.lastUpdated}`;

  callbacks.onUpdateSeo?.();
  callbacks.onAutoSyncDrive?.();
}

export async function loadProfile(profileKey: string | null): Promise<void> {
  if (!profileKey) {
    setActiveProfileKey(null);
    state.appData = null;
    callbacks.onSyncProfileSelectOptions?.();
    callbacks.onRenderAll?.();
    return;
  }

  setActiveProfileKey(profileKey);
  callbacks.onSyncProfileSelectOptions?.();

  const saved = localStorage.getItem(STORAGE_PREFIX + profileKey);
  if (saved) {
    try {
      const parsedSaved = JSON.parse(saved) as VehicleProfile;
      if (parsedSaved && parsedSaved.vehicle && Array.isArray(parsedSaved.periodicSchedule)) {
        state.appData = parsedSaved;
        callbacks.onRenderAll?.();
        return;
      }
    } catch (e) {
      console.warn("Fallback from localStorage error:", e);
    }
  }

  if (window.location.protocol !== "file:" && profileKey !== "blank-template") {
    try {
      let res = await fetch(`./template/${profileKey}.json`, { cache: "no-store" });
      if (!res.ok) {
        res = await fetch(`./cars/${profileKey}.json`, { cache: "no-store" });
      }
      if (res.ok) {
        state.appData = (await res.json()) as VehicleProfile;
        saveToLocal(false);
        callbacks.onRenderAll?.();
        return;
      }
    } catch {
      // ignore fetch fallback errors
    }
  }

  if (BUILTIN_PROFILES[profileKey]) {
    state.appData = JSON.parse(JSON.stringify(BUILTIN_PROFILES[profileKey])) as VehicleProfile;
    saveToLocal(false);
    callbacks.onRenderAll?.();
    return;
  }

  state.activeProfileKey = null;
  state.appData = null;
  callbacks.onRenderAll?.();
}

export function getUserProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(USER_PROFILE_STORAGE);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<UserProfile>;
      return {
        firstName: typeof parsed.firstName === "string" ? parsed.firstName : "",
        lastName: typeof parsed.lastName === "string" ? parsed.lastName : "",
        email: typeof parsed.email === "string" ? parsed.email : "",
      };
    }
  } catch {
    // ignore
  }
  return { firstName: "", lastName: "", email: "" };
}

export function setUserProfile(profile: UserProfile): void {
  localStorage.setItem(
    USER_PROFILE_STORAGE,
    JSON.stringify({
      firstName: (profile.firstName || "").trim(),
      lastName: (profile.lastName || "").trim(),
      email: (profile.email || "").trim(),
    }),
  );
}

export function clearAllLocalVehicles(): void {
  const customMap = getCustomProfilesMap();
  Object.keys(customMap).forEach((key) => {
    localStorage.removeItem(STORAGE_PREFIX + key);
  });
  localStorage.removeItem(CUSTOM_LIST_STORAGE);
  setActiveProfileKey(null);
  setAppData(null);
  callbacks.onSyncProfileSelectOptions?.();
  callbacks.onRenderAll?.();
}
