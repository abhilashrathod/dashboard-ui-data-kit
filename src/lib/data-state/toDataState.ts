/*
 * toDataState: TanStack Query result → DataState. Pure; no React.
 *
 * Rules, applied in THIS order (the first match wins):
 *
 * 1. data === undefined && isError → error.
 *    (Non-ApiError errors are normalized to ApiError { status: 0, code: 'UNAVAILABLE' }.)
 * 2. data === undefined → loading.
 * 3. isEmpty(data) && isError → error.
 *    An empty list we couldn't refresh is not proof of "no data"; don't claim "no orders".
 * 4. isEmpty(data) && isPlaceholderData → loading.
 *    The previous key's empty result shouldn't flash "no results" for the new key.
 * 5. isEmpty(data) → isFiltered ? no-results (with clear) : empty.
 * 6. Otherwise → ready, with isRefetching = isFetching, isPlaceholder = isPlaceholderData,
 *    staleError = isError ? error : undefined, updatedAt = dataUpdatedAt,
 *    and retry = () => refetch().
 */

import type { UseQueryResult } from '@tanstack/react-query'
import { ApiError, isApiError } from '@/lib/api'
import type { DataState } from './types'

export type QueryLike<T> = Pick<
  UseQueryResult<T, unknown>,
  | 'data'
  | 'error'
  | 'isPending'
  | 'isError'
  | 'isFetching'
  | 'isPlaceholderData'
  | 'dataUpdatedAt'
  | 'refetch'
>

export interface ToDataStateOptions<T> {
  /** True when the data has nothing to show (e.g. `page.total === 0`). */
  isEmpty: (data: T) => boolean
  /** Filters or a search narrow the data: empty means "no results", not "no data". */
  isFiltered?: boolean
  /** Clears the filters; offered by the no-results state. */
  clear?: () => void
}

/** Every error a DataState carries is an ApiError, whatever the query threw. */
export function toApiError(error: unknown): ApiError {
  if (isApiError(error)) return error
  return new ApiError({
    status: 0,
    code: 'UNAVAILABLE',
    message: error instanceof Error ? error.message : 'Unknown error',
    cause: error,
  })
}

export function toDataState<T>(query: QueryLike<T>, opts: ToDataStateOptions<T>): DataState<T> {
  const { data, isError, isPlaceholderData } = query
  const retry = () => query.refetch()

  // 1, 2: nothing to show yet.
  if (data === undefined) {
    return isError
      ? { status: 'error', error: toApiError(query.error), retry }
      : { status: 'loading' }
  }

  if (opts.isEmpty(data)) {
    // 3: an empty result we failed to refresh proves nothing.
    if (isError) return { status: 'error', error: toApiError(query.error), retry }
    // 4: the previous key's emptiness says nothing about the new key.
    if (isPlaceholderData) return { status: 'loading' }
    // 5
    return opts.isFiltered ? { status: 'no-results', clear: opts.clear } : { status: 'empty' }
  }

  // 6
  return {
    status: 'ready',
    data,
    isRefetching: query.isFetching,
    isPlaceholder: isPlaceholderData,
    staleError: isError ? toApiError(query.error) : undefined,
    updatedAt: query.dataUpdatedAt,
    retry,
  }
}
