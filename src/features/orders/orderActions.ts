import { createContext, use } from 'react'
import type { Order, OrderStatus } from '@/contracts'

/**
 * What a row can do, provided by OrdersTable. The drawer and the single-order
 * confirm dialog live at the table level, not in the row: a row can unmount
 * under them (a status change refetches and re-sorts the page).
 *
 * The value is stable (memoized callbacks), so the actions cell in every row
 * doesn't re-render when the active cell moves.
 */
export interface OrderActions {
  openDetails: (order: Order) => void
  changeStatus: (order: Order, status: OrderStatus) => void
}

export const OrderActionsContext = createContext<OrderActions | null>(null)

export function useOrderActions(): OrderActions {
  const actions = use(OrderActionsContext)
  if (!actions) throw new Error('Order row actions must be rendered inside <OrdersTable>.')
  return actions
}
