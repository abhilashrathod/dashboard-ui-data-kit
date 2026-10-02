import { describe, expect, it } from 'vitest'
import type { Order } from '@/contracts'
import { createColumnHelper, dataColumn } from '../columns'

const helper = createColumnHelper<Order>()

describe('dataColumn', () => {
  it('requires meta.label at the type level', () => {
    // Never called: these only need to fail to compile (pnpm typecheck).
    const typeOnly = () => [
      // @ts-expect-error: no meta at all
      dataColumn(helper, 'amount', { cell: () => null }),
      // @ts-expect-error: meta without a label
      dataColumn(helper, 'amount', { meta: { align: 'end' } }),
      // @ts-expect-error: an accessor function needs an id, as with helper.accessor
      dataColumn(helper, (order) => order.customer.name, { meta: { label: 'Customer' } }),
      // @ts-expect-error: 'channel' is not a SortField
      dataColumn(helper, 'channel', { meta: { label: 'Channel', sortField: 'channel' } }),
    ]
    expect(typeOnly).toBeTypeOf('function')

    const amount = dataColumn(helper, 'amount', { meta: { label: 'Amount', sortField: 'amount' } })
    expect(amount.meta?.label).toBe('Amount')
  })

  it('types meta.csv against the row', () => {
    const column = dataColumn(helper, 'amount', {
      meta: { label: 'Amount', csv: (order) => order.amount.toFixed(2) },
    })
    /* eslint-disable @typescript-eslint/no-unsafe-return -- the point is that this doesn't type */
    const typeOnly = () =>
      // @ts-expect-error: the row is an Order, which has no `total`
      dataColumn(helper, 'amount', { meta: { label: 'Amount', csv: (order) => order.total } })
    /* eslint-enable @typescript-eslint/no-unsafe-return */
    expect(typeOnly).toBeTypeOf('function')
    expect(column.meta?.csv).toBeTypeOf('function')
  })

  it('uses the label as the header text', () => {
    const column = dataColumn(helper, 'status', { meta: { label: 'Status' } })
    expect(column.header).toBe('Status')
  })
})
