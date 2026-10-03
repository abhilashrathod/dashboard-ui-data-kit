import { ChevronDown } from 'lucide-react'
import { useId, useRef } from 'react'
import {
  Button,
  ConfirmDialog,
  DropdownMenu,
  Tooltip,
  VisuallyHidden,
  type DataTableSelection,
} from '@/components'
import { BULK_STATUS_MAX_IDS } from '@/contracts'
import { formatNumber } from '@/lib/format'
import { StatusMenuItems } from './StatusMenuItems'
import { useStatusChangeFlow } from './useStatusChangeFlow'

const CAP_REASON = `Bulk actions support up to ${formatNumber(BULK_STATUS_MAX_IDS)} orders`

/** What the action needs from the table's selection (any row type). */
export type BulkSelection = Pick<DataTableSelection<unknown>, 'ids' | 'count' | 'remove'>

/**
 * "Mark as…" for the selected orders: pick a status, confirm, and the server
 * applies it to each order it allows (useStatusChangeFlow, shared with the
 * single-order paths). What's specific to the selection lives here: the 500
 * cap, and the updated orders leaving the selection while the failed ones
 * stay selected.
 */
export function BulkStatusAction({ selection }: { selection: BulkSelection }) {
  const reasonId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  /** Set by a menu choice, so the menu doesn't pull focus back from the dialog it opened. */
  const choosing = useRef(false)
  /** Ids to deselect once the dialog has closed (see onDialogClosed). */
  const toRemove = useRef<string[] | null>(null)
  const flow = useStatusChangeFlow({
    // Only the updated ids leave the selection. The failed ones STAY SELECTED,
    // so the user can see, and act on, exactly what didn't change.
    onResult: (result) => {
      toRemove.current = result.updated.map((order) => order.id)
    },
  })

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
          <StatusMenuItems
            onSelect={(status) => {
              choosing.current = true
              flow.start({ ids: selection.ids, status })
            }}
          />
        </DropdownMenu.Content>
      </DropdownMenu>
      <ConfirmDialog {...flow.dialogProps} onCloseAutoFocus={onDialogClosed} />
    </>
  )
}
