import { createContext, use } from 'react'

/** Provided by <NewOrderProvider>: opens the app-wide "New order" drawer. */
export const OpenNewOrderContext = createContext<(() => void) | null>(null)

export function useOpenNewOrder(): () => void {
  const open = use(OpenNewOrderContext)
  if (!open) throw new Error('useOpenNewOrder must be used inside <NewOrderProvider>')
  return open
}
