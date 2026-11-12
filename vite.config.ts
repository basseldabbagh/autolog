import { defineConfig, loadEnv, type Connect, type Plugin } from "vite";
import fs from "node:fs";
import path from "node:path";

/** Maps clean legal page URLs (/privacy-policy, /terms-of-service) and hoists pages/*.html to dist root. */
function cleanLegalRoutes(): Plugin {
  const devRoutes: Record<string, string> = {
    "/privacy-policy": "/pages/privacy-policy.html",
    "/terms-of-service": "/pages/terms-of-service.html",
  };
  const previewRoutes: Record<string, string> = {
    "/privacy-policy": "/privacy-policy.html",
    "/terms-of-service": "/terms-of-service.html",
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
  const staticFiles = [
    "config.js",
    "manifest.json",
    "sw.js",
    "favicon.svg",
    "og-image.svg",
    "robots.txt",
    "sitemap.xml",
    "llms.txt",
  ];
  const staticDirs = ["cars", "template"];

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
      injectGoogleSiteVerification(verificationToken),
    ],
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(process.cwd(), "index.html"),
          "privacy-policy": path.resolve(process.cwd(), "pages/privacy-policy.html"),
          "terms-of-service": path.resolve(process.cwd(), "pages/terms-of-service.html"),
        },
      },
    },
  };
});
