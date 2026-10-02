import { useQuery } from '@tanstack/react-query'
import type { MetricsRange } from '@/contracts'
import { fetchKpis, fetchRevenueSeries } from '@/lib/api'
import { queryKeys } from './keys'

export function useKpis(range: MetricsRange) {
  return useQuery({
    queryKey: queryKeys.metrics.kpis(range),
    queryFn: ({ signal }) => fetchKpis(range, signal),
  })
}

export function useRevenueSeries(range: MetricsRange) {
  return useQuery({
    queryKey: queryKeys.metrics.revenue(range),
    queryFn: ({ signal }) => fetchRevenueSeries(range, signal),
  })
}
