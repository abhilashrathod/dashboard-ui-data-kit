import type { SetupWorker } from 'msw/browser'

export interface RequestRow {
  id: string
  method: string
  pathname: string
  /** "" or "?…" */
  search: string
  /** ms since the log started. */
  startedAt: number
  status?: number
  durationMs?: number
  /** The app's AbortSignal fired: TanStack cancelled it because nobody needs it any more. */
  aborted: boolean
  /** A list request for a key other than the one on screen when it started (the next-page prefetch). */
  prefetch: boolean
  /** Same request as an earlier one that failed with 5xx or no response. */
  retry: boolean
}

export interface BrowserRequestLog {
  /** Begin recording. Returns stop(). Call before the queries mount (a layout effect). */
  start: () => () => void
  /** The list key currently on screen, used to tag prefetches. */
  setCurrentKey: (key: string) => void
  clear: () => void
  subscribe: (listener: () => void) => () => void
  getSnapshot: () => readonly RequestRow[]
}

interface PendingFetch {
  method: string
  url: string
  signal: AbortSignal
}

/**
 * Dev-only request log for the Storybook demo, fed by the MSW worker's
 * life-cycle events (the same `worker` the msw-storybook-addon starts, from
 * src/mocks/browser.ts).
 *
 * In the browser, MSW rebuilds each Request inside the service worker, so the
 * app's AbortSignal doesn't come along. A thin fetch tap records each call's
 * signal; `request:start` claims the oldest matching call, and the row is
 * tagged "aborted" if that signal fires.
 */
export function createBrowserRequestLog(worker: SetupWorker): BrowserRequestLog {
  let rows: readonly RequestRow[] = []
  let currentKey = ''
  let origin = performance.now()
  const listeners = new Set<() => void>()
  const pending: PendingFetch[] = []

  const emit = () => {
    for (const listener of [...listeners]) listener()
  }
  const update = (id: string, patch: Partial<RequestRow>) => {
    rows = rows.map((row) => (row.id === id ? { ...row, ...patch } : row))
    emit()
  }

  const onStart = ({ request, requestId }: { request: Request; requestId: string }) => {
    const url = new URL(request.url)
    if (!url.pathname.startsWith('/api/')) return

    const startedAt = performance.now() - origin
    const search = url.search
    const isList = request.method === 'GET' && url.pathname === '/api/orders'
    const previous = rows.findLast(
      (row) =>
        row.method === request.method && row.pathname === url.pathname && row.search === search,
    )
    rows = [
      ...rows,
      {
        id: requestId,
        method: request.method,
        pathname: url.pathname,
        search,
        startedAt,
        aborted: false,
        prefetch: isList && search.slice(1) !== currentKey,
        retry: previous !== undefined && (previous.status === 0 || (previous.status ?? 0) >= 500),
      },
    ]
    emit()

    const index = pending.findIndex(
      (call) => call.url === request.url && call.method === request.method,
    )
    if (index === -1) return
    const [{ signal }] = pending.splice(index, 1) as [PendingFetch]
    if (signal.aborted) update(requestId, { aborted: true })
    else
      signal.addEventListener('abort', () => update(requestId, { aborted: true }), { once: true })
  }

  const onResponse = ({ response, requestId }: { response: Response; requestId: string }) => {
    const row = rows.find((candidate) => candidate.id === requestId)
    if (!row) return
    update(requestId, {
      status: response.status,
      durationMs: performance.now() - origin - row.startedAt,
    })
  }

  return {
    start() {
      origin = performance.now()
      // Restored as-is on stop. Calling it unbound is fine: window.fetch is called that way everywhere.
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const originalFetch = window.fetch
      window.fetch = (input, init) => {
        const request = input instanceof Request ? input : undefined
        const signal = init?.signal ?? request?.signal
        if (signal) {
          pending.push({
            method: (init?.method ?? request?.method ?? 'GET').toUpperCase(),
            url: input instanceof Request ? input.url : input instanceof URL ? input.href : input,
            signal,
          })
          if (pending.length > 100) pending.shift()
        }
        return originalFetch(input, init)
      }
      worker.events.on('request:start', onStart)
      worker.events.on('response:mocked', onResponse)
      return () => {
        window.fetch = originalFetch
        worker.events.removeListener('request:start', onStart)
        worker.events.removeListener('response:mocked', onResponse)
      }
    },
    setCurrentKey(key) {
      currentKey = key
    },
    clear() {
      rows = []
      emit()
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    getSnapshot: () => rows,
  }
}
