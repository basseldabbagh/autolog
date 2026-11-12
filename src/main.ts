import { initTailwindConfig } from "./config/tailwind";
import { initChartListeners } from "./features/charts";
import { initCookieConsent } from "./features/cookieConsent";
import { initDataHubListeners } from "./features/dataHub";
import { initFuelListeners } from "./features/fuel";
import { autoSyncToGoogleDrive, initGoogleDriveListeners } from "./features/googleDrive";
import { syncProfileSelectOptions } from "./features/headerKpis";
import { initHistoryListeners } from "./features/history";
import { initOdometerListeners } from "./features/odometer";
import { initPeriodicScheduleListeners, renderPeriodicTable } from "./features/periodicSchedule";
import {
  renderAll,
  renderDashboardLiveMetrics,
  renderFilterDependentViews,
} from "./features/render";
import { initReportListeners } from "./features/reports";
import { initVehicleAndSettingsListeners } from "./features/settings";
import { initShareListeners } from "./features/share";
import { applyInitialThemeClass, initThemeFeature } from "./features/theme";
import { initWelcomeListeners } from "./features/welcome";
import {
  getActiveProfileKey,
  getCustomProfilesMap,
  loadProfile,
  registerStoreCallbacks,
  setActiveProfileKey,
  setAppData,
} from "./state/store";
import { updateDynamicSEO } from "./utils/seo";
import { initGlobalFilterListeners, restoreFiltersFromUrl, syncFiltersToUrl } from "./utils/urlFilters";

// Configure Tailwind CDN & initial theme class immediately
applyInitialThemeClass();
initTailwindConfig();

// Connect store persistence & rendering hooks
registerStoreCallbacks({
  onRenderAll: renderAll,
  onSyncProfileSelectOptions: syncProfileSelectOptions,
  onUpdateSeo: updateDynamicSEO,
  onAutoSyncDrive: autoSyncToGoogleDrive,
});

document.addEventListener("DOMContentLoaded", () => {
  const customMap = getCustomProfilesMap();
  const savedKeys = Object.keys(customMap);

  restoreFiltersFromUrl();

  let activeProfileKey = getActiveProfileKey();
  if (activeProfileKey && !customMap[activeProfileKey]) {
    activeProfileKey = savedKeys.length > 0 ? savedKeys[0] : null;
    setActiveProfileKey(activeProfileKey);
  } else if (!activeProfileKey && savedKeys.length > 0) {
    activeProfileKey = savedKeys[0];
    setActiveProfileKey(activeProfileKey);
  }

  syncProfileSelectOptions();

  if (activeProfileKey && customMap[activeProfileKey]) {
    void loadProfile(activeProfileKey);
  } else {
    setActiveProfileKey(null);
    setAppData(null);
    renderAll();
  }

  window.addEventListener("popstate", () => {
    restoreFiltersFromUrl();
    const key = getActiveProfileKey();
    if (key && getCustomProfilesMap()[key]) {
      void loadProfile(key);
    } else {
      renderAll();
    }
  });

  // Car Profile Switcher
  document.getElementById("carProfileSelect")?.addEventListener("change", (e) => {
    void loadProfile((e.target as HTMLSelectElement).value);
    syncFiltersToUrl();
  });

  // Initialize Feature Listeners
  initThemeFeature();
  initWelcomeListeners();
  initOdometerListeners(renderDashboardLiveMetrics, renderAll);
  initGlobalFilterListeners(renderFilterDependentViews);
  initPeriodicScheduleListeners(() => renderPeriodicTable(renderDashboardLiveMetrics), renderAll);
  initChartListeners();
  initFuelListeners(renderAll);
  initHistoryListeners(renderAll);
  initReportListeners();
  initDataHubListeners(renderAll);
  initShareListeners();
  initGoogleDriveListeners(renderAll);
  initVehicleAndSettingsListeners(renderAll);
  initCookieConsent();

  // Register Service Worker for PWA (Installable App & Offline Mode)
  if ("serviceWorker" in navigator && window.location.protocol.startsWith("http")) {
    navigator.serviceWorker
      .register("./sw.js")
      .then((reg) => {
        reg.update();
      })
      .catch((err) => console.log("SW registration note:", err));
  }

  // Dismiss App Preloader smoothly
  const preloader = document.getElementById("appPreloader");
  if (preloader) {
    setTimeout(() => {
      preloader.classList.add("opacity-0", "pointer-events-none");
      setTimeout(() => preloader.remove(), 400);
    }, 250);
  }
});
