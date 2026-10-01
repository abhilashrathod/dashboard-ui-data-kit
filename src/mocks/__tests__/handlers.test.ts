import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ApiErrorBody,
  BulkStatusUpdateResult,
  decodeListParams,
  KpiResponse,
  Order,
  pageSchema,
  RevenueSeriesResponse,
} from '@/contracts'
import { api } from '@/test/api'
import { db } from '../data/db'
import { checkContract } from '../handlers'
import { parseNetworkFromSearch, setNetworkConfig } from '../network'
import { queryOrders } from '../query/queryOrders'

const OrderPage = pageSchema(Order)

const get = (path: string) => fetch(api(path))
const send = (method: 'POST' | 'PATCH', path: string, body: unknown) =>
  fetch(api(path), {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

const validInput = {
  customer: { name: '  Grace Hopper  ', email: 'grace@example.com' },
  channel: 'web',
  amount: 249.99,
  itemCount: 3,
  reference: 'PO-NEW01',
}

/** A scripted rng: returns the values in order, then repeats. */
function sequence(...values: number[]) {
  let index = 0
  return () => values[index++ % values.length] ?? 0
}

afterEach(() => {
  vi.useRealTimers()
})

describe('happy paths (dev contract check stays quiet)', () => {
  let consoleError: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleError = vi.spyOn(console, 'error')
  })

  afterEach(() => {
    expect(consoleError).not.toHaveBeenCalled()
  })

  it('GET /api/orders with defaults: 50 rows of 10000, newest first', async () => {
    const res = await get('/api/orders')
    expect(res.status).toBe(200)

    const page = OrderPage.parse(await res.json())
    expect(page).toMatchObject({ total: 10_000, page: 1, pageSize: 50 })
    expect(page.rows).toHaveLength(50)
    expect(page.rows[0]?.id).toBe(db.orders.at(-1)?.id)
    const created = page.rows.map((order) => order.createdAt)
    expect(created).toEqual([...created].sort().reverse())
  })

  it('GET /api/orders with filters + sort matches queryOrders on the same params', async () => {
    const query = 'page=2&size=20&sort=amount&f=status:in:paid&f=amount:gt:500'
    const res = await get(`/api/orders?${query}`)
    expect(res.status).toBe(200)
    const page = OrderPage.parse(await res.json())

    const decoded = decodeListParams(new URLSearchParams(query), { mode: 'strict' })
    if (!decoded.ok) throw new Error('fixture query should be valid')
    expect(page).toStrictEqual(queryOrders(db.orders, decoded.params))

    expect(page.rows).toHaveLength(20)
    expect(page.rows.every((o) => o.status === 'paid' && o.amount > 500)).toBe(true)
    const amounts = page.rows.map((o) => o.amount)
    expect(amounts).toEqual([...amounts].sort((a, b) => a - b))
  })

  it('POST /api/orders creates a pending order that lists first', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-09-30T12:00:00.000Z'))

    const res = await send('POST', '/api/orders', validInput)
    expect(res.status).toBe(201)
    const created = Order.parse(await res.json())
    expect(created).toStrictEqual({
      id: 'ORD-010001',
      reference: 'PO-NEW01',
      customer: { name: 'Grace Hopper', email: 'grace@example.com' }, // trimmed by the schema
      status: 'pending',
      channel: 'web',
      amount: 249.99,
      itemCount: 3,
      createdAt: '2026-09-30T12:00:00.000Z',
      updatedAt: '2026-09-30T12:00:00.000Z',
    })

    const list = OrderPage.parse(await (await get('/api/orders')).json())
    expect(list.total).toBe(10_001)
    expect(list.rows[0]?.id).toBe('ORD-010001')
  })

  it('PATCH /api/orders/bulk-status: partial success is a 200', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-09-30T12:00:00.000Z'))
    const paid = db.orders.find((o) => o.status === 'paid')
    const refunded = db.orders.find((o) => o.status === 'refunded')
    if (!paid || !refunded) throw new Error('seed data should include paid and refunded orders')

    const res = await send('PATCH', '/api/orders/bulk-status', {
      ids: [paid.id, refunded.id, 'ORD-999999', paid.id], // valid, invalid, unknown, duplicate
      status: 'shipped',
    })
    expect(res.status).toBe(200)
    const result = BulkStatusUpdateResult.parse(await res.json())

    expect(result.updated.map((o) => [o.id, o.status, o.updatedAt])).toEqual([
      [paid.id, 'shipped', '2026-09-30T12:00:00.000Z'],
    ])
    expect(result.failed).toEqual([
      { id: refunded.id, reason: "Can't move refunded → shipped" },
      { id: 'ORD-999999', reason: 'Order not found' },
    ])
    // The db reflects the change; the rejected order is untouched.
    expect(db.orders.find((o) => o.id === paid.id)?.status).toBe('shipped')
    expect(db.orders.find((o) => o.id === refunded.id)?.status).toBe('refunded')
  })

  it('GET /api/metrics/kpis and /revenue for 30d parse with their schemas', async () => {
    const kpis = await get('/api/metrics/kpis?range=30d')
    expect(kpis.status).toBe(200)
    expect(KpiResponse.parse(await kpis.json()).range).toBe('30d')

    const revenue = await get('/api/metrics/revenue?range=30d')
    expect(revenue.status).toBe(200)
    const series = RevenueSeriesResponse.parse(await revenue.json())
    expect(series.points).toHaveLength(30)
    expect(series.points.at(-1)?.date).toBe('2026-09-29') // aligned with db.anchor
  })
})

describe('errors', () => {
  it('GET /api/orders with a bad filter → 400 with issues; header requestId matches the body', async () => {
    const res = await get('/api/orders?f=amount:in:5')
    expect(res.status).toBe(400)
    const body = ApiErrorBody.parse(await res.json())
    expect(body.code).toBe('BAD_REQUEST')
    expect(body.issues).toEqual([
      'f[0] "amount:in:5": op "in" not allowed for amount (allowed: gt, lt, between)',
    ])
    expect(res.headers.get('x-request-id')).toBe(body.requestId)
    expect(body.requestId).toMatch(/^req_\d{6}$/)
  })

  it('POST /api/orders invalid → 422 with dot-path fieldErrors', async () => {
    const res = await send('POST', '/api/orders', {
      ...validInput,
      customer: { name: 'Grace Hopper', email: 'not-an-email' },
      amount: 0,
    })
    expect(res.status).toBe(422)
    const body = ApiErrorBody.parse(await res.json())
    expect(body.code).toBe('VALIDATION')
    expect(Object.keys(body.fieldErrors ?? {}).sort()).toEqual(['amount', 'customer.email'])
    expect(db.orders).toHaveLength(10_000) // nothing was created
  })

  it('POST /api/orders with an existing reference → 422 on reference (server-only rule)', async () => {
    const taken = db.orders[0]?.reference
    const res = await send('POST', '/api/orders', { ...validInput, reference: taken })
    expect(res.status).toBe(422)
    const body = ApiErrorBody.parse(await res.json())
    expect(body.fieldErrors).toEqual({ reference: ['Reference already exists'] })
  })

  it('POST with a body that is not JSON → 400', async () => {
    const res = await fetch(api('/api/orders'), { method: 'POST', body: '{nope' })
    expect(res.status).toBe(400)
    expect(ApiErrorBody.parse(await res.json()).code).toBe('BAD_REQUEST')
  })

  it.each(['range=1y', ''])('metrics with "%s" → 400', async (query) => {
    for (const path of ['/api/metrics/revenue', '/api/metrics/kpis']) {
      const res = await get(`${path}?${query}`)
      expect(res.status).toBe(400)
      expect(ApiErrorBody.parse(await res.json()).code).toBe('BAD_REQUEST')
    }
  })

  it('request ids increase per response and restart after resetDb', async () => {
    const first = ApiErrorBody.parse(await (await get('/api/orders?page=0')).json())
    const second = ApiErrorBody.parse(await (await get('/api/orders?page=0')).json())
    expect([first.requestId, second.requestId]).toEqual(['req_000001', 'req_000002'])
  })
})

describe('network simulation', () => {
  it("mode 'error' → 500 SERVER_ERROR", async () => {
    setNetworkConfig({ mode: 'error' })
    const res = await get('/api/orders')
    expect(res.status).toBe(500)
    expect(ApiErrorBody.parse(await res.json()).code).toBe('SERVER_ERROR')
  })

  it('failEndpoints breaks only the listed endpoint', async () => {
    setNetworkConfig({ failEndpoints: ['metrics.kpis'] })

    const kpis = await get('/api/metrics/kpis?range=7d')
    expect(kpis.status).toBe(500)
    expect(ApiErrorBody.parse(await kpis.json()).message).toBe('Simulated failure: metrics.kpis')

    expect((await get('/api/orders')).status).toBe(200)
    expect((await get('/api/metrics/revenue?range=7d')).status).toBe(200)
  })

  it("mode 'flaky' fails exactly the requests whose roll is < 0.3, with 503", async () => {
    setNetworkConfig({ mode: 'flaky', rng: sequence(0.1, 0.9, 0.2, 0.5) })

    const statuses: number[] = []
    for (let i = 0; i < 4; i++) statuses.push((await get('/api/orders')).status) // sequential: rng order matters
    expect(statuses).toEqual([503, 200, 503, 200])

    const failure = await get('/api/orders') // 5th roll wraps to 0.1
    expect(ApiErrorBody.parse(await failure.json()).code).toBe('UNAVAILABLE')
  })

  it("mode 'empty' → no orders, zero KPIs, zero-filled revenue", async () => {
    setNetworkConfig({ mode: 'empty' })

    const page = OrderPage.parse(await (await get('/api/orders')).json())
    expect(page).toStrictEqual({ rows: [], total: 0, page: 1, pageSize: 50 })

    const { kpis } = KpiResponse.parse(await (await get('/api/metrics/kpis?range=30d')).json())
    expect(kpis.flatMap((k) => [k.value, k.previousValue])).toEqual(Array(8).fill(0))

    const { points } = RevenueSeriesResponse.parse(
      await (await get('/api/metrics/revenue?range=30d')).json(),
    )
    expect(points).toHaveLength(30)
    expect(points.every((p) => p.revenue === 0 && p.orders === 0)).toBe(true)
  })

  it("latency 'realistic' waits before responding", async () => {
    setNetworkConfig({ latency: 'realistic', rng: () => 0 }) // normal mode, minimum 150ms
    const start = performance.now()
    await get('/api/orders')
    expect(performance.now() - start).toBeGreaterThanOrEqual(140)
  })
})

describe('dev contract check', () => {
  it('logs (does not throw) when a body drifts from its contract', () => {
    expect(import.meta.env.DEV).toBe(true)
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => checkContract('orders.create', Order, { id: 'nope' })).not.toThrow()
    expect(consoleError).toHaveBeenCalledWith(
      '[mocks] orders.create response does not match its contract',
      expect.any(Array),
    )
  })
})

describe('parseNetworkFromSearch', () => {
  it.each([
    ['?network=slow', { mode: 'slow' }],
    ['?fail=metrics.kpis,orders.list', { failEndpoints: ['metrics.kpis', 'orders.list'] }],
    [
      'network=flaky&fail=orders.create&fail=metrics.revenue,orders.create',
      { mode: 'flaky', failEndpoints: ['orders.create', 'metrics.revenue'] },
    ],
    ['?network=turbo&fail=orders.delete,%20metrics.kpis%20', { failEndpoints: ['metrics.kpis'] }],
    ['?network=&fail=', {}],
    ['', {}],
  ])('%s', (search, expected) => {
    expect(parseNetworkFromSearch(search)).toStrictEqual(expected)
  })
})
