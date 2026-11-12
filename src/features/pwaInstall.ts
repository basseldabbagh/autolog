/**
 * PWA Installation Suggestion Feature
 * Prompts user to install My MotoFolio on desktop or mobile.
 * Dismisses permanently if user clicks Install or Cancel.
 */

import { showToast } from "../utils/format";

const PWA_DISMISSED_KEY = "autolog_pwa_install_dismissed";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

function isPwaDismissed(): boolean {
  try {
    return localStorage.getItem(PWA_DISMISSED_KEY) === "true";
  } catch {
    return false;
  }
}

function markPwaDismissed(): void {
  try {
    localStorage.setItem(PWA_DISMISSED_KEY, "true");
  } catch {
    // ignore storage errors
  }
}

function isRunningStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const isStandaloneMedia = window.matchMedia("(display-mode: standalone)").matches;
  const isIosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return isStandaloneMedia || isIosStandalone;
}

export function initPwaInstall(): void {
  if (typeof window === "undefined") return;

  // If already running inside installed PWA, never show install prompt
  if (isRunningStandalone()) {
    return;
  }

  // Register service worker if supported
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("/sw.js")
      .catch(() => {
        // Fallback relative registration if base path is nested
        navigator.serviceWorker.register("./sw.js").catch(() => {});
      });
  }

  // If user already dismissed or installed previously, do not show
  if (isPwaDismissed()) {
    return;
  }

  const promptEl = document.getElementById("pwaInstallPrompt");
  const cancelBtn = document.getElementById("pwaInstallCancelBtn");
  const closeBtn = document.getElementById("pwaInstallCloseBtn");
  const installBtn = document.getElementById("pwaInstallConfirmBtn");

  if (!promptEl) return;

  const showPrompt = (): void => {
    if (isPwaDismissed() || isRunningStandalone()) return;
    promptEl.classList.remove("hidden");
    promptEl.style.opacity = "0";
    promptEl.style.transform = "translateY(-10px) scale(0.98)";
    requestAnimationFrame(() => {
      promptEl.style.transition =
        "opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)";
      promptEl.style.opacity = "1";
      promptEl.style.transform = "translateY(0) scale(1)";
    });
  };

  const hidePrompt = (): void => {
    markPwaDismissed();
    promptEl.style.transition = "opacity 0.25s ease, transform 0.25s ease";
    promptEl.style.opacity = "0";
    promptEl.style.transform = "translateY(-10px) scale(0.96)";
    setTimeout(() => {
      promptEl.classList.add("hidden");
    }, 280);
  };

  // Capture Chromium beforeinstallprompt event
  window.addEventListener("beforeinstallprompt", (e: Event) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    // Show prompt after a short delay so page has initialized
    setTimeout(showPrompt, 1800);
  });

  // Listen for native installation completion
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    hidePrompt();
    showToast("My MotoFolio successfully installed!");
  });

  // Fallback: If beforeinstallprompt hasn't fired after 3.5s (e.g., iOS Safari or non-Chromium)
  // and prompt is still not dismissed, show suggestion
  setTimeout(() => {
    if (!isPwaDismissed() && !isRunningStandalone() && promptEl.classList.contains("hidden")) {
      showPrompt();
    }
  }, 3500);

  // User clicked Cancel or Close
  cancelBtn?.addEventListener("click", hidePrompt);
  closeBtn?.addEventListener("click", hidePrompt);

  // User clicked Install
  installBtn?.addEventListener("click", async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          showToast("Installing My MotoFolio...");
        }
      } catch {
        // ignore
      } finally {
        deferredPrompt = null;
      }
    } else {
      // Browser didn't provide beforeinstallprompt (e.g. iOS or manual browser menu)
      const isIos =
        /iPad|iPhone|iPod/.test(navigator.userAgent) &&
        !(window as unknown as { MSStream?: unknown }).MSStream;
      if (isIos) {
        showToast("To install on iOS: tap Share in Safari, then 'Add to Home Screen'");
      } else {
        showToast("Click the Install icon in your browser's address bar to install");
      }
    }
    // Always mark dismissed so user is not prompted again
    hidePrompt();
  });
}
