import { useCallback, useMemo, useRef, useState } from 'react'
import { ConfirmDialog, DataTable, useDataTable } from '@/components'
import type { Order, OrderStatus } from '@/contracts'
import { useOrdersTableData } from '@/lib/query'
import { BulkDetailsProvider } from './BulkDetailsProvider'
import { BulkStatusAction } from './BulkStatusAction'
import { OrderActionsContext, type OrderActions } from './orderActions'
import { getOrderRowId, orderColumns } from './orderColumns'
import { OrderDetailsDrawer } from './OrderDetailsDrawer'
import { ORDER_VIEW_PRESETS } from './orderViews'
import { useStatusChangeFlow } from './useStatusChangeFlow'

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
export function OrdersTable(props: OrdersTableProps) {
  // Above the table: the single-order flow can open "View details" for a failure too.
  return (
    <BulkDetailsProvider>
      <OrdersTableView {...props} />
    </BulkDetailsProvider>
  )
}

/** The order the drawer shows, and whether it's open (kept while it animates out). */
interface DetailsState {
  order: Order
  open: boolean
}

function OrdersTableView({ namespace = 'orders', gridClassName }: OrdersTableProps) {
  const source = useOrdersTableData(namespace)
  const [details, setDetails] = useState<DetailsState | null>(null)
  const openDetails = useCallback((order: Order) => setDetails({ order, open: true }), [])

  const table = useDataTable({
    id: namespace,
    columns: orderColumns,
    source,
    getRowId: getOrderRowId,
    selectable: true,
    // Enter on a text cell opens the drawer. A click on a row doesn't: see docs/keyboard-grid.md.
    onOpenRow: openDetails,
  })

  const drawerStatusRef = useRef<HTMLButtonElement>(null)
  const flow = useStatusChangeFlow({
    // Show the server's copy of the order in the drawer straight away.
    onResult: (result) => {
      const updated = result.updated[0]
      if (updated)
        setDetails((d) => (d && d.order.id === updated.id ? { ...d, order: updated } : d))
    },
  })
  const { start } = flow

  const changeStatus = useCallback(
    (order: Order, status: OrderStatus, from: 'row' | 'drawer' = 'row') =>
      start({ ids: [order.id], status, single: true, from }),
    [start],
  )
  const actions = useMemo<OrderActions>(
    () => ({ openDetails, changeStatus }),
    [openDetails, changeStatus],
  )

  // The freshest copy of the drawer's order: the table's row once a refetch
  // has it (newer updatedAt), else the snapshot (it may have left the page).
  const row = details && table.rows.find((candidate) => candidate.id === details.order.id)?.original
  const shownOrder =
    details && row && row.updatedAt >= details.order.updatedAt ? row : (details?.order ?? null)

  /*
   * Focus return. The drawer and a row's confirm dialog have no trigger
   * button to return to (Enter on a cell opened the drawer; the dialog's menu
   * item is gone), so focus goes back to the GRID explicitly: to the row the
   * overlay was about if it's still on the page (it may have moved: a status
   * change refetches, and a sort by status re-orders it), otherwise to the
   * active cell, clamped. Without this, Radix would focus the element that
   * was focused when it opened, which may have unmounted, dropping focus to
   * <body>. See resolveFocusReturn (keyboard/interaction.ts).
   */
  const returnToGrid = (rowId: string | undefined) => (event: Event) => {
    event.preventDefault()
    table.returnFocus({ rowId })
  }

  const onConfirmClosed = (event: Event) => {
    const request = flow.request
    if (request?.from === 'drawer' && details?.open) {
      // Still in the drawer: back to its "Mark as…" button.
      event.preventDefault()
      drawerStatusRef.current?.focus()
      return
    }
    returnToGrid(request?.ids[0])(event)
  }

  return (
    <OrderActionsContext value={actions}>
      <DataTable table={table} aria-label="Orders">
        <DataTable.Toolbar>
          <DataTable.SavedViews presets={ORDER_VIEW_PRESETS} />
          <DataTable.Search />
          <DataTable.ColumnToggle slot="end" />
          <DataTable.Export slot="end" />
          <DataTable.DensityToggle slot="end" />
          <DataTable.KeyboardHelp slot="end" />
        </DataTable.Toolbar>
        <DataTable.Filters />
        <DataTable.Grid className={gridClassName} />
        <DataTable.Pagination />
        <DataTable.BulkBar>
          {(selection) => <BulkStatusAction selection={selection} />}
        </DataTable.BulkBar>
      </DataTable>
      <OrderDetailsDrawer
        order={shownOrder}
        open={details?.open ?? false}
        onOpenChange={(open) => setDetails((d) => d && { ...d, open })}
        onChangeStatus={(status) => shownOrder && changeStatus(shownOrder, status, 'drawer')}
        statusTriggerRef={drawerStatusRef}
        onCloseAutoFocus={returnToGrid(details?.order.id)}
      />
      <ConfirmDialog {...flow.dialogProps} onCloseAutoFocus={onConfirmClosed} />
    </OrderActionsContext>
  )
}
