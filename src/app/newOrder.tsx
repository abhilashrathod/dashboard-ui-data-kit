import { useState, type ReactNode } from 'react'
import { CreateOrderDrawer } from '@/features/orders/CreateOrderDrawer'
import { useGoToOrders } from './navigation'
import { OpenNewOrderContext } from './useOpenNewOrder'

/**
 * One "New order" drawer for the whole app, so the Overview and Orders
 * buttons open the same one. Its open state is plain UI state, not URL state:
 * a half-filled form shouldn't survive in a shared link.
 */
export function NewOrderProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const goToOrders = useGoToOrders()

  return (
    <OpenNewOrderContext value={() => setOpen(true)}>
      {children}
      <CreateOrderDrawer
        open={open}
        onOpenChange={setOpen}
        onViewOrder={(id) => goToOrders({ q: id })}
      />
    </OpenNewOrderContext>
  )
}
