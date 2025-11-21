import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  appType: "mpa",

  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: false,
    minify: "esbuild",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        about: resolve(__dirname, "about/index.html"),
        disclaimer: resolve(__dirname, "disclaimer/index.html"),
        downloads: resolve(__dirname, "downloads/index.html"),
        guides: resolve(__dirname, "guides/index.html"),
        changelogs: resolve(__dirname, "changelogs/index.html"),
      },
      output: {
        manualChunks: undefined,
      },
    },
  },

  server: {
    port: 3000,
    open: true,
  },
});
