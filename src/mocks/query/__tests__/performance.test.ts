import { beforeAll, describe, expect, it } from 'vitest'
import { type ListParams, type Order, withDefaults } from '@/contracts'
import { generateOrders } from '../../data/generateOrders'
import { computeKpis } from '../metrics'
import { queryOrders } from '../queryOrders'

const ANCHOR = new Date('2026-09-30T00:00:00Z')

/** Median of several runs after a warm-up, in ms. */
function measure(run: () => unknown, runs = 7): number {
  run()
  const times = Array.from({ length: runs }, () => {
    const start = performance.now()
    run()
    return performance.now() - start
  }).sort((a, b) => a - b)
  return times[Math.floor(runs / 2)] ?? Number.NaN
}

let orders: Order[]
beforeAll(() => {
  orders = generateOrders({ seed: 42, count: 10_000, anchor: ANCHOR })
})

// Targets are < 20ms. The asserts are generous so a slow CI runner doesn't flake.
describe('performance (10k orders)', () => {
  it('queryOrders: 2 filters + q + sort by amount', () => {
    const params: ListParams = withDefaults({
      q: 'an',
      sort: '-amount',
      filters: [
        { field: 'status', op: 'in', value: ['paid', 'shipped'] },
        { field: 'createdAt', op: 'between', value: ['2026-01-01', '2026-09-29'] },
      ],
    })
    expect(queryOrders(orders, params).total).toBeGreaterThan(0)
    expect(measure(() => queryOrders(orders, params))).toBeLessThan(100)
  })

  it('computeKpis 90d', () => {
    expect(measure(() => computeKpis(orders, '90d', ANCHOR))).toBeLessThan(100)
  })
})
