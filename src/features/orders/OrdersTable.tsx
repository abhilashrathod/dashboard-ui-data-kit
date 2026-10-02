import { DataTable, useDataTable } from '@/components'
import { useOrdersTableData } from '@/lib/query'
import { getOrderRowId, orderColumns } from './orderColumns'

export interface OrdersTableProps {
  /** URL namespace for this list's params. Default 'orders'. */
  namespace?: string
  /** Passed to DataTable.Grid's scroll container, e.g. to cap its height. */
  gridClassName?: string
}

/**
 * The Orders table: URL params → query → DataState (useOrdersTableData), fed
 * to the kit's DataTable. The table renders what it's given; it never fetches.
 */
export function OrdersTable({ namespace = 'orders', gridClassName }: OrdersTableProps) {
  const source = useOrdersTableData(namespace)
  const table = useDataTable({
    id: namespace,
    columns: orderColumns,
    source,
    getRowId: getOrderRowId,
  })

  return (
    <DataTable table={table} aria-label="Orders">
      <DataTable.Toolbar>
        <DataTable.Search />
        <DataTable.DensityToggle slot="end" />
      </DataTable.Toolbar>
      <DataTable.Grid className={gridClassName} />
      <DataTable.Pagination />
    </DataTable>
  )
}
