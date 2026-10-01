import * as z from './zod'

export const ORDER_STATUSES = ['pending', 'paid', 'shipped', 'refunded', 'failed'] as const
export const OrderStatus = z.enum(ORDER_STATUSES)
export type OrderStatus = z.infer<typeof OrderStatus>

export const Channel = z.enum(['web', 'mobile', 'marketplace', 'pos'])
export type Channel = z.infer<typeof Channel>

/** USD with at most 2 decimals. `multipleOf` is float-safe in Zod 4 (19.99 passes, 10.005 fails). */
const usd = (...checks: z.core.$ZodCheck<number>[]) =>
  z.number().check(z.multipleOf(0.01), ...checks)

const orderReference = () =>
  z.string().check(z.regex(/^PO-[A-Z0-9]{5}$/, 'Reference must look like PO-8F3K2'))

export const Order = z.object({
  /** e.g. "ORD-004213" */
  id: z.string().check(z.regex(/^ORD-\d{6}$/)),
  /** e.g. "PO-8F3K2" */
  reference: orderReference(),
  customer: z.object({
    name: z.string().check(z.minLength(1)),
    email: z.email(),
  }),
  status: OrderStatus,
  channel: Channel,
  amount: usd(z.nonnegative()),
  itemCount: z.int().check(z.nonnegative()),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})
export type Order = z.infer<typeof Order>

export const CreateOrderInput = z.object({
  customer: z.object({
    name: z.string().check(z.trim(), z.minLength(2), z.maxLength(80)),
    email: z.email(),
  }),
  channel: Channel,
  amount: usd(z.gte(0.01), z.lte(50_000)),
  itemCount: z.int().check(z.gte(1), z.lte(999)),
  reference: orderReference(),
})
export type CreateOrderInput = z.infer<typeof CreateOrderInput>

export const BulkStatusUpdateInput = z.object({
  // Plain strings, not the ORD-###### pattern: an unknown or malformed id is
  // reported per-item in `failed` instead of rejecting the whole request.
  ids: z.array(z.string().check(z.minLength(1))).check(z.minLength(1), z.maxLength(500)),
  status: OrderStatus,
})
export type BulkStatusUpdateInput = z.infer<typeof BulkStatusUpdateInput>

/** Partial success by design: some ids can update while others fail. */
export const BulkStatusUpdateResult = z.object({
  updated: z.array(Order),
  failed: z.array(z.object({ id: z.string(), reason: z.string() })),
})
export type BulkStatusUpdateResult = z.infer<typeof BulkStatusUpdateResult>
