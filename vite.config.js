import { defineConfig } from "vite";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  appType: "mpa",
  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: false,
    minify: "esbuild",
    rollupOptions: {
      input: {
        main: resolve(rootDir, "index.html"),
        about: resolve(rootDir, "about/index.html"),
        disclaimer: resolve(rootDir, "disclaimer/index.html"),
        downloads: resolve(rootDir, "downloads/index.html"),
        guides: resolve(rootDir, "guides/index.html"),
        changelogs: resolve(rootDir, "changelogs/index.html"),
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
