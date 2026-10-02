import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { DEFAULT_LIST_PARAMS, listParamsKey } from '@/contracts'
import { fetchOrders, isApiError } from '@/lib/api'

const count = new Intl.NumberFormat('en-US')

/**
 * Placeholder card proving the whole path: TanStack Query → API client →
 * MSW (with network simulation) → query engine → contract-validated response.
 * Try /?network=error or /?network=slow.
 */
export function OrdersCard() {
  const orders = useQuery({
    queryKey: ['orders', listParamsKey(DEFAULT_LIST_PARAMS)],
    queryFn: ({ signal }) => fetchOrders(DEFAULT_LIST_PARAMS, signal),
  })

  let status: ReactNode
  if (orders.isPending) {
    status = <span className="text-fg-muted">Loading orders…</span>
  } else if (orders.isError) {
    const error = orders.error
    status = (
      <span className="text-status-danger-fg">
        Orders API error: {isApiError(error) ? error.code : 'UNKNOWN'}
        {isApiError(error) && error.requestId ? ` · ${error.requestId}` : ''}
      </span>
    )
  } else {
    status = <span>Orders API: {count.format(orders.data.total)} orders</span>
  }

  return (
    <section aria-labelledby="orders-title" className="rounded-lg bg-surface p-card">
      <div className="flex items-center justify-between gap-4">
        <h2 id="orders-title" className="text-sm font-medium text-fg-muted">
          Orders
        </h2>
        <button
          type="button"
          onClick={() => void orders.refetch()}
          disabled={orders.isFetching}
          className="h-control-sm rounded-pill border border-border-strong px-3 text-sm font-medium text-fg focus-ring hover:bg-surface-muted disabled:text-fg-muted"
        >
          {orders.isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      <p className="mt-2 text-lg font-semibold tabular" aria-live="polite">
        {status}
      </p>
      <p className="mt-1 text-sm text-fg-muted">
        <code>GET /api/orders</code> via the API client, served by MSW.
      </p>
    </section>
  )
}
