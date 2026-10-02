import type { SetupServer } from 'msw/node'
import { vi } from 'vitest'

export interface LoggedRequest {
  method: string
  pathname: string
  /** "" or "?…", exactly as sent. */
  search: string
  startedAt: number
}

export interface RequestLog {
  /** Requests that reached MSW, optionally filtered. */
  count: (filter?: (request: LoggedRequest) => boolean) => number
  byPath: (pathname: string) => LoggedRequest[]
  /** fetch calls whose AbortSignal ended up aborted (checked now, not at call time). */
  abortedCount: () => number
  all: () => readonly LoggedRequest[]
  clear: () => void
  dispose: () => void
}

/**
 * Counts every request the app makes, for "exactly N requests" assertions.
 *
 * - Requests: MSW's `request:start` lifecycle event, so only what actually
 *   went out is counted (cache hits never get here).
 * - Aborts: a pass-through spy on globalThis.fetch keeps each call's
 *   `init.signal`. MSW's own Request doesn't carry the caller's signal.
 *
 * Create one per test after server.listen(); the spy is restored by
 * dispose() (or by Vitest's restoreMocks).
 */
export function createRequestLog(server: SetupServer): RequestLog {
  const requests: LoggedRequest[] = []
  const onStart = ({ request }: { request: Request }) => {
    const url = new URL(request.url)
    requests.push({
      method: request.method,
      pathname: url.pathname,
      search: url.search,
      startedAt: performance.now(),
    })
  }
  server.events.on('request:start', onStart)
  const fetchSpy = vi.spyOn(globalThis, 'fetch')

  return {
    count: (filter) => (filter ? requests.filter(filter).length : requests.length),
    byPath: (pathname) => requests.filter((request) => request.pathname === pathname),
    abortedCount: () => fetchSpy.mock.calls.filter(([, init]) => init?.signal?.aborted).length,
    all: () => [...requests],
    clear: () => {
      requests.length = 0
      fetchSpy.mockClear()
    },
    dispose: () => {
      server.events.removeListener('request:start', onStart)
      fetchSpy.mockRestore()
    },
  }
}

/** Query-string helpers for logged requests. */
export const searchOf = (request: LoggedRequest) => new URLSearchParams(request.search)
