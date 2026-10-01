import { KpiResponse, type MetricsRange, RevenueSeriesResponse } from '@/contracts'
import { apiFetch } from './client'

export function fetchKpis(range: MetricsRange, signal?: AbortSignal): Promise<KpiResponse> {
  return apiFetch(`/api/metrics/kpis?range=${range}`, { schema: KpiResponse, signal })
}

export function fetchRevenueSeries(
  range: MetricsRange,
  signal?: AbortSignal,
): Promise<RevenueSeriesResponse> {
  return apiFetch(`/api/metrics/revenue?range=${range}`, { schema: RevenueSeriesResponse, signal })
}
