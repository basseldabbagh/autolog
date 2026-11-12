import { initTailwindConfig } from "./config/tailwind";
import { applyInitialThemeClass, initThemeFeature } from "./features/theme";

// Apply initial theme and Tailwind tokens immediately to prevent FOUC
applyInitialThemeClass();
initTailwindConfig();

document.addEventListener("DOMContentLoaded", () => {
  initThemeFeature();
});
