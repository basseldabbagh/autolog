import { escapeHtml } from "../utils/format";

export interface GoogleAuthButtonState {
  connected: boolean;
  userName?: string;
  email?: string;
}

const GOOGLE_G_SVG = `
  <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
`;

/**
 * Renders every `[data-google-auth-btn]` button consistently across the UI.
 * Variants:
 * - `hero`: Welcome screen primary CTA
 * - `panel`: Profile / Tools panel button
 */
export function renderGoogleAuthButtons(state: GoogleAuthButtonState): void {
  const buttons = document.querySelectorAll<HTMLButtonElement>("[data-google-auth-btn]");
  const trimmedName = (state.userName || "").trim();
  const trimmedEmail = (state.email || "").trim();

  const label = state.connected
    ? trimmedName
      ? `Connected as ${trimmedName}`
      : "Connected"
    : "Sign in with Google";

  const tooltip = state.connected
    ? `Google Account: ${trimmedName || "Connected"}${trimmedEmail ? ` (${trimmedEmail})` : ""} - Click to manage Drive sync`
    : "Sign in with Google to load or sync your fleet from Google Drive";

  buttons.forEach((btn) => {
    const variant = btn.getAttribute("data-variant") || "panel";
    btn.title = tooltip;

    if (variant === "hero") {
      btn.className = state.connected
        ? "inline-flex items-center gap-2.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs sm:text-sm font-bold px-5 py-2.5 rounded-xl border border-emerald-500/40 shadow-lg transition-all cursor-pointer"
        : "inline-flex items-center gap-2.5 bg-white hover:bg-slate-100 text-slate-900 text-xs sm:text-sm font-bold px-5 py-2.5 rounded-xl shadow-xl shadow-white/10 hover:shadow-indigo-500/20 border border-slate-200 transition-all cursor-pointer transform hover:-translate-y-0.5";
    } else {
      btn.className = state.connected
        ? "inline-flex items-center justify-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-semibold px-3 py-2.5 rounded-xl border border-emerald-500/35 shadow-sm transition cursor-pointer"
        : "inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-700 hover:border-indigo-500/50 shadow-sm transition cursor-pointer";
    }

    const dotHtml = state.connected
      ? `<span class="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] shrink-0"></span>`
      : `<span class="w-2 h-2 rounded-full bg-slate-500 shrink-0 ${variant === "hero" ? "hidden" : ""}"></span>`;

    btn.innerHTML = `
      ${GOOGLE_G_SVG}
      ${dotHtml}
      <span class="truncate">${escapeHtml(label)}</span>
    `;
  });
}
