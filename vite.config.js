import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  appType: 'mpa',

  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        privacy: resolve(__dirname, 'privacy/index.html'),
        terms: resolve(__dirname, 'terms/index.html'),
        disclaimer: resolve(__dirname, 'disclaimer/index.html'),
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
})
