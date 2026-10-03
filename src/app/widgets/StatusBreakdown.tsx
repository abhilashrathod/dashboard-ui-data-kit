import { PieChart as PieIcon } from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import { Card, DataBoundary, EmptyState, ORDER_STATUS_DISPLAY, Skeleton, StatusPill } from '@/components'
import type { MetricsRange, OrderStatus } from '@/contracts'
import { cn } from '@/lib/cn'
import { formatNumber, formatPercent } from '@/lib/format'
import { useGoToOrders } from '../navigation'
import { usePrefersReducedMotion } from '../usePrefersReducedMotion'
import { useStatusBreakdownState } from './metricsState'

/** Each segment wears its status's base color, the same tone as its StatusPill. */
const segmentColor = (status: OrderStatus) =>
  `var(--color-status-${ORDER_STATUS_DISPLAY[status].tone})`

const DONUT_SIZE = 'size-44'

function BreakdownSkeleton() {
  return (
    <div className="flex flex-col items-center gap-6">
      <Skeleton shape="circle" className={DONUT_SIZE} />
      <div className="flex w-full flex-col gap-3">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="flex items-center justify-between gap-3">
            <Skeleton shape="pill" className="h-6 w-24" />
            <Skeleton shape="pill" className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function StatusBreakdown({ range }: { range: MetricsRange }) {
  const state = useStatusBreakdownState(range)
  const reducedMotion = usePrefersReducedMotion()
  const goToOrders = useGoToOrders()

  return (
    <Card className="min-w-0">
      <Card.Header>
        <Card.Title as="h2">Orders by status</Card.Title>
        <Card.Description>Orders created this period</Card.Description>
      </Card.Header>
      <DataBoundary
        state={state}
        label="Status breakdown"
        skeleton={<BreakdownSkeleton />}
        empty={
          <EmptyState
            size="compact"
            icon={<PieIcon />}
            title="No orders in this period"
            description="Try a longer range."
          />
        }
      >
        {(breakdown) => (
          <div className="flex flex-col items-center gap-6">
            <div className={cn('relative', DONUT_SIZE)}>
              <div aria-hidden="true" className="absolute inset-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={breakdown.items}
                      dataKey="count"
                      nameKey="status"
                      innerRadius="68%"
                      outerRadius="100%"
                      paddingAngle={0}
                      cornerRadius={4}
                      // A 2px surface ring between segments.
                      stroke="var(--color-surface)"
                      strokeWidth={2}
                      startAngle={90}
                      endAngle={-270}
                      isAnimationActive={!reducedMotion}
                    >
                      {breakdown.items.map((item) => (
                        <Cell key={item.status} fill={segmentColor(item.status)} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <p className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-medium tabular">{formatNumber(breakdown.total)}</span>
                <span className="text-sm text-fg-muted">orders</span>
              </p>
            </div>

            <ul className="flex w-full flex-col gap-1">
              {breakdown.items.map(({ status, count }) => {
                const share = breakdown.total === 0 ? 0 : count / breakdown.total
                const label = ORDER_STATUS_DISPLAY[status].label
                return (
                  <li key={status}>
                    <button
                      type="button"
                      onClick={() => goToOrders({ status })}
                      aria-label={`${label}: ${formatNumber(count)} orders, ${formatPercent(share, { digits: 1 })}. Show in Orders`}
                      className="flex w-full items-center gap-2 rounded-pill py-1.5 pr-3 pl-1.5 text-sm focus-ring transition-colors duration-(--duration-fast) ease-standard hover-enabled:bg-surface-subtle"
                    >
                      <StatusPill status={status} />
                      <span className="flex-1" />
                      <span className="min-w-10 text-right tabular">{formatNumber(count)}</span>
                      <span className="w-13 text-right text-fg-muted tabular">
                        {formatPercent(share, { digits: 1 })}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </DataBoundary>
    </Card>
  )
}
