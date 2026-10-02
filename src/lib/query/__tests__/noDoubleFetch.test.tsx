import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { delay, http } from 'msw'
import { StrictMode, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Filter } from '@/contracts'
import { server } from '@/mocks/node'
import { createRequestLog, searchOf, type LoggedRequest, type RequestLog } from '@/test/requestLog'
import {
  createMemoryAdapter,
  setPage,
  upsertFilter,
  UrlStateProvider,
  type MemoryUrlAdapter,
} from '@/lib/url-state'
import { useBulkUpdateStatus } from '../mutations'
import { createQueryClient } from '../queryClient'
import { useKpis } from '../useMetrics'
import { useOrdersTableData } from '../useOrdersTableData'

/*
 * The README's proof for hard problem #1: URL-driven lists make exactly the
 * requests they need, no more. Each test name is the claim; the request log
 * counts what reached the (MSW) network. Everything runs under StrictMode,
 * which double-invokes effects; the counts must hold anyway.
 */

const ORDERS = '/api/orders'
const paid: Filter = { field: 'status', op: 'in', value: ['paid'] }
const shipped: Filter = { field: 'status', op: 'in', value: ['shipped'] }
const web: Filter = { field: 'channel', op: 'in', value: ['web'] }

/** List requests matching a page (absent = 1) and, optionally, a filter token. */
function listRequests(log: RequestLog, page: number, filter?: string) {
  return log.byPath(ORDERS).filter((request: LoggedRequest) => {
    const sp = searchOf(request)
    const samePage = Number(sp.get('page') ?? 1) === page
    return samePage && (filter === undefined ? true : sp.getAll('f').includes(filter))
  }).length
}

let log: RequestLog
beforeEach(() => {
  log = createRequestLog(server)
})
afterEach(() => log.dispose())

function setup(url = '', options?: { prefetchNext?: boolean }) {
  const adapter: MemoryUrlAdapter = createMemoryAdapter(url)
  const queryClient = createQueryClient({ mode: 'test' })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <StrictMode>
      <UrlStateProvider adapter={adapter}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </UrlStateProvider>
    </StrictMode>
  )
  const hook = renderHook(() => useOrdersTableData('orders', options), { wrapper })
  return { adapter, queryClient, ...hook }
}

type Setup = ReturnType<typeof setup>

/** The current page has real data, and the next-page prefetch (if any) has settled. */
async function settled({ result, queryClient }: Setup) {
  await waitFor(() => {
    expect(result.current.query.isSuccess).toBe(true)
    expect(result.current.query.isPlaceholderData).toBe(false)
    expect(queryClient.isFetching()).toBe(0)
  })
}

/** Delays /api/orders responses per request, then falls through to the real handler. */
function delayOrders(ms: (search: URLSearchParams) => number) {
  server.use(
    http.get(ORDERS, async ({ request }) => {
      await delay(ms(new URL(request.url).searchParams))
    }),
  )
}

describe('no loops, no double fetches', () => {
  it('initial mount makes exactly 1 list request (+1 prefetch for page 2)', async () => {
    const view = setup()
    await settled(view)

    expect(listRequests(log, 1)).toBe(1)
    expect(listRequests(log, 2)).toBe(1)
    expect(log.count()).toBe(2)
    expect(log.abortedCount()).toBe(0)
  })

  it('changing a filter on page 3 makes exactly 1 request, already for page 1', async () => {
    const view = setup('?orders.page=3')
    await settled(view)
    log.clear()

    act(() => view.result.current.setParams(upsertFilter(paid)))
    await settled(view)

    expect(listRequests(log, 1, 'status:in:paid')).toBe(1)
    expect(listRequests(log, 3, 'status:in:paid')).toBe(0)
    // The only other request is the new view's page-2 prefetch.
    expect(listRequests(log, 2, 'status:in:paid')).toBe(1)
    expect(log.count()).toBe(2)
    expect(view.adapter.getSearch()).toBe('?orders.f=status:in:paid')
  })

  it('an equivalent but differently-ordered URL makes 0 requests', async () => {
    const view = setup('?orders.f=channel:in:web&orders.f=status:in:paid')
    await settled(view)
    log.clear()

    act(() =>
      view.adapter.navigate(
        '?orders.page=1&orders.f=status:in:paid&orders.f=channel:in:web',
        'push',
      ),
    )
    await settled(view)

    // Canonicalized (replace) back to the same key: a cache hit.
    expect(view.adapter.getSearch()).toBe('?orders.f=channel:in:web&orders.f=status:in:paid')
    expect(view.result.current.params.filters).toEqual([web, paid])
    expect(log.count()).toBe(0)
  })

  it('Back to the previous view makes 0 requests within staleTime', async () => {
    const view = setup()
    await settled(view)
    const firstView = view.result.current.query.data

    act(() => view.result.current.setParams(upsertFilter(shipped)))
    await settled(view)
    log.clear()

    act(() => view.adapter.back())
    await settled(view)

    expect(log.count()).toBe(0)
    expect(view.result.current.query.data).toBe(firstView)
    expect(view.result.current.params.filters).toEqual([])
  })

  it('changing an unrelated param (?network or another namespace) makes 0 requests', async () => {
    const view = setup('?orders.page=2')
    await settled(view)
    const before = view.result.current
    log.clear()

    act(() => view.adapter.navigate('?orders.page=2&network=slow', 'push'))
    act(() => view.adapter.navigate('?orders.page=2&network=slow&refunds.page=4', 'push'))
    await settled(view)

    expect(log.count()).toBe(0)
    expect(view.result.current.key).toBe(before.key)
    expect(view.result.current.params).toBe(before.params)
  })

  it('rapid filter changes cancel stale requests and the last one wins', async () => {
    const view = setup('', { prefetchNext: false })
    await settled(view)
    log.clear()

    // Earlier requests answer LATER, so if they weren't cancelled they'd land last.
    const latency: Record<string, number> = {
      'status:in:paid': 150,
      'status:in:shipped': 100,
      'channel:in:web': 20,
    }
    delayOrders((sp) => latency[sp.getAll('f').at(-1) ?? ''] ?? 0)

    // Each change waits until its request is on the wire, so all three are
    // real in-flight requests (not fetches aborted before they left).
    const changes = [paid, shipped, web]
    for (const [index, filter] of changes.entries()) {
      act(() => view.result.current.setParams(upsertFilter(filter)))
      await waitFor(() => expect(log.count()).toBe(index + 1))
    }
    await settled(view)
    await delay(200) // past the slowest stale response

    expect(log.count()).toBe(3)
    expect(log.abortedCount()).toBe(2)
    expect(view.result.current.params.filters).toEqual([web, shipped])
    expect(view.result.current.query.data?.rows.every((o) => o.status === 'shipped')).toBe(true)
    expect(view.result.current.query.data?.rows.every((o) => o.channel === 'web')).toBe(true)
  })

  it('the next page is served from the prefetch cache', async () => {
    const view = setup()
    await settled(view)
    expect(listRequests(log, 2)).toBe(1)

    act(() => view.result.current.setParams(setPage(2)))

    // Ready in the same render: real page-2 data, not the previous page as placeholder.
    expect(view.result.current.query.isPlaceholderData).toBe(false)
    expect(view.result.current.query.data?.page).toBe(2)
    expect(view.result.current.dataState).toMatchObject({ status: 'ready', isPlaceholder: false })
    await settled(view)
    expect(listRequests(log, 2)).toBe(1) // no second request for page 2
    expect(listRequests(log, 3)).toBe(1) // which in turn prefetched page 3
  })

  it('while the next page loads, the previous rows stay visible', async () => {
    const view = setup('', { prefetchNext: false })
    await settled(view)
    const page1 = view.result.current.query.data
    delayOrders(() => 50)

    act(() => view.result.current.setParams(setPage(2)))

    expect(view.result.current.dataState).toMatchObject({ status: 'ready', isPlaceholder: true })
    expect(view.result.current.query.data).toBe(page1)
    await waitFor(() =>
      expect(view.result.current.dataState).toMatchObject({
        status: 'ready',
        isPlaceholder: false,
      }),
    )
    expect(view.result.current.query.data?.page).toBe(2)
    expect(listRequests(log, 2)).toBe(1)
  })

  it('bulk update invalidates lists and metrics', async () => {
    const adapter = createMemoryAdapter()
    const queryClient = createQueryClient({ mode: 'test' })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <StrictMode>
        <UrlStateProvider adapter={adapter}>
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </UrlStateProvider>
      </StrictMode>
    )
    const { result } = renderHook(
      () => ({
        table: useOrdersTableData('orders', { prefetchNext: false }),
        kpis: useKpis('30d'),
        bulk: useBulkUpdateStatus(),
      }),
      { wrapper },
    )
    await waitFor(() => {
      expect(result.current.table.query.isSuccess).toBe(true)
      expect(result.current.kpis.isSuccess).toBe(true)
    })
    const pending = result.current.table.query.data!.rows.filter((o) => o.status === 'pending')
    const ids = [...pending.map((o) => o.id), 'ORD-999999']
    log.clear()

    let outcome: Awaited<ReturnType<typeof result.current.bulk.mutateAsync>> | undefined
    await act(async () => {
      outcome = await result.current.bulk.mutateAsync({ ids, status: 'paid' })
    })

    expect(outcome?.updated).toHaveLength(pending.length)
    expect(outcome?.failed).toEqual([{ id: 'ORD-999999', reason: 'Order not found' }])
    expect(log.byPath('/api/orders/bulk-status')).toHaveLength(1)
    expect(log.byPath(ORDERS)).toHaveLength(1)
    expect(log.byPath('/api/metrics/kpis')).toHaveLength(1)
    expect(log.count()).toBe(3)
  })
})
