import { act } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Order } from '@/contracts'
import { renderWithProviders } from '@/test/render'
import { toCsv } from '@/lib/csv'
import { makeOrder } from '@/mocks/query/__tests__/makeOrder'
import { buildCsvColumns, selectedRowsForExport } from '../exportColumns'
import type { DataTableModel } from '../useDataTable'
import { readyPage, TableHarness } from './harness'

function setup() {
  let table: DataTableModel<Order> | undefined
  renderWithProviders(
    <TableHarness selectable dataState={readyPage(120)} onTable={(next) => (table = next)} />,
  )
  return () => table!
}

describe('buildCsvColumns', () => {
  it('uses the visible columns in display order, without the selection column', () => {
    const table = setup()
    expect(buildCsvColumns(table().instance).map((column) => column.header)).toEqual([
      'Order',
      'Customer',
      'Status',
      'Channel',
      'Items',
      'Amount',
      'Created',
    ])
  })

  it('follows column visibility', () => {
    const table = setup()
    act(() => table().columnVisibility.setVisible('channel', false))
    expect(buildCsvColumns(table().instance).map((column) => column.header)).not.toContain(
      'Channel',
    )
  })

  it('uses meta.csv over the accessor, and the raw accessor value otherwise', () => {
    const table = setup()
    const order = makeOrder({
      id: 'ORD-000042',
      amount: 1234.5,
      status: 'shipped',
      channel: 'pos',
      itemCount: 3,
      createdAt: '2026-09-15T12:00:00.000Z',
      customer: { name: 'José Núñez', email: 'jose@example.com' },
    })
    expect(toCsv([order], buildCsvColumns(table().instance))).toBe(
      'Order,Customer,Status,Channel,Items,Amount,Created\r\n' +
        'ORD-000042,José Núñez <jose@example.com>,shipped,pos,3,1234.50,2026-09-15T12:00:00.000Z\r\n',
    )
  })
})

describe('selectedRowsForExport', () => {
  const row = (id: string) => ({ id })
  it('puts the current page first in its order, then other pages in selection order', () => {
    const page = ['a', 'b', 'c', 'd'].map((id) => ({ id, original: row(id) }))
    const selection = { ids: ['x', 'c', 'y', 'a'], rows: ['x', 'c', 'y', 'a'].map(row) }
    expect(selectedRowsForExport(page, selection).map((r) => r.id)).toEqual(['a', 'c', 'x', 'y'])
  })
})
