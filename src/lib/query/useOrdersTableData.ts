import { useCallback } from 'react'
import type { Order, Page } from '@/contracts'
import { useDataState } from '@/lib/data-state'
import { clearFilters, useListParams, type ListDefaults } from '@/lib/url-state'
import { useOrdersList, type UseOrdersListOptions } from './useOrdersList'

const isEmpty = (page: Page<Order>) => page.total === 0

/**
 * Glue for the orders table: URL params → list query → DataState.
 * Stage 4's DataTable consumes this.
 */
export function useOrdersTableData(
  namespace = 'orders',
  { defaults, ...options }: UseOrdersListOptions & { defaults?: ListDefaults } = {},
) {
  const { params, setParams, resetParams, key, dropped } = useListParams(namespace, { defaults })
  const query = useOrdersList(params, options)
  const clear = useCallback(
    () => setParams((prev) => ({ ...clearFilters()(prev), q: undefined })),
    [setParams],
  )
  const dataState = useDataState(query, {
    isEmpty,
    isFiltered: params.filters.length > 0 || !!params.q,
    clear,
  })
  return { params, setParams, resetParams, dataState, query, key, dropped, namespace }
}
