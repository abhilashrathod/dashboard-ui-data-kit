import type { MetricsRange } from '@/contracts'

/**
 * Every query key in the app, built here and nowhere else.
 *
 * - List keys use the CANONICAL params string (listParamsKey), never the
 *   params object: equivalent params ⇔ equal keys. Reordered filters, a
 *   default written out, or a different namespace can't create a second cache
 *   entry (or a second request) for the same data.
 * - The hierarchy enables targeted invalidation: `orders.lists()` matches every
 *   list page and filter combination, `metrics.all` every metric, and neither
 *   touches the other.
 */
export const queryKeys = {
  orders: {
    all: ['orders'] as const,
    lists: () => [...queryKeys.orders.all, 'list'] as const,
    /** `key` = listParamsKey(params). */
    list: (key: string) => [...queryKeys.orders.lists(), key] as const,
  },
  metrics: {
    all: ['metrics'] as const,
    kpis: (range: MetricsRange) => [...queryKeys.metrics.all, 'kpis', range] as const,
    /** `compare` = the response includes previousPoints. */
    revenue: (range: MetricsRange, compare = false) =>
      [...queryKeys.metrics.all, 'revenue', range, compare ? 'compare' : 'current'] as const,
    statusBreakdown: (range: MetricsRange) =>
      [...queryKeys.metrics.all, 'statusBreakdown', range] as const,
  },
}
