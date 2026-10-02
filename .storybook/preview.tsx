import addonA11y from '@storybook/addon-a11y'
import addonDocs from '@storybook/addon-docs'
import addonVitest from '@storybook/addon-vitest'
import { definePreview } from '@storybook/react-vite'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import addonMsw from 'msw-storybook-addon'
import { useLayoutEffect, useState, type ReactNode } from 'react'
import { KitProvider } from '@/components'
import { createMemoryAdapter, type MemoryUrlAdapter, UrlStateProvider } from '@/lib/url-state'
import { startMockWorker } from '@/mocks/browser'
import { resetDb } from '@/mocks/data/db'
import {
  type EndpointKey,
  NETWORK_MODES,
  type NetworkMode,
  resetNetworkConfig,
  setNetworkConfig,
} from '@/mocks/network'
import '@fontsource-variable/geist/wght.css'
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
 * Each story render gets its own in-memory URL history, starting at
 * `parameters.url` (e.g. '?orders.page=3&orders.sort=-amount') or ''.
 * This returns that adapter, for play functions:
 *   play: async ({ loaded }) => { const url = storyUrl(loaded); expect(url.entries)… }
 */
export function storyUrl(loaded: Record<string, unknown>): MemoryUrlAdapter {
  const adapter = loaded.urlAdapter as MemoryUrlAdapter | undefined
  if (!adapter) throw new Error('No URL adapter: is the preview loader missing?')
  return adapter
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

/**
 * Theme and density go on <html>, not on the story wrapper: overlays (dialogs,
 * menus, toasts) portal to document.body, outside any wrapper, and must still
 * follow the toolbar. Cleared when the story (or the globals) change.
 */
function DocumentGlobals({
  theme,
  density,
  children,
}: {
  theme: 'light' | 'dark'
  density: 'comfortable' | 'compact'
  children: ReactNode
}) {
  useLayoutEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    root.dataset.density = density
    return () => {
      delete root.dataset.theme
      delete root.dataset.density
    }
  }, [theme, density])
  return children
}

export default definePreview({
  addons: [
    addonA11y(),
    addonDocs(),
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
    // A fresh in-memory URL per story render, so the iframe's real URL is never
    // touched and play functions can assert on history entries (storyUrl).
    ({ parameters }) => ({
      urlAdapter: createMemoryAdapter(typeof parameters.url === 'string' ? parameters.url : ''),
    }),
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
    density: {
      description: 'Spacing density (data-density)',
      toolbar: {
        title: 'Density',
        icon: 'component',
        items: [
          { value: 'comfortable', title: 'Comfortable' },
          { value: 'compact', title: 'Compact' },
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
  initialGlobals: { theme: 'light', density: 'comfortable', network: 'normal' },

  parameters: {
    layout: 'fullscreen',
    // The theme decorator paints the canvas token, so the backgrounds toolbar would only conflict.
    backgrounds: { disable: true },
    // Fail story tests on accessibility violations instead of only reporting them.
    a11y: { test: 'error' },
  },

  decorators: [
    // Fresh query cache, URL and kit state (toasts, announcer) per story.
    (Story, { id, globals, loaded }) => (
      <UrlStateProvider adapter={storyUrl(loaded)}>
        <StoryQueryProvider key={`${id}:${String(globals.network)}`}>
          <KitProvider>
            <Story />
          </KitProvider>
        </StoryQueryProvider>
      </UrlStateProvider>
    ),
    (Story, { id, globals }) => (
      <DocumentGlobals
        key={id}
        theme={globals.theme === 'dark' ? 'dark' : 'light'}
        density={globals.density === 'compact' ? 'compact' : 'comfortable'}
      >
        <div className="min-h-screen bg-canvas p-6 font-sans text-base text-fg">
          <Story />
        </div>
      </DocumentGlobals>
    ),
  ],
})
