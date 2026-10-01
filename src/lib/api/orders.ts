import {
  type BulkStatusUpdateInput,
  BulkStatusUpdateResult,
  type CreateOrderInput,
  type ListParams,
  listParamsKey,
  Order,
  type Page,
  pageSchema,
} from '@/contracts'
import { apiFetch } from './client'

const OrderPage = pageSchema(Order)

/** GET /api/orders. The query string is the canonical encoding, so equal params hit the same URL. */
export function fetchOrders(params: ListParams, signal?: AbortSignal): Promise<Page<Order>> {
  const query = listParamsKey(params)
  return apiFetch(query ? `/api/orders?${query}` : '/api/orders', { schema: OrderPage, signal })
}

export function createOrder(input: CreateOrderInput, signal?: AbortSignal): Promise<Order> {
  return apiFetch('/api/orders', { schema: Order, method: 'POST', body: input, signal })
}

/** Always resolves on partial failure; check `failed` in the result. */
export function bulkUpdateStatus(
  input: BulkStatusUpdateInput,
  signal?: AbortSignal,
): Promise<BulkStatusUpdateResult> {
  return apiFetch('/api/orders/bulk-status', {
    schema: BulkStatusUpdateResult,
    method: 'PATCH',
    body: input,
    signal,
  })
}
