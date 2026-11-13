import { defineConfig, loadEnv, type Connect, type Plugin } from "vite";
import fs from "node:fs";
import path from "node:path";

/** Maps clean page URLs (/privacy-policy, /terms-of-service, /faqs) and hoists pages/*.html to dist root. */
function cleanLegalRoutes(): Plugin {
  const devRoutes: Record<string, string> = {
    "/privacy-policy": "/pages/privacy-policy.html",
    "/terms-of-service": "/pages/terms-of-service.html",
    "/faqs": "/pages/faqs.html",
  };
  const previewRoutes: Record<string, string> = {
    "/privacy-policy": "/privacy-policy.html",
    "/terms-of-service": "/terms-of-service.html",
    "/faqs": "/faqs.html",
  };

  const attachMiddleware = (middlewares: Connect.Server, routeMap: Record<string, string>) => {
    middlewares.use((req, res, next) => {
      if (!req.url) return next();
      const [pathname, query = ""] = req.url.split("?");
      const normalized = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
      if (pathname !== normalized && routeMap[normalized]) {
        res.statusCode = 302;
        res.setHeader("Location", query ? `${normalized}?${query}` : normalized);
        res.end();
        return;
      }
      if (routeMap[pathname]) {
        req.url = query ? `${routeMap[pathname]}?${query}` : routeMap[pathname];
      }
      next();
    });
  };

  return {
    name: "clean-legal-routes",
    enforce: "post",
    configureServer(server) {
      attachMiddleware(server.middlewares, devRoutes);
    },
    configurePreviewServer(server) {
      attachMiddleware(server.middlewares, previewRoutes);
    },
    generateBundle(_options, bundle) {
      for (const [key, item] of Object.entries(bundle)) {
        if (item.type === "asset" && key.startsWith("pages/") && key.endsWith(".html")) {
          const rootName = key.replace(/^pages\//, "");
          if (typeof item.source === "string") {
            item.source = item.source.replace(/(href|src)="\.\.\/assets\//g, '$1="./assets/');
          }
          item.fileName = rootName;
          bundle[rootName] = item;
          delete bundle[key];
        }
      }
    },
  };
}

/** Copies static runtime files and JSON profile folders into dist/ on production build. */
function copyStaticRuntimeAssets(): Plugin {
  const staticFiles = ["config.js"];
  const staticDirs = ["cars"];

  return {
    name: "copy-static-runtime-assets",
    closeBundle() {
      const rootDir = process.cwd();
      const outDir = path.resolve(rootDir, "dist");
      if (!fs.existsSync(outDir)) return;

      for (const file of staticFiles) {
        const src = path.join(rootDir, file);
        const dest = path.join(outDir, file);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest);
        }
      }

      for (const dir of staticDirs) {
        const srcDir = path.join(rootDir, dir);
        const destDir = path.join(outDir, dir);
        if (fs.existsSync(srcDir)) {
          fs.cpSync(srcDir, destDir, { recursive: true });
        }
      }
    },
  };
}

/** Injects Google Search Console site verification meta tag from environment variables (.env). */
function injectGoogleSiteVerification(token?: string): Plugin {
  return {
    name: "inject-google-site-verification",
    transformIndexHtml(html) {
      if (!token) return html;
      const cleanToken = token.replace(/^[\\"'`]+|[\\"'`]+$/g, "").trim();
      if (!cleanToken) return html;
      const tag = `<meta name="google-site-verification" content="${cleanToken}" />`;
      if (html.includes("<!-- GOOGLE_SITE_VERIFICATION -->")) {
        return html.replace("<!-- GOOGLE_SITE_VERIFICATION -->", tag);
      }
      return html.replace("</head>", `\t\t${tag}\n\t</head>`);
    },
  };
}

interface FaqJsonItem {
  id: string;
  question: string;
  answer: string;
}

interface FaqJsonCategory {
  id: string;
  name: string;
  faqs: FaqJsonItem[];
}

interface FaqJsonData {
  title?: string;
  description?: string;
  lastUpdated?: string;
  categories?: FaqJsonCategory[];
}

function escapeHtmlServer(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Reads public/data/faqs.json to pre-render faqs.html (HTML + FAQPage JSON-LD) and emit dist/faqs.md for AI agents. */
function generateFaqArtifacts(): Plugin {
  const loadFaqData = (): FaqJsonData | null => {
    const jsonPath = path.resolve(process.cwd(), "public/data/faqs.json");
    if (!fs.existsSync(jsonPath)) return null;
    try {
      return JSON.parse(fs.readFileSync(jsonPath, "utf8")) as FaqJsonData;
    } catch {
      return null;
    }
  };

  return {
    name: "generate-faq-artifacts",
    transformIndexHtml(html, ctx) {
      if (!ctx.filename.endsWith("faqs.html")) return html;
      const data = loadFaqData();
      const categories = data?.categories ?? [];

      const faqEntities = categories.flatMap((cat) =>
        cat.faqs.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      );

      const jsonLdTag = `<script type="application/ld+json">${JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "@id": "https://motofolio.pages.dev/faqs#faq",
        mainEntity: faqEntities,
      })}</script>`;

      const prerenderedHtml = categories
        .map(
          (cat) => `
          <article class="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-4" aria-labelledby="cat-${escapeHtmlServer(cat.id)}">
            <h2 id="cat-${escapeHtmlServer(cat.id)}" class="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span class="w-1.5 h-5 rounded-full bg-indigo-500 inline-block"></span>
              ${escapeHtmlServer(cat.name)}
            </h2>
            <div class="space-y-2.5">
              ${cat.faqs
                .map(
                  (item) => `
                <details id="${escapeHtmlServer(item.id)}" class="group bg-slate-950/70 border border-slate-800 rounded-xl p-4 transition-all hover:border-slate-700 open:border-indigo-500/40">
                  <summary class="flex items-center justify-between cursor-pointer font-semibold text-sm text-slate-100 group-hover:text-white list-none select-none gap-3">
                    <span>${escapeHtmlServer(item.question)}</span>
                    <svg class="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div class="mt-2.5 text-sm text-slate-300 leading-relaxed pt-2.5 border-t border-slate-800/70">
                    ${escapeHtmlServer(item.answer)}
                  </div>
                </details>`,
                )
                .join("")}
            </div>
          </article>`,
        )
        .join("\n");

      return html
        .replace("<!-- FAQ_JSONLD -->", jsonLdTag)
        .replace("<!-- FAQ_PRERENDER_CONTENT -->", prerenderedHtml);
    },
    closeBundle() {
      const data = loadFaqData();
      const outDir = path.resolve(process.cwd(), "dist");
      if (!data || !fs.existsSync(outDir)) return;

      const lines: string[] = [
        `# ${data.title || "My MotoFolio — Frequently Asked Questions"}`,
        "",
        `> ${data.description || ""}`,
        "",
        `- Canonical URL: https://motofolio.pages.dev/faqs`,
        `- JSON Source: https://motofolio.pages.dev/data/faqs.json`,
        `- Last Updated: ${data.lastUpdated || ""}`,
        "",
      ];

      for (const cat of data.categories ?? []) {
        lines.push(`## ${cat.name}`, "");
        for (const item of cat.faqs) {
          lines.push(`### ${item.question}`, "", item.answer, "");
        }
      }

      fs.writeFileSync(path.join(outDir, "faqs.md"), lines.join("\n"), "utf8");
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const verificationToken =
    env.GOOGLE_SITE_VERIFICATION || env.VITE_GOOGLE_SITE_VERIFICATION || "";

  return {
    base: "./",
    envPrefix: ["VITE_", "GOOGLE_CLIENT_ID", "GOOGLE_SITE_VERIFICATION"],
    plugins: [
      cleanLegalRoutes(),
      copyStaticRuntimeAssets(),
      generateFaqArtifacts(),
      injectGoogleSiteVerification(verificationToken),
    ],
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(process.cwd(), "index.html"),
          "privacy-policy": path.resolve(process.cwd(), "pages/privacy-policy.html"),
          "terms-of-service": path.resolve(process.cwd(), "pages/terms-of-service.html"),
          faqs: path.resolve(process.cwd(), "pages/faqs.html"),
        },
      },
    },
  };
});
