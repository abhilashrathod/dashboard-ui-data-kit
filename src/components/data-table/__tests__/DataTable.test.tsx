import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Order } from '@/contracts'
import { renderWithProviders } from '@/test/render'
import type * as AnnouncerModule from '../../announcer'
import type { DataTableProps } from '../DataTable'
import type { DataTableModel } from '../useDataTable'
import { readyPage, TableHarness } from './harness'

const announce = vi.hoisted(() => vi.fn())
vi.mock('@/components/announcer', async (importOriginal) => ({
  ...(await importOriginal<typeof AnnouncerModule>()),
  useAnnounce: () => announce,
}))

beforeEach(() => announce.mockClear())

const header = (name: string) => screen.getByRole('columnheader', { name: new RegExp(`^${name}`) })
const searchOf = (search: string) => new URLSearchParams(search)

describe('DataTable root', () => {
  it('takes exactly three props (API rule 1: features are children, not flags)', () => {
    type Equals<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
    const budget: Equals<keyof DataTableProps<Order>, 'table' | 'aria-label' | 'children'> = true
    expect(budget).toBe(true)
  })
})

describe('DataTable.Grid header', () => {
  it('puts aria-sort on the sorted column only', () => {
    renderWithProviders(<TableHarness dataState={readyPage(120)} />, {
      url: '?orders.sort=-amount',
    })

    expect(header('Amount')).toHaveAttribute('aria-sort', 'descending')
    for (const name of ['Order', 'Customer', 'Status', 'Channel', 'Items', 'Created']) {
      expect(header(name)).not.toHaveAttribute('aria-sort')
    }
  })

  it('marks the default sort (newest first) on Created', () => {
    renderWithProviders(<TableHarness dataState={readyPage(120)} />)
    expect(header('Created')).toHaveAttribute('aria-sort', 'descending')
  })

  it('names each sort button after what a click will do', () => {
    renderWithProviders(<TableHarness dataState={readyPage(120)} />, {
      url: '?orders.sort=-amount',
    })

    expect(screen.getByRole('button', { name: 'Amount, sort ascending' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Customer, sort descending' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Created, sort descending' })).toBeInTheDocument()
  })

  it('renders non-sortable headers as plain text', () => {
    renderWithProviders(<TableHarness dataState={readyPage(120)} />)
    expect(within(header('Channel')).queryByRole('button')).toBeNull()
    expect(within(header('Items')).queryByRole('button')).toBeNull()
  })

  it('writes the sort cycle to the URL: desc → asc → default', async () => {
    const user = userEvent.setup()
    const { urlAdapter } = renderWithProviders(<TableHarness dataState={readyPage(120)} />)

    await user.click(screen.getByRole('button', { name: 'Amount, sort descending' }))
    expect(searchOf(urlAdapter.getSearch()).get('orders.sort')).toBe('-amount')
    expect(header('Amount')).toHaveAttribute('aria-sort', 'descending')

    await user.click(screen.getByRole('button', { name: 'Amount, sort ascending' }))
    expect(searchOf(urlAdapter.getSearch()).get('orders.sort')).toBe('amount')

    await user.click(screen.getByRole('button', { name: 'Amount, clear sort' }))
    expect(searchOf(urlAdapter.getSearch()).has('orders.sort')).toBe(false)
    expect(header('Created')).toHaveAttribute('aria-sort', 'descending')
    expect(urlAdapter.entries).toHaveLength(4) // each click is a push
  })

  it('follows the URL on Back, with no table-local sort state', async () => {
    const user = userEvent.setup()
    const { urlAdapter } = renderWithProviders(<TableHarness dataState={readyPage(120)} />)
    await user.click(screen.getByRole('button', { name: 'Amount, sort descending' }))

    act(() => urlAdapter.back())

    expect(header('Amount')).not.toHaveAttribute('aria-sort')
    expect(header('Created')).toHaveAttribute('aria-sort', 'descending')
  })
})

describe('announcements', () => {
  it('says nothing for the initial load', () => {
    renderWithProviders(<TableHarness dataState={readyPage(120)} />)
    expect(announce).not.toHaveBeenCalled()
  })

  it('announces a settled sort change', async () => {
    const user = userEvent.setup()
    renderWithProviders(<TableHarness dataState={readyPage(120)} />)
    await user.click(screen.getByRole('button', { name: 'Amount, sort descending' }))
    expect(announce).toHaveBeenLastCalledWith('Sorted by Amount, descending')
  })

  it('waits while the previous rows are a placeholder', async () => {
    const user = userEvent.setup()
    let placeholder = false
    const { rerender } = renderWithProviders(
      <TableHarness
        dataState={() => ({ ...readyPage(120), isPlaceholder: placeholder }) as never}
      />,
    )
    placeholder = true
    await user.click(screen.getByRole('button', { name: 'Amount, sort descending' }))
    expect(announce).not.toHaveBeenCalled()

    placeholder = false
    rerender(<TableHarness dataState={() => readyPage(120)} />)
    expect(announce).toHaveBeenLastCalledWith('Sorted by Amount, descending')
  })

  it('announces the new range after paging', async () => {
    const user = userEvent.setup()
    renderWithProviders(<TableHarness dataState={(params) => readyPage(4213, 50, params.page)} />)
    await user.click(screen.getByRole('button', { name: 'Next page' }))
    expect(announce).toHaveBeenLastCalledWith('Showing 51–100 of 4,213')
  })
})

describe('DataTable.Pagination', () => {
  it('shows the range, the page count and disables Previous on page 1', () => {
    renderWithProviders(<TableHarness dataState={readyPage(4213)} />)
    expect(screen.getByTestId('data-table-range')).toHaveTextContent('Showing 1–50 of 4,213')
    expect(screen.getByText(/^Page/)).toHaveTextContent('Page 1 of 85')
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled()
  })

  it('disables Next on the last page', () => {
    renderWithProviders(<TableHarness dataState={readyPage(4213, 50, 85)} />, {
      url: '?orders.page=85',
    })
    expect(screen.getByTestId('data-table-range')).toHaveTextContent('Showing 4,201–4,213 of 4,213')
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
  })

  it('is hidden when there is nothing to page through', () => {
    renderWithProviders(<TableHarness dataState={{ status: 'empty' }} />)
    expect(screen.queryByTestId('data-table-range')).toBeNull()
  })
})

describe('escape hatch: table.instance', () => {
  it("routes TanStack's own setters through the URL", () => {
    let table: DataTableModel<Order> | undefined
    const { urlAdapter } = renderWithProviders(
      <TableHarness dataState={readyPage(4213)} onTable={(next) => (table = next)} />,
    )

    act(() => table!.instance.setPageIndex(2))
    expect(searchOf(urlAdapter.getSearch()).get('orders.page')).toBe('3')

    act(() => table!.instance.setPageSize(100))
    expect(searchOf(urlAdapter.getSearch()).get('orders.size')).toBe('100')
    expect(searchOf(urlAdapter.getSearch()).has('orders.page')).toBe(false)

    act(() => table!.instance.getColumn('status')!.toggleSorting())
    expect(searchOf(urlAdapter.getSearch()).get('orders.sort')).toBe('-status')
  })

  it('exposes rows, total and pageCount from the data', () => {
    let table: DataTableModel<Order> | undefined
    renderWithProviders(
      <TableHarness dataState={readyPage(4213)} onTable={(next) => (table = next)} />,
    )
    expect(table!.rows).toHaveLength(50)
    expect(table!.total).toBe(4213)
    expect(table!.pageCount).toBe(85)
  })

  it('keeps the last known total while a new key loads', () => {
    let table: DataTableModel<Order> | undefined
    const { rerender } = renderWithProviders(
      <TableHarness dataState={readyPage(4213)} onTable={(next) => (table = next)} />,
    )
    rerender(<TableHarness dataState={{ status: 'loading' }} onTable={(next) => (table = next)} />)
    expect(table!.rows).toEqual([])
    expect(table!.total).toBe(4213)
    expect(table!.pageCount).toBe(85)
  })
})
