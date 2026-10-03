import { ChevronDown } from 'lucide-react'
import { useRef, type ReactNode, type RefObject } from 'react'
import { Amount, Avatar, Button, Drawer, DropdownMenu, StatusPill } from '@/components'
import type { Order, OrderStatus } from '@/contracts'
import { cn } from '@/lib/cn'
import { formatDate, formatNumber, formatRelative, formatTime } from '@/lib/format'
import { CHANNEL_LABEL } from './orderColumns'
import { StatusMenuItems } from './StatusMenuItems'

export interface OrderDetailsDrawerProps {
  /** The order shown; null before the first open. */
  order: Order | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** "Mark as…" in the footer: the same status flow as the row actions. */
  onChangeStatus: (status: OrderStatus) => void
  /** The footer's "Mark as…" button: where focus goes back after its confirm dialog. */
  statusTriggerRef: RefObject<HTMLButtonElement | null>
  /** There's no trigger button: the caller returns focus to the grid (see OrdersTable). */
  onCloseAutoFocus: (event: Event) => void
}

/** One dt/dd pair, wrapped in a div (allowed directly inside a dl). */
function Field({
  label,
  wide = false,
  children,
}: {
  label: string
  /** Spans both columns. */
  wide?: boolean
  children: ReactNode
}) {
  return (
    <div className={cn('flex flex-col gap-1', wide && 'col-span-2')}>
      <dt className="text-sm text-fg-muted">{label}</dt>
      <dd className="text-fg">{children}</dd>
    </div>
  )
}

/** "Sep 30, 2026, 2:05 PM · 3 hours ago" */
function When({ iso }: { iso: string }) {
  return (
    <>
      <time dateTime={iso} className="tabular">
        {formatDate(iso)}, {formatTime(iso)}
      </time>
      <span className="text-fg-muted"> · {formatRelative(Date.parse(iso))}</span>
    </>
  )
}

/**
 * One order's details, in a side drawer: opened with Enter on a row's text
 * cell, or "View details" in its actions menu.
 *
 * Data: the row the table already has. The mock list endpoint returns every
 * field of an order, so there's nothing more to fetch; a real app whose list
 * returns a summary would fetch the full order by id here (a query keyed on
 * the id, with the row as its placeholder data).
 */
export function OrderDetailsDrawer({
  order,
  open,
  onOpenChange,
  onChangeStatus,
  statusTriggerRef,
  onCloseAutoFocus,
}: OrderDetailsDrawerProps) {
  /** A menu choice opens a confirm dialog: the menu mustn't take focus back first. */
  const choosing = useRef(false)

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      {order ? (
        <Drawer.Content size="md" onCloseAutoFocus={onCloseAutoFocus}>
          <Drawer.Header>
            <div className="flex flex-wrap items-center gap-3">
              <Drawer.Title className="tabular">{order.id}</Drawer.Title>
              <StatusPill status={order.status} />
            </div>
            <Drawer.Description>
              Placed by {order.customer.name} on {formatDate(order.createdAt)}
            </Drawer.Description>
          </Drawer.Header>
          <Drawer.Body className="flex flex-col gap-6">
            <Amount value={order.amount} size="display-sm" glyph />
            <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
              <Field label="Customer" wide>
                <span className="flex items-center gap-3">
                  <Avatar name={order.customer.name} decorative />
                  <span className="flex min-w-0 flex-col">
                    <span>{order.customer.name}</span>
                    <span className="text-sm break-all text-fg-muted">{order.customer.email}</span>
                  </span>
                </span>
              </Field>
              <Field label="Channel">{CHANNEL_LABEL[order.channel]}</Field>
              <Field label="Items">
                <span className="tabular">{formatNumber(order.itemCount)}</span>
              </Field>
              <Field label="Reference">
                <span className="tabular">{order.reference}</span>
              </Field>
              <Field label="Created" wide>
                <When iso={order.createdAt} />
              </Field>
              <Field label="Updated" wide>
                <When iso={order.updatedAt} />
              </Field>
            </dl>
          </Drawer.Body>
          <Drawer.Footer>
            <DropdownMenu>
              <DropdownMenu.Trigger asChild>
                <Button
                  ref={statusTriggerRef}
                  variant="secondary"
                  rightIcon={<ChevronDown />}
                  className="mr-auto"
                >
                  Mark as…
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content
                onCloseAutoFocus={(event) => {
                  if (!choosing.current) return
                  choosing.current = false
                  event.preventDefault()
                }}
              >
                <StatusMenuItems
                  exclude={order.status}
                  onSelect={(status) => {
                    choosing.current = true
                    onChangeStatus(status)
                  }}
                />
              </DropdownMenu.Content>
            </DropdownMenu>
            <Drawer.Close asChild>
              <Button variant="ghost">Close</Button>
            </Drawer.Close>
          </Drawer.Footer>
        </Drawer.Content>
      ) : null}
    </Drawer>
  )
}
