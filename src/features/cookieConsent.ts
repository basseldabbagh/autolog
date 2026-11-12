const COOKIE_CONSENT_KEY = "autolog_cookies_accepted";

export function initCookieConsent(): void {
  try {
    const isAccepted = localStorage.getItem(COOKIE_CONSENT_KEY) === "true";
    const banner = document.getElementById("cookieConsentBanner");
    const acceptBtn = document.getElementById("cookieConsentAcceptBtn");

    if (!banner) return;

    if (!isAccepted) {
      setTimeout(() => {
        banner.classList.remove("hidden");
        banner.classList.add("block");
      }, 600);
    }

    acceptBtn?.addEventListener("click", () => {
      try {
        localStorage.setItem(COOKIE_CONSENT_KEY, "true");
      } catch {
        // ignore storage errors
      }
      banner.style.transition = "opacity 0.3s ease, transform 0.3s ease";
      banner.style.opacity = "0";
      banner.style.transform = "translateY(12px)";
      setTimeout(() => {
        banner.classList.add("hidden");
        banner.classList.remove("block");
      }, 320);
    });
  } catch {
    // ignore
  }
}
