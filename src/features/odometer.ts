import { BUILTIN_PROFILES } from "../config/profiles";
import { getActiveProfileKey, getAppData, saveToLocal } from "../state/store";
import { formatNumber, showToast } from "../utils/format";

export function initOdometerListeners(
  onLiveUpdate: () => void,
  onFullRender: () => void,
): void {
  document.getElementById("currentMileageInput")?.addEventListener("input", (e) => {
    const appData = getAppData();
    if (!appData || !appData.vehicle) return;
    const val = Number((e.target as HTMLInputElement).value);
    if (!isNaN(val) && val >= 0) {
      appData.vehicle.currentMileageKm = val;
      saveToLocal(true);
      onLiveUpdate();
    }
  });

  document.querySelectorAll<HTMLButtonElement>(".km-step-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const appData = getAppData();
      if (!appData || !appData.vehicle) return;
      const step = Number(btn.getAttribute("data-km-step")) || 1000;
      appData.vehicle.currentMileageKm = (Number(appData.vehicle.currentMileageKm) || 0) + step;
      saveToLocal(true);
      onFullRender();
      showToast(`Odometer: ${formatNumber(appData.vehicle.currentMileageKm)} km`);
    });
  });

  document.getElementById("resetMileageBtn")?.addEventListener("click", () => {
    const appData = getAppData();
    const activeProfileKey = getActiveProfileKey();
    if (!appData || !appData.vehicle) return;
    const defKm = (activeProfileKey && BUILTIN_PROFILES[activeProfileKey]?.vehicle?.currentMileageKm) || 0;
    appData.vehicle.currentMileageKm = defKm;
    saveToLocal(true);
    onFullRender();
    showToast("Odometer reset");
  });
}
