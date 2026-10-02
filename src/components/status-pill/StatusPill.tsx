import type { OrderStatus } from '@/contracts'
import { Badge, type BadgeProps, type BadgeTone } from '../badge'

/** The ONE mapping from order status to tone and label. */
export const ORDER_STATUS_DISPLAY: Record<OrderStatus, { tone: BadgeTone; label: string }> = {
  pending: { tone: 'warning', label: 'Pending' },
  paid: { tone: 'success', label: 'Paid' },
  shipped: { tone: 'info', label: 'Shipped' },
  refunded: { tone: 'neutral', label: 'Refunded' },
  failed: { tone: 'danger', label: 'Failed' },
}

export type StatusPillProps = Omit<BadgeProps, 'tone' | 'dot' | 'children'> & {
  status: OrderStatus
}

/** An order status as a dotted Badge. The label is always visible, never color alone. */
export function StatusPill({ status, ...props }: StatusPillProps) {
  const { tone, label } = ORDER_STATUS_DISPLAY[status]
  return (
    <Badge tone={tone} dot data-status={status} {...props}>
      {label}
    </Badge>
  )
}
