import { useMemo } from 'react'
import { toDataState, type QueryLike, type ToDataStateOptions } from './toDataState'
import type { DataState } from './types'

/** toDataState, memoized. All the logic lives in the pure function. */
export function useDataState<T>(query: QueryLike<T>, opts: ToDataStateOptions<T>): DataState<T> {
  const { data, error, isPending, isError, isFetching, isPlaceholderData, dataUpdatedAt, refetch } =
    query
  const { isEmpty, isFiltered, clear } = opts
  return useMemo(
    () =>
      toDataState(
        { data, error, isPending, isError, isFetching, isPlaceholderData, dataUpdatedAt, refetch },
        { isEmpty, isFiltered, clear },
      ),
    [
      data,
      error,
      isPending,
      isError,
      isFetching,
      isPlaceholderData,
      dataUpdatedAt,
      refetch,
      isEmpty,
      isFiltered,
      clear,
    ],
  )
}
