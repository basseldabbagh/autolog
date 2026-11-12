import { getAppData, hasSavedCars } from "../state/store";
import { syncCategoryFilterOptions, syncFiltersToUrl } from "../utils/urlFilters";
import { renderSvgCharts } from "./charts";
import { renderFuelEfficiencySection } from "./fuel";
import {
  renderFooterSpecs,
  renderHeaderAndKPIs,
  syncProfileSelectOptions,
  updateVehicleIcons,
} from "./headerKpis";
import { populateLinkedItemSelect, renderHistoryList } from "./history";
import { renderPeriodicTable } from "./periodicSchedule";
import { renderWelcomeTemplates } from "./welcome";

export function renderDashboardLiveMetrics(): void {
  renderHeaderAndKPIs();
  renderPeriodicTable(renderDashboardLiveMetrics);
  renderSvgCharts();
}

export function renderFilterDependentViews(): void {
  renderHeaderAndKPIs();
  renderSvgCharts();
  renderHistoryList();
}

export function renderAll(): void {
  const welcomeView = document.getElementById("emptyGarageWelcomeView");
  const dashboardView = document.getElementById("vehicleDashboardView");
  const appData = getAppData();
  const hasCars = hasSavedCars() && Boolean(appData && appData.vehicle);

  if (!hasCars) {
    welcomeView?.classList.remove("hidden");
    dashboardView?.classList.add("hidden");
    syncProfileSelectOptions();
    updateVehicleIcons("blank-template");
    const titleEl = document.getElementById("headerCarTitle");
    if (titleEl) titleEl.textContent = "Vehicle Maintenance";
    document.getElementById("headerPlateBadge")?.classList.add("hidden");
    document.getElementById("editVehicleBtn")?.classList.add("hidden");
    const subEl = document.getElementById("headerEngineSub");
    if (subEl) subEl.textContent = "No car selected • Pick a template below to get started";
    renderWelcomeTemplates();
    syncFiltersToUrl();
    return;
  }

  welcomeView?.classList.add("hidden");
  dashboardView?.classList.remove("hidden");
  document.getElementById("headerPlateBadge")?.classList.remove("hidden");
  document.getElementById("editVehicleBtn")?.classList.remove("hidden");

  syncCategoryFilterOptions();
  renderHeaderAndKPIs();
  renderPeriodicTable(renderDashboardLiveMetrics);
  renderSvgCharts();
  renderFuelEfficiencySection();
  renderHistoryList();
  renderFooterSpecs();
  populateLinkedItemSelect();
  syncFiltersToUrl();
}
