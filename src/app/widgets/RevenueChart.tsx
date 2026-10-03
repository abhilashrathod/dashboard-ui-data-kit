import { TrendingUp } from 'lucide-react'
import { useId } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts'
import { Card, DataBoundary, EmptyState, Skeleton } from '@/components'
import type { MetricsRange, RevenuePoint, RevenueSeriesResponse } from '@/contracts'
import { computeDelta, type Delta } from '@/components'
import { formatCurrency, MINUS } from '@/lib/format'
import { HatchPattern } from '@/tokens/patterns'
import { usePrefersReducedMotion } from '../usePrefersReducedMotion'
import { useRevenueState } from './metricsState'

interface Bucket {
  label: string
  /** yyyy-mm-dd, inclusive. */
  start: string
  end: string
  previousStart: string
  previousEnd: string
  current: number
  previous: number
}

/** "Jul 8": the API's dates are UTC days, so format them in UTC. */
const dayLabel = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
const formatDay = (isoDate: string) => dayLabel.format(new Date(`${isoDate}T00:00:00Z`))
const formatSpan = (start: string, end: string) =>
  start === end ? formatDay(start) : `${formatDay(start)} – ${formatDay(end)}`

/**
 * Daily buckets for 7d/30d. 90 bars would be too thin to read, so 90d is
 * summed into weekly buckets (13: twelve full weeks and a 6-day one), each
 * labeled by its first day. Index i of `previousPoints` is day i of the
 * previous period, so both series bucket the same way.
 */
export function toBuckets(series: RevenueSeriesResponse): Bucket[] {
  const { points, range } = series
  const previous = series.previousPoints ?? []
  const size = range === '90d' ? 7 : 1
  const buckets: Bucket[] = []
  for (let i = 0; i < points.length; i += size) {
    const slice = points.slice(i, i + size)
    const previousSlice = previous.slice(i, i + size)
    const first = slice[0] as RevenuePoint
    const last = slice[slice.length - 1] as RevenuePoint
    const sum = (list: RevenuePoint[]) =>
      Math.round(list.reduce((total, point) => total + point.revenue * 100, 0)) / 100
    buckets.push({
      label: formatDay(first.date),
      start: first.date,
      end: last.date,
      previousStart: previousSlice[0]?.date ?? first.date,
      previousEnd: previousSlice[previousSlice.length - 1]?.date ?? last.date,
      current: sum(slice),
      previous: sum(previousSlice),
    })
  }
  return buckets
}

/** "+7.2%", "−3.1%", "0%" or "New". */
function changeText(delta: Delta): string {
  if (delta.direction === 'up') return `+${delta.text}`
  if (delta.direction === 'down') return `${MINUS}${delta.text}`
  return delta.text
}

function RevenueTooltip({ active, payload }: Partial<TooltipContentProps<number, string>>) {
  const bucket = payload?.[0]?.payload as Bucket | undefined
  if (!active || !bucket) return null
  const delta = computeDelta(bucket.current, bucket.previous, 'up')
  return (
    <div className="flex min-w-48 flex-col gap-2 rounded-md bg-surface-inverse px-3 py-2.5 text-sm text-fg-inverse shadow-overlay">
      <p className="font-medium">{formatSpan(bucket.start, bucket.end)}</p>
      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
        <dt className="flex items-center gap-2">
          <span aria-hidden="true" className="size-2.5 rounded-pill bg-accent" />
          This period
        </dt>
        <dd className="text-right tabular">{formatCurrency(bucket.current)}</dd>
        <dt className="flex items-center gap-2">
          <span aria-hidden="true" className="size-2.5 rounded-pill bg-fg-subtle" />
          Previous ({formatSpan(bucket.previousStart, bucket.previousEnd)})
        </dt>
        <dd className="text-right tabular">{formatCurrency(bucket.previous)}</dd>
        <dt>Change</dt>
        <dd className="text-right tabular">{changeText(delta)}</dd>
      </dl>
    </div>
  )
}

function LegendSwatch({ hatchId, kind }: { hatchId: string; kind: 'current' | 'previous' }) {
  return (
    <svg aria-hidden="true" width="12" height="12" className="shrink-0 rounded-xs">
      {kind === 'previous' ? (
        <>
          <defs>
            <HatchPattern id={hatchId} size={4} strokeWidth={1.5} />
          </defs>
          <rect width="12" height="12" fill={`url(#${hatchId})`} />
        </>
      ) : (
        <rect width="12" height="12" style={{ fill: 'var(--color-accent)' }} />
      )}
    </svg>
  )
}

/** Ids from useId contain characters that are awkward inside url(#…). */
const svgId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, '')

const CHART_HEIGHT = 'h-72'

function ChartSkeleton() {
  // Bars of varied height along a baseline, shimmering, like the chart they stand in for.
  const heights = [45, 70, 55, 85, 60, 75, 40, 65, 90, 50, 72, 58]
  return (
    <div className={`flex ${CHART_HEIGHT} items-end gap-2 pt-4 pl-12`}>
      {heights.map((height, index) => (
        <Skeleton key={index} className="flex-1 rounded-t-sm rounded-b-none" style={{ height: `${height}%` }} />
      ))}
    </div>
  )
}

export function RevenueChart({ range }: { range: MetricsRange }) {
  const state = useRevenueState(range)
  const reducedMotion = usePrefersReducedMotion()
  const baseId = svgId(useId())
  const hatchId = `${baseId}-hatch`

  return (
    <Card className="min-w-0">
      <Card.Header
        actions={
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-fg-muted">
            <li className="flex items-center gap-2">
              <LegendSwatch hatchId={`${baseId}-legend-current`} kind="current" />
              This period
            </li>
            <li className="flex items-center gap-2">
              <LegendSwatch hatchId={`${baseId}-legend-previous`} kind="previous" />
              Previous period
            </li>
          </ul>
        }
        className="flex-wrap"
      >
        <Card.Title as="h2">Revenue</Card.Title>
        <Card.Description>Current vs previous period</Card.Description>
      </Card.Header>
      <DataBoundary
        state={state}
        label="Revenue"
        skeleton={<ChartSkeleton />}
        empty={
          <EmptyState
            size="compact"
            icon={<TrendingUp />}
            title="No revenue in this period"
            description="Paid and shipped orders show up here."
            className={CHART_HEIGHT}
          />
        }
      >
        {(series) => {
          const buckets = toBuckets(series)
          return (
            <div className={CHART_HEIGHT}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={buckets}
                  barGap={2}
                  barCategoryGap={range === '7d' ? '28%' : '20%'}
                  margin={{ top: 8, right: 4, bottom: 0, left: 0 }}
                  accessibilityLayer
                >
                  <defs>
                    <HatchPattern id={hatchId} />
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--color-chart-grid)" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={16}
                    tick={{ fill: 'var(--color-fg-muted)', fontSize: 12 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={48}
                    tickFormatter={(value: number) => formatCurrency(value, { compact: true })}
                    tick={{ fill: 'var(--color-fg-muted)', fontSize: 12 }}
                  />
                  <Tooltip
                    cursor={{ fill: 'var(--color-surface-muted)', radius: 8 }}
                    content={(props) => <RevenueTooltip active={props.active} payload={props.payload} />}
                    isAnimationActive={!reducedMotion}
                  />
                  <Bar
                    dataKey="previous"
                    name="Previous period"
                    fill={`url(#${hatchId})`}
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={!reducedMotion}
                  />
                  <Bar
                    dataKey="current"
                    name="This period"
                    fill="var(--color-accent)"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={!reducedMotion}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )
        }}
      </DataBoundary>
    </Card>
  )
}
