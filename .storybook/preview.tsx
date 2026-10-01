import addonA11y from '@storybook/addon-a11y'
import addonVitest from '@storybook/addon-vitest'
import { definePreview } from '@storybook/react-vite'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import addonMsw from 'msw-storybook-addon'
import { useState, type ReactNode } from 'react'
import { startMockWorker } from '@/mocks/browser'
import '@/styles.css'

/** A fresh QueryClient per story (keyed by story id), so cached data never leaks between stories. */
function StoryQueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  )
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

export default definePreview({
  addons: [
    addonA11y(),
    addonVitest(),
    // Custom setup: registers the shared `handlers` as initial handlers (they
    // survive the addon's per-story reset).
    // Override per story with `beforeEach({ msw }) { msw.use(...) }`.
    addonMsw(() => startMockWorker({ quiet: true })),
  ],

  globalTypes: {
    theme: {
      description: 'Color theme',
      toolbar: {
        title: 'Theme',
        icon: 'mirror',
        items: [
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'light' },

  parameters: {
    layout: 'fullscreen',
    // The theme decorator paints the canvas token, so the backgrounds toolbar would only conflict.
    backgrounds: { disable: true },
    // Fail story tests on accessibility violations instead of only reporting them.
    a11y: { test: 'error' },
  },

  decorators: [
    (Story, { id }) => (
      <StoryQueryProvider key={id}>
        <Story />
      </StoryQueryProvider>
    ),
    (Story, { globals }) => (
      <div
        data-theme={globals.theme === 'dark' ? 'dark' : 'light'}
        className="min-h-screen bg-canvas p-6 font-sans text-fg-default"
      >
        <Story />
      </div>
    ),
  ],
})
