import { Copy, Ellipsis, PanelRight, Tag } from 'lucide-react'
import { memo, useRef } from 'react'
import { DropdownMenu, IconButton, useFocusTargetProps } from '@/components'
import type { Order } from '@/contracts'
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard'
import { useOrderActions } from './orderActions'
import { StatusMenuItems } from './StatusMenuItems'

/**
 * The Actions column's cell: "⋯" → View details, Mark as… (a submenu of
 * statuses), Copy order ID. A WIDGET cell (meta.cellKind: 'widget'): the
 * button is the cell's focus target, so arrowing into the column focuses it
 * directly, and Enter opens the menu.
 *
 * Focus: Escape or "Copy order ID" closes the menu and Radix returns focus to
 * the button. "View details" and "Mark as…" open a drawer / dialog instead, so
 * the menu must NOT pull focus back to the button behind them (`opening`);
 * those overlays return focus to the grid's active cell (this button) when
 * they close (OrdersTable).
 *
 * Memoized on the row's order (stable between refetches), so selecting rows
 * or moving the active cell doesn't re-render 50 menus.
 */
export const RowActions = memo(function RowActions({ order }: { order: Order }) {
  const { openDetails, changeStatus } = useOrderActions()
  const copy = useCopyToClipboard()
  const opening = useRef(false)

  return (
    <DropdownMenu>
      <DropdownMenu.Trigger asChild>
        <IconButton
          {...useFocusTargetProps()}
          variant="ghost"
          size="sm"
          aria-label={`Actions for order ${order.id}`}
        >
          <Ellipsis />
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        align="end"
        onCloseAutoFocus={(event) => {
          if (!opening.current) return
          opening.current = false
          event.preventDefault()
        }}
      >
        <DropdownMenu.Item
          icon={<PanelRight />}
          onSelect={() => {
            opening.current = true
            openDetails(order)
          }}
        >
          View details
        </DropdownMenu.Item>
        <DropdownMenu.Sub>
          <DropdownMenu.SubTrigger icon={<Tag />}>Mark as…</DropdownMenu.SubTrigger>
          <DropdownMenu.SubContent>
            <StatusMenuItems
              exclude={order.status}
              onSelect={(status) => {
                opening.current = true
                changeStatus(order, status)
              }}
            />
          </DropdownMenu.SubContent>
        </DropdownMenu.Sub>
        <DropdownMenu.Item icon={<Copy />} onSelect={() => void copy(order.id, 'Order ID copied')}>
          Copy order ID
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu>
  )
})
