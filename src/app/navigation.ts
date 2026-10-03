import { useCallback } from 'react'
import { MetricsRange, type OrderStatus } from '@/contracts'
import {
  enumParam,
  readNamespace,
  useUrlAdapter,
  useUrlParam,
  writeNamespace,
  writeParam,
} from '@/lib/url-state'

/*
 * The app's two views live in the URL (?view=orders), so Back/Forward and
 * shared links work without a router library. Overview is the default and
 * never written.
 */

export const VIEWS = ['overview', 'orders'] as const
export type View = (typeof VIEWS)[number]

export const VIEW_TITLE: Record<View, string> = { overview: 'Overview', orders: 'Orders' }

const viewParam = enumParam(VIEWS, 'overview')
const rangeParam = enumParam(MetricsRange.options, '30d')

export function useView() {
  return useUrlParam('view', viewParam)
}

/** The Overview's period: `?dash.range=7d`. Default 30d. */
export function useDashRange() {
  return useUrlParam('dash.range', rangeParam)
}

/** The namespace the Orders view's table reads. */
export const ORDERS_NAMESPACE = 'orders'

/**
 * Go to the Orders view in ONE push navigation (one Back step).
 * - `{ status }`: show only that status (a fresh filter; page, search and other filters cleared).
 * - `{ q }`: search for `q` (e.g. a new order's id), with no filters.
 * - no argument: no filters and no search, but the user's sort and page size are kept.
 */
export function useGoToOrders() {
  const adapter = useUrlAdapter()
  return useCallback(
    (opts: { status?: OrderStatus; q?: string } = {}) => {
      const current = adapter.getSearch()
      const slice = readNamespace(current, ORDERS_NAMESPACE)
      for (const key of ['page', 'q', 'f']) slice.delete(key)
      if (opts.status) slice.append('f', `status:in:${opts.status}`)
      if (opts.q) slice.set('q', opts.q)
      const withOrders = writeNamespace(current, ORDERS_NAMESPACE, slice)
      adapter.navigate(writeParam(withOrders, 'view', 'orders'), 'push')
    },
    [adapter],
  )
}
