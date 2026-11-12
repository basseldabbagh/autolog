import { getAppData } from "../state/store";
import { copyTextSafe, formatNumber } from "../utils/format";
import { computeItemStatus } from "./periodicSchedule";
import { generateA4HistoryReportTab, generateA4StatusReportTab } from "./reports";

export function buildShareSummaryText(): string {
  const appData = getAppData();
  if (!appData || !appData.vehicle) {
    return (
      "MotoFolio — Universal Vehicle Maintenance Tracker\n" +
      (window.location.origin.includes("pages.dev") ? window.location.href : "https://motofolio.pages.dev/")
    );
  }
  const v = appData.vehicle;
  const curKm = Number(v.currentMileageKm) || 0;
  const sched = appData.periodicSchedule || [];
  const activeLines = sched
    .filter((i) => i.lastServicedKm !== null && i.lastServicedKm !== undefined && String(i.lastServicedKm) !== "")
    .map((i) => {
      const st = computeItemStatus(i, curKm);
      return `• ${i.name}: Next @ ${formatNumber(st.nextDueKm)} km (${st.label})`;
    });

  return [
    `MotoFolio Report: ${v.year || ""} ${v.make || ""} ${v.model || ""} (${v.plateNumber || "N/A"})`.trim(),
    `Odometer: ${formatNumber(curKm)} km | Updated: ${appData.lastUpdated || "—"}`,
    activeLines.length ? `\nTracked Services:\n${activeLines.join("\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function initShareListeners(): void {
  const shareModal = document.getElementById("shareModal");

  document.getElementById("openShareModalBtn")?.addEventListener("click", () => {
    const preview = document.getElementById("shareSummaryPreview");
    if (preview) preview.textContent = buildShareSummaryText();
    shareModal?.classList.remove("hidden");
    shareModal?.classList.add("flex");
  });

  document.getElementById("closeShareModalBtn")?.addEventListener("click", () => {
    shareModal?.classList.add("hidden");
    shareModal?.classList.remove("flex");
  });

  document.getElementById("shareOpenStatusA4Btn")?.addEventListener("click", () => {
    shareModal?.classList.add("hidden");
    shareModal?.classList.remove("flex");
    generateA4StatusReportTab();
  });

  document.getElementById("shareOpenHistoryA4Btn")?.addEventListener("click", () => {
    shareModal?.classList.add("hidden");
    shareModal?.classList.remove("flex");
    generateA4HistoryReportTab();
  });

  document.getElementById("copyShareTextBtn")?.addEventListener("click", async () => {
    const text = buildShareSummaryText();
    if (navigator.share) {
      try {
        await navigator.share({ title: document.title, text, url: window.location.href });
        return;
      } catch {
        // fallback to copy
      }
    }
    copyTextSafe(text, "Report text copied for WhatsApp");
  });

  document.getElementById("copyShareUrlBtn")?.addEventListener("click", () => {
    copyTextSafe(window.location.href, "Sharable link with current filters copied to clipboard!");
  });
}
