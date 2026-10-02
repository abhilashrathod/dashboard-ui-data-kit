import type { OrderStatus } from '@/contracts'
import { StatusPill } from '../../status-pill'

export function StatusCell({ status }: { status: OrderStatus }) {
  return <StatusPill status={status} />
}
