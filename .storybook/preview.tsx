import addonA11y from '@storybook/addon-a11y'
import addonVitest from '@storybook/addon-vitest'
import { definePreview } from '@storybook/react-vite'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import addonMsw from 'msw-storybook-addon'
import { useState, type ReactNode } from 'react'
import { startMockWorker } from '@/mocks/browser'
import { resetDb } from '@/mocks/data/db'
import {
  type EndpointKey,
  NETWORK_MODES,
  type NetworkMode,
  resetNetworkConfig,
  setNetworkConfig,
} from '@/mocks/network'
import '@/styles.css'

/**
 * Per-story network simulation. Wins over the toolbar:
 *   parameters: { network: { failEndpoints: ['metrics.kpis'] } }
 */
export interface NetworkParameter {
  mode?: NetworkMode
  failEndpoints?: EndpointKey[]
}

/**
 * Stories use a fixed anchor so their numbers and charts look the same every
 * day (stable visuals and snapshots). The demo app anchors on today instead.
 */
const STORY_ANCHOR = new Date('2026-09-30T00:00:00Z')

const isNetworkMode = (value: unknown): value is NetworkMode =>
  NETWORK_MODES.some((mode) => mode === value)

/**
 * A fresh QueryClient per mount. The decorator keys this on story id + network
 * mode, so cached data never leaks between stories, and switching the network
 * toolbar shows the new state instead of stale data. useState keeps the client
 * stable across re-renders of the same mount.
 */
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

  // Runs before every story render: fresh seeded data, then the network mode
  // from the toolbar, then the story's own `parameters.network` on top.
  loaders: [
    ({ globals, parameters }) => {
      resetDb({ anchor: STORY_ANCHOR })
      resetNetworkConfig()
      if (isNetworkMode(globals.network)) setNetworkConfig({ mode: globals.network })
      const network = parameters.network as NetworkParameter | undefined
      if (network) setNetworkConfig(network)
      return {}
    },
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
    network: {
      description: 'Simulated network for the mock API',
      toolbar: {
        title: 'Network',
        icon: 'transfer',
        items: NETWORK_MODES.map((mode) => ({ value: mode, title: mode })),
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'light', network: 'normal' },

  parameters: {
    layout: 'fullscreen',
    // The theme decorator paints the canvas token, so the backgrounds toolbar would only conflict.
    backgrounds: { disable: true },
    // Fail story tests on accessibility violations instead of only reporting them.
    a11y: { test: 'error' },
  },

  decorators: [
    (Story, { id, globals }) => (
      <StoryQueryProvider key={`${id}:${String(globals.network)}`}>
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
