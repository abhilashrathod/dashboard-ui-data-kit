import type { Order } from '@/contracts'
import { generateOrders } from './generateOrders'

/**
 * In-memory store behind the MSW handlers.
 *
 * Mutations (create and bulk status update, coming in 1e) only live for the
 * page session: a reload re-seeds from scratch. That's deliberate for a demo
 * with no backend.
 */
export const db = { orders: [] as Order[] }

/** Local midnight today, so a whole day's numbers stay stable while the page is open. */
function startOfToday(): Date {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

/**
 * Regenerates `db.orders` in place. The array identity is kept, so code
 * holding a reference to it sees the new data.
 */
export function resetDb({
  seed = 42,
  count = 10_000,
  anchor = startOfToday(),
}: { seed?: number; count?: number; anchor?: Date } = {}): void {
  const orders = generateOrders({ seed, count, anchor })
  db.orders.length = 0
  for (const order of orders) db.orders.push(order)
}

export function emptyDb(): void {
  db.orders.length = 0
}

resetDb()
