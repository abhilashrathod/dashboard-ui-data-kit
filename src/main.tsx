import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/app/App'
import { KitProvider } from '@/components'
import { createQueryClient } from '@/lib/query'
import { UrlStateProvider } from '@/lib/url-state'
import { initDensity } from '@/tokens/density'
import { initTheme } from '@/tokens/theme'
import '@fontsource-variable/geist/wght.css'
import '@/styles.css'

// Defaults (retry policy, staleTime, gcTime) live in src/lib/query/queryClient.ts.
const queryClient = createQueryClient({ mode: 'app' })

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
      <UrlStateProvider>
        <QueryClientProvider client={queryClient}>
          <KitProvider>
            <App />
          </KitProvider>
        </QueryClientProvider>
      </UrlStateProvider>
    </StrictMode>,
  )
})
