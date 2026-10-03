import type {
  KpiResponse,
  MetricsRange,
  RevenueSeriesResponse,
  StatusBreakdownResponse,
} from '@/contracts'
import { useDataState } from '@/lib/data-state'
import { useKpis, useRevenueSeries, useStatusBreakdown } from '@/lib/query'

/*
 * The Overview's data, as DataStates. Every widget calls these with the same
 * range, and TanStack dedupes by key: the four KPI cards share ONE kpis query,
 * and the sparklines and the revenue chart share ONE revenue query (always
 * with compare, so there's a single cache entry). Each widget still renders
 * its own DataBoundary, so a failure shows up inside every card it affects.
 *
 * isEmpty functions live at module scope: useDataState memoizes on them.
 */

const never = () => false
const noRevenue = (series: RevenueSeriesResponse) =>
  series.points.every((point) => point.revenue === 0) &&
  (series.previousPoints ?? []).every((point) => point.revenue === 0)
const noOrders = (breakdown: StatusBreakdownResponse) => breakdown.total === 0

export function useKpisState(range: MetricsRange) {
  return useDataState<KpiResponse>(useKpis(range), { isEmpty: never })
}

export function useRevenueState(range: MetricsRange) {
  return useDataState(useRevenueSeries(range, { compare: true }), { isEmpty: noRevenue })
}

export function useStatusBreakdownState(range: MetricsRange) {
  return useDataState(useStatusBreakdown(range), { isEmpty: noOrders })
}

export const RANGE_DAYS: Record<MetricsRange, number> = { '7d': 7, '30d': 30, '90d': 90 }
