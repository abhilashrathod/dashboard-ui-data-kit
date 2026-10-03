import { CircleDollarSign, Receipt, RotateCcw, ShoppingBag, type LucideIcon } from 'lucide-react'
import { Line, LineChart, ResponsiveContainer } from 'recharts'
import { Amount, Card, DataBoundary, DeltaChip, Skeleton } from '@/components'
import type { Kpi, MetricsRange, RevenuePoint } from '@/contracts'
import { cn } from '@/lib/cn'
import { formatNumber, formatPercent } from '@/lib/format'
import { usePrefersReducedMotion } from '../usePrefersReducedMotion'
import { RANGE_DAYS, useKpisState, useRevenueState } from './metricsState'

type KpiId = Kpi['id']

const KPI_META: Record<
  KpiId,
  { label: string; icon: LucideIcon; goodWhen: 'up' | 'down'; spark?: 'revenue' | 'orders' }
> = {
  revenue: { label: 'Revenue', icon: CircleDollarSign, goodWhen: 'up', spark: 'revenue' },
  orders: { label: 'Orders', icon: ShoppingBag, goodWhen: 'up', spark: 'orders' },
  aov: { label: 'Avg. order value', icon: Receipt, goodWhen: 'up' },
  refundRate: { label: 'Refund rate', icon: RotateCcw, goodWhen: 'down' },
}

function KpiValue({ kpi, hero }: { kpi: Kpi; hero: boolean }) {
  switch (kpi.format) {
    case 'currency':
      // The orange glyph disappears on the gradient, so the hero goes without.
      return <Amount value={kpi.value} size="display-sm" glyph={!hero} />
    case 'percent':
      return <span className="text-display-sm tabular">{formatPercent(kpi.value, { digits: 1 })}</span>
    case 'number':
      return <span className="text-display-sm tabular">{formatNumber(kpi.value)}</span>
  }
}

function Sparkline({
  points,
  dataKey,
  hero,
}: {
  points: RevenuePoint[]
  dataKey: 'revenue' | 'orders'
  hero: boolean
}) {
  const reducedMotion = usePrefersReducedMotion()
  return (
    <div aria-hidden="true" className="h-8 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line
            type="monotone"
            dataKey={dataKey}
            dot={false}
            strokeWidth={2}
            stroke={hero ? 'var(--color-accent-gradient-fg)' : 'var(--color-accent)'}
            isAnimationActive={!reducedMotion}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function KpiSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <Skeleton shape="pill" className="h-4 w-24" />
        <Skeleton shape="circle" className="size-9" />
      </div>
      <Skeleton shape="pill" className="h-9 w-36" />
      <Skeleton shape="pill" className="h-5 w-40" />
      <Skeleton shape="tile" className="h-8 w-full" />
    </div>
  )
}

/**
 * One KPI: label and icon, the value, its change vs the previous period and,
 * for revenue and orders, a sparkline. The revenue card is the screen's hero.
 */
export function KpiCard({ id, range }: { id: KpiId; range: MetricsRange }) {
  const meta = KPI_META[id]
  const kpis = useKpisState(range)
  const revenue = useRevenueState(range)
  const Icon = meta.icon

  const hero = id === 'revenue'
  // The gradient is for the number. Error and empty states (small muted text)
  // need the plain surface to stay readable.
  const showHero = hero && (kpis.status === 'ready' || kpis.status === 'loading')
  const points = meta.spark && revenue.status === 'ready' ? revenue.data.points : undefined
  const periodLabel = `vs previous ${RANGE_DAYS[range]} days`

  return (
    <Card variant={showHero ? 'hero' : 'default'} className="min-h-44">
      <DataBoundary state={kpis} label={meta.label} size="compact" skeleton={<KpiSkeleton />}>
        {(data) => {
          const kpi = data.kpis.find((candidate) => candidate.id === id)
          if (!kpi) return null
          return (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <h2
                  className={cn(
                    'text-base font-medium',
                    showHero ? 'rounded-pill bg-surface px-3 py-1 text-sm text-fg' : 'text-fg-muted',
                  )}
                >
                  {meta.label}
                </h2>
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-pill [&_svg]:size-4.5',
                    showHero ? 'bg-surface text-fg' : 'bg-surface-subtle text-fg',
                  )}
                >
                  <Icon />
                </span>
              </div>
              <KpiValue kpi={kpi} hero={showHero} />
              <div
                className={cn(
                  'flex flex-wrap items-center gap-2 whitespace-nowrap',
                  showHero && 'self-start rounded-pill bg-surface py-1 pr-3 pl-1',
                )}
              >
                <DeltaChip
                  current={kpi.value}
                  previous={kpi.previousValue}
                  goodWhen={meta.goodWhen}
                  periodLabel={periodLabel}
                />
                {/* DeltaChip already says this to screen readers. */}
                <span aria-hidden="true" className="text-xs text-fg-muted">
                  {periodLabel}
                </span>
              </div>
              {points && meta.spark ? (
                <Sparkline points={points} dataKey={meta.spark} hero={showHero} />
              ) : null}
            </div>
          )
        }}
      </DataBoundary>
    </Card>
  )
}
