import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_LIST_PARAMS, Order, pageSchema } from '@/contracts'
import { server } from '@/mocks/node'
import { setNetworkConfig } from '@/mocks/network'
import {
  ApiError,
  apiFetch,
  createOrder,
  fetchKpis,
  fetchOrders,
  fetchRevenueSeries,
  isApiError,
} from '..'

/** Awaits a rejection and returns the reason, failing the test if it resolves. */
async function rejectionOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise
  } catch (error) {
    return error
  }
  throw new Error('expected the promise to reject')
}

describe('apiFetch / typed endpoints', () => {
  it('fetchOrders parses and returns the first page', async () => {
    const page = await fetchOrders(DEFAULT_LIST_PARAMS)
    expect(page.rows).toHaveLength(50)
    expect(page.total).toBe(10_000)
  })

  it('fetchKpis and fetchRevenueSeries return parsed responses', async () => {
    expect((await fetchKpis('30d')).kpis.map((k) => k.id)).toEqual([
      'revenue',
      'orders',
      'aov',
      'refundRate',
    ])
    expect((await fetchRevenueSeries('7d')).points).toHaveLength(7)
  })

  it('400 → ApiError BAD_REQUEST carrying issues and the requestId', async () => {
    const error = await rejectionOf(
      apiFetch('/api/orders?page=0&f=amount:in:5', { schema: pageSchema(Order) }),
    )
    expect(isApiError(error)).toBe(true)
    expect(error).toMatchObject({
      status: 400,
      code: 'BAD_REQUEST',
      requestId: 'req_000001',
      issues: [
        'page "0": must be an integer >= 1',
        'f[0] "amount:in:5": op "in" not allowed for amount (allowed: gt, lt, between)',
      ],
    })
  })

  it('createOrder invalid → ApiError 422 with fieldErrors["customer.email"]', async () => {
    const error = await rejectionOf(
      createOrder({
        customer: { name: 'Grace Hopper', email: 'not-an-email' },
        channel: 'web',
        amount: 10,
        itemCount: 1,
        reference: 'PO-ABCDE',
      }),
    )
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 422, code: 'VALIDATION' })
    expect((error as ApiError).fieldErrors?.['customer.email']).toEqual(['Enter a valid email'])
  })

  it('network failure → ApiError status 0, UNAVAILABLE', async () => {
    server.use(http.get('/api/orders', () => HttpResponse.error()))

    const error = await rejectionOf(fetchOrders(DEFAULT_LIST_PARAMS))
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 0, code: 'UNAVAILABLE', message: 'Network error' })
  })

  it('abort mid-flight rejects with the AbortError itself, not an ApiError', async () => {
    server.use(
      http.get('/api/orders', async () => {
        await delay(500)
        return HttpResponse.json({ rows: [], total: 0, page: 1, pageSize: 50 })
      }),
    )
    const controller = new AbortController()

    const request = fetchOrders(DEFAULT_LIST_PARAMS, controller.signal)
    controller.abort()
    const error = await rejectionOf(request)

    expect(error).toBeInstanceOf(Error)
    expect((error as Error).name).toBe('AbortError')
    expect(isApiError(error)).toBe(false)
  })

  it('a 2xx body that breaks the contract → ApiError CONTRACT (and a console.error)', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    server.use(http.get('/api/orders', () => HttpResponse.json({ rows: 'nope' })))

    const error = await rejectionOf(fetchOrders(DEFAULT_LIST_PARAMS))
    expect(error).toMatchObject({
      status: 200,
      code: 'CONTRACT',
      message: 'Response did not match contract',
    })
    expect((error as ApiError).issues?.length).toBeGreaterThan(0)
    expect(consoleError).toHaveBeenCalledWith(
      '[api] GET /api/orders did not match its contract',
      expect.any(Array),
    )
  })

  it('a non-JSON error page → ApiError with the status and SERVER_ERROR', async () => {
    server.use(
      http.get('/api/orders', () =>
        HttpResponse.text('<!doctype html><h1>Not Found</h1>', {
          status: 404,
          headers: { 'Content-Type': 'text/html' },
        }),
      ),
    )

    const error = await rejectionOf(fetchOrders(DEFAULT_LIST_PARAMS))
    expect(error).toMatchObject({
      status: 404,
      code: 'SERVER_ERROR',
      message: 'Unexpected 404 response',
    })
  })

  it('a flaky 503 keeps its server code (UNAVAILABLE) and status', async () => {
    setNetworkConfig({ mode: 'flaky', rng: () => 0 })
    const error = await rejectionOf(fetchOrders(DEFAULT_LIST_PARAMS))
    expect(error).toMatchObject({ status: 503, code: 'UNAVAILABLE' })
  })
})
