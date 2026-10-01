import { Order } from '@/contracts'

type OrderOverrides = Partial<Omit<Order, 'customer'>> & { customer?: Partial<Order['customer']> }

/**
 * A valid Order with sensible defaults; override only what a test cares about.
 * Parsed with the Order schema, so an invalid fixture fails loudly here
 * instead of producing a confusing test result.
 */
export function makeOrder(overrides: OrderOverrides = {}): Order {
  const createdAt = overrides.createdAt ?? '2026-09-15T12:00:00.000Z'
  return Order.parse({
    id: 'ORD-000001',
    reference: 'PO-TEST1',
    status: 'paid',
    channel: 'web',
    amount: 100,
    itemCount: 1,
    updatedAt: createdAt,
    ...overrides,
    createdAt,
    customer: { name: 'Test Customer', email: 'test@example.com', ...overrides.customer },
  })
}
