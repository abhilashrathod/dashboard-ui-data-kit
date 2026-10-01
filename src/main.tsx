import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/app/App'
import { initTheme } from '@/tokens/theme'
import '@/styles.css'

const queryClient = new QueryClient()

async function enableMocking(): Promise<void> {
  // The deployed demo has no backend, so production builds opt in with
  // VITE_ENABLE_MOCKS=true. The dynamic import keeps MSW out of other builds.
  if (!import.meta.env.DEV && import.meta.env.VITE_ENABLE_MOCKS !== 'true') return
  const { startMockWorker } = await import('@/mocks/browser')
  await startMockWorker()
}

initTheme()

void enableMocking().then(() => {
  const root = document.getElementById('root')
  if (!root) throw new Error('Missing #root element')

  createRoot(root).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </StrictMode>,
  )
})
