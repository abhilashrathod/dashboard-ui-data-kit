import { badgeDotVariants, DropdownMenu, ORDER_STATUS_DISPLAY } from '@/components'
import type { OrderStatus } from '@/contracts'
import { STATUS_TARGETS } from './useStatusChangeFlow'

/** One item per target status, with its status dot. Used by every "Mark as…" menu. */
export function StatusMenuItems({
  onSelect,
  exclude,
}: {
  onSelect: (status: OrderStatus) => void
  /** Leave out a status (one order's current one: "Mark as paid" on a paid order does nothing). */
  exclude?: OrderStatus
}) {
  return STATUS_TARGETS.filter((status) => status !== exclude).map((status) => (
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
      onSelect={() => onSelect(status)}
    >
      {ORDER_STATUS_DISPLAY[status].label}
    </DropdownMenu.Item>
  ))
}
