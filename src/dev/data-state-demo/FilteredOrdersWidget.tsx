import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import {
  Amount,
  Checkbox,
  DataBoundary,
  NoDataEmptyState,
  NoResultsEmptyState,
  Skeleton,
  StatusPill,
} from '@/components'
import {
  DEFAULT_LIST_PARAMS,
  listParamsKey,
  type ListParams,
  type Order,
  type Page,
} from '@/contracts'
import { fetchOrders } from '@/lib/api'
import { useDataState } from '@/lib/data-state'
import { formatNumber } from '@/lib/format'
import { WidgetCard } from './WidgetCard'

/** No seeded order matches this (the largest failed order is under $3,000). */
const FILTERED: ListParams = {
  ...DEFAULT_LIST_PARAMS,
  filters: [
    { field: 'status', op: 'in', value: ['failed'] },
    { field: 'amount', op: 'gt', value: 4900 },
  ],
}

const isEmpty = (page: Page<Order>) => page.total === 0

const skeleton = (
  <div className="flex flex-col gap-3">
    <Skeleton className="my-0.5 h-3 w-24" />
    {Array.from({ length: 3 }, (_, index) => (
      <Skeleton key={index} shape="pill" className="h-9 w-full" />
    ))}
  </div>
)

/**
 * Filters + keepPreviousData: toggling dims the old rows (isPlaceholder) while
 * the new key loads, then lands on no-results, with a working Clear filters.
 */
export function FilteredOrdersWidget({ defaultFiltered = false }: { defaultFiltered?: boolean }) {
  const [filtered, setFiltered] = useState(defaultFiltered)
  const params = filtered ? FILTERED : DEFAULT_LIST_PARAMS
  const query = useQuery({
    queryKey: ['orders', listParamsKey(params)],
    queryFn: ({ signal }) => fetchOrders(params, signal),
    placeholderData: keepPreviousData,
  })
  const clear = useCallback(() => setFiltered(false), [])
  const state = useDataState(query, { isEmpty, isFiltered: filtered, clear })

  return (
    <WidgetCard
      title="Recent orders"
      onRefresh={query.refetch}
      actions={
        <Checkbox
          label="Filter: status = failed and amount > 4900"
          checked={filtered}
          onChange={(event) => setFiltered(event.target.checked)}
          className="text-sm"
        />
      }
    >
      {/* A distinct label (landmarks must be unique on a page); the copy still says "orders". */}
      <DataBoundary
        state={state}
        label="Recent orders"
        skeleton={skeleton}
        empty={<NoDataEmptyState noun="orders" />}
        noResults={<NoResultsEmptyState noun="orders" onClear={clear} />}
      >
        {(page) => (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-fg-muted tabular">{formatNumber(page.total)} orders</p>
            <ul className="flex flex-col gap-2">
              {page.rows.slice(0, 3).map((order) => (
                <li
                  key={order.id}
                  className="flex h-9 items-center justify-between gap-3 rounded-pill bg-surface-subtle px-3 text-sm"
                >
                  <span className="truncate">
                    <span className="font-mono text-xs text-fg-muted">{order.id}</span>{' '}
                    {order.customer.name}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <Amount size="sm" value={order.amount} />
                    <StatusPill status={order.status} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </DataBoundary>
    </WidgetCard>
  )
}
