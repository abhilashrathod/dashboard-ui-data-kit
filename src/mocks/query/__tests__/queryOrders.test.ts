import { describe, expect, it } from 'vitest'
import { type Filter, type ListParams, type Order, type Sort, withDefaults } from '@/contracts'
import { queryOrders } from '../queryOrders'
import { makeOrder } from './makeOrder'

/**
 * Six orders with distinct values per field (except status: two are `paid`).
 * Names mix case and accents to prove the collator is used.
 */
const ORDERS: Order[] = [
  makeOrder({
    id: 'ORD-000001',
    reference: 'PO-AAA01',
    customer: { name: 'Ada Lovelace', email: 'ada@northwind.io' },
    status: 'paid',
    channel: 'web',
    amount: 100, // = amount-between min
    createdAt: '2026-01-01T00:00:00.000Z', // = date-between start
  }),
  makeOrder({
    id: 'ORD-000002',
    reference: 'PO-BBB02',
    customer: { name: 'émile Zola', email: 'emile@globex.com' },
    status: 'shipped',
    channel: 'mobile',
    amount: 500,
    createdAt: '2026-03-31T23:59:59.999Z', // = date-between end
  }),
  makeOrder({
    id: 'ORD-000003',
    reference: 'PO-CCC03',
    customer: { name: 'Grace Hopper', email: 'grace@initech.com' },
    status: 'pending',
    channel: 'marketplace',
    amount: 900, // = amount-between max
    createdAt: '2026-04-01T00:00:00.000Z', // day after the end: excluded
  }),
  makeOrder({
    id: 'ORD-000004',
    reference: 'PO-DDD04',
    customer: { name: 'bob Builder', email: 'bob@acmecorp.com' },
    status: 'refunded',
    channel: 'pos',
    amount: 99.99, // just below min
    createdAt: '2025-12-31T23:59:59.999Z', // just before the start
  }),
  makeOrder({
    id: 'ORD-000005',
    reference: 'PO-EEE05',
    customer: { name: 'Chen Wei', email: 'chen@lumen.io' },
    status: 'failed',
    channel: 'web',
    amount: 100.01,
    createdAt: '2026-02-14T10:00:00.000Z',
  }),
  makeOrder({
    id: 'ORD-000006',
    reference: 'PO-FFF06',
    customer: { name: 'Zoë Adams', email: 'zoe@zenith.com' },
    status: 'paid',
    channel: 'mobile',
    amount: 900.01, // just above max
    createdAt: '2026-05-05T08:30:00.000Z',
  }),
]

const ids = (orders: readonly Order[]) => orders.map((order) => Number(order.id.slice(4)))

function run(params: Partial<ListParams>, orders: readonly Order[] = ORDERS) {
  return queryOrders(orders, withDefaults({ pageSize: 500, ...params }))
}

const filtered = (...filters: Filter[]) => ids(run({ filters, sort: 'amount' }).rows)

describe('queryOrders: filters', () => {
  it.each<[string, Filter, number[]]>([
    ['status in', { field: 'status', op: 'in', value: ['paid', 'refunded'] }, [4, 1, 6]],
    ['channel in', { field: 'channel', op: 'in', value: ['mobile'] }, [2, 6]],
    ['amount gt (strict)', { field: 'amount', op: 'gt', value: 500 }, [3, 6]],
    ['amount lt (strict)', { field: 'amount', op: 'lt', value: 100 }, [4]],
    [
      'amount between (inclusive)',
      { field: 'amount', op: 'between', value: [100, 900] },
      [1, 5, 2, 3],
    ],
    [
      'createdAt between (inclusive UTC days)',
      { field: 'createdAt', op: 'between', value: ['2026-01-01', '2026-03-31'] },
      [1, 5, 2],
    ],
  ])('%s', (_name, filter, expected) => {
    expect(filtered(filter)).toEqual(expected)
  })

  it('createdAt between includes 00:00 on the start and 23:59:59.999 on the end, not 00:00 the day after', () => {
    const rows = run({
      filters: [{ field: 'createdAt', op: 'between', value: ['2026-01-01', '2026-03-31'] }],
    }).rows
    const created = rows.map((order) => order.createdAt)
    expect(created).toContain('2026-01-01T00:00:00.000Z')
    expect(created).toContain('2026-03-31T23:59:59.999Z')
    expect(created).not.toContain('2026-04-01T00:00:00.000Z')
    expect(created).not.toContain('2025-12-31T23:59:59.999Z')
  })

  it('a single-day createdAt range covers that whole UTC day', () => {
    expect(
      filtered({ field: 'createdAt', op: 'between', value: ['2026-03-31', '2026-03-31'] }),
    ).toEqual([2])
  })

  it('combines filters with AND', () => {
    expect(
      filtered(
        { field: 'status', op: 'in', value: ['paid', 'shipped', 'failed'] },
        { field: 'amount', op: 'between', value: [100, 900] },
        { field: 'createdAt', op: 'between', value: ['2026-01-01', '2026-12-31'] },
        { field: 'channel', op: 'in', value: ['web'] },
      ),
    ).toEqual([1, 5])
  })
})

describe('queryOrders: q', () => {
  it.each([
    ['id', 'ord-000005', [5]],
    ['reference', 'po-bbb', [2]],
    ['customer.name', 'LOVELACE', [1]],
    ['customer.email', 'GLOBEX.COM', [2]],
    ['surrounding whitespace is trimmed', '  hopper  ', [3]],
  ])('matches %s, case-insensitive', (_field, q, expected) => {
    expect(ids(run({ q, sort: 'amount' }).rows)).toEqual(expected)
  })

  it('ignores a whitespace-only q', () => {
    expect(run({ q: '   ' }).total).toBe(ORDERS.length)
  })
})

describe('queryOrders: sort', () => {
  it.each<[string, number[]]>([
    ['createdAt', [4, 1, 5, 2, 3, 6]],
    ['amount', [4, 1, 5, 2, 3, 6]],
    // Collator: case/accent-insensitive (ada, bob, chen, émile, grace, zoë).
    ['customer', [1, 4, 5, 2, 3, 6]],
  ])('%s ascending and descending', (field, ascending) => {
    expect(ids(run({ sort: field as Sort }).rows)).toEqual(ascending)
    expect(ids(run({ sort: `-${field}` as Sort }).rows)).toEqual([...ascending].reverse())
  })

  it('status follows lifecycle order (pending, paid, shipped, refunded, failed), ties by id', () => {
    expect(ids(run({ sort: 'status' }).rows)).toEqual([3, 1, 6, 2, 4, 5])
    // Descending reverses the lifecycle, but the two `paid` orders still tie-break by id ascending.
    expect(ids(run({ sort: '-status' }).rows)).toEqual([5, 4, 2, 1, 6, 3])
  })

  it('is stable: equal keys come out in id order in both directions, and paging covers each row once', () => {
    const sameStatus = [13, 10, 14, 12, 11].map((n, i) =>
      makeOrder({ id: `ORD-0000${n}`, reference: `PO-SAME${i}`, status: 'shipped' }),
    )

    for (const sort of ['status', '-status'] as const) {
      expect(ids(run({ sort }, sameStatus).rows)).toEqual([10, 11, 12, 13, 14])

      const paged = [1, 2, 3].flatMap((page) =>
        ids(run({ sort, page, pageSize: 2 }, sameStatus).rows),
      )
      expect(paged).toEqual([10, 11, 12, 13, 14])
    }
  })
})

describe('queryOrders: pagination', () => {
  it('returns the requested 1-based page with the filtered total', () => {
    const result = run({ sort: 'amount', page: 2, pageSize: 4 })
    expect(ids(result.rows)).toEqual([3, 6])
    expect(result).toMatchObject({ total: 6, page: 2, pageSize: 4 })
  })

  it('returns no rows past the end, with the correct total (no clamping)', () => {
    const result = run({
      page: 99,
      pageSize: 2,
      filters: [{ field: 'channel', op: 'in', value: ['web'] }],
    })
    expect(result).toStrictEqual({ rows: [], total: 2, page: 99, pageSize: 2 })
  })
})

it('does not mutate the input array', () => {
  const input = [...ORDERS].reverse()
  const snapshot = structuredClone(input)

  run({ sort: 'amount', q: 'a', filters: [{ field: 'amount', op: 'gt', value: 1 }] }, input)

  expect(input).toStrictEqual(snapshot)
})
