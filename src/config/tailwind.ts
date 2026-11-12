/** Configures Tailwind CSS Play CDN runtime theme tokens, brand identity colors, and fonts. */
export function initTailwindConfig(): void {
  const origWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    if (args[0] && typeof args[0] === "string" && args[0].includes("cdn.tailwindcss.com")) return;
    origWarn.apply(console, args);
  };

  if (typeof window !== "undefined" && typeof window.tailwind !== "undefined") {
    window.tailwind.config = {
      darkMode: "class",
      theme: {
        extend: {
          colors: {
            // Re-alias indigo to the vibrant Brand Automotive Orange identity palette
            indigo: {
              50: "#fff7ed",
              100: "#ffedd5",
              200: "#fed7aa",
              300: "#fdba74",
              400: "#fb923c",
              500: "#ff6b35", // Brand Hero Orange
              600: "#ea580c", // Brand Hover Orange
              700: "#c2410c",
              800: "#9a3412",
              900: "#7c2d12",
              950: "#431407",
            },
            // Specific Brand Identity tokens
            brand: {
              DEFAULT: "var(--color-brand-primary)",
              hover: "var(--color-brand-hover)",
              muted: "var(--color-brand-muted)",
              border: "var(--color-brand-border)",
              orange: "#ff6b35",
              navy: "#0a192f",
              ice: "#bbd3ec",
              steel: "#4a5568",
            },
            canvas: "var(--color-bg-canvas)",
            surface: {
              DEFAULT: "var(--color-bg-surface)",
              elevated: "var(--color-bg-surface-elevated)",
              input: "var(--color-bg-input)",
            },
            status: {
              good: "var(--color-status-good)",
              "good-bg": "var(--color-status-good-bg)",
              "good-border": "var(--color-status-good-border)",
              "good-text": "var(--color-status-good-text)",
              warning: "var(--color-status-warning)",
              "warning-bg": "var(--color-status-warning-bg)",
              "warning-border": "var(--color-status-warning-border)",
              "warning-text": "var(--color-status-warning-text)",
              critical: "var(--color-status-critical)",
              "critical-bg": "var(--color-status-critical-bg)",
              "critical-border": "var(--color-status-critical-border)",
              "critical-text": "var(--color-status-critical-text)",
              pending: "var(--color-status-pending)",
              "pending-bg": "var(--color-status-pending-bg)",
              "pending-border": "var(--color-status-pending-border)",
              "pending-text": "var(--color-status-pending-text)",
            },
            accent: {
              cyan: "var(--color-accent-cyan)",
              "cyan-text": "var(--color-accent-cyan-text)",
              "cyan-bg": "var(--color-accent-cyan-bg)",
            },
          },
          fontFamily: {
            sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
            mono: ["JetBrains Mono", "Fira Code", "monospace"],
          },
        },
      },
    };
  }
}
