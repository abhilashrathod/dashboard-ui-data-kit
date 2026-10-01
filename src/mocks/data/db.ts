import type { Order } from '@/contracts'
import { resetRequestIds } from '../http'
import { generateOrders } from './generateOrders'

/**
 * In-memory store behind the MSW handlers.
 *
 * Mutations (create and bulk status update) only live for the page session:
 * a reload re-seeds from scratch. That's deliberate for a demo with no backend.
 *
 * `anchor` is the date the data was generated relative to. The metrics
 * handlers use it, so KPIs line up with the data rather than the wall clock.
 */
export const db = { orders: [] as Order[], anchor: new Date(0) }

/** Local midnight today, so a whole day's numbers stay stable while the page is open. */
function startOfToday(): Date {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

/**
 * Regenerates `db.orders` in place (the array identity is kept, so code
 * holding a reference to it sees the new data), stores the anchor, and
 * restarts request ids at req_000001.
 */
export function resetDb({
  seed = 42,
  count = 10_000,
  anchor = startOfToday(),
}: { seed?: number; count?: number; anchor?: Date } = {}): void {
  const orders = generateOrders({ seed, count, anchor })
  db.orders.length = 0
  for (const order of orders) db.orders.push(order)
  db.anchor = new Date(anchor.getTime())
  resetRequestIds()
}

export function emptyDb(): void {
  db.orders.length = 0
}

resetDb()
