import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
import { playwright } from '@vitest/browser-playwright'
import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

// Extends vite.config.ts, so the `@/` alias, React and Tailwind plugins apply to both projects.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      projects: [
        {
          extends: true,
          test: {
            name: 'unit',
            environment: 'jsdom',
            include: ['src/**/*.test.{ts,tsx}'],
            setupFiles: ['./src/test/setup.ts'],
            restoreMocks: true,
            unstubGlobals: true,
          },
        },
        {
          extends: true,
          plugins: [
            // Turns every story into a test: render + play function + a11y checks.
            storybookTest({
              configDir: '.storybook',
              storybookScript: 'pnpm storybook --no-open',
            }),
          ],
          test: {
            name: 'storybook',
            browser: {
              enabled: true,
              provider: playwright(),
              headless: true,
              instances: [{ browser: 'chromium' }],
            },
          },
        },
      ],
    },
  }),
)
