import { QueryClient } from '@tanstack/react-query'
import { isApiError } from '@/lib/api'

export type QueryClientMode = 'app' | 'storybook' | 'test'

const MAX_RETRIES = 2
/** Requests that are wrong, not unlucky: sending them again can't succeed. */
const NEVER_RETRY_STATUS = new Set([400, 404, 422])

/**
 * The retry policy, as a pure function (TanStack's `retry` signature).
 * `failureCount` is the number of failures before this one: 0 on the first.
 *
 * - Never: 400, 404, 422, and CONTRACT (the server answered, but not with
 *   what the contract promises; asking again gets the same answer).
 * - Up to 2 retries: no response at all (status 0) and 5xx.
 * - Anything else (other 4xx, non-ApiErrors) isn't retried.
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (!isApiError(error)) return false
  if (error.code === 'CONTRACT' || NEVER_RETRY_STATUS.has(error.status)) return false
  const transient = error.status === 0 || error.status >= 500
  return transient && failureCount < MAX_RETRIES
}

/** 500ms, then 1000ms. */
export function retryDelay(failureCount: number): number {
  return Math.min(500 * 2 ** failureCount, 1000)
}

export interface CreateQueryClientOptions {
  mode: QueryClientMode
  /** Use the app's retry policy. Defaults to true in 'app' only; a Storybook story opts in with `parameters.query.retry`. */
  retry?: boolean
}

/**
 * The one place query defaults are decided, for the app, Storybook and tests.
 *
 * - staleTime 30s: list data on a dashboard is fine for half a minute. Within
 *   that window Back/Forward and revisits are served from cache with no request.
 * - gcTime 5min: unused results (previous filters, prefetched pages) stay
 *   around long enough for Back to be instant.
 * - refetchOnWindowFocus: after 30s, returning to the tab shows the cached data
 *   immediately and revalidates in the background (the RefetchIndicator).
 * - Retries only in the app by default: in tests and stories a failure should
 *   show its error state at once, deterministically.
 */
export function createQueryClient({
  mode,
  retry = mode === 'app',
}: CreateQueryClientOptions): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: true,
        retry: retry ? shouldRetry : false,
        retryDelay,
      },
      mutations: { retry: false },
    },
  })
}
