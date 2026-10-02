import { describe, expect, it } from 'vitest'
import { http } from 'msw'
import { ApiError, type ApiErrorCode, fetchOrders } from '@/lib/api'
import { DEFAULT_LIST_PARAMS } from '@/contracts'
import { apiError } from '@/mocks/http'
import { server } from '@/mocks/node'
import { createRequestLog } from '@/test/requestLog'
import { createQueryClient, retryDelay, shouldRetry } from '../queryClient'

const error = (status: number, code: ApiErrorCode = 'SERVER_ERROR') =>
  new ApiError({ status, code, message: 'x' })

describe('shouldRetry', () => {
  it.each([
    ['400', error(400, 'BAD_REQUEST')],
    ['404', error(404, 'NOT_FOUND')],
    ['422', error(422, 'VALIDATION')],
    ['CONTRACT', error(200, 'CONTRACT')],
    ['other 4xx', error(409, 'BAD_REQUEST')],
    ['a non-ApiError', new TypeError('boom')],
  ])('never retries %s', (_, err) => {
    expect(shouldRetry(0, err)).toBe(false)
  })

  it.each([
    ['network (status 0)', error(0, 'UNAVAILABLE')],
    ['500', error(500)],
    ['503', error(503, 'UNAVAILABLE')],
  ])('retries %s twice, then stops', (_, err) => {
    expect(shouldRetry(0, err)).toBe(true)
    expect(shouldRetry(1, err)).toBe(true)
    expect(shouldRetry(2, err)).toBe(false)
  })

  it('backs off 500ms, then 1000ms', () => {
    expect([retryDelay(0), retryDelay(1), retryDelay(2)]).toEqual([500, 1000, 1000])
  })
})

describe('createQueryClient', () => {
  it('retries only in app mode (or when a story opts in)', () => {
    const retryOf = (client: ReturnType<typeof createQueryClient>) =>
      client.getDefaultOptions().queries?.retry
    expect(retryOf(createQueryClient({ mode: 'app' }))).toBe(shouldRetry)
    expect(retryOf(createQueryClient({ mode: 'test' }))).toBe(false)
    expect(retryOf(createQueryClient({ mode: 'storybook' }))).toBe(false)
    expect(retryOf(createQueryClient({ mode: 'storybook', retry: true }))).toBe(shouldRetry)
  })

  /** The app client, with the backoff removed so the test doesn't wait. */
  function appClientWithoutDelay() {
    const client = createQueryClient({ mode: 'app' })
    client.setDefaultOptions({
      queries: { ...client.getDefaultOptions().queries, retryDelay: 0 },
    })
    return client
  }

  const fetchList = (client: ReturnType<typeof createQueryClient>) =>
    client.fetchQuery({
      queryKey: ['retry-test'],
      queryFn: ({ signal }) => fetchOrders(DEFAULT_LIST_PARAMS, signal),
    })

  it('the app client retries a 503 twice (3 requests in total)', async () => {
    server.use(http.get('/api/orders', () => apiError(503, 'UNAVAILABLE', 'down')))
    const log = createRequestLog(server)

    await expect(fetchList(appClientWithoutDelay())).rejects.toMatchObject({ status: 503 })
    expect(log.byPath('/api/orders')).toHaveLength(3)
  })

  it('the app client never retries a 422', async () => {
    server.use(http.get('/api/orders', () => apiError(422, 'VALIDATION', 'bad')))
    const log = createRequestLog(server)

    await expect(fetchList(appClientWithoutDelay())).rejects.toMatchObject({ status: 422 })
    expect(log.byPath('/api/orders')).toHaveLength(1)
  })
})
