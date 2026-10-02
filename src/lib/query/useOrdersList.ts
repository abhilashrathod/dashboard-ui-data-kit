import { keepPreviousData, queryOptions, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { listParamsKey, type ListParams } from '@/contracts'
import { fetchOrders } from '@/lib/api'
import { queryKeys } from './keys'

/** Key + fetcher for one list page. Shared by the hook and the prefetch, so they always agree. */
export function ordersListQuery(params: ListParams) {
  return queryOptions({
    queryKey: queryKeys.orders.list(listParamsKey(params)),
    // The signal lets TanStack abort a request nobody is waiting for any more
    // (the user changed the filter again before it answered).
    queryFn: ({ signal }) => fetchOrders(params, signal),
  })
}

export interface UseOrdersListOptions {
  /** Prefetch page + 1 once this page has loaded. Default true. */
  prefetchNext?: boolean
}

/**
 * One page of orders for `params`. While a new key loads, the previous page
 * stays on screen (keepPreviousData → isPlaceholderData → DataState
 * isPlaceholder), so paging and filtering never flash a skeleton.
 */
export function useOrdersList(
  params: ListParams,
  { prefetchNext = true }: UseOrdersListOptions = {},
) {
  const queryClient = useQueryClient()
  const query = useQuery({ ...ordersListQuery(params), placeholderData: keepPreviousData })
  const { data, isPlaceholderData } = query

  // Prefetch the next page: the only effect in the query layer.
  //
  // It runs after this page's real (non-placeholder) data arrives, i.e. when
  // `params` (stable per canonical key, from useListParams) or `data` (a new
  // object per fetch) changes. It's safe to run any number of times, StrictMode
  // included: prefetchQuery is idempotent, joins an in-flight fetch for the
  // same key, and does nothing while that page is cached and fresh (staleTime).
  // It never writes to the URL or to this query, so it can't feed back into itself.
  useEffect(() => {
    if (!prefetchNext || !data || isPlaceholderData) return
    const lastPage = Math.ceil(data.total / params.pageSize)
    if (params.page >= lastPage) return
    void queryClient.prefetchQuery(ordersListQuery({ ...params, page: params.page + 1 }))
  }, [queryClient, prefetchNext, params, data, isPlaceholderData])

  return query
}
