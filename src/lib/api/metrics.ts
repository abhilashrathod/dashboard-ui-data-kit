import {
  KpiResponse,
  type MetricsRange,
  RevenueSeriesResponse,
  StatusBreakdownResponse,
} from '@/contracts'
import { apiFetch } from './client'

export function fetchKpis(range: MetricsRange, signal?: AbortSignal): Promise<KpiResponse> {
  return apiFetch(`/api/metrics/kpis?range=${range}`, { schema: KpiResponse, signal })
}

/** With `compare`, the response also carries `previousPoints` (the previous equal period). */
export function fetchRevenueSeries(
  range: MetricsRange,
  signal?: AbortSignal,
  { compare = false }: { compare?: boolean } = {},
): Promise<RevenueSeriesResponse> {
  const query = compare ? `range=${range}&compare=1` : `range=${range}`
  return apiFetch(`/api/metrics/revenue?${query}`, { schema: RevenueSeriesResponse, signal })
}

export function fetchStatusBreakdown(
  range: MetricsRange,
  signal?: AbortSignal,
): Promise<StatusBreakdownResponse> {
  return apiFetch(`/api/metrics/status-breakdown?range=${range}`, {
    schema: StatusBreakdownResponse,
    signal,
  })
}
