import type { ThemeMode } from "../types";
import { showToast } from "../utils/format";

const THEME_STORAGE_KEY = "myMotofolio_theme_mode";

/** Updates favicon and touch appicon dynamically based on active theme schema. */
export function updateThemeIdentityAssets(isDark: boolean): void {
  try {
    const faviconEls = document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]');
    const touchIconEl = document.getElementById("appTouchIcon") as HTMLLinkElement | null;
    const themeColorMeta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;

    faviconEls.forEach((el) => {
      el.removeAttribute("media");
      el.href = isDark ? "/images/identity/favicon-light.png" : "/images/identity/favicon.png";
    });

    if (touchIconEl) {
      touchIconEl.href = isDark ? "/images/identity/appicon.png" : "/images/identity/appicon-light.png";
    }
    if (themeColorMeta) {
      themeColorMeta.content = isDark ? "#0a192f" : "#f4f8fc";
    }
  } catch {
    // ignore
  }
}

export function applyInitialThemeClass(): void {
  try {
    const theme = (localStorage.getItem(THEME_STORAGE_KEY) || "system") as ThemeMode;
    const isDark =
      theme === "dark" ||
      (theme === "system" &&
        typeof window !== "undefined" &&
        Boolean(window.matchMedia?.("(prefers-color-scheme: dark)").matches));
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    updateThemeIdentityAssets(isDark);
  } catch {
    // ignore storage errors
  }
}

export function initThemeFeature(): void {
  const themeToggleButtons = document.querySelectorAll<HTMLButtonElement>(".theme-toggle-btn");

  const updateThemeToggleUI = (activeTheme: ThemeMode): void => {
    themeToggleButtons.forEach((btn) => {
      const isMatch = btn.getAttribute("data-theme") === activeTheme;
      if (isMatch) {
        btn.className =
          "theme-toggle-btn px-2.5 py-1 text-xs font-semibold rounded-lg text-white bg-indigo-600 transition flex items-center gap-1.5 cursor-pointer shadow-sm";
      } else {
        btn.className =
          "theme-toggle-btn px-2.5 py-1 text-xs font-medium rounded-lg text-slate-400 hover:text-white transition flex items-center gap-1.5 cursor-pointer";
      }
    });
  };

  const applyThemePreference = (themeMode: ThemeMode): void => {
    localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    const isDark =
      themeMode === "dark" ||
      (themeMode === "system" &&
        Boolean(window.matchMedia?.("(prefers-color-scheme: dark)").matches));
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    updateThemeToggleUI(themeMode);
    updateThemeIdentityAssets(isDark);
  };

  themeToggleButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const chosen = (btn.getAttribute("data-theme") || "system") as ThemeMode;
      applyThemePreference(chosen);
      showToast(`Theme set to ${chosen.charAt(0).toUpperCase() + chosen.slice(1)}`);
    });
  });

  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      const cur = (localStorage.getItem(THEME_STORAGE_KEY) || "system") as ThemeMode;
      if (cur === "system") {
        applyThemePreference("system");
      }
    });
  }

  const savedTheme = (localStorage.getItem(THEME_STORAGE_KEY) || "system") as ThemeMode;
  applyThemePreference(savedTheme);
}
