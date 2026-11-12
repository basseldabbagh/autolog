import {
  getActiveProfileKey,
  getAppData,
  getCustomProfilesMap,
  loadProfile,
  registerCustomProfileOption,
  saveToLocal,
  setActiveProfileKey,
  setAppData,
  STORAGE_PREFIX,
} from "../state/store";
import type { GoogleTokenClient, VehicleProfile } from "../types";
import { escapeHtml, showToast } from "../utils/format";
import { buildCsvFromData, parseCsvText } from "./dataHub";
import { syncProfileSelectOptions } from "./headerKpis";

const GDRIVE_STORAGE_TOKEN = "motofolio_gdrive_token";
const GDRIVE_STORAGE_EMAIL = "motofolio_gdrive_email";
const GDRIVE_STORAGE_FOLDER_ID = "motofolio_gdrive_folder_id";
const GDRIVE_STORAGE_FOLDER_NAME = "autolog_gdrive_folder_name";
const GDRIVE_STORAGE_AUTOSYNC = "motofolio_gdrive_autosync";
const GDRIVE_FOLDER_NAME = "MotoFolio";

let gdriveTokenClient: GoogleTokenClient | null = null;
let gdriveAutoSyncTimer: ReturnType<typeof setTimeout> | null = null;
let onRenderAllCallback: (() => void) | null = null;

export function getDriveClientId(): string {
  const id = window.MOTOFOLIO_CONFIG && window.MOTOFOLIO_CONFIG.GOOGLE_CLIENT_ID;
  return typeof id === "string" ? id.trim() : "";
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

export function updateDriveUI(): void {
  const token = getDriveAccessToken();
  const email = localStorage.getItem(GDRIVE_STORAGE_EMAIL) || "user@google.com";
  const unauthSec = document.getElementById("driveUnauthSection");
  const authSec = document.getElementById("driveAuthSection");
  const statusText = document.getElementById("driveHeaderStatusText");
  const statusDot = document.getElementById("driveAccountStatusDot");
  const driveBtn = document.getElementById("openDriveSyncModalBtn");
  const emailSpan = document.getElementById("driveAccountEmail");
  const autoSyncCheck = document.getElementById("driveAutoSyncCheckbox") as HTMLInputElement | null;
  const folderInp = document.getElementById("driveFolderNameInput") as HTMLInputElement | null;

  if (folderInp) folderInp.value = getDriveFolderName();
  if (autoSyncCheck) autoSyncCheck.checked = isDriveAutoSyncEnabled();

  if (token) {
    unauthSec?.classList.add("hidden");
    authSec?.classList.remove("hidden");
    if (statusText) statusText.textContent = "Connected";
    if (statusDot) {
      statusDot.className = "w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]";
    }
    if (driveBtn) {
      driveBtn.title = `Google Account: Connected (${email}) - Click to manage sync`;
    }
    if (emailSpan) emailSpan.textContent = email;
  } else {
    unauthSec?.classList.remove("hidden");
    authSec?.classList.add("hidden");
    if (statusText) statusText.textContent = "Google Drive";
    if (statusDot) {
      statusDot.className = "w-2 h-2 rounded-full bg-slate-500";
    }
    if (driveBtn) {
      driveBtn.title = "Google Account: Not Connected - Click to connect";
    }
  }
}

export async function scanDriveFolders(): Promise<void> {
  const token = getDriveAccessToken();
  const container = document.getElementById("driveExistingFoldersList");
  if (!token || !container) return;

  try {
    container.classList.remove("hidden");
    container.innerHTML = `<div class="p-2 text-slate-400 text-center flex items-center justify-center gap-2"><svg class="w-3.5 h-3.5 animate-spin text-indigo-400" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg><span>Scanning folders...</span></div>`;

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

export async function syncCurrentCarToDrive(showNotification = true): Promise<void> {
  const token = getDriveAccessToken();
  const appData = getAppData();
  const activeProfileKey = getActiveProfileKey();
  const statusMsg = document.getElementById("driveSyncStatusMsg");
  const headerStatus = document.getElementById("driveHeaderStatusText");
  if (!token || !appData || !appData.vehicle) return;

  const carId = (appData.vehicle.id || activeProfileKey || "car-maintenance").toLowerCase();
  const fileName = `${carId}.csv`;

  try {
    if (statusMsg) statusMsg.textContent = `Syncing ${fileName} to Google Drive...`;
    if (headerStatus) headerStatus.textContent = "Syncing...";

    const folderId = await findOrCreateMotoFolioFolder(token);
    const headers = { Authorization: `Bearer ${token}` };
    const csvContent = buildCsvFromData(appData);

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
      if (!updateRes.ok) throw new Error("Failed to update CSV in Google Drive.");
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
      if (!createRes.ok) throw new Error("Failed to create CSV in Google Drive.");
    }

    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (statusMsg) {
      statusMsg.textContent = `Synced "${fileName}" to MotoFolio folder at ${nowTime}`;
      statusMsg.className = "text-center font-mono text-[11px] text-emerald-400 pt-1";
    }
    if (headerStatus) headerStatus.textContent = "Drive Synced";
    if (showNotification) showToast(`Synced ${fileName} to Drive`);
  } catch (err) {
    console.error("Drive Sync Error:", err);
    if (statusMsg) {
      statusMsg.textContent = "Sync failed: " + (err instanceof Error ? err.message : String(err));
      statusMsg.className = "text-center font-mono text-[11px] text-rose-400 pt-1";
    }
    if (headerStatus) headerStatus.textContent = "Sync Failed";
  }
}

export async function fetchCurrentCarFromDrive(): Promise<void> {
  const token = getDriveAccessToken();
  const appData = getAppData();
  const activeProfileKey = getActiveProfileKey();
  const statusMsg = document.getElementById("driveSyncStatusMsg");
  if (!token) {
    alert("Please connect Google Drive first.");
    return;
  }

  const carId = (appData?.vehicle?.id || activeProfileKey || "car-maintenance").toLowerCase();
  const fileName = `${carId}.csv`;

  try {
    if (statusMsg) statusMsg.textContent = `Fetching ${fileName} from Google Drive...`;
    const folderId = await findOrCreateMotoFolioFolder(token);
    const headers = { Authorization: `Bearer ${token}` };

    const query = encodeURIComponent(`'${folderId}' in parents and name = '${fileName}' and trashed = false`);
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
      headers,
    });
    if (!searchRes.ok) throw new Error("Error searching Drive.");

    const sData = (await searchRes.json()) as { files?: Array<{ id: string }> };
    if (!sData.files || sData.files.length === 0) {
      if (statusMsg) {
        statusMsg.textContent = `No file named "${fileName}" found in MotoFolio folder.`;
        statusMsg.className = "text-center font-mono text-[11px] text-amber-400 pt-1";
      }
      return;
    }

    const fileId = sData.files[0].id;
    const dlRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, { headers });
    if (!dlRes.ok) throw new Error("Error downloading CSV from Drive.");

    const csvText = await dlRes.text();
    const parsedData = parseCsvText(csvText);
    setAppData(parsedData);
    const nextKey = parsedData.vehicle?.id || carId;
    setActiveProfileKey(nextKey);
    registerCustomProfileOption(nextKey, `${parsedData.vehicle.make || ""} ${parsedData.vehicle.model || ""}`.trim());
    saveToLocal(true);
    onRenderAllCallback?.();

    if (statusMsg) {
      statusMsg.textContent = `Fetched and loaded "${fileName}" from Google Drive.`;
      statusMsg.className = "text-center font-mono text-[11px] text-emerald-400 pt-1";
    }
    showToast(`Loaded ${fileName} from Drive`);
  } catch (err) {
    console.error("Drive Fetch Error:", err);
    if (statusMsg) {
      statusMsg.textContent = "Fetch failed: " + (err instanceof Error ? err.message : String(err));
      statusMsg.className = "text-center font-mono text-[11px] text-rose-400 pt-1";
    }
  }
}

export async function syncAllCarsWithDrive(showNotification = true): Promise<void> {
  const token = getDriveAccessToken();
  const statusMsg = document.getElementById("driveSyncStatusMsg");
  const headerStatus = document.getElementById("driveHeaderStatusText");
  if (!token) {
    if (showNotification) alert("Please connect Google Drive first.");
    return;
  }

  try {
    if (statusMsg) statusMsg.textContent = `Syncing all vehicles with Google Drive...`;
    if (headerStatus) headerStatus.textContent = "Syncing All...";

    const folderId = await findOrCreateMotoFolioFolder(token);
    const headers = { Authorization: `Bearer ${token}` };

    const map = getCustomProfilesMap();
    const keys = Object.keys(map);
    let uploaded = 0;
    const activeProfileKey = getActiveProfileKey();
    const appData = getAppData();

    for (const key of keys) {
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

      const fileName = `${(carObj.vehicle.id || key).toLowerCase()}.csv`;
      const csvContent = buildCsvFromData(carObj);

      const q = encodeURIComponent(`'${folderId}' in parents and name = '${fileName}' and trashed = false`);
      const sRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, { headers });
      let existingId: string | null = null;
      if (sRes.ok) {
        const sData = (await sRes.json()) as { files?: Array<{ id: string }> };
        if (sData.files && sData.files.length > 0) existingId = sData.files[0].id;
      }

      if (existingId) {
        await fetch(`https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=media`, {
          method: "PATCH",
          headers: { ...headers, "Content-Type": "text/csv;charset=utf-8" },
          body: csvContent,
        });
      } else {
        const metadata = { name: fileName, parents: [folderId], mimeType: "text/csv" };
        const boundary = "-------MotoFolioBoundary" + Date.now();
        const multipartBody =
          `\r\n--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
          JSON.stringify(metadata) +
          `\r\n--${boundary}\r\nContent-Type: text/csv; charset=UTF-8\r\n\r\n` +
          csvContent +
          `\r\n--${boundary}--`;
        await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
          method: "POST",
          headers: { ...headers, "Content-Type": `multipart/related; boundary=${boundary}` },
          body: multipartBody,
        });
      }
      uploaded++;
    }

    let downloaded = 0;
    const listQ = encodeURIComponent(`'${folderId}' in parents and mimeType = 'text/csv' and trashed = false`);
    const listRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${listQ}&fields=files(id,name)`, { headers });
    if (listRes.ok) {
      const listData = (await listRes.json()) as { files?: Array<{ id: string; name: string }> };
      if (listData.files) {
        for (const f of listData.files) {
          const carKey = f.name.replace(/\.csv$/i, "").toLowerCase();
          if (!map[carKey]) {
            try {
              const dlRes = await fetch(`https://www.googleapis.com/drive/v3/files/${f.id}?alt=media`, { headers });
              if (dlRes.ok) {
                const csvText = await dlRes.text();
                const parsedObj = parseCsvText(csvText);
                if (parsedObj && parsedObj.vehicle) {
                  const v = parsedObj.vehicle;
                  const label = `${v.make || ""} ${v.model || ""}`.trim() || f.name.replace(/\.csv$/i, "");
                  registerCustomProfileOption(carKey, label);
                  localStorage.setItem(STORAGE_PREFIX + carKey, JSON.stringify(parsedObj));
                  downloaded++;
                }
              }
            } catch {
              // ignore individual download errors
            }
          }
        }
      }
    }

    syncProfileSelectOptions();
    const finalMap = getCustomProfilesMap();
    const finalKeys = Object.keys(finalMap);
    if (!getActiveProfileKey() && finalKeys.length > 0) {
      await loadProfile(finalKeys[0]);
    } else {
      onRenderAllCallback?.();
    }

    const summaryMsg = `Synced ${uploaded} vehicle(s) to Drive folder "${getDriveFolderName()}". (${downloaded} new loaded from Drive)`;
    if (statusMsg) {
      statusMsg.textContent = summaryMsg;
      statusMsg.className = "text-center font-mono text-[11px] text-emerald-400 pt-1";
    }
    if (headerStatus) headerStatus.textContent = "Drive Synced";
    if (showNotification) showToast(summaryMsg);
  } catch (err) {
    console.error("Sync All Cars Error:", err);
    if (statusMsg) {
      statusMsg.textContent = "Fleet sync failed: " + (err instanceof Error ? err.message : String(err));
      statusMsg.className = "text-center font-mono text-[11px] text-rose-400 pt-1";
    }
    if (headerStatus) headerStatus.textContent = "Sync Failed";
  }
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
    scope: "https://www.googleapis.com/auth/drive.file",
    callback: async (resp) => {
      if (resp.error) {
        console.error("Google Auth error:", resp);
        const statusMsg = document.getElementById("driveSyncStatusMsg");
        if (statusMsg) statusMsg.textContent = "Sign-in failed: " + resp.error;
        return;
      }
      if (resp.access_token) {
        sessionStorage.setItem(GDRIVE_STORAGE_TOKEN, resp.access_token);
        try {
          const uRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: { Authorization: `Bearer ${resp.access_token}` },
          });
          if (uRes.ok) {
            const uInfo = (await uRes.json()) as { email?: string };
            if (uInfo.email) localStorage.setItem(GDRIVE_STORAGE_EMAIL, uInfo.email);
          }
        } catch {
          // ignore
        }

        updateDriveUI();
        showToast("Google Drive connected");
        window.openDriveModal?.();
        await scanDriveFolders();
        await syncAllCarsWithDrive(true);
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

  const openDriveModal = (): void => {
    updateDriveUI();
    window.closeSettingsModal?.();
    driveSyncModal?.classList.remove("hidden");
    driveSyncModal?.classList.add("flex");
    if (getDriveAccessToken()) {
      void scanDriveFolders();
    }
  };

  const closeDriveModal = (): void => {
    driveSyncModal?.classList.add("hidden");
    driveSyncModal?.classList.remove("flex");
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

  document.getElementById("driveSyncAllCarsBtn")?.addEventListener("click", () => {
    void syncAllCarsWithDrive(true);
  });

  document.getElementById("googleSignInBtn")?.addEventListener("click", () => {
    initGoogleDriveAuth(true);
  });

  document.getElementById("googleSignOutBtn")?.addEventListener("click", () => {
    sessionStorage.removeItem(GDRIVE_STORAGE_TOKEN);
    localStorage.removeItem(GDRIVE_STORAGE_EMAIL);
    updateDriveUI();
    showToast("Disconnected from Google Drive");
  });

  document.getElementById("driveAutoSyncCheckbox")?.addEventListener("change", (e) => {
    localStorage.setItem(GDRIVE_STORAGE_AUTOSYNC, (e.target as HTMLInputElement).checked ? "true" : "false");
  });

  document.getElementById("drivePushCurrentBtn")?.addEventListener("click", () => {
    void syncCurrentCarToDrive(true);
  });

  document.getElementById("drivePullCurrentBtn")?.addEventListener("click", () => {
    void fetchCurrentCarFromDrive();
  });

  document.getElementById("welcomeGoogleSignInBtn")?.addEventListener("click", () => {
    if (getDriveClientId()) {
      initGoogleDriveAuth(true);
    } else {
      openDriveModal();
    }
  });

  updateDriveUI();
}
