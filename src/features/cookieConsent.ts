const COOKIE_CONSENT_KEY = "myMotofolio_cookies_accepted";

const BROWSING_ONLY_IDS = new Set([
  "pwaInstallCloseBtn",
  "pwaInstallCancelBtn",
  "donutModeCatBtn",
  "donutModeMechBtn",
  "resetFiltersBtn",
]);

let memoryConsentState: "accepted" | "rejected" | null = null;
let hideTimeoutId: ReturnType<typeof setTimeout> | null = null;
let pendingFeatureEl: HTMLElement | null = null;

function readConsentState(): string | null {
  try {
    return localStorage.getItem(COOKIE_CONSENT_KEY);
  } catch {
    return memoryConsentState === "accepted" ? "true" : memoryConsentState;
  }
}

function writeConsentState(value: "true" | "rejected"): void {
  memoryConsentState = value === "true" ? "accepted" : "rejected";
  try {
    localStorage.setItem(COOKIE_CONSENT_KEY, value);
  } catch {
    // ignore storage errors
  }
}

export function isCookieConsentAccepted(): boolean {
  return readConsentState() === "true";
}

function isBrowsingOnlyAction(actionEl: HTMLElement): boolean {
  if (actionEl.closest("#cookieConsentBanner")) return true;
  if (BROWSING_ONLY_IDS.has(actionEl.id)) return true;
  if (actionEl.id.startsWith("close") || actionEl.id.startsWith("cancel")) return true;
  if (actionEl.getAttribute("aria-label") === "Close") return true;
  return false;
}

function showBanner(banner: HTMLElement, fromFeatureAttempt = false): void {
  if (hideTimeoutId !== null) {
    clearTimeout(hideTimeoutId);
    hideTimeoutId = null;
  }

  const featureNote = document.getElementById("cookieConsentFeatureNote");
  if (featureNote) {
    featureNote.classList.toggle("hidden", !fromFeatureAttempt);
  }

  banner.classList.remove("hidden");
  banner.classList.add("block");
  banner.style.transition = "opacity 0.25s ease, transform 0.25s ease";
  banner.style.opacity = "1";
  banner.style.transform = "translateY(0)";

  if (fromFeatureAttempt) {
    const acceptBtn = document.getElementById("cookieConsentAcceptBtn");
    acceptBtn?.focus();
  }
}

function hideBanner(banner: HTMLElement): void {
  if (hideTimeoutId !== null) {
    clearTimeout(hideTimeoutId);
  }
  banner.style.transition = "opacity 0.3s ease, transform 0.3s ease";
  banner.style.opacity = "0";
  banner.style.transform = "translateY(12px)";
  hideTimeoutId = setTimeout(() => {
    banner.classList.add("hidden");
    banner.classList.remove("block");
    hideTimeoutId = null;
  }, 320);
}

export function initCookieConsent(): void {
  const banner = document.getElementById("cookieConsentBanner");
  const acceptBtn = document.getElementById("cookieConsentAcceptBtn");
  const rejectBtn = document.getElementById("cookieConsentRejectBtn");

  if (!banner) return;

  const currentState = readConsentState();
  if (currentState !== "true" && currentState !== "rejected") {
    setTimeout(() => {
      if (!isCookieConsentAccepted() && readConsentState() !== "rejected") {
        showBanner(banner, false);
      }
    }, 600);
  }

  acceptBtn?.addEventListener("click", () => {
    writeConsentState("true");
    hideBanner(banner);

    const targetToResume = pendingFeatureEl;
    pendingFeatureEl = null;
    if (targetToResume && targetToResume.isConnected) {
      setTimeout(() => targetToResume.click(), 50);
    }
  });

  rejectBtn?.addEventListener("click", () => {
    writeConsentState("rejected");
    pendingFeatureEl = null;
    hideBanner(banner);
  });

  // Gate app features if the user has not accepted storage/cookies (e.g. after rejecting)
  document.addEventListener(
    "click",
    (e: MouseEvent) => {
      if (isCookieConsentAccepted()) return;
      const target = e.target as HTMLElement | null;
      const actionEl = target?.closest<HTMLElement>(
        "button, [role='button'], [data-odo-delta], [data-action]",
      );
      if (!actionEl || isBrowsingOnlyAction(actionEl)) return;

      e.preventDefault();
      e.stopPropagation();
      pendingFeatureEl = actionEl;
      showBanner(banner, true);
    },
    true,
  );

  document.addEventListener(
    "keydown",
    (e: KeyboardEvent) => {
      if (isCookieConsentAccepted()) return;
      if (e.key !== "Enter" && e.key !== " ") return;
      const target = e.target as HTMLElement | null;
      const actionEl = target?.closest<HTMLElement>("[role='button']");
      if (!actionEl || isBrowsingOnlyAction(actionEl)) return;

      e.preventDefault();
      e.stopPropagation();
      pendingFeatureEl = actionEl;
      showBanner(banner, true);
    },
    true,
  );

  document.addEventListener(
    "submit",
    (e: SubmitEvent) => {
      if (isCookieConsentAccepted()) return;
      e.preventDefault();
      e.stopPropagation();
      showBanner(banner, true);
    },
    true,
  );
}
