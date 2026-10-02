import { useQuery } from '@tanstack/react-query'
import { Amount, DataBoundary, Skeleton } from '@/components'
import type { RevenueSeriesResponse } from '@/contracts'
import { fetchRevenueSeries } from '@/lib/api'
import { useDataState } from '@/lib/data-state'
import { formatNumber } from '@/lib/format'
import { WidgetCard } from './WidgetCard'
import { queryKeys } from '@/lib/query'

// The series is zero-filled, so "empty" means no orders on any day.
const isEmpty = ({ points }: RevenueSeriesResponse) => points.every((point) => point.orders === 0)

/** Derives a total from the series inside the render function. */
export function RevenueTotalWidget() {
  const query = useQuery({
    queryKey: queryKeys.metrics.revenue('30d'),
    queryFn: ({ signal }) => fetchRevenueSeries('30d', signal),
  })
  const state = useDataState(query, { isEmpty })

  return (
    <WidgetCard title="Revenue · 30 days" onRefresh={query.refetch}>
      <DataBoundary
        state={state}
        label="Revenue"
        skeleton={
          <div className="flex flex-col gap-1">
            <Skeleton className="h-10 w-44" />
            <Skeleton className="my-0.5 h-3 w-24" />
          </div>
        }
      >
        {({ points }) => (
          <div className="flex flex-col gap-1">
            <Amount
              size="display-sm"
              value={points.reduce((sum, point) => sum + point.revenue, 0)}
            />
            <p className="text-sm text-fg-muted tabular">
              {formatNumber(points.reduce((sum, point) => sum + point.orders, 0))} orders
            </p>
          </div>
        )}
      </DataBoundary>
    </WidgetCard>
  )
}
