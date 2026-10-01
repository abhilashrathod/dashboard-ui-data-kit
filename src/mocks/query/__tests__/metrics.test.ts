import { describe, expect, it } from 'vitest'
import { KpiResponse, type MetricsRange, type Order, RevenueSeriesResponse } from '@/contracts'
import { computeKpis, computeRevenueSeries } from '../metrics'
import { makeOrder } from './makeOrder'

const ANCHOR = new Date('2026-09-30T00:00:00Z')
// 7d → current [2026-09-23, 2026-09-30), previous [2026-09-16, 2026-09-23)

let nextId = 1
function order(status: Order['status'], amount: number, createdAt: string): Order {
  const n = nextId++
  return makeOrder({
    id: `ORD-${String(n).padStart(6, '0')}`,
    reference: `PO-M${String(n).padStart(4, '0')}`,
    status,
    amount,
    createdAt,
  })
}

const CURRENT = [
  order('paid', 100, '2026-09-23T00:00:00.000Z'), // period start: included
  order('shipped', 50.25, '2026-09-25T09:00:00.000Z'),
  order('refunded', 40, '2026-09-26T09:00:00.000Z'),
  order('failed', 70, '2026-09-27T09:00:00.000Z'),
  order('pending', 999, '2026-09-29T09:00:00.000Z'),
  order('paid', 10, '2026-09-29T23:59:59.999Z'), // last instant: included
]
const PREVIOUS = [
  order('paid', 200, '2026-09-16T00:00:00.000Z'),
  order('refunded', 20, '2026-09-18T09:00:00.000Z'),
  order('refunded', 30, '2026-09-20T09:00:00.000Z'),
  order('failed', 5, '2026-09-21T09:00:00.000Z'),
  order('shipped', 100, '2026-09-22T23:59:59.999Z'),
]
const OUTSIDE = [
  order('paid', 1000, '2026-09-30T00:00:00.000Z'), // = anchor: excluded (exclusive end)
  order('paid', 1000, '2026-09-15T23:59:59.999Z'), // before the previous period
]
const ALL = [...OUTSIDE, ...PREVIOUS, ...CURRENT]

const kpiMap = (response: KpiResponse) =>
  Object.fromEntries(response.kpis.map((k) => [k.id, [k.value, k.previousValue]]))

describe('computeKpis', () => {
  it('computes exact values for both periods', () => {
    expect(kpiMap(computeKpis(ALL, '7d', ANCHOR))).toEqual({
      // current: paid 100 + shipped 50.25 + paid 10.  previous: paid 200 + shipped 100
      revenue: [160.25, 300],
      // all but failed. current: 5 (incl. pending + refunded). previous: 4
      orders: [5, 4],
      // 160.25 / 3 = 53.4166… → 53.42.  300 / 2 = 150
      aov: [53.42, 150],
      // refunded / (paid + shipped + refunded): 1/4, 2/4
      refundRate: [0.25, 0.5],
    })
  })

  it('returns kpis in order with the agreed labels and formats', () => {
    const { kpis } = computeKpis(ALL, '7d', ANCHOR)
    expect(kpis.map(({ id, label, format }) => [id, label, format])).toEqual([
      ['revenue', 'Revenue', 'currency'],
      ['orders', 'Orders', 'number'],
      ['aov', 'Avg. order value', 'currency'],
      ['refundRate', 'Refund rate', 'percent'],
    ])
  })

  it('excludes pending, refunded and failed from revenue, and failed from the order count', () => {
    const notRevenue = [
      order('pending', 10, '2026-09-24T09:00:00.000Z'),
      order('refunded', 20, '2026-09-24T09:00:00.000Z'),
      order('failed', 30, '2026-09-24T09:00:00.000Z'),
    ]
    expect(kpiMap(computeKpis(notRevenue, '7d', ANCHOR))).toMatchObject({
      revenue: [0, 0],
      orders: [2, 0],
      aov: [0, 0],
      refundRate: [1, 0],
    })
  })

  // 0.10/0.20/0.30 catches naive float sums (→ 0.6000000000000001). 0.07×3 and
  // 19.99×3 also catch summing `amount * 100` without Math.round
  // (→ 0.21000000000000005, 59.96999999999999).
  it.each([
    [[0.1, 0.2, 0.3], 0.6, 0.2],
    [[0.07, 0.07, 0.07], 0.21, 0.07],
    [[19.99, 19.99, 19.99], 59.97, 19.99],
  ])('sums money in integer cents: %j → revenue exactly %d', (amounts, revenue, aov) => {
    const orders = amounts.map((amount) => order('paid', amount, '2026-09-24T09:00:00.000Z'))
    const kpis = kpiMap(computeKpis(orders, '7d', ANCHOR))
    expect(kpis.revenue?.[0]).toBe(revenue)
    expect(kpis.aov?.[0]).toBe(aov)

    const series = computeRevenueSeries(orders, '7d', ANCHOR).points
    expect(series.find((p) => p.date === '2026-09-24')?.revenue).toBe(revenue)
  })

  it('returns all zeros for empty input, with no NaN or Infinity', () => {
    const { kpis } = computeKpis([], '30d', ANCHOR)
    for (const kpi of kpis) {
      expect(kpi.value).toBe(0)
      expect(kpi.previousValue).toBe(0)
    }
  })
})

describe('computeRevenueSeries', () => {
  it('has one zero-filled point per UTC day, ascending', () => {
    expect(computeRevenueSeries(ALL, '7d', ANCHOR).points).toEqual([
      { date: '2026-09-23', revenue: 100, orders: 1 },
      { date: '2026-09-24', revenue: 0, orders: 0 },
      { date: '2026-09-25', revenue: 50.25, orders: 1 },
      { date: '2026-09-26', revenue: 0, orders: 0 }, // refunded only
      { date: '2026-09-27', revenue: 0, orders: 0 }, // failed only
      { date: '2026-09-28', revenue: 0, orders: 0 },
      { date: '2026-09-29', revenue: 10, orders: 1 }, // pending excluded
    ])
  })

  it.each<[MetricsRange, number]>([
    ['7d', 7],
    ['30d', 30],
    ['90d', 90],
  ])('%s has exactly %i points, and sums to the revenue KPI', (range, days) => {
    const { points } = computeRevenueSeries(ALL, range, ANCHOR)
    expect(points).toHaveLength(days)
    expect(points.at(-1)?.date).toBe('2026-09-29')
    expect(points.map((p) => p.date)).toEqual([...points.map((p) => p.date)].sort())

    const seriesCents = points.reduce((sum, p) => sum + Math.round(p.revenue * 100), 0)
    const revenue = computeKpis(ALL, range, ANCHOR).kpis.find((k) => k.id === 'revenue')
    expect(seriesCents / 100).toBe(revenue?.value)
  })

  it('snaps a mid-day anchor to the start of its UTC day', () => {
    const midDay = new Date('2026-09-30T15:45:00Z')
    expect(computeRevenueSeries(ALL, '7d', midDay)).toStrictEqual(
      computeRevenueSeries(ALL, '7d', ANCHOR),
    )
    expect(computeKpis(ALL, '7d', midDay)).toStrictEqual(computeKpis(ALL, '7d', ANCHOR))
  })
})

it('outputs parse with the KpiResponse and RevenueSeriesResponse schemas', () => {
  for (const range of ['7d', '30d', '90d'] as const) {
    expect(KpiResponse.safeParse(computeKpis(ALL, range, ANCHOR)).error).toBeUndefined()
    expect(
      RevenueSeriesResponse.safeParse(computeRevenueSeries(ALL, range, ANCHOR)).error,
    ).toBeUndefined()
    expect(KpiResponse.safeParse(computeKpis([], range, ANCHOR)).error).toBeUndefined()
  }
})
