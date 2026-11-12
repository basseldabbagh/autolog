export function showToast(msg: string, _type?: string): void {
  const banner = document.getElementById("toastBanner");
  const textEl = document.getElementById("toastText");
  if (!banner || !textEl) return;

  textEl.textContent = msg;
  banner.classList.remove("hidden");
  banner.classList.add("flex");
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => {
    banner.classList.add("hidden");
    banner.classList.remove("flex");
  }, 2200);
}

export function escapeHtml(str: unknown): string {
  if (typeof str !== "string") return str === null || str === undefined ? "" : String(str);
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  };
  return str.replace(/[&<>'"]/g, (tag) => map[tag] || tag);
}

export function formatNumber(num: number | string | null | undefined): string {
  if (num === null || num === undefined || num === "" || isNaN(Number(num))) return "—";
  return Number(num).toLocaleString("en-US");
}

export function formatCurrency(num: number | string | null | undefined, currency = "MYR"): string {
  if (num === null || num === undefined || num === "" || isNaN(Number(num))) return "Workshop Fees";
  const prefix = currency === "MYR" ? "RM " : `${currency} `;
  return prefix + Number(num).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function getThemeColor(varName: string, fallback: string): string {
  if (typeof window === "undefined" || !window.getComputedStyle) return fallback;
  const val = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return val || fallback;
}

export function triggerDownload(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function copyTextSafe(text: string, msg = "Copied to clipboard"): void {
  const fallbackCopy = (): void => {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    showToast(msg);
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(text)
      .then(() => showToast(msg))
      .catch(fallbackCopy);
  } else {
    fallbackCopy();
  }
}

export function wireSelectOther(
  selectId: string,
  otherInputId: string,
  onSelectChange?: (selEl: HTMLSelectElement, inpEl: HTMLInputElement) => void,
): void {
  const selEl = document.getElementById(selectId) as HTMLSelectElement | null;
  const inpEl = document.getElementById(otherInputId) as HTMLInputElement | null;
  if (!selEl || !inpEl) return;

  selEl.addEventListener("change", () => {
    const isOther = selEl.value === "__other__";
    inpEl.classList.toggle("hidden", !isOther);
    inpEl.required = isOther;
    if (isOther) inpEl.focus();
    if (onSelectChange) onSelectChange(selEl, inpEl);
  });
}

export function getSelectOrOtherVal(selId: string, otherId: string): string {
  const selEl = document.getElementById(selId) as HTMLSelectElement | null;
  const inpEl = document.getElementById(otherId) as HTMLInputElement | null;
  if (!selEl) return "";
  return selEl.value === "__other__" ? (inpEl ? inpEl.value.trim() : "") : selEl.value;
}
