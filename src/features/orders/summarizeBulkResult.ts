import { ORDER_STATUS_DISPLAY, type ToastOptions } from '@/components'
import type { BulkStatusUpdateResult, OrderStatus } from '@/contracts'
import { formatNumber } from '@/lib/format'

/** "1 order", "2 orders", "1,204 orders". */
export function orders(count: number): string {
  return `${formatNumber(count)} ${count === 1 ? 'order' : 'orders'}`
}

/** "shipped": the status as it reads mid-sentence. */
export function statusWord(status: OrderStatus): string {
  return ORDER_STATUS_DISPLAY[status].label.toLowerCase()
}

export type BulkResultSummary = Required<Pick<ToastOptions, 'title' | 'tone'>> &
  Pick<ToastOptions, 'description'> & {
    /** Offer "View details" (the failed ids and the server's reasons). */
    details: boolean
  }

/**
 * The toast for a bulk status result. The server's `{ updated, failed }` is
 * taken as is: it alone decides which transitions are allowed.
 *  - all updated → success: "3 orders marked as shipped"
 *  - some failed → default: "2 updated, 1 couldn't be changed" + details
 *  - none updated → danger: "No orders could be changed" + details
 */
export function summarizeBulkResult(
  result: BulkStatusUpdateResult,
  status: OrderStatus,
): BulkResultSummary {
  const updated = result.updated.length
  const failed = result.failed.length
  const word = statusWord(status)

  if (failed === 0) {
    return { title: `${orders(updated)} marked as ${word}`, tone: 'success', details: false }
  }
  if (updated === 0) {
    return {
      title: 'No orders could be changed',
      description:
        failed === 1
          ? `The order can't be marked as ${word}. It's still selected.`
          : `None of the ${orders(failed)} can be marked as ${word}. They're still selected.`,
      tone: 'danger',
      details: true,
    }
  }
  return {
    title: `${formatNumber(updated)} updated, ${formatNumber(failed)} couldn't be changed`,
    description: `${orders(updated)} marked as ${word}. The ${failed === 1 ? 'other one is' : 'others are'} still selected.`,
    tone: 'default',
    details: true,
  }
}
