import { http, HttpResponse, type JsonBodyType } from 'msw'
import {
  BulkStatusUpdateInput,
  BulkStatusUpdateResult,
  CreateOrderInput,
  decodeListParams,
  KpiResponse,
  MetricsRange,
  Order,
  type OrderStatus,
  pageSchema,
  RevenueSeriesResponse,
  StatusBreakdownResponse,
} from '@/contracts'
import { z } from '@/contracts/zod'
import { db } from './data/db'
import { apiError, json, zodToFieldErrors, zodToIssues } from './http'
import { type EndpointKey, withNetwork } from './network'
import { computeKpis, computeRevenueSeries, computeStatusBreakdown } from './query/metrics'
import { queryOrders } from './query/queryOrders'

/** Which status changes the bulk endpoint allows. Anything not listed is rejected per order. */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ['paid', 'failed'],
  paid: ['shipped', 'refunded'],
  shipped: ['refunded'],
  refunded: [],
  failed: [],
}

const OrderPage = pageSchema(Order)

/**
 * Dev-only contract check: validates a success body against its contract
 * schema and logs any mismatch, so drift between handlers and contracts shows
 * up immediately. Logs instead of throwing, so the app keeps working.
 */
export function checkContract(endpoint: EndpointKey, schema: z.core.$ZodType, body: unknown): void {
  if (!import.meta.env.DEV) return
  const result = z.safeParse(schema, body)
  if (!result.success) {
    console.error(`[mocks] ${endpoint} response does not match its contract`, result.error.issues)
  }
}

function ok<T extends JsonBodyType>(
  endpoint: EndpointKey,
  schema: z.core.$ZodType,
  body: T,
  status = 200,
) {
  checkContract(endpoint, schema, body)
  return json(body, status)
}

async function readJson(request: Request): Promise<{ ok: true; body: unknown } | { ok: false }> {
  try {
    return { ok: true, body: await request.json() }
  } catch {
    return { ok: false }
  }
}

function invalidJson() {
  return apiError(400, 'BAD_REQUEST', 'Request body must be valid JSON')
}

function validationError(error: z.core.$ZodError) {
  return apiError(422, 'VALIDATION', 'Request body is invalid', {
    issues: zodToIssues(error),
    fieldErrors: zodToFieldErrors(error),
  })
}

function parseRange(request: Request) {
  const raw = new URL(request.url).searchParams.get('range')
  const range = MetricsRange.safeParse(raw)
  if (range.success) return { ok: true as const, range: range.data }
  const shown = raw === null ? 'range is required' : `range "${raw}"`
  return {
    ok: false as const,
    error: apiError(400, 'BAD_REQUEST', 'Invalid metrics range', {
      issues: [`${shown}: must be one of ${MetricsRange.options.join(', ')}`],
    }),
  }
}

function nextOrderId(orders: readonly Order[]): string {
  const max = orders.reduce((highest, order) => Math.max(highest, Number(order.id.slice(4))), 0)
  return `ORD-${String(max + 1).padStart(6, '0')}`
}

export const handlers = [
  http.get('/api/health', () => HttpResponse.json({ ok: true })),

  http.get(
    '/api/orders',
    withNetwork('orders.list', ({ request }, ctx) => {
      const decoded = decodeListParams(new URL(request.url).searchParams, { mode: 'strict' })
      if (!decoded.ok) {
        return apiError(400, 'BAD_REQUEST', 'Invalid list parameters', { issues: decoded.issues })
      }
      return ok('orders.list', OrderPage, queryOrders(ctx.orders, decoded.params))
    }),
  ),

  http.post(
    '/api/orders',
    withNetwork('orders.create', async ({ request }) => {
      const body = await readJson(request)
      if (!body.ok) return invalidJson()

      const input = CreateOrderInput.safeParse(body.body)
      if (!input.success) return validationError(input.error)

      // Server-only rule: uniqueness depends on data the client can't see, so
      // the client schema can't check it. It still comes back as a field error.
      if (db.orders.some((order) => order.reference === input.data.reference)) {
        return apiError(422, 'VALIDATION', 'Request body is invalid', {
          issues: ['reference: Reference already exists'],
          fieldErrors: { reference: ['Reference already exists'] },
        })
      }

      const now = new Date().toISOString()
      const order: Order = {
        id: nextOrderId(db.orders),
        ...input.data,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      }
      db.orders.push(order)
      return ok('orders.create', Order, order, 201)
    }),
  ),

  http.patch(
    '/api/orders/bulk-status',
    withNetwork('orders.bulkStatus', async ({ request }, ctx) => {
      const body = await readJson(request)
      if (!body.ok) return invalidJson()

      const input = BulkStatusUpdateInput.safeParse(body.body)
      if (!input.success) return validationError(input.error)

      const { status: next } = input.data
      const byId = new Map(ctx.orders.map((order) => [order.id, order]))
      const now = new Date().toISOString()
      const result: BulkStatusUpdateResult = { updated: [], failed: [] }

      for (const id of new Set(input.data.ids)) {
        const order = byId.get(id)
        if (!order) {
          result.failed.push({ id, reason: 'Order not found' })
        } else if (!ALLOWED_TRANSITIONS[order.status].includes(next)) {
          result.failed.push({ id, reason: `Can't move ${order.status} → ${next}` })
        } else {
          order.status = next
          order.updatedAt = now
          result.updated.push(order)
        }
      }

      // Partial success is not an HTTP error: always 200, and the client
      // reads `failed` to report per-order problems.
      return ok('orders.bulkStatus', BulkStatusUpdateResult, result)
    }),
  ),

  http.get(
    '/api/metrics/kpis',
    withNetwork('metrics.kpis', ({ request }, ctx) => {
      const parsed = parseRange(request)
      if (!parsed.ok) return parsed.error
      return ok('metrics.kpis', KpiResponse, computeKpis(ctx.orders, parsed.range, db.anchor))
    }),
  ),

  http.get(
    '/api/metrics/revenue',
    withNetwork('metrics.revenue', ({ request }, ctx) => {
      const parsed = parseRange(request)
      if (!parsed.ok) return parsed.error
      return ok(
        'metrics.revenue',
        RevenueSeriesResponse,
        computeRevenueSeries(ctx.orders, parsed.range, db.anchor, {
          compare: new URL(request.url).searchParams.get('compare') === '1',
        }),
      )
    }),
  ),

  http.get(
    '/api/metrics/status-breakdown',
    withNetwork('metrics.statusBreakdown', ({ request }, ctx) => {
      const parsed = parseRange(request)
      if (!parsed.ok) return parsed.error
      return ok(
        'metrics.statusBreakdown',
        StatusBreakdownResponse,
        computeStatusBreakdown(ctx.orders, parsed.range, db.anchor),
      )
    }),
  ),
]
