import {
  useTable,
  type OnChangeFn,
  type PaginationState,
  type ReactTable,
  type Row,
  type RowData,
  type SortingState,
  type ColumnVisibilityState,
} from '@tanstack/react-table'
import { useCallback, useMemo, useState } from 'react'
import type { Page } from '@/contracts'
import type { DataState } from '@/lib/data-state'
import { setPage, setPageSize, type UseListParamsResult } from '@/lib/url-state'
import { dataTableFeatures, type DataColumnDef, type DataTableFeatures } from './columns'
import {
  effectiveActiveCell,
  INITIAL_ACTIVE,
  listKeyOf,
  rekeyActiveCell,
  type StoredActiveCell,
} from './keyboard/activeCell'
import type { Pos } from './keyboard/gridNav'
import { pageRange, sortingFromParams, sortUpdaterFor } from './model'
import { viewKeyOf } from './selection'
import { selectionColumn } from './selectionColumn'
import { useColumnVisibility, type ColumnVisibility } from './useColumnVisibility'
import { useSelection, type DataTableSelection } from './useSelection'

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
  /**
   * Adds the selection column (first) and turns on `table.selection`. The one
   * switch for selection: <DataTable.BulkBar> doesn't add the column itself.
   */
  selectable?: boolean
  /** Names a row for its checkbox: "order ORD-000123" → "Select order ORD-000123". Default: "{singular label} {id}". */
  getRowLabel?: (row: TData) => string
}

export interface DataTableModel<TData extends RowData> extends DataTableSource<TData> {
  id: string
  /** Escape hatch: the TanStack Table instance (v9). Its sort/page/visibility setters go through the kit too. */
  instance: ReactTable<DataTableFeatures, TData>
  /** Every column, including the selection column when selectable. */
  columns: readonly DataColumnDef<TData>[]
  /** Which columns are shown: the user's stored preference (useColumnVisibility). */
  columnVisibility: ColumnVisibility
  /** Always present; stays empty unless `selectable`. */
  selection: DataTableSelection<TData>
  selectable: boolean
  getRowLabel?: (row: TData) => string
  /** The ready page's rows; [] in every other state. */
  rows: Row<DataTableFeatures, TData>[]
  /** Rows matching the params; the last known value while a new key loads. */
  total: number
  pageCount: number
  /**
   * The grid's active cell (keyboard focus position): row -1 is the header,
   * columns count visible columns only. Already clamped to the grid on screen.
   * See docs/keyboard-grid.md.
   */
  activeCell: Pos
  /** Moves the active cell. Doesn't move focus; DataTable.Grid does that for user moves. */
  setActiveCell: (pos: Pos) => void
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
  columns: dataColumns,
  source,
  getRowId,
  selectable = false,
  getRowLabel,
}: UseDataTableOptions<TData>): DataTableModel<TData> {
  const { params, setParams, resetParams, dataState } = source

  const columns = useMemo(
    () => (selectable ? [selectionColumn as DataColumnDef<TData>, ...dataColumns] : dataColumns),
    [selectable, dataColumns],
  )

  const page = dataState.status === 'ready' ? dataState.data : undefined
  const data: TData[] = page?.rows ?? NO_ROWS
  // Placeholder rows belong to the previous key (maybe another view): not selectable.
  const selectableRows =
    selectable && dataState.status === 'ready' && !dataState.isPlaceholder ? data : NO_ROWS
  const selection = useSelection(params, selectableRows, getRowId)
  const columnVisibility = useColumnVisibility(id, columns)

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

  const { apply: applyVisibility, state: visibilityState } = columnVisibility
  const onColumnVisibilityChange = useCallback<OnChangeFn<ColumnVisibilityState>>(
    (updater) =>
      applyVisibility(typeof updater === 'function' ? updater(visibilityState) : updater),
    [applyVisibility, visibilityState],
  )

  // useTable builds the core table once and updates its options each render;
  // `features`, `columns` and `data` keep their identity unless they change.
  const instance = useTable<DataTableFeatures, TData>({
    features: dataTableFeatures,
    columns,
    data,
    getRowId,
    state: { sorting, pagination, columnVisibility: visibilityState },
    onSortingChange,
    onPaginationChange,
    onColumnVisibilityChange,
    // The server sorts and pages; TanStack only lays out what it's given.
    manualSorting: true,
    manualPagination: true,
    enableMultiSort: false,
    rowCount: total,
  })

  const { pageCount } = pageRange({ page: params.page, pageSize: params.pageSize, total })
  const rows = instance.getRowModel().rows

  /*
   * The active cell: local UI state, like the selection. A new page or view
   * resets the row to 0 (keeping the column); that reset is derived during
   * render, the same pattern as the selection's view-key clear. Clamping to
   * the rows and columns on screen is read-side only (keyboard/activeCell.ts).
   */
  const listKey = listKeyOf(viewKeyOf(params), params.page, params.pageSize)
  const [storedActive, setStoredActive] = useState<StoredActiveCell>(() => ({
    pos: INITIAL_ACTIVE,
    listKey,
  }))
  const currentActive = rekeyActiveCell(storedActive, listKey)
  if (currentActive !== storedActive) setStoredActive(currentActive)
  const activeCell = effectiveActiveCell(currentActive, {
    rowCount: rows.length,
    colCount: instance.getVisibleLeafColumns().length,
  })
  const setActiveCell = useCallback(
    (pos: Pos) =>
      setStoredActive((state) =>
        state.pos.row === pos.row && state.pos.col === pos.col ? state : { ...state, pos },
      ),
    [setStoredActive],
  )

  return {
    id,
    instance,
    params,
    setParams,
    resetParams,
    dataState,
    columns,
    columnVisibility,
    selection,
    selectable,
    getRowLabel,
    rows,
    total,
    pageCount,
    activeCell,
    setActiveCell,
  }
}
