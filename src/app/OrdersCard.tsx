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
      <span className="text-danger">
        Orders API error: {isApiError(error) ? error.code : 'UNKNOWN'}
        {isApiError(error) && error.requestId ? ` · ${error.requestId}` : ''}
      </span>
    )
  } else {
    status = <span>Orders API: {count.format(orders.data.total)} orders</span>
  }

  return (
    <section
      aria-labelledby="orders-title"
      className="rounded-lg border border-border bg-surface p-6 shadow-sm"
    >
      <div className="flex items-center justify-between gap-4">
        <h2 id="orders-title" className="text-sm font-medium text-fg-muted">
          Orders
        </h2>
        <button
          type="button"
          onClick={() => void orders.refetch()}
          disabled={orders.isFetching}
          className="rounded-md border border-border px-2 py-1 text-xs font-medium text-fg-default hover:bg-muted focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none disabled:opacity-60"
        >
          {orders.isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      <p className="mt-2 text-lg font-semibold" aria-live="polite">
        {status}
      </p>
      <p className="mt-1 text-sm text-fg-muted">
        <code>GET /api/orders</code> via the API client, served by MSW.
      </p>
    </section>
  )
}
