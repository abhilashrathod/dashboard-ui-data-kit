import { createContext, useContext } from 'react'
import type { UrlAdapter } from './adapter'

export const UrlAdapterContext = createContext<UrlAdapter | null>(null)

/** The adapter from the nearest <UrlStateProvider>. */
export function useUrlAdapter(): UrlAdapter {
  const adapter = useContext(UrlAdapterContext)
  if (!adapter) throw new Error('useUrlAdapter must be used inside <UrlStateProvider>')
  return adapter
}
