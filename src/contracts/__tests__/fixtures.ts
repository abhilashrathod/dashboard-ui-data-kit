import type {
  ApiErrorBody,
  BulkStatusUpdateInput,
  CreateOrderInput,
  KpiResponse,
  Order,
  RevenueSeriesResponse,
} from '@/contracts'

export const validOrder: Order = {
  id: 'ORD-004213',
  reference: 'PO-8F3K2',
  customer: { name: 'Ada Lovelace', email: 'ada@example.com' },
  status: 'paid',
  channel: 'web',
  amount: 1249.99,
  itemCount: 3,
  createdAt: '2026-09-28T14:03:11.000Z',
  updatedAt: '2026-09-29T08:45:00.000Z',
}

export const validCreateOrderInput: CreateOrderInput = {
  customer: { name: 'Grace Hopper', email: 'grace@example.com' },
  channel: 'marketplace',
  amount: 49.5,
  itemCount: 2,
  reference: 'PO-A1B2C',
}

export const validBulkStatusUpdateInput: BulkStatusUpdateInput = {
  ids: ['ORD-004213', 'ORD-004214'],
  status: 'shipped',
}

export const validKpiResponse: KpiResponse = {
  range: '30d',
  kpis: [
    {
      id: 'revenue',
      label: 'Revenue',
      value: 182340.5,
      previousValue: 165010.25,
      format: 'currency',
    },
    { id: 'orders', label: 'Orders', value: 1204, previousValue: 1130, format: 'number' },
    {
      id: 'aov',
      label: 'Avg. order value',
      value: 151.45,
      previousValue: 146.03,
      format: 'currency',
    },
    {
      id: 'refundRate',
      label: 'Refund rate',
      value: 0.021,
      previousValue: 0.025,
      format: 'percent',
    },
  ],
}

export const validRevenueSeriesResponse: RevenueSeriesResponse = {
  range: '7d',
  points: [
    { date: '2026-09-24', revenue: 6120.4, orders: 41 },
    { date: '2026-09-25', revenue: 5890, orders: 38 },
  ],
}

export const validApiErrorBody: ApiErrorBody = {
  status: 422,
  code: 'VALIDATION',
  message: 'Request body is invalid',
  requestId: 'req_7Hc2kQ',
  issues: ['customer.email: Invalid email address'],
  fieldErrors: { 'customer.email': ['Invalid email address'] },
}
