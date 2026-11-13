import { BUILTIN_PROFILES, SAMPLE_PROFILE_KEYS, TEMPLATE_PRESETS } from "../config/profiles";
import {
  getActiveProfileKey,
  getAppData,
  getCustomProfilesMap,
  getUserProfile,
  loadProfile,
  registerCustomProfileOption,
  saveToLocal,
  setActiveProfileKey,
  setAppData,
  setUserProfile,
  STORAGE_PREFIX,
  CUSTOM_LIST_STORAGE,
} from "../state/store";
import type { VehicleProfile } from "../types";
import { escapeHtml, showToast } from "../utils/format";
import { syncFiltersToUrl } from "../utils/urlFilters";
import { syncProfileSelectOptions } from "./headerKpis";

export function renderSettingsSavedCarsList(onRenderAll: () => void, closeSettingsModal: () => void): void {
  const container = document.getElementById("settingsSavedCarsList");
  const countEl = document.getElementById("settingsSavedCarsCount");
  if (!container) return;

  const customMap = getCustomProfilesMap();
  const savedEntries = Object.entries(customMap).filter(([id]) => !SAMPLE_PROFILE_KEYS.has(id));
  const activeProfileKey = getActiveProfileKey();

  if (countEl) countEl.textContent = `${savedEntries.length} saved`;

  if (savedEntries.length === 0) {
    container.innerHTML = `
      <div class="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-slate-500 text-xs">
        No custom saved vehicles yet. Fill out the form above to create your first vehicle.
      </div>
    `;
    return;
  }

  let html = "";
  savedEntries.forEach(([id, label]) => {
    const isActive = id === activeProfileKey;
    html += `
      <div class="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-950 border ${isActive ? "border-indigo-500/60 bg-indigo-500/5" : "border-slate-800 hover:border-slate-700"} transition">
        <div class="flex items-center gap-2 min-w-0">
          <span class="w-2 h-2 rounded-full ${isActive ? "bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]" : "bg-slate-600"}"></span>
          <span class="font-medium text-slate-200 truncate ${isActive ? "text-indigo-300 font-semibold" : ""}">${escapeHtml(label)}</span>
          ${isActive ? '<span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">Active</span>' : ""}
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          ${
            !isActive
              ? `<button
                  type="button"
                  class="settings-switch-car-btn text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                  data-car-id="${escapeHtml(id)}"
                >Switch</button>`
              : ""
          }
          <button
            type="button"
            class="settings-delete-car-btn p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
            title="Delete saved vehicle"
            data-car-id="${escapeHtml(id)}"
            data-car-name="${escapeHtml(label)}"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    `;
  });
  container.innerHTML = html;

  container.querySelectorAll<HTMLButtonElement>(".settings-switch-car-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const carId = btn.getAttribute("data-car-id");
      if (carId) {
        void loadProfile(carId);
        syncFiltersToUrl();
        renderSettingsSavedCarsList(onRenderAll, closeSettingsModal);
        closeSettingsModal();
        showToast("Switched vehicle");
      }
    });
  });

  container.querySelectorAll<HTMLButtonElement>(".settings-delete-car-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const carId = btn.getAttribute("data-car-id");
      const carName = btn.getAttribute("data-car-name") || "this vehicle";
      if (carId && confirm(`Are you sure you want to delete "${carName}"? All local records for this car will be removed.`)) {
        localStorage.removeItem(STORAGE_PREFIX + carId);
        const map = getCustomProfilesMap();
        delete map[carId];
        localStorage.setItem(CUSTOM_LIST_STORAGE, JSON.stringify(map));

        if (getActiveProfileKey() === carId) {
          const remainingKeys = Object.keys(map);
          if (remainingKeys.length > 0) {
            void loadProfile(remainingKeys[0]);
          } else {
            setActiveProfileKey(null);
            setAppData(null);
            syncProfileSelectOptions();
            onRenderAll();
          }
        } else {
          syncProfileSelectOptions();
        }
        renderSettingsSavedCarsList(onRenderAll, closeSettingsModal);
        showToast(`Deleted ${carName}`);
      }
    });
  });
}

export function initVehicleAndSettingsListeners(onRenderAll: () => void): void {
  // Edit Vehicle Modal
  const editCarModal = document.getElementById("editCarModal");
  const closeEditCar = (): void => {
    editCarModal?.classList.add("hidden");
    editCarModal?.classList.remove("flex");
  };

  document.getElementById("editVehicleBtn")?.addEventListener("click", () => {
    const appData = getAppData();
    if (!appData || !appData.vehicle) {
      showToast("Please add or select a vehicle first.");
      return;
    }
    const v = appData.vehicle;
    const setVal = (id: string, val: string): void => {
      const el = document.getElementById(id) as HTMLInputElement | null;
      if (el) el.value = val;
    };
    setVal("editCarMake", v.make || "");
    setVal("editCarModel", v.model || "");
    setVal("editCarYear", String(v.year || ""));
    setVal("editCarPlate", v.plateNumber || "");
    setVal("editCarCurrency", appData.currency || "MYR");
    setVal("editCarEngine", v.engine || "");
    setVal("editCarTrans", v.transmission || "");
    setVal("editCarRoadTax", v.roadTaxExpiry || "");
    setVal("editCarInsurance", v.insuranceExpiry || "");
    editCarModal?.classList.remove("hidden");
    editCarModal?.classList.add("flex");
  });

  document.getElementById("closeEditCarModalBtn")?.addEventListener("click", closeEditCar);
  document.getElementById("cancelEditCarBtn")?.addEventListener("click", closeEditCar);

  document.getElementById("editCarForm")?.addEventListener("submit", (e: SubmitEvent) => {
    e.preventDefault();
    const appData = getAppData();
    if (!appData) return;
    if (!appData.vehicle) {
      appData.vehicle = { id: getActiveProfileKey() || "car", make: "", model: "", year: null, currentMileageKm: 0 };
    }
    const getVal = (id: string): string => ((document.getElementById(id) as HTMLInputElement | null)?.value || "").trim();

    appData.vehicle.make = getVal("editCarMake");
    appData.vehicle.model = getVal("editCarModel");
    appData.vehicle.year = getVal("editCarYear");
    appData.vehicle.plateNumber = getVal("editCarPlate");
    appData.currency = getVal("editCarCurrency") || "MYR";
    appData.vehicle.engine = getVal("editCarEngine");
    appData.vehicle.transmission = getVal("editCarTrans");
    const rtEl = document.getElementById("editCarRoadTax") as HTMLInputElement | null;
    if (rtEl) appData.vehicle.roadTaxExpiry = rtEl.value || null;
    const insEl = document.getElementById("editCarInsurance") as HTMLInputElement | null;
    if (insEl) appData.vehicle.insuranceExpiry = insEl.value || null;

    saveToLocal(true);
    onRenderAll();
    closeEditCar();
    showToast("Vehicle info updated");
  });

  // Official Documents Modal (Road Tax & Insurance)
  const officialDocsModal = document.getElementById("officialDocsModal");
  const openOfficialDocsModal = (): void => {
    const appData = getAppData();
    if (!appData || !appData.vehicle) {
      showToast("Please add or select a vehicle first.");
      return;
    }
    const v = appData.vehicle;
    const rtInp = document.getElementById("inputRoadTaxExpiry") as HTMLInputElement | null;
    if (rtInp) rtInp.value = v.roadTaxExpiry || "";
    const insInp = document.getElementById("inputInsuranceExpiry") as HTMLInputElement | null;
    if (insInp) insInp.value = v.insuranceExpiry || "";
    officialDocsModal?.classList.remove("hidden");
    officialDocsModal?.classList.add("flex");
  };

  const closeOfficialDocsModal = (): void => {
    officialDocsModal?.classList.add("hidden");
    officialDocsModal?.classList.remove("flex");
  };

  document.getElementById("openOfficialDocsBtn")?.addEventListener("click", openOfficialDocsModal);
  document.getElementById("openOfficialDocsModalBtn")?.addEventListener("click", openOfficialDocsModal);
  document.getElementById("closeOfficialDocsModalBtn")?.addEventListener("click", closeOfficialDocsModal);
  document.getElementById("cancelOfficialDocsBtn")?.addEventListener("click", closeOfficialDocsModal);
  officialDocsModal?.addEventListener("click", (e) => {
    if (e.target === officialDocsModal) closeOfficialDocsModal();
  });

  document.getElementById("officialDocsForm")?.addEventListener("submit", (e: SubmitEvent) => {
    e.preventDefault();
    const appData = getAppData();
    if (!appData || !appData.vehicle) return;
    const rtInp = document.getElementById("inputRoadTaxExpiry") as HTMLInputElement | null;
    const insInp = document.getElementById("inputInsuranceExpiry") as HTMLInputElement | null;
    appData.vehicle.roadTaxExpiry = rtInp?.value || null;
    appData.vehicle.insuranceExpiry = insInp?.value || null;
    saveToLocal(true);
    onRenderAll();
    closeOfficialDocsModal();
    showToast("Official documents dates saved");
  });

  // Profile Modal (previously Settings)
  const settingsCarModal = document.getElementById("settingsCarModal");
  const populateUserProfileForm = (): void => {
    const profile = getUserProfile();
    const firstEl = document.getElementById("profileFirstName") as HTMLInputElement | null;
    const lastEl = document.getElementById("profileLastName") as HTMLInputElement | null;
    if (firstEl) firstEl.value = profile.firstName;
    if (lastEl) lastEl.value = profile.lastName;
  };

  const closeSettingsModal = (): void => {
    settingsCarModal?.classList.add("hidden");
    settingsCarModal?.classList.remove("flex");
  };
  const openSettingsModal = (): void => {
    populateUserProfileForm();
    settingsCarModal?.classList.remove("hidden");
    settingsCarModal?.classList.add("flex");
  };

  window.openSettingsModal = openSettingsModal;
  window.closeSettingsModal = closeSettingsModal;

  document.getElementById("openSettingsBtn")?.addEventListener("click", openSettingsModal);
  document.getElementById("closeSettingsCarModalBtn")?.addEventListener("click", closeSettingsModal);
  settingsCarModal?.addEventListener("click", (e) => {
    if (e.target === settingsCarModal) closeSettingsModal();
  });

  document.getElementById("userProfileForm")?.addEventListener("submit", (e: SubmitEvent) => {
    e.preventDefault();
    const firstName = (document.getElementById("profileFirstName") as HTMLInputElement | null)?.value.trim() || "";
    const lastName = (document.getElementById("profileLastName") as HTMLInputElement | null)?.value.trim() || "";
    setUserProfile({ firstName, lastName });
    showToast("Profile saved");
  });

  // Vehicles Modal (Saved Vehicles & Add New Vehicle)
  const vehiclesModal = document.getElementById("vehiclesModal");
  const closeVehiclesModal = (): void => {
    vehiclesModal?.classList.add("hidden");
    vehiclesModal?.classList.remove("flex");
  };
  const openVehiclesModal = (): void => {
    renderSettingsSavedCarsList(onRenderAll, closeVehiclesModal);
    vehiclesModal?.classList.remove("hidden");
    vehiclesModal?.classList.add("flex");
  };

  window.openVehiclesModal = openVehiclesModal;
  window.closeVehiclesModal = closeVehiclesModal;

  document.getElementById("openVehiclesModalBtn")?.addEventListener("click", openVehiclesModal);
  document.getElementById("closeVehiclesModalBtn")?.addEventListener("click", closeVehiclesModal);
  document.getElementById("cancelVehiclesModalBtn")?.addEventListener("click", closeVehiclesModal);
  vehiclesModal?.addEventListener("click", (e) => {
    if (e.target === vehiclesModal) closeVehiclesModal();
  });

  document.getElementById("modalNewCarBaseSelect")?.addEventListener("change", (e) => {
    const preset = TEMPLATE_PRESETS[(e.target as HTMLSelectElement).value];
    if (preset) {
      const setVal = (id: string, val: string): void => {
        const el = document.getElementById(id) as HTMLInputElement | null;
        if (el) el.value = val;
      };
      setVal("modalNewCarMake", preset.make);
      setVal("modalNewCarModel", preset.model);
      setVal("modalNewCarYear", preset.year ? String(preset.year) : "");
      setVal("modalNewCarEngine", preset.engine);
      setVal("modalNewCarTrans", preset.trans);
      setVal("modalNewCarCurrency", preset.currency);
      setVal("modalNewCarMileage", preset.mileage ? String(preset.mileage) : "");
    }
  });

  document.getElementById("addNewCarForm")?.addEventListener("submit", (e: SubmitEvent) => {
    e.preventDefault();
    const getVal = (id: string): string => ((document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null)?.value || "").trim();

    const baseKey = getVal("modalNewCarBaseSelect") || "blank-template";
    const make = getVal("modalNewCarMake") || "Custom";
    const model = getVal("modalNewCarModel") || "Vehicle";
    const year = getVal("modalNewCarYear");
    const plate = getVal("modalNewCarPlate");
    const mileage = Number(getVal("modalNewCarMileage")) || 0;
    const currency = getVal("modalNewCarCurrency") || "USD";
    const engine = getVal("modalNewCarEngine");
    const trans = getVal("modalNewCarTrans");

    const baseObj = BUILTIN_PROFILES[baseKey] || BUILTIN_PROFILES["blank-template"];
    const newProfile = JSON.parse(JSON.stringify(baseObj)) as VehicleProfile;

    const newId = "car-" + Date.now();
    newProfile.schemaVersion = "2.0";
    newProfile.currency = currency;
    newProfile.lastUpdated = new Date().toISOString().slice(0, 10);
    if (!newProfile.vehicle) {
      newProfile.vehicle = { id: newId, make, model, year: null, currentMileageKm: mileage };
    }
    newProfile.vehicle.id = newId;
    newProfile.vehicle.make = make;
    newProfile.vehicle.model = model;
    newProfile.vehicle.year = year ? Number(year) : null;
    newProfile.vehicle.plateNumber = plate || null;
    newProfile.vehicle.currentMileageKm = mileage;
    newProfile.vehicle.engine = engine || "";
    newProfile.vehicle.transmission = trans || "";
    newProfile.vehicle.latestServiceDate = new Date().toISOString().slice(0, 10);

    localStorage.setItem(STORAGE_PREFIX + newId, JSON.stringify(newProfile));
    registerCustomProfileOption(newId, `${make} ${model}`.trim());
    void loadProfile(newId);

    closeVehiclesModal();
    (e.target as HTMLFormElement).reset();
    showToast(`Vehicle "${make} ${model}" created & switched`);
  });
}
