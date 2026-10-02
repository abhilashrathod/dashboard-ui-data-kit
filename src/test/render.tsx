import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, type RenderOptions } from '@testing-library/react'
import type { ReactElement } from 'react'
import { KitProvider } from '@/components'
import { createMemoryAdapter, UrlStateProvider } from '@/lib/url-state'

export interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  /** Initial query string for the in-memory URL, e.g. "?orders.page=2". */
  url?: string
}

/**
 * Render with the same providers as main.tsx (URL state + QueryClient + KitProvider),
 * using an in-memory URL and a fresh non-retrying QueryClient.
 */
export function renderWithProviders(
  ui: ReactElement,
  { url = '', ...options }: RenderWithProvidersOptions = {},
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const urlAdapter = createMemoryAdapter(url)
  return {
    queryClient,
    urlAdapter,
    ...render(ui, {
      wrapper: ({ children }) => (
        <UrlStateProvider adapter={urlAdapter}>
          <QueryClientProvider client={queryClient}>
            <KitProvider>{children}</KitProvider>
          </QueryClientProvider>
        </UrlStateProvider>
      ),
      ...options,
    }),
  }
}
