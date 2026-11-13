import { renderGoogleAuthButtons } from "../components/googleAuthButton";
import {
  clearAllLocalVehicles,
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
} from "../state/store";
import type { GoogleTokenClient, VehicleProfile } from "../types";
import { escapeHtml, showToast } from "../utils/format";
import { buildCsvFromData, parseCsvText } from "./dataHub";
import { syncProfileSelectOptions } from "./headerKpis";

const GDRIVE_STORAGE_TOKEN = "motofolio_gdrive_token";
const GDRIVE_STORAGE_EMAIL = "motofolio_gdrive_email";
const GDRIVE_STORAGE_NAME = "motofolio_gdrive_name";
const GDRIVE_STORAGE_FOLDER_ID = "motofolio_gdrive_folder_id";
const GDRIVE_STORAGE_FOLDER_NAME = "autolog_gdrive_folder_name";
const GDRIVE_STORAGE_AUTOSYNC = "motofolio_gdrive_autosync";
const GDRIVE_FOLDER_NAME = "MotoFolio";

let gdriveTokenClient: GoogleTokenClient | null = null;
let gdriveAutoSyncTimer: ReturnType<typeof setTimeout> | null = null;
let onRenderAllCallback: (() => void) | null = null;

export function getDriveClientId(): string {
  const runtimeId = window.MOTOFOLIO_CONFIG?.GOOGLE_CLIENT_ID;
  if (typeof runtimeId === "string" && runtimeId.trim()) {
    return runtimeId.trim();
  }
  const envId = import.meta.env.VITE_GOOGLE_CLIENT_ID || import.meta.env.GOOGLE_CLIENT_ID;
  return typeof envId === "string" ? envId.trim() : "";
}

export function getDriveFolderName(): string {
  return localStorage.getItem(GDRIVE_STORAGE_FOLDER_NAME) || GDRIVE_FOLDER_NAME;
}

export function getDriveAccessToken(): string {
  return sessionStorage.getItem(GDRIVE_STORAGE_TOKEN) || "";
}

export function isDriveAutoSyncEnabled(): boolean {
  const stored = localStorage.getItem(GDRIVE_STORAGE_AUTOSYNC);
  return stored === null ? true : stored === "true";
}

export function getDriveUserName(): string {
  return localStorage.getItem(GDRIVE_STORAGE_NAME) || "";
}

export function getDriveUserEmail(): string {
  return localStorage.getItem(GDRIVE_STORAGE_EMAIL) || "";
}

export function updateDriveUI(): void {
  const token = getDriveAccessToken();
  const email = getDriveUserEmail();
  const userName = getDriveUserName();
  const unauthSec = document.getElementById("driveUnauthSection");
  const authSec = document.getElementById("driveAuthSection");
  const emailSpan = document.getElementById("driveAccountEmail");
  const autoSyncCheck = document.getElementById("driveAutoSyncCheckbox") as HTMLInputElement | null;
  const folderInp = document.getElementById("driveFolderNameInput") as HTMLInputElement | null;

  if (folderInp) folderInp.value = getDriveFolderName();
  if (autoSyncCheck) autoSyncCheck.checked = isDriveAutoSyncEnabled();

  renderGoogleAuthButtons({
    connected: Boolean(token),
    userName,
    email,
  });

  if (token) {
    unauthSec?.classList.add("hidden");
    authSec?.classList.remove("hidden");
    if (emailSpan) {
      emailSpan.textContent = email || userName || "Connected";
    }
  } else {
    unauthSec?.classList.remove("hidden");
    authSec?.classList.add("hidden");
    if (emailSpan) emailSpan.textContent = "";
    hideDriveCarPicker();
  }
}

export async function scanDriveFolders(): Promise<void> {
  const token = getDriveAccessToken();
  const container = document.getElementById("driveExistingFoldersList");
  if (!token || !container) return;

  try {
    container.classList.remove("hidden");
    container.innerHTML = `<div class="p-2 text-slate-400 text-center flex items-center justify-center gap-2"><img src="/images/identity/spinner-light.png" class="w-4 h-4 spinning spininng hidden dark:inline-block" alt="" /><img src="/images/identity/spinner.png" class="w-4 h-4 spinning spininng inline-block dark:hidden" alt="" /><span>Scanning folders...</span></div>`;

    const q = encodeURIComponent("mimeType = 'application/vnd.google-apps.folder' and trashed = false");
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&pageSize=30`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      container.innerHTML = `<div class="p-2 text-slate-500 text-center">Type a folder name above to create or use it.</div>`;
      return;
    }

    const data = (await res.json()) as { files?: Array<{ id: string; name: string }> };
    const currentFolderName = getDriveFolderName();
    const folders = data.files || [];

    if (folders.length === 0) {
      container.innerHTML = `<div class="p-2 text-slate-500 text-center">No existing folders found. Enter a name above to create one.</div>`;
      return;
    }

    let listHtml = `<div class="text-[10px] text-slate-400 font-semibold px-1 py-0.5">Select an existing folder:</div>`;
    folders.forEach((f) => {
      const isSelected = f.name === currentFolderName;
      listHtml += `
        <button
          type="button"
          class="drive-select-folder-item w-full text-left px-2 py-1.5 rounded flex items-center justify-between hover:bg-indigo-600/20 hover:text-indigo-200 transition ${isSelected ? "bg-indigo-600/30 text-indigo-300 font-semibold" : "text-slate-300"}"
          data-folder-id="${escapeHtml(f.id)}"
          data-folder-name="${escapeHtml(f.name)}"
        >
          <span class="truncate flex items-center gap-1.5">
            <svg class="w-3 h-3 text-amber-400 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/></svg>
            ${escapeHtml(f.name)}
          </span>
          ${isSelected ? '<span class="text-[9px] text-emerald-400 font-mono shrink-0">Active</span>' : ""}
        </button>
      `;
    });
    container.innerHTML = listHtml;

    container.querySelectorAll<HTMLButtonElement>(".drive-select-folder-item").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const fId = btn.getAttribute("data-folder-id");
        const fName = btn.getAttribute("data-folder-name");
        if (fName) {
          const inp = document.getElementById("driveFolderNameInput") as HTMLInputElement | null;
          if (inp) inp.value = fName;
          localStorage.setItem(GDRIVE_STORAGE_FOLDER_NAME, fName);
          if (fId) localStorage.setItem(GDRIVE_STORAGE_FOLDER_ID, fId);
          showToast(`Drive folder set to "${fName}"`);
          await scanDriveFolders();
        }
      });
    });
  } catch (err) {
    console.warn("Scan folders error:", err);
    container.classList.add("hidden");
  }
}

async function findOrCreateMotoFolioFolder(token: string): Promise<string> {
  const targetFolderName = getDriveFolderName();
  let folderId = localStorage.getItem(GDRIVE_STORAGE_FOLDER_ID);
  const headers = { Authorization: `Bearer ${token}` };

  if (folderId) {
    try {
      const checkRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,name,trashed`,
        { headers },
      );
      if (checkRes.ok) {
        const folder = (await checkRes.json()) as { id: string; name: string; trashed: boolean };
        if (!folder.trashed && folder.name === targetFolderName) return folderId;
      }
    } catch {
      // ignore and search
    }
  }

  const query = encodeURIComponent(
    `mimeType = 'application/vnd.google-apps.folder' and (name = '${targetFolderName}' or name = 'MotoFolio' or name = 'AutoLog') and trashed = false`,
  );
  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
    headers,
  });
  if (searchRes.ok) {
    const searchData = (await searchRes.json()) as { files?: Array<{ id: string }> };
    if (searchData.files && searchData.files.length > 0) {
      folderId = searchData.files[0].id;
      localStorage.setItem(GDRIVE_STORAGE_FOLDER_ID, folderId);
      return folderId;
    }
  }

  const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: targetFolderName,
      mimeType: "application/vnd.google-apps.folder",
    }),
  });

  if (!createRes.ok) throw new Error(`Could not create "${targetFolderName}" folder in Google Drive.`);
  const newFolder = (await createRes.json()) as { id: string };
  folderId = newFolder.id;
  localStorage.setItem(GDRIVE_STORAGE_FOLDER_ID, folderId);
  return folderId;
}

async function uploadVehicleCsvToDrive(
  token: string,
  folderId: string,
  carObj: VehicleProfile,
  fallbackKey: string,
): Promise<string> {
  const headers = { Authorization: `Bearer ${token}` };
  const carId = (carObj.vehicle?.id || fallbackKey || "car-maintenance").toLowerCase();
  const fileName = `${carId}.csv`;
  const csvContent = buildCsvFromData(carObj);

  const query = encodeURIComponent(`'${folderId}' in parents and name = '${fileName}' and trashed = false`);
  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
    headers,
  });
  let existingFileId: string | null = null;

  if (searchRes.ok) {
    const sData = (await searchRes.json()) as { files?: Array<{ id: string }> };
    if (sData.files && sData.files.length > 0) {
      existingFileId = sData.files[0].id;
    }
  }

  if (existingFileId) {
    const updateRes = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`,
      {
        method: "PATCH",
        headers: {
          ...headers,
          "Content-Type": "text/csv;charset=utf-8",
        },
        body: csvContent,
      },
    );
    if (!updateRes.ok) throw new Error(`Failed to update ${fileName} in Google Drive.`);
  } else {
    const metadata = {
      name: fileName,
      parents: [folderId],
      mimeType: "text/csv",
    };
    const boundary = "-------MotoFolioBoundary" + Date.now();
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartBody =
      delimiter +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      JSON.stringify(metadata) +
      delimiter +
      "Content-Type: text/csv; charset=UTF-8\r\n\r\n" +
      csvContent +
      closeDelimiter;

    const createRes = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    });
    if (!createRes.ok) throw new Error(`Failed to create ${fileName} in Google Drive.`);
  }

  return fileName;
}

export async function syncCurrentCarToDrive(showNotification = true): Promise<void> {
  const token = getDriveAccessToken();
  const appData = getAppData();
  const activeProfileKey = getActiveProfileKey();
  const statusMsg = document.getElementById("driveSyncStatusMsg");
  if (!token || !appData || !appData.vehicle) return;

  try {
    if (statusMsg) statusMsg.textContent = "Saving current vehicle to Google Drive...";
    const folderId = await findOrCreateMotoFolioFolder(token);
    const fileName = await uploadVehicleCsvToDrive(token, folderId, appData, activeProfileKey || "car-maintenance");

    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (statusMsg) {
      statusMsg.textContent = `Saved "${fileName}" to ${getDriveFolderName()} at ${nowTime}`;
      statusMsg.className = "text-center font-mono text-[11px] text-emerald-400 pt-1";
    }
    if (showNotification) showToast(`Saved ${fileName} to Drive`);
  } catch (err) {
    console.error("Drive Sync Error:", err);
    if (statusMsg) {
      statusMsg.textContent = "Save failed: " + (err instanceof Error ? err.message : String(err));
      statusMsg.className = "text-center font-mono text-[11px] text-rose-400 pt-1";
    }
  }
}

interface DrivePickerItem {
  id: string;
  label: string;
  badge?: string;
}

function hideDriveCarPicker(): void {
  const panel = document.getElementById("driveCarPickerPanel");
  if (panel) {
    panel.classList.add("hidden");
    panel.innerHTML = "";
  }
}

function renderDriveCarPicker(
  title: string,
  items: DrivePickerItem[],
  confirmLabel: string,
  onConfirm: (selectedIds: string[]) => Promise<void>,
): void {
  const panel = document.getElementById("driveCarPickerPanel");
  if (!panel) return;

  panel.innerHTML = `
    <div class="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-800">
      <span class="text-xs font-semibold text-slate-200">${escapeHtml(title)}</span>
      <div class="flex items-center gap-2 text-[11px]">
        <button type="button" id="drivePickerSelectAllBtn" class="text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer">Select All</button>
        <button type="button" id="drivePickerClearBtn" class="text-slate-400 hover:text-slate-200 font-medium cursor-pointer">None</button>
      </div>
    </div>
    <div class="space-y-1 max-h-36 overflow-y-auto pe-1">
      ${items
        .map(
          (item) => `
          <label class="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-slate-900/70 hover:bg-slate-800/80 border border-slate-800 cursor-pointer text-xs">
            <span class="flex items-center gap-2 min-w-0">
              <input type="checkbox" class="drive-picker-checkbox rounded border-slate-600 bg-slate-950 text-indigo-500 focus:ring-indigo-500" value="${escapeHtml(item.id)}" checked />
              <span class="text-slate-200 truncate">${escapeHtml(item.label)}</span>
            </span>
            ${item.badge ? `<span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 shrink-0">${escapeHtml(item.badge)}</span>` : ""}
          </label>
        `,
        )
        .join("")}
    </div>
    <div class="flex items-center justify-end gap-2 pt-1">
      <button type="button" id="drivePickerCancelBtn" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition cursor-pointer">Cancel</button>
      <button type="button" id="drivePickerConfirmBtn" class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer">${escapeHtml(confirmLabel)}</button>
    </div>
  `;
  panel.classList.remove("hidden");

  const getCheckboxes = () => Array.from(panel.querySelectorAll<HTMLInputElement>(".drive-picker-checkbox"));

  panel.querySelector("#drivePickerSelectAllBtn")?.addEventListener("click", () => {
    getCheckboxes().forEach((cb) => {
      cb.checked = true;
    });
  });

  panel.querySelector("#drivePickerClearBtn")?.addEventListener("click", () => {
    getCheckboxes().forEach((cb) => {
      cb.checked = false;
    });
  });

  panel.querySelector("#drivePickerCancelBtn")?.addEventListener("click", hideDriveCarPicker);

  panel.querySelector("#drivePickerConfirmBtn")?.addEventListener("click", async () => {
    const selectedIds = getCheckboxes()
      .filter((cb) => cb.checked)
      .map((cb) => cb.value);
    if (selectedIds.length === 0) {
      showToast("Select at least one vehicle.", "warning");
      return;
    }
    hideDriveCarPicker();
    await onConfirm(selectedIds);
  });
}

function getLocalVehicleEntries(): Array<{ key: string; label: string; data: VehicleProfile }> {
  const map = getCustomProfilesMap();
  const activeProfileKey = getActiveProfileKey();
  const appData = getAppData();
  const entries: Array<{ key: string; label: string; data: VehicleProfile }> = [];

  for (const [key, mapLabel] of Object.entries(map)) {
    let carObj: VehicleProfile | null = null;
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (raw) {
      try {
        carObj = JSON.parse(raw) as VehicleProfile;
      } catch {
        // ignore
      }
    }
    if (!carObj && key === activeProfileKey && appData) carObj = appData;
    if (!carObj || !carObj.vehicle) continue;
    const label = `${carObj.vehicle.year || ""} ${carObj.vehicle.make || ""} ${carObj.vehicle.model || ""}`.trim() || mapLabel || key;
    entries.push({ key, label, data: carObj });
  }
  return entries;
}

async function saveSelectedLocalCarsToDrive(
  entries: Array<{ key: string; label: string; data: VehicleProfile }>,
): Promise<void> {
  const token = getDriveAccessToken();
  const statusMsg = document.getElementById("driveSyncStatusMsg");
  if (!token || entries.length === 0) return;

  try {
    if (statusMsg) {
      statusMsg.textContent = `Saving ${entries.length} vehicle(s) to Google Drive...`;
      statusMsg.className = "text-center font-mono text-[11px] text-slate-400 pt-1";
    }
    const folderId = await findOrCreateMotoFolioFolder(token);
    let saved = 0;
    for (const entry of entries) {
      await uploadVehicleCsvToDrive(token, folderId, entry.data, entry.key);
      saved++;
    }
    const msg = `Saved ${saved} vehicle(s) to Drive folder "${getDriveFolderName()}".`;
    if (statusMsg) {
      statusMsg.textContent = msg;
      statusMsg.className = "text-center font-mono text-[11px] text-emerald-400 pt-1";
    }
    showToast(msg);
  } catch (err) {
    console.error("Manual Save Error:", err);
    if (statusMsg) {
      statusMsg.textContent = "Save failed: " + (err instanceof Error ? err.message : String(err));
      statusMsg.className = "text-center font-mono text-[11px] text-rose-400 pt-1";
    }
  }
}

export async function handleManualSaveToDrive(): Promise<void> {
  const token = getDriveAccessToken();
  const statusMsg = document.getElementById("driveSyncStatusMsg");
  if (!token) {
    showToast("Please connect Google Drive first.", "warning");
    return;
  }

  const entries = getLocalVehicleEntries();
  if (entries.length === 0) {
    if (statusMsg) {
      statusMsg.textContent = "No local vehicles to save.";
      statusMsg.className = "text-center font-mono text-[11px] text-amber-400 pt-1";
    }
    showToast("No local vehicles to save.", "warning");
    return;
  }

  if (entries.length === 1) {
    hideDriveCarPicker();
    await saveSelectedLocalCarsToDrive(entries);
    return;
  }

  const activeKey = getActiveProfileKey();
  renderDriveCarPicker(
    "Select vehicles to save to Drive:",
    entries.map((e) => ({
      id: e.key,
      label: e.label,
      badge: e.key === activeKey ? "Active" : undefined,
    })),
    "Save Selected",
    async (selectedKeys) => {
      const selected = entries.filter((e) => selectedKeys.includes(e.key));
      await saveSelectedLocalCarsToDrive(selected);
    },
  );
}

async function fetchSelectedFilesFromDrive(
  files: Array<{ id: string; name: string }>,
): Promise<void> {
  const token = getDriveAccessToken();
  const statusMsg = document.getElementById("driveSyncStatusMsg");
  if (!token || files.length === 0) return;

  const headers = { Authorization: `Bearer ${token}` };
  let fetched = 0;
  let firstLoadedKey: string | null = null;

  try {
    if (statusMsg) {
      statusMsg.textContent = `Fetching ${files.length} vehicle(s) from Google Drive...`;
      statusMsg.className = "text-center font-mono text-[11px] text-slate-400 pt-1";
    }

    for (const f of files) {
      const dlRes = await fetch(`https://www.googleapis.com/drive/v3/files/${f.id}?alt=media`, { headers });
      if (!dlRes.ok) continue;
      const csvText = await dlRes.text();
      const parsedObj = parseCsvText(csvText);
      if (parsedObj && parsedObj.vehicle) {
        const carKey = (parsedObj.vehicle.id || f.name.replace(/\.csv$/i, "")).toLowerCase();
        const label = `${parsedObj.vehicle.make || ""} ${parsedObj.vehicle.model || ""}`.trim() || f.name.replace(/\.csv$/i, "");
        registerCustomProfileOption(carKey, label);
        localStorage.setItem(STORAGE_PREFIX + carKey, JSON.stringify(parsedObj));
        if (!firstLoadedKey) firstLoadedKey = carKey;
        fetched++;
      }
    }

    syncProfileSelectOptions();
    if (firstLoadedKey && (!getActiveProfileKey() || files.length === 1)) {
      await loadProfile(firstLoadedKey);
    } else {
      const activeKey = getActiveProfileKey();
      if (activeKey) {
        await loadProfile(activeKey);
      } else {
        onRenderAllCallback?.();
      }
    }

    const msg = `Fetched ${fetched} vehicle(s) from Drive folder "${getDriveFolderName()}".`;
    if (statusMsg) {
      statusMsg.textContent = msg;
      statusMsg.className = "text-center font-mono text-[11px] text-emerald-400 pt-1";
    }
    showToast(msg);
  } catch (err) {
    console.error("Drive Fetch Error:", err);
    if (statusMsg) {
      statusMsg.textContent = "Fetch failed: " + (err instanceof Error ? err.message : String(err));
      statusMsg.className = "text-center font-mono text-[11px] text-rose-400 pt-1";
    }
  }
}

export async function handleFetchCarsFromDrive(): Promise<void> {
  const token = getDriveAccessToken();
  const statusMsg = document.getElementById("driveSyncStatusMsg");
  if (!token) {
    showToast("Please connect Google Drive first.", "warning");
    return;
  }

  try {
    if (statusMsg) {
      statusMsg.textContent = `Scanning "${getDriveFolderName()}" for vehicles...`;
      statusMsg.className = "text-center font-mono text-[11px] text-slate-400 pt-1";
    }
    const folderId = await findOrCreateMotoFolioFolder(token);
    const headers = { Authorization: `Bearer ${token}` };
    const listQ = encodeURIComponent(`'${folderId}' in parents and mimeType = 'text/csv' and trashed = false`);
    const listRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${listQ}&fields=files(id,name)`, { headers });
    if (!listRes.ok) throw new Error("Failed to list files in Drive folder.");

    const listData = (await listRes.json()) as { files?: Array<{ id: string; name: string }> };
    const files = listData.files || [];

    if (files.length === 0) {
      hideDriveCarPicker();
      if (statusMsg) {
        statusMsg.textContent = `No vehicle CSV files found in "${getDriveFolderName()}".`;
        statusMsg.className = "text-center font-mono text-[11px] text-amber-400 pt-1";
      }
      return;
    }

    if (files.length === 1) {
      hideDriveCarPicker();
      await fetchSelectedFilesFromDrive(files);
      return;
    }

    const localMap = getCustomProfilesMap();
    renderDriveCarPicker(
      "Select vehicles to fetch from Drive:",
      files.map((f) => {
        const key = f.name.replace(/\.csv$/i, "").toLowerCase();
        return {
          id: f.id,
          label: localMap[key] ? `${localMap[key]} (${f.name})` : f.name,
          badge: localMap[key] ? "Local" : "New",
        };
      }),
      "Fetch Selected",
      async (selectedIds) => {
        const selected = files.filter((f) => selectedIds.includes(f.id));
        await fetchSelectedFilesFromDrive(selected);
      },
    );
  } catch (err) {
    console.error("Drive Fetch Error:", err);
    if (statusMsg) {
      statusMsg.textContent = "Fetch failed: " + (err instanceof Error ? err.message : String(err));
      statusMsg.className = "text-center font-mono text-[11px] text-rose-400 pt-1";
    }
  }
}

async function refreshGoogleUserInfo(token: string): Promise<{ name: string; email: string }> {
  let fetchedEmail = "";
  let fetchedName = "";
  let fetchedFirst = "";
  let fetchedLast = "";

  try {
    const uRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (uRes.status === 401) {
      sessionStorage.removeItem(GDRIVE_STORAGE_TOKEN);
      updateDriveUI();
      return { name: "", email: "" };
    }
    if (uRes.ok) {
      const uInfo = (await uRes.json()) as {
        email?: string;
        name?: string;
        given_name?: string;
        family_name?: string;
      };
      fetchedEmail = uInfo.email || "";
      fetchedName = uInfo.name || "";
      fetchedFirst = uInfo.given_name || "";
      fetchedLast = uInfo.family_name || "";
    }
  } catch {
    // ignore and try Drive about fallback
  }

  if (!fetchedEmail || !fetchedName) {
    try {
      const aboutRes = await fetch(
        "https://www.googleapis.com/drive/v3/about?fields=user(displayName,emailAddress)",
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (aboutRes.status === 401) {
        sessionStorage.removeItem(GDRIVE_STORAGE_TOKEN);
        updateDriveUI();
        return { name: "", email: "" };
      }
      if (aboutRes.ok) {
        const aboutData = (await aboutRes.json()) as {
          user?: { displayName?: string; emailAddress?: string };
        };
        if (!fetchedEmail && aboutData.user?.emailAddress) {
          fetchedEmail = aboutData.user.emailAddress;
        }
        if (!fetchedName && aboutData.user?.displayName) {
          fetchedName = aboutData.user.displayName;
        }
      }
    } catch {
      // ignore
    }
  }

  if (fetchedEmail) localStorage.setItem(GDRIVE_STORAGE_EMAIL, fetchedEmail);
  if (fetchedName) localStorage.setItem(GDRIVE_STORAGE_NAME, fetchedName);

  // Pre-fill local profile fields only if currently empty
  const existingProfile = getUserProfile();
  const parts = fetchedName.trim().split(/\s+/);
  const nextFirst = existingProfile.firstName || fetchedFirst || parts[0] || "";
  const nextLast = existingProfile.lastName || fetchedLast || (parts.length > 1 ? parts.slice(1).join(" ") : "");
  const nextEmail = existingProfile.email || fetchedEmail || "";
  if (
    nextFirst !== existingProfile.firstName ||
    nextLast !== existingProfile.lastName ||
    nextEmail !== existingProfile.email
  ) {
    setUserProfile({
      firstName: nextFirst,
      lastName: nextLast,
      email: nextEmail,
    });
  }

  updateDriveUI();
  return { name: fetchedName, email: fetchedEmail };
}

export function initGoogleDriveAuth(interactive = false): void {
  const clientId = getDriveClientId();
  if (!clientId) {
    if (interactive) {
      showToast("Google Sign-in is not configured yet. Set GOOGLE_CLIENT_ID in config.js", "warning");
      console.warn(
        "MotoFolio Google Drive Sync: No GOOGLE_CLIENT_ID found. See config.js and .env.example for instructions.",
      );
    }
    return;
  }

  if (typeof google === "undefined" || !google.accounts || !google.accounts.oauth2) {
    if (interactive) {
      alert("Google Identity Services library is still loading. Please try again in a few seconds.");
    }
    return;
  }

  gdriveTokenClient = google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope:
      "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
    callback: async (resp) => {
      if (resp.error) {
        console.error("Google Auth error:", resp);
        const statusMsg = document.getElementById("driveSyncStatusMsg");
        if (statusMsg) statusMsg.textContent = "Sign-in failed: " + resp.error;
        return;
      }
      if (resp.access_token) {
        sessionStorage.setItem(GDRIVE_STORAGE_TOKEN, resp.access_token);
        localStorage.removeItem(GDRIVE_STORAGE_EMAIL);
        localStorage.removeItem(GDRIVE_STORAGE_NAME);

        const { name } = await refreshGoogleUserInfo(resp.access_token);
        showToast(name ? `Connected as ${name}` : "Google Drive connected");
        window.openDriveModal?.();
        await scanDriveFolders();
      }
    },
  });

  if (interactive) {
    gdriveTokenClient.requestAccessToken({ prompt: "consent" });
  }
}

export function autoSyncToGoogleDrive(): void {
  if (!isDriveAutoSyncEnabled() || !getDriveAccessToken()) return;
  if (gdriveAutoSyncTimer) clearTimeout(gdriveAutoSyncTimer);
  gdriveAutoSyncTimer = setTimeout(() => {
    void syncCurrentCarToDrive(false);
  }, 1500);
}

export function initGoogleDriveListeners(onRenderAll: () => void): void {
  onRenderAllCallback = onRenderAll;
  const driveSyncModal = document.getElementById("driveSyncModal");
  const driveDisconnectModal = document.getElementById("driveDisconnectModal");

  const openDriveModal = (): void => {
    updateDriveUI();
    hideDriveCarPicker();
    window.closeSettingsModal?.();
    driveSyncModal?.classList.remove("hidden");
    driveSyncModal?.classList.add("flex");
    const token = getDriveAccessToken();
    if (token) {
      void refreshGoogleUserInfo(token);
      void scanDriveFolders();
    }
  };

  const closeDriveModal = (): void => {
    driveSyncModal?.classList.add("hidden");
    driveSyncModal?.classList.remove("flex");
    hideDriveCarPicker();
  };

  const openDisconnectModal = (): void => {
    driveDisconnectModal?.classList.remove("hidden");
    driveDisconnectModal?.classList.add("flex");
  };

  const closeDisconnectModal = (): void => {
    driveDisconnectModal?.classList.add("hidden");
    driveDisconnectModal?.classList.remove("flex");
  };

  const performDisconnect = (removeLocalCars: boolean): void => {
    sessionStorage.removeItem(GDRIVE_STORAGE_TOKEN);
    localStorage.removeItem(GDRIVE_STORAGE_EMAIL);
    localStorage.removeItem(GDRIVE_STORAGE_NAME);
    if (removeLocalCars) {
      clearAllLocalVehicles();
    }
    closeDisconnectModal();
    closeDriveModal();
    updateDriveUI();
    showToast(
      removeLocalCars
        ? "Disconnected from Google Drive & removed local vehicles"
        : "Disconnected from Google Drive (local vehicles kept)",
    );
  };

  window.openDriveModal = openDriveModal;
  window.closeDriveModal = closeDriveModal;

  document.getElementById("openDriveSyncModalBtn")?.addEventListener("click", openDriveModal);
  document.getElementById("openDriveSyncFromSettingsBtn")?.addEventListener("click", openDriveModal);
  document.getElementById("closeDriveSyncModalBtn")?.addEventListener("click", closeDriveModal);
  document.getElementById("refreshDriveFoldersBtn")?.addEventListener("click", () => {
    void scanDriveFolders();
  });

  document.getElementById("saveDriveFolderNameBtn")?.addEventListener("click", async () => {
    const val = (document.getElementById("driveFolderNameInput") as HTMLInputElement | null)?.value.trim() || "MotoFolio";
    localStorage.setItem(GDRIVE_STORAGE_FOLDER_NAME, val);
    localStorage.removeItem(GDRIVE_STORAGE_FOLDER_ID);
    showToast(`Drive folder set to "${val}"`);
    if (getDriveAccessToken()) {
      await scanDriveFolders();
    }
  });

  document.getElementById("googleSignInBtn")?.addEventListener("click", () => {
    initGoogleDriveAuth(true);
  });

  document.getElementById("googleSignOutBtn")?.addEventListener("click", openDisconnectModal);
  document.getElementById("closeDriveDisconnectModalBtn")?.addEventListener("click", closeDisconnectModal);
  document.getElementById("cancelDriveDisconnectBtn")?.addEventListener("click", closeDisconnectModal);
  driveDisconnectModal?.addEventListener("click", (e) => {
    if (e.target === driveDisconnectModal) closeDisconnectModal();
  });

  document.getElementById("disconnectRemoveCarsBtn")?.addEventListener("click", () => {
    performDisconnect(true);
  });

  document.getElementById("disconnectKeepCarsBtn")?.addEventListener("click", () => {
    performDisconnect(false);
  });

  document.getElementById("driveAutoSyncCheckbox")?.addEventListener("change", (e) => {
    localStorage.setItem(GDRIVE_STORAGE_AUTOSYNC, (e.target as HTMLInputElement).checked ? "true" : "false");
  });

  document.getElementById("driveSaveManualBtn")?.addEventListener("click", () => {
    void handleManualSaveToDrive();
  });

  document.getElementById("driveFetchCarsBtn")?.addEventListener("click", () => {
    void handleFetchCarsFromDrive();
  });

  document.getElementById("welcomeGoogleSignInBtn")?.addEventListener("click", () => {
    if (getDriveAccessToken() || !getDriveClientId()) {
      openDriveModal();
    } else {
      initGoogleDriveAuth(true);
    }
  });

  updateDriveUI();
  const existingToken = getDriveAccessToken();
  if (existingToken) {
    void refreshGoogleUserInfo(existingToken);
  }
}
