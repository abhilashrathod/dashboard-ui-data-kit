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
            exclude: ['src/**/*.node.test.ts'],
            setupFiles: ['./src/test/setup.ts'],
            restoreMocks: true,
            unstubGlobals: true,
          },
        },
        {
          // Pure Node tests (no DOM, no MSW), e.g. the token guard tests that read tokens.css.
          extends: true,
          test: {
            name: 'node',
            environment: 'node',
            include: ['src/**/*.node.test.ts'],
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
            // Run after the unit and node projects (groupOrder 0), not alongside
            // them: Chromium competing for CPU made time-sensitive unit tests
            // (the 10k-order performance budget, Radix interactions in jsdom)
            // fail intermittently.
            sequence: { groupOrder: 1 },
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
