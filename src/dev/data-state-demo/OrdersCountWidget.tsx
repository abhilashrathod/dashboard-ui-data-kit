import { useQuery } from '@tanstack/react-query'
import { DataBoundary, Skeleton } from '@/components'
import { DEFAULT_LIST_PARAMS, listParamsKey, type Order, type Page } from '@/contracts'
import { fetchOrders } from '@/lib/api'
import { useDataState } from '@/lib/data-state'
import { formatNumber } from '@/lib/format'
import { WidgetCard } from './WidgetCard'

const isEmpty = (page: Page<Order>) => page.total === 0

/** The minimal wiring: query → useDataState → DataBoundary. */
export function OrdersCountWidget() {
  const query = useQuery({
    queryKey: ['orders', listParamsKey(DEFAULT_LIST_PARAMS)],
    queryFn: ({ signal }) => fetchOrders(DEFAULT_LIST_PARAMS, signal),
  })
  const state = useDataState(query, { isEmpty })

  return (
    <WidgetCard title="Orders" onRefresh={query.refetch}>
      <DataBoundary state={state} label="Orders" skeleton={<Skeleton className="h-10 w-36" />}>
        {(page) => <p className="text-display-sm tabular">{formatNumber(page.total)}</p>}
      </DataBoundary>
    </WidgetCard>
  )
}
