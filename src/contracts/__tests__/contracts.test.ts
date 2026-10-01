import { describe, expect, expectTypeOf, it } from 'vitest'
import type { z } from 'zod'
import {
  ApiErrorBody,
  BulkStatusUpdateInput,
  BulkStatusUpdateResult,
  Channel,
  CreateOrderInput,
  Kpi,
  KpiResponse,
  MetricsRange,
  Order,
  ORDER_STATUSES,
  OrderStatus,
  type Page,
  pageSchema,
  RevenuePoint,
  RevenueSeriesResponse,
} from '@/contracts'
import {
  validApiErrorBody,
  validBulkStatusUpdateInput,
  validCreateOrderInput,
  validKpiResponse,
  validOrder,
  validRevenueSeriesResponse,
} from './fixtures'

describe('valid fixtures parse', () => {
  it.each([
    ['OrderStatus', OrderStatus, 'refunded'],
    ['Channel', Channel, 'pos'],
    ['Order', Order, validOrder],
    ['CreateOrderInput', CreateOrderInput, validCreateOrderInput],
    ['BulkStatusUpdateInput', BulkStatusUpdateInput, validBulkStatusUpdateInput],
    [
      'BulkStatusUpdateResult',
      BulkStatusUpdateResult,
      { updated: [validOrder], failed: [{ id: 'ORD-999999', reason: 'Order not found' }] },
    ],
    ['MetricsRange', MetricsRange, '90d'],
    ['Kpi', Kpi, validKpiResponse.kpis[0]],
    ['KpiResponse', KpiResponse, validKpiResponse],
    ['RevenuePoint', RevenuePoint, validRevenueSeriesResponse.points[0]],
    ['RevenueSeriesResponse', RevenueSeriesResponse, validRevenueSeriesResponse],
    [
      'pageSchema(Order)',
      pageSchema(Order),
      { rows: [validOrder], total: 1, page: 1, pageSize: 25 },
    ],
    ['ApiErrorBody', ApiErrorBody, validApiErrorBody],
  ] as const)('%s', (_name, schema, value) => {
    const result = schema.safeParse(value)
    expect(result.error?.issues).toBeUndefined()
    expect(result.success).toBe(true)
  })

  it('ORDER_STATUSES lists every OrderStatus option', () => {
    expect(ORDER_STATUSES).toEqual(OrderStatus.options)
  })

  it('pageSchema infers the same shape as Page<T>', () => {
    type OrderPage = z.infer<ReturnType<typeof pageSchema<typeof Order>>>
    expectTypeOf<OrderPage>().toEqualTypeOf<Page<Order>>()
  })
})

describe('CreateOrderInput', () => {
  it('trims the customer name', () => {
    const parsed = CreateOrderInput.parse({
      ...validCreateOrderInput,
      customer: { ...validCreateOrderInput.customer, name: '  Grace Hopper  ' },
    })
    expect(parsed.customer.name).toBe('Grace Hopper')
  })

  it.each([
    [
      'a short name (1 char after trimming)',
      { customer: { ...validCreateOrderInput.customer, name: '  A  ' } },
      ['customer', 'name'],
    ],
    [
      'a bad email',
      { customer: { ...validCreateOrderInput.customer, email: 'grace-at-example' } },
      ['customer', 'email'],
    ],
    ['amount 0', { amount: 0 }, ['amount']],
    ['an amount with 3 decimals', { amount: 10.005 }, ['amount']],
    ['a bad reference format', { reference: 'PO-abc12' }, ['reference']],
  ] as const)('rejects %s', (_case, override, expectedPath) => {
    const result = CreateOrderInput.safeParse({ ...validCreateOrderInput, ...override })

    expect(result.success).toBe(false)
    // Exactly one issue, at the expected path: the rest of the fixture is valid.
    expect(result.error?.issues.map((issue) => issue.path)).toEqual([expectedPath])
  })
})
