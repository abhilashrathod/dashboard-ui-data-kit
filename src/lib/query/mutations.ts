import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import type {
  BulkStatusUpdateInput,
  BulkStatusUpdateResult,
  CreateOrderInput,
  Order,
} from '@/contracts'
import { bulkUpdateStatus, createOrder, type ApiError } from '@/lib/api'
import { queryKeys } from './keys'

/*
 * No optimistic updates, deliberately. A bulk status change can partly fail
 * (some orders can't make that transition), so an optimistic version would
 * need a per-row rollback that matches the server's `failed` list, across
 * every cached page and filter it touched. That's a lot of code for a ~300ms
 * win. Instead: wait for the server, then invalidate, and the lists and
 * metrics refetch with the truth.
 */

/** Every order list (all pages, all filters) and every metric. Only active queries refetch now; the rest on next use. */
function invalidateOrdersAndMetrics(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.metrics.all }),
  ])
}

export function useCreateOrder() {
  const queryClient = useQueryClient()
  return useMutation<Order, ApiError, CreateOrderInput>({
    mutationFn: (input) => createOrder(input),
    // Returning the promise keeps the mutation pending until the refetch is done.
    onSuccess: () => invalidateOrdersAndMetrics(queryClient),
  })
}

/**
 * Resolves with `{ updated, failed }` even on partial failure, so the UI can
 * say "10 updated, 2 failed". Invalidates on settle: after a partial success
 * (or an error after the server applied some changes) the cache is stale either way.
 */
export function useBulkUpdateStatus() {
  const queryClient = useQueryClient()
  return useMutation<BulkStatusUpdateResult, ApiError, BulkStatusUpdateInput>({
    mutationFn: (input) => bulkUpdateStatus(input),
    onSettled: () => invalidateOrdersAndMetrics(queryClient),
  })
}
