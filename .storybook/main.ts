import { defineMain } from '@storybook/react-vite/node'

/*
 * The `@/` alias and the Tailwind plugin come from ../vite.config.ts, which the
 * builder loads automatically.
 */
export default defineMain({
  framework: '@storybook/react-vite',
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-a11y', '@storybook/addon-docs', '@storybook/addon-vitest'],
  // Serves public/mockServiceWorker.js next to iframe.html.
  staticDirs: ['../public'],
})
