import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // Keep in sync with "paths" in tsconfig.json. Vitest and Storybook both
    // load this file, so they inherit the alias.
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
