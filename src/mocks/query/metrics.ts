/*
 * Metric definitions (product decisions; the README cites these).
 *
 * - Revenue orders: status `paid` or `shipped`. `pending` isn't paid yet;
 *   `refunded` and `failed` aren't revenue.
 * - revenue:    sum of amounts of revenue orders. Summed in INTEGER CENTS
 *               (Math.round(amount * 100)) and converted back once at the end,
 *               so 0.10 + 0.20 + 0.30 is exactly 0.6, not 0.6000000000000001.
 * - orders:     count of all orders except `failed`.
 * - aov:        revenue / count of revenue orders, rounded to 2 decimals;
 *               0 when there are no revenue orders.
 * - refundRate: refunded / (paid + shipped + refunded), a fraction 0–1;
 *               0 when the denominator is 0.
 * - Periods:    range N days ('7d' | '30d' | '90d'), whole UTC days.
 *               current  = [anchor − N days,  anchor)
 *               previous = [anchor − 2N days, anchor − N days)
 *               The anchor is snapped to the start of its UTC day, so both
 *               periods are exactly N whole days and the series has N points.
 */

import type {
  Kpi,
  KpiResponse,
  MetricsRange,
  Order,
  OrderStatus,
  RevenuePoint,
  RevenueSeriesResponse,
} from '@/contracts'

const DAY_MS = 86_400_000

const RANGE_DAYS = { '7d': 7, '30d': 30, '90d': 90 } as const satisfies Record<MetricsRange, number>

const REVENUE_STATUSES: ReadonlySet<OrderStatus> = new Set(['paid', 'shipped'])

const toCents = (amount: number) => Math.round(amount * 100)
const fromCents = (cents: number) => cents / 100

/** [start, end) in epoch ms. */
interface Period {
  start: number
  end: number
}

function periodsFor(range: MetricsRange, anchor: Date): { current: Period; previous: Period } {
  const days = RANGE_DAYS[range]
  const end = Math.floor(anchor.getTime() / DAY_MS) * DAY_MS // start of the anchor's UTC day
  return {
    current: { start: end - days * DAY_MS, end },
    previous: { start: end - 2 * days * DAY_MS, end: end - days * DAY_MS },
  }
}

const isWithin = (time: number, { start, end }: Period) => time >= start && time < end

interface Totals {
  revenueCents: number
  revenueOrders: number
  nonFailedOrders: number
  refundedOrders: number
}

function totalsFor(orders: readonly Order[], period: Period): Totals {
  const totals: Totals = {
    revenueCents: 0,
    revenueOrders: 0,
    nonFailedOrders: 0,
    refundedOrders: 0,
  }
  for (const order of orders) {
    if (!isWithin(Date.parse(order.createdAt), period)) continue
    if (order.status !== 'failed') totals.nonFailedOrders++
    if (order.status === 'refunded') totals.refundedOrders++
    if (REVENUE_STATUSES.has(order.status)) {
      totals.revenueCents += toCents(order.amount)
      totals.revenueOrders++
    }
  }
  return totals
}

function kpiValues(totals: Totals): Record<Kpi['id'], number> {
  const settled = totals.revenueOrders + totals.refundedOrders // paid + shipped + refunded
  return {
    revenue: fromCents(totals.revenueCents),
    orders: totals.nonFailedOrders,
    // Rounding the cents average to a whole cent = rounding to 2 decimals.
    aov:
      totals.revenueOrders === 0
        ? 0
        : fromCents(Math.round(totals.revenueCents / totals.revenueOrders)),
    refundRate: settled === 0 ? 0 : totals.refundedOrders / settled,
  }
}

const KPI_DEFINITIONS = [
  { id: 'revenue', label: 'Revenue', format: 'currency' },
  { id: 'orders', label: 'Orders', format: 'number' },
  { id: 'aov', label: 'Avg. order value', format: 'currency' },
  { id: 'refundRate', label: 'Refund rate', format: 'percent' },
] as const satisfies readonly Omit<Kpi, 'value' | 'previousValue'>[]

export function computeKpis(
  orders: readonly Order[],
  range: MetricsRange,
  anchor: Date,
): KpiResponse {
  const { current, previous } = periodsFor(range, anchor)
  const value = kpiValues(totalsFor(orders, current))
  const previousValue = kpiValues(totalsFor(orders, previous))
  return {
    range,
    kpis: KPI_DEFINITIONS.map((kpi) => ({
      ...kpi,
      value: value[kpi.id],
      previousValue: previousValue[kpi.id],
    })),
  }
}

/** One point per UTC day of the current period, ascending, zero-filled: exactly N points. */
export function computeRevenueSeries(
  orders: readonly Order[],
  range: MetricsRange,
  anchor: Date,
): RevenueSeriesResponse {
  const { current } = periodsFor(range, anchor)
  const days = RANGE_DAYS[range]
  const cents = new Array<number>(days).fill(0)
  const counts = new Array<number>(days).fill(0)

  for (const order of orders) {
    if (!REVENUE_STATUSES.has(order.status)) continue
    const time = Date.parse(order.createdAt)
    if (!isWithin(time, current)) continue
    const day = Math.floor((time - current.start) / DAY_MS)
    cents[day] = (cents[day] ?? 0) + toCents(order.amount)
    counts[day] = (counts[day] ?? 0) + 1
  }

  const points: RevenuePoint[] = cents.map((dayCents, day) => ({
    date: new Date(current.start + day * DAY_MS).toISOString().slice(0, 10),
    revenue: fromCents(dayCents),
    orders: counts[day] ?? 0,
  }))
  return { range, points }
}
