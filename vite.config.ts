import { defineConfig, type Plugin } from "vite";
import fs from "node:fs";
import path from "node:path";

/** Copies static runtime files and JSON profile folders into dist/ on production build. */
function copyStaticRuntimeAssets(): Plugin {
  const staticFiles = ["config.js", "manifest.json", "sw.js", "favicon.svg", "og-image.svg"];
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

export default defineConfig({
  base: "./",
  envPrefix: ["VITE_", "GOOGLE_CLIENT_ID"],
  plugins: [copyStaticRuntimeAssets()],
});
