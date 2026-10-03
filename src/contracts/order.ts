import { z } from './zod'

export const ORDER_STATUSES = ['pending', 'paid', 'shipped', 'refunded', 'failed'] as const
export const OrderStatus = z.enum(ORDER_STATUSES)
export type OrderStatus = z.infer<typeof OrderStatus>

export const Channel = z.enum(['web', 'mobile', 'marketplace', 'pos'])
export type Channel = z.infer<typeof Channel>

/** USD with at most 2 decimals. `multipleOf` is float-safe in Zod 4 (19.99 passes, 10.005 fails). */
const usd = (...checks: z.core.$ZodCheck<number>[]) =>
  z.number().check(z.multipleOf(0.01), ...checks)

const orderReference = () =>
  z.string().check(z.regex(/^PO-[A-Z0-9]{5}$/, 'Reference must look like PO-AB12C'))

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

const AMOUNT_RANGE = 'Amount must be between $0.01 and $50,000'
const ITEMS_RANGE = 'Items must be between 1 and 999'

/*
 * The messages here are what users read. The form validates with this schema
 * and the POST /api/orders handler does too, so the server's 422 fieldErrors
 * carry exactly the same messages (docs/forms.md).
 */
export const CreateOrderInput = z.object({
  customer: z.object({
    name: z.string({ error: 'Enter a name' }).check(
      z.trim(),
      z.minLength(2, 'Name must be at least 2 characters'),
      z.maxLength(80, 'Name must be at most 80 characters'),
    ),
    email: z.email({ error: 'Enter a valid email' }),
  }),
  channel: z.enum(Channel.options, { error: 'Choose a channel' }),
  amount: z
    .number({ error: 'Enter an amount' })
    .check(
      z.multipleOf(0.01, 'Use at most 2 decimals'),
      z.gte(0.01, AMOUNT_RANGE),
      z.lte(50_000, AMOUNT_RANGE),
    ),
  itemCount: z
    .number({ error: 'Enter the number of items' })
    .check(z.int(ITEMS_RANGE), z.gte(1, ITEMS_RANGE), z.lte(999, ITEMS_RANGE)),
  reference: z
    .string({ error: 'Enter a reference' })
    .check(z.regex(/^PO-[A-Z0-9]{5}$/, 'Reference must look like PO-AB12C')),
})
export type CreateOrderInput = z.infer<typeof CreateOrderInput>

/** The most ids one bulk status request accepts. */
export const BULK_STATUS_MAX_IDS = 500

export const BulkStatusUpdateInput = z.object({
  // Plain strings, not the ORD-###### pattern: an unknown or malformed id is
  // reported per-item in `failed` instead of rejecting the whole request.
  ids: z
    .array(z.string().check(z.minLength(1)))
    .check(z.minLength(1), z.maxLength(BULK_STATUS_MAX_IDS)),
  status: OrderStatus,
})
export type BulkStatusUpdateInput = z.infer<typeof BulkStatusUpdateInput>

/** Partial success by design: some ids can update while others fail. */
export const BulkStatusUpdateResult = z.object({
  updated: z.array(Order),
  failed: z.array(z.object({ id: z.string(), reason: z.string() })),
})
export type BulkStatusUpdateResult = z.infer<typeof BulkStatusUpdateResult>
