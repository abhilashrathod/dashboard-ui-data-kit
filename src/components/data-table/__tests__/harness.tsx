import type { RowData } from '@tanstack/react-table'
import type { ReactNode } from 'react'
import type { Order, Page } from '@/contracts'
import { getOrderRowId, orderColumns } from '@/features/orders/orderColumns'
import type { DataState } from '@/lib/data-state'
import { useListParams } from '@/lib/url-state'
import { makeOrder } from '@/mocks/query/__tests__/makeOrder'
import { DataTableContext } from '../context'
import { DataTable } from '../DataTable'
import { useDataTable, type DataTableModel } from '../useDataTable'

export function readyPage(total: number, pageSize = 50, page = 1): DataState<Page<Order>> {
  const count = Math.max(0, Math.min(pageSize, total - (page - 1) * pageSize))
  const rows = Array.from({ length: count }, (_, index) =>
    makeOrder({
      id: `ORD-${String(index + 1).padStart(6, '0')}`,
      customer: { name: `Customer ${index + 1}` },
    }),
  )
  return {
    status: 'ready',
    data: { rows, total, page, pageSize },
    isRefetching: false,
    isPlaceholder: false,
    updatedAt: 0,
    retry: () => Promise.resolve(),
  }
}

/**
 * The real useListParams + useDataTable + DataTable, with a DataState handed in
 * instead of fetched: the table never fetches, so tests don't need to either.
 */
export function TableHarness({
  dataState,
  onTable,
}: {
  dataState:
    | DataState<Page<Order>>
    | ((params: ReturnType<typeof useListParams>['params']) => DataState<Page<Order>>)
  onTable?: (table: DataTableModel<Order>) => void
}) {
  const list = useListParams('orders')
  const state = typeof dataState === 'function' ? dataState(list.params) : dataState
  const table = useDataTable({
    id: 'orders',
    columns: orderColumns,
    source: { ...list, dataState: state },
    getRowId: getOrderRowId,
  })
  onTable?.(table)
  return (
    <DataTable table={table} aria-label="Orders">
      <DataTable.Toolbar>
        <DataTable.Search />
      </DataTable.Toolbar>
      <DataTable.Grid />
      <DataTable.Pagination />
    </DataTable>
  )
}

/** Just enough table for one part: the URL params, no query, no TanStack instance. */
export function ParamsOnlyTable({ children }: { children: ReactNode }) {
  const { params, setParams, resetParams } = useListParams('orders')
  const table = {
    id: 'orders',
    params,
    setParams,
    resetParams,
  } as unknown as DataTableModel<RowData>
  return <DataTableContext value={{ table, label: 'Orders' }}>{children}</DataTableContext>
}
