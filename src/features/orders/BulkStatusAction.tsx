import { ChevronDown } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import {
  badgeDotVariants,
  Button,
  ConfirmDialog,
  DropdownMenu,
  ERROR_COPY,
  ORDER_STATUS_DISPLAY,
  Tooltip,
  useToast,
  VisuallyHidden,
  type DataTableSelection,
} from '@/components'
import { BULK_STATUS_MAX_IDS, type OrderStatus } from '@/contracts'
import { isApiError } from '@/lib/api'
import { formatNumber } from '@/lib/format'
import { useBulkUpdateStatus } from '@/lib/query'
import { useShowBulkDetails } from './bulkDetails'
import { orders, statusWord, summarizeBulkResult } from './summarizeBulkResult'

/** The statuses a bulk change can target. Pending is where orders start, not a destination. */
const TARGETS: readonly OrderStatus[] = ['paid', 'shipped', 'refunded', 'failed']
const DESTRUCTIVE: ReadonlySet<OrderStatus> = new Set(['refunded', 'failed'])
const CAP_REASON = `Bulk actions support up to ${formatNumber(BULK_STATUS_MAX_IDS)} orders`

/** What the action needs from the table's selection (any row type). */
export type BulkSelection = Pick<DataTableSelection<unknown>, 'ids' | 'count' | 'remove'>

/**
 * "Mark as…" for the selected orders: pick a status, confirm, and the server
 * applies it to each order it allows. There's no client-side pre-filtering of
 * which orders "can" move: the server is the authority on transitions, so the
 * rules live in one place, and the result says what happened to every id.
 */
export function BulkStatusAction({ selection }: { selection: BulkSelection }) {
  const mutation = useBulkUpdateStatus()
  const { toast } = useToast()
  const showDetails = useShowBulkDetails()
  const reasonId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [target, setTarget] = useState<OrderStatus | null>(null)
  const [open, setOpen] = useState(false)
  /** Set by a menu choice, so the menu doesn't pull focus back from the dialog it opened. */
  const choosing = useRef(false)
  /** Ids to deselect once the dialog has closed (see onCloseAutoFocus). */
  const toRemove = useRef<string[] | null>(null)

  if (selection.count > BULK_STATUS_MAX_IDS) {
    // Focusable (aria-disabled, not disabled), so keyboard users reach the
    // tooltip too; the reason is also its description for screen readers.
    return (
      <>
        <Tooltip content={CAP_REASON}>
          <Button
            variant="secondary"
            size="sm"
            rightIcon={<ChevronDown />}
            aria-disabled="true"
            data-disabled=""
            aria-describedby={reasonId}
            onClick={(event) => event.preventDefault()}
          >
            Mark as…
          </Button>
        </Tooltip>
        <VisuallyHidden id={reasonId}>{CAP_REASON}</VisuallyHidden>
      </>
    )
  }

  const confirm = async () => {
    if (!target) return
    let result
    try {
      result = await mutation.mutateAsync({ ids: selection.ids, status: target })
    } catch (error) {
      // ConfirmDialog shows this inline and stays open; the selection is untouched.
      const copy = isApiError(error) ? ERROR_COPY[error.code] : ERROR_COPY.UNAVAILABLE
      throw new Error(`${copy.title}. ${copy.description}`)
    }

    const summary = summarizeBulkResult(result, target)
    const { failed } = result
    const status = target
    toast({
      title: summary.title,
      description: summary.description,
      tone: summary.tone,
      action: summary.details
        ? { label: 'View details', onClick: () => showDetails({ status, failed }) }
        : undefined,
    })
    // Only the updated ids leave the selection. The failed ones STAY SELECTED,
    // so the user can see, and act on, exactly what didn't change.
    toRemove.current = result.updated.map((order) => order.id)
  }

  const onDialogClosed = (event: Event) => {
    // The dialog was opened from a menu item that no longer exists, so Radix
    // has nowhere to return focus: send it to the trigger, or, when nothing
    // is left selected (the bar is about to unmount), to the table region.
    event.preventDefault()
    const removed = toRemove.current ?? []
    toRemove.current = null
    const remaining = selection.ids.filter((id) => !removed.includes(id)).length
    const region = triggerRef.current
      ?.closest('[data-slot="data-table"]')
      ?.querySelector<HTMLElement>('section[tabindex="-1"]')
    ;(remaining > 0 ? triggerRef.current : region)?.focus()
    // Deselect after the dialog is gone, so the user sees the rows change.
    if (removed.length > 0) selection.remove(removed)
  }

  const word = target ? statusWord(target) : ''

  return (
    <>
      <DropdownMenu>
        <DropdownMenu.Trigger asChild>
          <Button ref={triggerRef} variant="secondary" size="sm" rightIcon={<ChevronDown />}>
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
          {TARGETS.map((status) => (
            <DropdownMenu.Item
              key={status}
              icon={
                <span
                  className={badgeDotVariants({
                    tone: ORDER_STATUS_DISPLAY[status].tone,
                    className: 'size-2',
                  })}
                />
              }
              onSelect={() => {
                choosing.current = true
                setTarget(status)
                setOpen(true)
              }}
            >
              {ORDER_STATUS_DISPLAY[status].label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Mark ${orders(selection.count)} as ${word}?`}
        description={`Orders that can't move to ${word} from their current status are skipped. They stay selected, so you can review them.`}
        tone={target && DESTRUCTIVE.has(target) ? 'danger' : 'default'}
        confirmLabel={`Mark as ${word}`}
        onConfirm={confirm}
        onCloseAutoFocus={onDialogClosed}
      />
    </>
  )
}
