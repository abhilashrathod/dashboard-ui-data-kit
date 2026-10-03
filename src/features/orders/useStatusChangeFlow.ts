import { useCallback, useState } from 'react'
import { ERROR_COPY, useToast, type ConfirmDialogProps } from '@/components'
import type { BulkStatusUpdateResult, OrderStatus } from '@/contracts'
import { isApiError } from '@/lib/api'
import { useBulkUpdateStatus } from '@/lib/query'
import { useShowBulkDetails } from './bulkDetails'
import { orders, statusWord, summarizeBulkResult } from './summarizeBulkResult'

/** The statuses an order can be moved to. Pending is where orders start, not a destination. */
export const STATUS_TARGETS: readonly OrderStatus[] = ['paid', 'shipped', 'refunded', 'failed']
const DESTRUCTIVE: ReadonlySet<OrderStatus> = new Set(['refunded', 'failed'])

export interface StatusChangeRequest {
  ids: readonly string[]
  status: OrderStatus
  /** One order (the row actions, the drawer) rather than a selection: singular wording. */
  single?: boolean
  /** Where it was started, for the caller's focus return (OrdersTable: 'row' | 'drawer'). */
  from?: string
}

/**
 * "Mark as…": confirm, call the bulk endpoint, toast the result. Shared by the
 * bulk bar (the selection) and the single-order paths (row actions, the
 * details drawer), so both make the same request (`{ ids, status }`, a single
 * order is a one-id bulk) and read the result the same way. The server is the
 * authority on transitions: nothing is pre-filtered here.
 *
 *   const flow = useStatusChangeFlow({ onResult })
 *   flow.start({ ids: [order.id], status: 'shipped', single: true })
 *   <ConfirmDialog {...flow.dialogProps} onCloseAutoFocus={…} />
 *
 * Focus return is the caller's (onCloseAutoFocus): the dialog is usually
 * opened from a menu item that no longer exists when it closes.
 */
export function useStatusChangeFlow({
  onResult,
}: {
  /** After a successful request, before the dialog closes. */
  onResult?: (result: BulkStatusUpdateResult, request: StatusChangeRequest) => void
} = {}) {
  const mutation = useBulkUpdateStatus()
  const { toast } = useToast()
  const showDetails = useShowBulkDetails()
  const [request, setRequest] = useState<StatusChangeRequest | null>(null)
  const [open, setOpen] = useState(false)

  const start = useCallback((next: StatusChangeRequest) => {
    setRequest(next)
    setOpen(true)
  }, [])

  const confirm = async () => {
    if (!request) return
    const { ids, status, single } = request
    let result
    try {
      result = await mutation.mutateAsync({ ids: [...ids], status })
    } catch (error) {
      // ConfirmDialog shows this inline and stays open; nothing else changes.
      const copy = isApiError(error) ? ERROR_COPY[error.code] : ERROR_COPY.UNAVAILABLE
      throw new Error(`${copy.title}. ${copy.description}`)
    }

    const summary = summarizeBulkResult(result, status, single ? { orderId: ids[0] } : {})
    const { failed } = result
    toast({
      title: summary.title,
      description: summary.description,
      tone: summary.tone,
      action: summary.details
        ? { label: 'View details', onClick: () => showDetails({ status, failed }) }
        : undefined,
    })
    onResult?.(result, request)
  }

  const word = request ? statusWord(request.status) : ''
  const single = request?.single ?? false
  const dialogProps: Omit<ConfirmDialogProps, 'onCloseAutoFocus'> = {
    open,
    onOpenChange: setOpen,
    title: single
      ? `Mark order ${request?.ids[0]} as ${word}?`
      : `Mark ${orders(request?.ids.length ?? 0)} as ${word}?`,
    description: single
      ? `If the order can't move to ${word} from its current status, it stays as it is.`
      : `Orders that can't move to ${word} from their current status are skipped. They stay selected, so you can review them.`,
    tone: request && DESTRUCTIVE.has(request.status) ? 'danger' : 'default',
    confirmLabel: `Mark as ${word}`,
    onConfirm: confirm,
  }

  return { start, request, dialogProps }
}
