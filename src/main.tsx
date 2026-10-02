import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/app/App'
import { KitProvider } from '@/components'
import { isApiError } from '@/lib/api'
import { initDensity } from '@/tokens/density'
import { initTheme } from '@/tokens/theme'
import '@fontsource-variable/geist/wght.css'
import '@/styles.css'

const MAX_RETRIES = 2

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry only failures that can succeed on a second try: no response at
      // all (status 0) or 503 UNAVAILABLE. Retrying 4xx, 500 or CONTRACT errors
      // just delays the error state (by ~7s with the default policy).
      retry: (failureCount, error) =>
        failureCount < MAX_RETRIES &&
        isApiError(error) &&
        (error.status === 0 || error.code === 'UNAVAILABLE'),
    },
  },
})

async function enableMocking(): Promise<void> {
  // The deployed demo has no backend, so production builds opt in with
  // VITE_ENABLE_MOCKS=true. The dynamic import keeps MSW out of other builds.
  if (!import.meta.env.DEV && import.meta.env.VITE_ENABLE_MOCKS !== 'true') return
  const { startMockWorker } = await import('@/mocks/browser')
  await startMockWorker()
}

initTheme()
initDensity()

void enableMocking().then(() => {
  const root = document.getElementById('root')
  if (!root) throw new Error('Missing #root element')

  createRoot(root).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <KitProvider>
          <App />
        </KitProvider>
      </QueryClientProvider>
    </StrictMode>,
  )
})
