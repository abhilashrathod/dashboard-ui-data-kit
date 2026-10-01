import { beforeAll, describe, expect, it } from 'vitest'
import { Order, type OrderStatus } from '@/contracts'
import { generateOrders } from '../generateOrders'

const ANCHOR = new Date('2026-09-30T00:00:00Z')
const DAY_MS = 86_400_000
const WINDOW_START = Date.parse('2025-03-30T00:00:00Z') // 18 months before ANCHOR
const PENDING_CUTOFF = ANCHOR.getTime() - 14 * DAY_MS

const createdMs = (order: Order) => Date.parse(order.createdAt)
const isUtcWeekend = (ms: number) => [0, 6].includes(new Date(ms).getUTCDay())

function shares<T extends string>(values: readonly T[]): Map<T, number> {
  const counts = new Map<T, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  return new Map([...counts].map(([value, count]) => [value, (100 * count) / values.length]))
}

let orders: Order[] // seed 42, 10k orders

beforeAll(() => {
  orders = generateOrders({ seed: 42, count: 10_000, anchor: ANCHOR })
})

describe('generateOrders', () => {
  it('is deterministic for the same seed and anchor', () => {
    const a = generateOrders({ seed: 7, count: 500, anchor: ANCHOR })
    const b = generateOrders({ seed: 7, count: 500, anchor: ANCHOR })
    expect(a).toStrictEqual(b)

    const other = generateOrders({ seed: 8, count: 500, anchor: ANCHOR })
    expect(other[0]).not.toStrictEqual(a[0])
  })

  it('produces orders that all pass the Order schema', () => {
    for (const order of generateOrders({ seed: 3, count: 2000, anchor: ANCHOR })) {
      const result = Order.safeParse(order)
      expect(result.error?.issues).toBeUndefined()
    }
  })

  it('assigns unique, chronological ids and unique references', () => {
    expect(new Set(orders.map((o) => o.id)).size).toBe(orders.length)
    expect(new Set(orders.map((o) => o.reference)).size).toBe(orders.length)

    orders.forEach((order, index) => {
      expect(order.id).toBe(`ORD-${String(index + 1).padStart(6, '0')}`)
      if (index > 0) expect(order.createdAt >= orders[index - 1]!.createdAt).toBe(true)
    })
  })

  describe('status distribution (10k)', () => {
    // Pending is only allowed in the last 14 days (~3% of orders), so it can't be
    // 10% overall. What the weights do imply:
    //  - among non-pending orders, each status ≈ weight / 90%
    //  - among orders from the last 14 days, pending ≈ 10%
    it('settled statuses match their renormalized weights within ±2pp', () => {
      const settled = orders.filter((o) => o.status !== 'pending').map((o) => o.status)
      const actual = shares(settled)
      const expected: [OrderStatus, number][] = [
        ['paid', (55 / 90) * 100],
        ['shipped', (25 / 90) * 100],
        ['refunded', (6 / 90) * 100],
        ['failed', (4 / 90) * 100],
      ]
      for (const [status, weight] of expected) {
        expect(actual.get(status), status).toBeGreaterThan(weight - 2)
        expect(actual.get(status), status).toBeLessThan(weight + 2)
      }
    })

    it('pending is ~10% of orders from the last 14 days', () => {
      const recent = orders.filter((o) => createdMs(o) >= PENDING_CUTOFF).map((o) => o.status)
      // Only ~300 recent orders (sd ≈ 1.8pp), so the band is wider than ±2pp.
      expect(shares(recent).get('pending')).toBeGreaterThan(6)
      expect(shares(recent).get('pending')).toBeLessThan(14)
    })
  })

  it('channels match their weights within ±2pp', () => {
    const actual = shares(orders.map((o) => o.channel))
    for (const [channel, weight] of [
      ['web', 50],
      ['mobile', 30],
      ['marketplace', 15],
      ['pos', 5],
    ] as const) {
      expect(actual.get(channel), channel).toBeGreaterThan(weight - 2)
      expect(actual.get(channel), channel).toBeLessThan(weight + 2)
    }
  })

  it('never has a pending order older than 14 days before the anchor', () => {
    const stalePending = orders.filter(
      (o) => o.status === 'pending' && createdMs(o) < PENDING_CUTOFF,
    )
    expect(stalePending).toEqual([])
  })

  it('keeps amounts, item counts and dates in range', () => {
    for (const order of orders) {
      expect(order.amount).toBeGreaterThanOrEqual(5)
      expect(order.amount).toBeLessThanOrEqual(5000)
      expect(Math.round(order.amount * 100) / 100).toBe(order.amount) // ≤ 2 decimals

      expect(order.itemCount).toBeGreaterThanOrEqual(1)
      expect(order.itemCount).toBeLessThanOrEqual(12)

      expect(createdMs(order)).toBeGreaterThanOrEqual(WINDOW_START)
      expect(createdMs(order)).toBeLessThanOrEqual(ANCHOR.getTime())
    }
  })

  it('sets updatedAt: equal for pending, otherwise createdAt + 0–10 days, capped at the anchor', () => {
    for (const order of orders) {
      const delay = Date.parse(order.updatedAt) - createdMs(order)
      if (order.status === 'pending') {
        expect(delay).toBe(0)
      } else {
        expect(delay).toBeGreaterThanOrEqual(0)
        expect(delay).toBeLessThanOrEqual(10 * DAY_MS)
        expect(Date.parse(order.updatedAt)).toBeLessThanOrEqual(ANCHOR.getTime())
      }
    }
  })

  it('skews item counts toward small numbers', () => {
    const counts = shares(orders.map((o) => String(o.itemCount)))
    expect(counts.get('1')).toBeGreaterThan(counts.get('2') ?? 0)
    expect(counts.get('2')).toBeGreaterThan(counts.get('6') ?? 0)
    expect(counts.get('6')).toBeGreaterThan(counts.get('12') ?? 0)
  })

  it('draws from a pool of ≤ 800 customers, with some repeat buyers', () => {
    const perCustomer = new Map<string, number>()
    for (const { customer } of orders) {
      perCustomer.set(customer.email, (perCustomer.get(customer.email) ?? 0) + 1)
    }
    expect(perCustomer.size).toBeLessThanOrEqual(800)
    expect(Math.max(...perCustomer.values())).toBeGreaterThanOrEqual(20)
  })

  it('has more orders per weekday than per weekend day', () => {
    let weekdayDays = 0
    let weekendDays = 0
    for (let day = WINDOW_START; day < ANCHOR.getTime(); day += DAY_MS) {
      if (isUtcWeekend(day)) weekendDays++
      else weekdayDays++
    }
    const weekendOrders = orders.filter((o) => isUtcWeekend(createdMs(o))).length
    const weekdayOrders = orders.length - weekendOrders

    expect(weekdayOrders / weekdayDays).toBeGreaterThan(weekendOrders / weekendDays)
  })

  it('grows volume over time (recent months busier than the oldest)', () => {
    const quarter = 91 * DAY_MS
    const oldest = orders.filter((o) => createdMs(o) < WINDOW_START + quarter).length
    const newest = orders.filter((o) => createdMs(o) >= ANCHOR.getTime() - quarter).length
    expect(newest / oldest).toBeGreaterThan(1.3)
  })

  it('generates 10k orders quickly', () => {
    generateOrders({ seed: 1, count: 10_000, anchor: ANCHOR }) // warm up the JIT
    const start = performance.now()
    generateOrders({ seed: 2, count: 10_000, anchor: ANCHOR })
    const elapsed = performance.now() - start

    // Target is < 300ms (measured ~30ms locally). Generous bound so slow CI doesn't flake.
    expect(elapsed).toBeLessThan(1000)
  })

  it('rejects an invalid anchor or count', () => {
    expect(() => generateOrders({ seed: 1, count: 10, anchor: new Date('nope') })).toThrow(
      RangeError,
    )
    expect(() => generateOrders({ seed: 1, count: -1, anchor: ANCHOR })).toThrow(RangeError)
  })
})
