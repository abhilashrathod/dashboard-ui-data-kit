import { Plus } from 'lucide-react'
import { Button } from '@/components'
import { OrdersTable } from '@/features/orders/OrdersTable'
import { ORDERS_NAMESPACE } from '../navigation'
import { useOpenNewOrder } from '../useOpenNewOrder'

export function OrdersView() {
  const openNewOrder = useOpenNewOrder()
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-xl font-semibold">Orders</h2>
          <p className="max-w-2xl text-fg-muted">
            Every order across channels. Sort, page and search live in the URL, so any view can be
            shared or bookmarked.
          </p>
        </div>
        <Button leftIcon={<Plus />} onClick={openNewOrder}>
          New order
        </Button>
      </div>
      {/*
        A bounded scroll container, so large pages (500 rows) virtualize:
        the viewport minus the top bar, title, toolbar and pagination,
        never under 400px.
      */}
      <OrdersTable
        namespace={ORDERS_NAMESPACE}
        gridClassName="max-h-[max(400px,calc(100dvh-24rem))]"
      />
    </>
  )
}
