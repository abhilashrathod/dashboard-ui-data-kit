import { useQuery } from '@tanstack/react-query'
import type { MetricsRange } from '@/contracts'
import { fetchKpis, fetchRevenueSeries, fetchStatusBreakdown } from '@/lib/api'
import { queryKeys } from './keys'

export function useKpis(range: MetricsRange) {
  return useQuery({
    queryKey: queryKeys.metrics.kpis(range),
    queryFn: ({ signal }) => fetchKpis(range, signal),
  })
}

/** `compare` adds `previousPoints`; it's part of the key, so the two shapes never share a cache entry. */
export function useRevenueSeries(range: MetricsRange, { compare = false }: { compare?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.metrics.revenue(range, compare),
    queryFn: ({ signal }) => fetchRevenueSeries(range, signal, { compare }),
  })
}

export function useStatusBreakdown(range: MetricsRange) {
  return useQuery({
    queryKey: queryKeys.metrics.statusBreakdown(range),
    queryFn: ({ signal }) => fetchStatusBreakdown(range, signal),
  })
}
