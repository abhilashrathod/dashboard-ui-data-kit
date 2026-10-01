import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The demo is deployed to a GitHub Pages subpath (/<repo>/demo/), so the
// base is injected at build time. Everything that builds a URL at runtime
// (e.g. the MSW worker script) must go through import.meta.env.BASE_URL.
function resolveBase(): string {
  const base = process.env.BASE_PATH ?? '/'
  return base.endsWith('/') ? base : `${base}/`
}

// https://vite.dev/config/
export default defineConfig({
  base: resolveBase(),
  plugins: [react(), tailwindcss()],
  resolve: {
    // Keep in sync with "paths" in tsconfig.json. Vitest and Storybook both
    // load this file, so they inherit the alias.
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
