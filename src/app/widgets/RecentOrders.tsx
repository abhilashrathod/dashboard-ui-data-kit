import { ArrowRight } from 'lucide-react'
import { Button, Card, DataTable, useDataTable } from '@/components'
import { getOrderRowId, orderColumns } from '@/features/orders/orderColumns'
import { useOrdersTableData } from '@/lib/query'
import { useGoToOrders } from '../navigation'

/*
 * The same DataTable that powers the Orders view, in a different composition:
 * the Orders view adds the toolbar, selection, bulk bar, pagination, row
 * actions and virtualization; here it's just the grid. Its params live in
 * their own URL namespace ('recent'), so the two tables never share state.
 *
 * A narrower column set rather than visibility defaults: visibility is a
 * per-user preference with no defaults API (and no toggle here to change it).
 * The row-actions column is left out too: its menu needs the Orders view's
 * drawer and confirm flow.
 */
const HIDDEN = new Set(['channel', 'itemCount', 'actions'])
/** TanStack's id: `id`, else the accessor key. */
const idOf = (column: (typeof orderColumns)[number]) =>
  column.id ?? ('accessorKey' in column ? String(column.accessorKey) : '')
const recentColumns = orderColumns.filter((column) => !HIDDEN.has(idOf(column)))

const RECENT_DEFAULTS = { pageSize: 10, sort: '-createdAt' } as const

export function RecentOrders() {
  const goToOrders = useGoToOrders()
  const source = useOrdersTableData('recent', { defaults: RECENT_DEFAULTS, prefetchNext: false })
  const table = useDataTable({
    id: 'recent',
    columns: recentColumns,
    source,
    getRowId: getOrderRowId,
  })

  return (
    <DataTable table={table} aria-label="Recent orders">
      <Card.Header
        className="px-card"
        actions={
          <Button variant="ghost" size="sm" rightIcon={<ArrowRight />} onClick={() => goToOrders()}>
            View all
          </Button>
        }
      >
        <Card.Title as="h2">Recent orders</Card.Title>
      </Card.Header>
      <DataTable.Grid virtualize={false} />
    </DataTable>
  )
}
