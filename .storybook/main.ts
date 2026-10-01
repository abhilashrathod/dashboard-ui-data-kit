import { defineMain } from '@storybook/react-vite/node'

/*
 * Subpath deployment (GitHub Pages /<repo>/): no base/managerHead override is
 * needed. Storybook's Vite builder forces `base: './'` for the preview, so the
 * static build uses relative URLs and works under any subpath. Inside stories
 * `import.meta.env.BASE_URL` is therefore './', which is what the MSW worker
 * URL in src/mocks/browser.ts relies on.
 *
 * The `@/` alias and the Tailwind plugin come from ../vite.config.ts, which the
 * builder loads automatically.
 */
export default defineMain({
  framework: '@storybook/react-vite',
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-a11y', '@storybook/addon-vitest'],
  // Serves public/mockServiceWorker.js next to iframe.html.
  staticDirs: ['../public'],
})
