import type { ReactNode } from 'react'
import { AnnouncerProvider } from '../announcer'
import { ToastProvider } from '../toast'
import { TooltipProvider } from '../tooltip'

/**
 * Everything the kit needs once at the root: the shared tooltip delay, the
 * toast store and viewport, and the screen-reader announcer. Render it inside
 * your data providers (QueryClientProvider), around the app.
 */
export function KitProvider({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider>
      <ToastProvider>
        <AnnouncerProvider>{children}</AnnouncerProvider>
      </ToastProvider>
    </TooltipProvider>
  )
}
