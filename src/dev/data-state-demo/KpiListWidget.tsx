import { useQuery } from '@tanstack/react-query'
import { DataBoundary, DeltaChip, NoDataEmptyState, Skeleton } from '@/components'
import type { Kpi, KpiResponse } from '@/contracts'
import { fetchKpis } from '@/lib/api'
import { useDataState } from '@/lib/data-state'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/format'
import { WidgetCard } from './WidgetCard'
import { queryKeys } from '@/lib/query'

const isEmpty = ({ kpis }: KpiResponse) =>
  kpis.every((kpi) => kpi.value === 0 && kpi.previousValue === 0)

const format = (kpi: Kpi) =>
  kpi.format === 'currency'
    ? formatCurrency(kpi.value, { compact: true })
    : kpi.format === 'percent'
      ? formatPercent(kpi.value, { digits: 1 })
      : formatNumber(kpi.value)

const tile = 'flex flex-col gap-1 rounded-md bg-surface-subtle p-tile'

const skeleton = (
  <div className="grid grid-cols-2 gap-2">
    {Array.from({ length: 4 }, (_, index) => (
      <div key={index} className={tile}>
        <Skeleton className="my-0.5 h-3 w-20" />
        <Skeleton className="h-7 w-24" />
      </div>
    ))}
  </div>
)

/** Compact boundary: four KPI tiles with deltas. */
export function KpiListWidget() {
  const query = useQuery({
    queryKey: queryKeys.metrics.kpis('30d'),
    queryFn: ({ signal }) => fetchKpis('30d', signal),
  })
  const state = useDataState(query, { isEmpty })

  return (
    <WidgetCard title="KPIs · 30 days" onRefresh={query.refetch}>
      <DataBoundary
        state={state}
        label="KPIs"
        size="compact"
        skeleton={skeleton}
        empty={<NoDataEmptyState noun="KPI data" size="compact" />}
      >
        {({ kpis }) => (
          <dl className="grid grid-cols-2 gap-2">
            {kpis.map((kpi) => (
              <div key={kpi.id} className={tile}>
                <dt className="text-sm text-fg-muted">{kpi.label}</dt>
                <dd className="flex flex-wrap items-center gap-2">
                  <span className="text-xl tabular">{format(kpi)}</span>
                  <DeltaChip
                    current={kpi.value}
                    previous={kpi.previousValue}
                    goodWhen={kpi.id === 'refundRate' ? 'down' : 'up'}
                    periodLabel="vs previous 30 days"
                  />
                </dd>
              </div>
            ))}
          </dl>
        )}
      </DataBoundary>
    </WidgetCard>
  )
}
