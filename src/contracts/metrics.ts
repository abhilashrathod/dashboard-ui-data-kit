import { OrderStatus } from './order'
import { z } from './zod'

export const MetricsRange = z.enum(['7d', '30d', '90d'])
export type MetricsRange = z.infer<typeof MetricsRange>

export const Kpi = z.object({
  id: z.enum(['revenue', 'orders', 'aov', 'refundRate']),
  label: z.string(),
  value: z.number(),
  /** Same metric over the preceding period of equal length, for the delta. */
  previousValue: z.number(),
  format: z.enum(['currency', 'number', 'percent']),
})
export type Kpi = z.infer<typeof Kpi>

export const KpiResponse = z.object({
  range: MetricsRange,
  kpis: z.array(Kpi),
})
export type KpiResponse = z.infer<typeof KpiResponse>

export const RevenuePoint = z.object({
  /** yyyy-mm-dd */
  date: z.iso.date(),
  revenue: z.number(),
  orders: z.int().check(z.nonnegative()),
})
export type RevenuePoint = z.infer<typeof RevenuePoint>

export const RevenueSeriesResponse = z.object({
  range: MetricsRange,
  points: z.array(RevenuePoint),
  /**
   * Only with `compare=1`: the preceding period of equal length, one point per
   * day like `points` (same length, same order), so index i lines up with points[i].
   */
  previousPoints: z.optional(z.array(RevenuePoint)),
})
export type RevenueSeriesResponse = z.infer<typeof RevenueSeriesResponse>

export const StatusBreakdownItem = z.object({
  status: OrderStatus,
  count: z.int().check(z.nonnegative()),
})
export type StatusBreakdownItem = z.infer<typeof StatusBreakdownItem>

/** Orders created in the current period, by status. Every status is listed, zero-filled. */
export const StatusBreakdownResponse = z.object({
  range: MetricsRange,
  total: z.int().check(z.nonnegative()),
  items: z.array(StatusBreakdownItem),
})
export type StatusBreakdownResponse = z.infer<typeof StatusBreakdownResponse>
