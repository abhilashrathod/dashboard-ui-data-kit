import { createContext, use } from 'react'

/**
 * Dev-only render counter for the grid's rows. A test provides a callback and
 * every row render reports its id, so a test can assert that moving the active
 * cell re-renders at most two rows (docs/keyboard-grid.md). Without a
 * provider it does nothing; in production builds the call is compiled out.
 */
export type RenderCounter = (rowId: string) => void

export const RenderCounterContext = createContext<RenderCounter | null>(null)

export function useRenderCount(rowId: string) {
  const counter = use(RenderCounterContext)
  if (import.meta.env.DEV && counter) counter(rowId)
}
