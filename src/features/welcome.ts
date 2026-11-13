import { VEHICLE_TYPE_ICONS, WELCOME_SAMPLE_TEMPLATES } from "../config/profiles";
import { escapeHtml } from "../utils/format";

export function openAddCarModalWithPreset(presetKey: string | null): void {
  if (typeof window.openVehiclesModal === "function") {
    window.openVehiclesModal();
  }
  const baseSel = document.getElementById("modalNewCarBaseSelect") as HTMLSelectElement | null;
  if (baseSel) {
    baseSel.value = presetKey || "blank-template";
    baseSel.dispatchEvent(new Event("change"));
  }
  const formEl = document.getElementById("addNewCarForm");
  if (formEl) {
    setTimeout(() => {
      formEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }
  const makeInput = document.getElementById("modalNewCarMake") as HTMLInputElement | null;
  if (makeInput) {
    makeInput.value = "";
    setTimeout(() => makeInput.focus(), 200);
  }
}

export function renderWelcomeTemplates(): void {
  const container = document.getElementById("sampleTemplatesGrid");
  if (!container) return;

  let html = "";
  WELCOME_SAMPLE_TEMPLATES.forEach((tpl) => {
    const svgIcon = VEHICLE_TYPE_ICONS[tpl.key] || VEHICLE_TYPE_ICONS["default"];
    const isCustom = tpl.key === "blank-template";
    html += `
      <div
        role="button"
        tabindex="0"
        data-template-key="${tpl.key}"
        class="welcome-template-card cursor-pointer bg-slate-900/90 border ${isCustom ? "border-indigo-500/60 bg-gradient-to-br from-indigo-950/25 to-slate-900/90" : "border-slate-800"} hover:border-indigo-500 hover:bg-slate-800/80 rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 hover:shadow-xl hover:shadow-indigo-500/15 group relative select-none transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        title="Click to customize and start with ${escapeHtml(tpl.title)}"
      >
        <div>
          <div class="flex items-center justify-between gap-3 mb-3">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-10 h-10 rounded-xl bg-slate-800 group-hover:bg-indigo-600/20 text-indigo-400 p-2 border border-slate-700/60 transition shrink-0">
                ${svgIcon}
              </div>
              <div class="min-w-0">
                <h4 class="font-bold text-white text-sm group-hover:text-indigo-300 transition truncate">${escapeHtml(tpl.title)}</h4>
                <p class="text-[11px] text-slate-400 truncate">${escapeHtml(tpl.subtitle)}</p>
              </div>
            </div>
            ${isCustom ? `<span class="shrink-0 px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-semibold uppercase tracking-wider">Custom</span>` : ""}
          </div>
          <p class="text-xs text-slate-400 mb-3 leading-relaxed">${escapeHtml(tpl.desc)}</p>
          <div class="flex flex-wrap gap-1.5 mb-4">
            ${tpl.tags.map((t) => `<span class="px-2 py-0.5 rounded-md bg-slate-950 text-slate-300 border border-slate-800 text-[10px] font-mono">${escapeHtml(t)}</span>`).join("")}
          </div>
        </div>
        <div class="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-indigo-700 dark:text-indigo-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition">
          <span>Configure Profile</span>
          <svg class="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  container.querySelectorAll<HTMLElement>(".welcome-template-card").forEach((card) => {
    const trigger = (): void => {
      const key = card.getAttribute("data-template-key");
      openAddCarModalWithPreset(key);
    };
    card.addEventListener("click", trigger);
    card.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        trigger();
      }
    });
  });
}

export function initWelcomeListeners(): void {
  document.getElementById("welcomeImportBtn")?.addEventListener("click", () => {
    document.getElementById("openDataHubBtn")?.click();
  });
}
