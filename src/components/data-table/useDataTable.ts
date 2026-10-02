import {
  useTable,
  type OnChangeFn,
  type PaginationState,
  type ReactTable,
  type Row,
  type RowData,
  type SortingState,
} from '@tanstack/react-table'
import { useCallback, useMemo, useState } from 'react'
import type { Page } from '@/contracts'
import type { DataState } from '@/lib/data-state'
import { setPage, setPageSize, type UseListParamsResult } from '@/lib/url-state'
import { dataTableFeatures, type DataColumnDef, type DataTableFeatures } from './columns'
import { pageRange, sortingFromParams, sortUpdaterFor } from './model'

/**
 * What a table renders: URL params plus their DataState. The table never
 * fetches; useOrdersTableData('orders') returns exactly this shape.
 */
export interface DataTableSource<TData> {
  params: UseListParamsResult['params']
  setParams: UseListParamsResult['setParams']
  resetParams: UseListParamsResult['resetParams']
  dataState: DataState<Page<TData>>
}

export interface UseDataTableOptions<TData extends RowData> {
  /** Unique on the page; prefixes element ids. */
  id: string
  /** Define them outside the component: a new array each render rebuilds every column. */
  columns: readonly DataColumnDef<TData>[]
  source: DataTableSource<TData>
  getRowId: (row: TData) => string
}

export interface DataTableModel<TData extends RowData> extends DataTableSource<TData> {
  id: string
  /** Escape hatch: the TanStack Table instance (v9). Its sort/page setters write the URL too. */
  instance: ReactTable<DataTableFeatures, TData>
  columns: readonly DataColumnDef<TData>[]
  /** The ready page's rows; [] in every other state. */
  rows: Row<DataTableFeatures, TData>[]
  /** Rows matching the params; the last known value while a new key loads. */
  total: number
  pageCount: number
}

/** Module scope, so a non-ready state doesn't hand TanStack a new array each render. */
const NO_ROWS: never[] = []

/**
 * A TanStack Table whose sorting and pagination are DERIVED from the URL params:
 * there is no table-local copy of either. Header clicks and the escape hatch's
 * setters go through onSortingChange / onPaginationChange to setParams, the
 * URL changes, and the new state flows back down. See docs/data-table.md.
 */
export function useDataTable<TData extends RowData>({
  id,
  columns,
  source,
  getRowId,
}: UseDataTableOptions<TData>): DataTableModel<TData> {
  const { params, setParams, resetParams, dataState } = source

  const page = dataState.status === 'ready' ? dataState.data : undefined
  const data: TData[] = page?.rows ?? NO_ROWS

  // The last total we saw, kept while a new key has no data yet (loading, an
  // error), so the page count doesn't flicker. Derived state, set during render.
  const [lastTotal, setLastTotal] = useState(0)
  if (page && page.total !== lastTotal) setLastTotal(page.total)
  const knownEmpty = dataState.status === 'empty' || dataState.status === 'no-results'
  const total = page?.total ?? (knownEmpty ? 0 : lastTotal)

  const sorting = useMemo(() => sortingFromParams(params.sort, columns), [params.sort, columns])
  const pagination = useMemo<PaginationState>(
    () => ({ pageIndex: params.page - 1, pageSize: params.pageSize }),
    [params.page, params.pageSize],
  )

  const onSortingChange = useCallback<OnChangeFn<SortingState>>(
    (updater) => {
      const update = sortUpdaterFor(updater, sorting, columns)
      if (update) setParams(update)
    },
    [sorting, columns, setParams],
  )

  const onPaginationChange = useCallback<OnChangeFn<PaginationState>>(
    (updater) => {
      const next = typeof updater === 'function' ? updater(pagination) : updater
      if (next.pageSize !== pagination.pageSize) setParams(setPageSize(next.pageSize))
      else if (next.pageIndex !== pagination.pageIndex) setParams(setPage(next.pageIndex + 1))
    },
    [pagination, setParams],
  )

  // useTable builds the core table once and updates its options each render;
  // `features`, `columns` and `data` keep their identity unless they change.
  const instance = useTable<DataTableFeatures, TData>({
    features: dataTableFeatures,
    columns,
    data,
    getRowId,
    state: { sorting, pagination },
    onSortingChange,
    onPaginationChange,
    // The server sorts and pages; TanStack only lays out what it's given.
    manualSorting: true,
    manualPagination: true,
    enableMultiSort: false,
    rowCount: total,
  })

  const { pageCount } = pageRange({ page: params.page, pageSize: params.pageSize, total })

  return {
    id,
    instance,
    params,
    setParams,
    resetParams,
    dataState,
    columns,
    rows: instance.getRowModel().rows,
    total,
    pageCount,
  }
}
