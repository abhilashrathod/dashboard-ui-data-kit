import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { DEFAULT_LIST_PARAMS, listParamsKey } from '@/contracts'
import { Button, Card } from '@/components'
import { fetchOrders, isApiError } from '@/lib/api'
import { queryKeys } from '@/lib/query'

const count = new Intl.NumberFormat('en-US')

/**
 * Placeholder card proving the whole path: TanStack Query → API client →
 * MSW (with network simulation) → query engine → contract-validated response.
 * Try /?network=error or /?network=slow.
 */
export function OrdersCard() {
  const orders = useQuery({
    queryKey: queryKeys.orders.list(listParamsKey(DEFAULT_LIST_PARAMS)),
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
    <Card role="region" aria-labelledby="orders-title">
      <Card.Header
        actions={
          <Button
            variant="outline"
            size="sm"
            loading={orders.isFetching}
            onClick={() => void orders.refetch()}
          >
            Refresh
          </Button>
        }
      >
        <Card.Title as="h2" id="orders-title" className="text-sm font-medium text-fg-muted">
          Orders
        </Card.Title>
      </Card.Header>
      <Card.Body>
        <p className="text-lg font-semibold tabular" aria-live="polite">
          {status}
        </p>
        <p className="mt-1 text-sm text-fg-muted">
          <code>GET /api/orders</code> via the API client, served by MSW.
        </p>
      </Card.Body>
    </Card>
  )
}
