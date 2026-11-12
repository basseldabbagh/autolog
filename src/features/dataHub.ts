import { BUILTIN_PROFILES } from "../config/profiles";
import {
  getActiveProfileKey,
  getAppData,
  registerCustomProfileOption,
  saveToLocal,
  setActiveProfileKey,
  setAppData,
  STORAGE_PREFIX,
} from "../state/store";
import type { VehicleProfile } from "../types";
import { copyTextSafe, showToast, triggerDownload } from "../utils/format";

export function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export function buildCsvFromData(dataObj: VehicleProfile | null): string {
  const source: VehicleProfile = dataObj && dataObj.vehicle ? dataObj : BUILTIN_PROFILES["blank-template"];

  const headers = [
    "Record_Type",
    "Name_Or_Title",
    "Category_Or_Field",
    "Interval_Km_Or_Value",
    "Last_Serviced_Km_Or_Mileage",
    "Next_Due_Km",
    "Date",
    "Cost",
    "Paid",
    "Status_Or_Method",
    "Notes",
    "Mechanic",
  ];
  const rows = [headers.join(",")];
  const v = source.vehicle;
  const curKm = Number(v.currentMileageKm) || 0;

  const metaEntries: [string, string | number][] = [
    ["Make", v.make || ""],
    ["Model", v.model || ""],
    ["Year", v.year || ""],
    ["Plate_Number", v.plateNumber || ""],
    ["Engine", v.engine || ""],
    ["Engine_Number", v.engineNumber || ""],
    ["Chassis_Number", v.chassisNumber || ""],
    ["Transmission", v.transmission || ""],
    ["Current_Mileage_Km", curKm],
    ["Latest_Service_Date", v.latestServiceDate || ""],
    ["Road_Tax_Expiry", v.roadTaxExpiry || ""],
    ["Insurance_Expiry", v.insuranceExpiry || ""],
    ["Currency", source.currency || "MYR"],
  ];
  metaEntries.forEach(([key, val]) => {
    rows.push(["META", key, "Vehicle_Info", val, "", "", "", "", "", "", "", ""].map(escapeCsvCell).join(","));
  });

  (source.periodicSchedule || []).forEach((item) => {
    const lastKm =
      item.lastServicedKm !== null && item.lastServicedKm !== undefined && String(item.lastServicedKm) !== ""
        ? Number(item.lastServicedKm)
        : "";
    const nextKm = lastKm !== "" ? lastKm + Number(item.intervalKm || 0) : "";
    rows.push(
      [
        "SCHEDULE",
        item.name || "",
        item.category || "General",
        item.intervalKm || "",
        lastKm,
        nextKm,
        item.lastServicedDate || "",
        item.estimatedCostMyr !== null && item.estimatedCostMyr !== undefined ? item.estimatedCostMyr : "",
        "",
        "",
        item.oemPartNumber || "",
        item.intervalMonths || "",
      ]
        .map(escapeCsvCell)
        .join(","),
    );
  });

  (source.maintenanceHistory || []).forEach((rec) => {
    rows.push(
      [
        "HISTORY",
        rec.title || "",
        rec.category || "Service",
        "",
        rec.mileageKm !== null && rec.mileageKm !== undefined ? rec.mileageKm : "",
        "",
        rec.date || "",
        rec.costMyr !== null && rec.costMyr !== undefined ? rec.costMyr : "",
        rec.paidMyr !== null && rec.paidMyr !== undefined ? rec.paidMyr : "",
        rec.paymentMethod || "Workshop Fees",
        rec.notes || "",
        rec.mechanic || "",
      ]
        .map(escapeCsvCell)
        .join(","),
    );
  });

  return "\uFEFF" + rows.join("\r\n");
}

export function parseCsvText(csvText: string): VehicleProfile {
  const cleanText = csvText.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const ch = cleanText[i];
    const nextCh = cleanText[i + 1];
    if (inQuotes) {
      if (ch === '"' && nextCh === '"') {
        currentCell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        currentCell += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        currentRow.push(currentCell.trim());
        currentCell = "";
      } else if (ch === "\n" || (ch === "\r" && nextCh === "\n")) {
        if (ch === "\r") i++;
        currentRow.push(currentCell.trim());
        if (currentRow.some((c) => c !== "")) rows.push(currentRow);
        currentRow = [];
        currentCell = "";
      } else {
        currentCell += ch;
      }
    }
  }
  if (currentCell !== "" || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c !== "")) rows.push(currentRow);
  }

  if (rows.length < 2) throw new Error("CSV file is empty.");

  const newObj = JSON.parse(JSON.stringify(BUILTIN_PROFILES["blank-template"])) as VehicleProfile;
  newObj.periodicSchedule = [];
  newObj.maintenanceHistory = [];

  for (let r = 1; r < rows.length; r++) {
    const cols = rows[r];
    const type = (cols[0] || "").toUpperCase();
    const col1 = cols[1] || "";
    const col2 = cols[2] || "";
    const col3 = cols[3] || "";
    const col4 = cols[4] || "";
    const col6 = cols[6] || "";
    const col7 = cols[7] || "";
    const col8 = cols[8] || "";
    const col9 = cols[9] || "";
    const col10 = cols[10] || "";
    const col11 = cols[11] || "";

    if (type === "META") {
      const key = col1.toLowerCase();
      if (key === "make") newObj.vehicle.make = col3;
      else if (key === "model") newObj.vehicle.model = col3;
      else if (key === "year") newObj.vehicle.year = Number(col3) || col3;
      else if (key === "plate_number") newObj.vehicle.plateNumber = col3;
      else if (key === "engine") newObj.vehicle.engine = col3;
      else if (key === "engine_number") newObj.vehicle.engineNumber = col3;
      else if (key === "chassis_number") newObj.vehicle.chassisNumber = col3;
      else if (key === "transmission") newObj.vehicle.transmission = col3;
      else if (key === "current_mileage_km") newObj.vehicle.currentMileageKm = Number(col3) || 0;
      else if (key === "latest_service_date") newObj.vehicle.latestServiceDate = col3;
      else if (key === "road_tax_expiry") newObj.vehicle.roadTaxExpiry = col3;
      else if (key === "insurance_expiry") newObj.vehicle.insuranceExpiry = col3;
      else if (key === "currency") newObj.currency = col3 || "MYR";
    } else if (type === "SCHEDULE") {
      if (!col1) continue;
      newObj.periodicSchedule.push({
        id: "sched-" + r,
        name: col1,
        category: col2 || "General",
        intervalKm: Number(col3.replace(/,/g, "")) || 10000,
        intervalMonths: col11 ? Number(col11.replace(/,/g, "")) || null : null,
        lastServicedKm: col4 !== "" ? Number(col4.replace(/,/g, "")) : null,
        lastServicedDate: col6 || null,
        estimatedCostMyr: col7 !== "" ? Number(col7.replace(/,/g, "")) : null,
        oemPartNumber: col10 || "",
      });
    } else if (type === "HISTORY") {
      if (!col1) continue;
      newObj.maintenanceHistory.push({
        id: "hist-" + r,
        date: col6 || "",
        mileageKm: col4 !== "" ? Number(col4.replace(/,/g, "")) : null,
        title: col1,
        category: col2 || "Service",
        mechanic: col11 || "",
        costMyr: col7 !== "" ? Number(col7.replace(/,/g, "")) : null,
        paidMyr: col8 !== "" ? Number(col8.replace(/,/g, "")) : null,
        paymentMethod: col9 || "Workshop Fees",
        status: "Completed",
        notes: col10 || "",
      });
    } else if (col1 && !isNaN(Number(col2.replace(/,/g, "")))) {
      newObj.periodicSchedule.push({
        id: "sched-simple-" + r,
        name: col1,
        category: "Service",
        intervalKm: Number(col2.replace(/,/g, "")) || 10000,
        intervalMonths: null,
        lastServicedKm: col3 !== "" ? Number(col3.replace(/,/g, "")) : null,
        lastServicedDate: null,
        estimatedCostMyr: null,
      });
    }
  }

  const slug = `${newObj.vehicle.make}-${newObj.vehicle.model}-${newObj.vehicle.year}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  newObj.vehicle.id = slug || "imported-" + Date.now();
  newObj.lastUpdated = new Date().toISOString().slice(0, 10);
  return newObj;
}

export function initDataHubListeners(onRenderAll: () => void): void {
  const dataHubModal = document.getElementById("dataHubModal");
  const hubTabCsv = document.getElementById("hubTabCsv");
  const hubTabJson = document.getElementById("hubTabJson");
  const jsonTextarea = document.getElementById("jsonTextarea") as HTMLTextAreaElement | null;
  const jsonErrorMsg = document.getElementById("jsonErrorMsg");
  const csvStatusMsg = document.getElementById("csvStatusMsg");

  const switchHubTab = (tabName: string): void => {
    document.querySelectorAll<HTMLButtonElement>(".hub-tab-btn").forEach((b) => {
      const isMatch = b.getAttribute("data-hub-tab") === tabName;
      b.className = isMatch
        ? "hub-tab-btn px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white transition"
        : "hub-tab-btn px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 transition";
    });
    if (tabName === "csv") {
      hubTabCsv?.classList.remove("hidden");
      hubTabJson?.classList.add("hidden");
      hubTabJson?.classList.remove("flex");
    } else {
      hubTabCsv?.classList.add("hidden");
      hubTabJson?.classList.remove("hidden");
      hubTabJson?.classList.add("flex");
      if (jsonTextarea) jsonTextarea.value = JSON.stringify(getAppData(), null, 2);
      jsonErrorMsg?.classList.add("hidden");
    }
  };

  document.querySelectorAll<HTMLButtonElement>(".hub-tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchHubTab(btn.getAttribute("data-hub-tab") || "csv"));
  });

  document.getElementById("openDataHubBtn")?.addEventListener("click", () => {
    window.closeSettingsModal?.();
    csvStatusMsg?.classList.add("hidden");
    if (jsonTextarea) jsonTextarea.value = JSON.stringify(getAppData(), null, 2);
    dataHubModal?.classList.remove("hidden");
    dataHubModal?.classList.add("flex");
  });

  document.getElementById("closeDataHubBtn")?.addEventListener("click", () => {
    dataHubModal?.classList.add("hidden");
    dataHubModal?.classList.remove("flex");
  });

  document.getElementById("downloadCsvTemplateBtn")?.addEventListener("click", () => {
    const templateData = JSON.parse(JSON.stringify(BUILTIN_PROFILES["blank-template"])) as VehicleProfile;
    templateData.maintenanceHistory = [
      {
        date: new Date().toISOString().slice(0, 10),
        mileageKm: 50000,
        title: "Engine Oil & Filter",
        category: "Periodic & Fluids",
        costMyr: 150,
        paidMyr: 150,
        paymentMethod: "Workshop Fees",
        status: "Completed",
        notes: "5W-30 Synthetic",
      },
    ];
    triggerDownload(buildCsvFromData(templateData), "car-maintenance-template.csv", "text/csv;charset=utf-8;");
  });

  document.getElementById("exportCurrentCsvBtn")?.addEventListener("click", () => {
    const appData = getAppData();
    if (!appData || !appData.vehicle) {
      showToast("No active vehicle to export. Please add or select a car first.");
      return;
    }
    const filename = ((appData.vehicle.id || "car-maintenance") + ".csv").toLowerCase();
    triggerDownload(buildCsvFromData(appData), filename, "text/csv;charset=utf-8;");
  });

  document.getElementById("csvFileInput")?.addEventListener("change", (e) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const importedData = parseCsvText(String(ev.target?.result || ""));
        setAppData(importedData);
        const key = importedData.vehicle?.id || "imported-" + Date.now();
        setActiveProfileKey(key);
        registerCustomProfileOption(key, `${importedData.vehicle.make} ${importedData.vehicle.model}`);
        saveToLocal(true);
        onRenderAll();
        if (csvStatusMsg) {
          csvStatusMsg.textContent = `Imported & saved "${file.name}" to localStorage.`;
          csvStatusMsg.className = "font-mono text-xs pt-1 text-emerald-400";
          csvStatusMsg.classList.remove("hidden");
        }
        showToast("CSV imported & saved");
      } catch (err) {
        if (csvStatusMsg) {
          csvStatusMsg.textContent = "Error: " + (err instanceof Error ? err.message : String(err));
          csvStatusMsg.className = "font-mono text-xs pt-1 text-rose-400";
          csvStatusMsg.classList.remove("hidden");
        }
      }
    };
    reader.readAsText(file);
  });

  document.getElementById("downloadJsonTemplateBtn")?.addEventListener("click", () => {
    const templateData = JSON.parse(JSON.stringify(BUILTIN_PROFILES["blank-template"]));
    triggerDownload(JSON.stringify(templateData, null, 2), "car-maintenance-template.json", "application/json");
  });

  document.getElementById("jsonFileInput")?.addEventListener("change", (e) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(String(ev.target?.result || "")) as VehicleProfile;
        setAppData(parsed);
        if (parsed.vehicle?.id) {
          setActiveProfileKey(parsed.vehicle.id);
          registerCustomProfileOption(
            parsed.vehicle.id,
            `${parsed.vehicle.make || ""} ${parsed.vehicle.model || ""}`.trim(),
          );
        }
        saveToLocal(true);
        if (jsonTextarea) jsonTextarea.value = JSON.stringify(parsed, null, 2);
        onRenderAll();
        showToast("JSON imported & saved");
      } catch (err) {
        if (jsonErrorMsg) {
          jsonErrorMsg.textContent = "Invalid JSON: " + (err instanceof Error ? err.message : String(err));
          jsonErrorMsg.classList.remove("hidden");
        }
      }
    };
    reader.readAsText(file);
  });

  document.getElementById("exportJsonBtn")?.addEventListener("click", () => {
    const appData = getAppData();
    if (!appData || !appData.vehicle) {
      showToast("No active vehicle to export. Please add or select a car first.");
      return;
    }
    saveToLocal(true);
    const filename = (appData.vehicle.id || "car-maintenance") + ".json";
    triggerDownload(JSON.stringify(appData, null, 2), filename, "application/json");
  });

  document.getElementById("copyJsonBtn")?.addEventListener("click", () => {
    if (jsonTextarea) {
      copyTextSafe(jsonTextarea.value, "JSON copied to clipboard");
    }
  });

  document.getElementById("applyJsonBtn")?.addEventListener("click", () => {
    if (!jsonTextarea) return;
    try {
      const parsed = JSON.parse(jsonTextarea.value) as VehicleProfile;
      setAppData(parsed);
      if (parsed.vehicle?.id) {
        setActiveProfileKey(parsed.vehicle.id);
        registerCustomProfileOption(
          parsed.vehicle.id,
          `${parsed.vehicle.make || ""} ${parsed.vehicle.model || ""}`.trim(),
        );
      }
      saveToLocal(true);
      onRenderAll();
      dataHubModal?.classList.add("hidden");
      dataHubModal?.classList.remove("flex");
      showToast("JSON saved to localStorage");
    } catch (err) {
      if (jsonErrorMsg) {
        jsonErrorMsg.textContent = "JSON Error: " + (err instanceof Error ? err.message : String(err));
        jsonErrorMsg.classList.remove("hidden");
      }
    }
  });

  document.getElementById("resetStorageBtn")?.addEventListener("click", () => {
    const activeProfileKey = getActiveProfileKey();
    if (!activeProfileKey) return;
    localStorage.removeItem(STORAGE_PREFIX + activeProfileKey);
    const resetData = JSON.parse(
      JSON.stringify(BUILTIN_PROFILES[activeProfileKey] || BUILTIN_PROFILES["blank-template"]),
    ) as VehicleProfile;
    setAppData(resetData);
    saveToLocal(false);
    if (jsonTextarea) jsonTextarea.value = JSON.stringify(resetData, null, 2);
    onRenderAll();
    showToast("Reset to default");
  });
}
