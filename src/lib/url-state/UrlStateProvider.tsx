import type { ReactNode } from 'react'
import { getBrowserAdapter, type UrlAdapter } from './adapter'
import { UrlAdapterContext } from './context'

/**
 * Supplies the URL adapter to every useListParams below it. Defaults to the
 * browser's history; tests and Storybook pass a memory adapter.
 */
export function UrlStateProvider({
  adapter,
  children,
}: {
  adapter?: UrlAdapter
  children: ReactNode
}) {
  return <UrlAdapterContext value={adapter ?? getBrowserAdapter()}>{children}</UrlAdapterContext>
}
