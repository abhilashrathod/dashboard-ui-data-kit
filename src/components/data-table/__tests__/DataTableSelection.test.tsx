import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Order } from '@/contracts'
import { renderWithProviders } from '@/test/render'
import type * as AnnouncerModule from '../../announcer'
import { DataTableBulkBar } from '../DataTableBulkBar'
import type { DataTableModel } from '../useDataTable'
import { readyPage, TableHarness } from './harness'

const announce = vi.hoisted(() => vi.fn())
vi.mock('@/components/announcer', async (importOriginal) => ({
  ...(await importOriginal<typeof AnnouncerModule>()),
  useAnnounce: () => announce,
}))
beforeEach(() => announce.mockClear())

/** Pages of 50 out of 4,213, built for whatever page the URL asks for. */
const byParams = (params: { page: number; pageSize: number }) =>
  readyPage(4213, params.pageSize, params.page)

function setup(url = '') {
  let table: DataTableModel<Order> | undefined
  const utils = renderWithProviders(
    <TableHarness selectable dataState={byParams} onTable={(next) => (table = next)}>
      <DataTableBulkBar>{() => null}</DataTableBulkBar>
    </TableHarness>,
    { url },
  )
  const rowBox = (id: string) => screen.getByRole('checkbox', { name: `Select order ${id}` })
  const pageBox = () => screen.getByRole('checkbox', { name: 'Select all orders on this page' })
  const go = (search: string) => act(() => utils.urlAdapter.navigate(search, 'push'))
  return { ...utils, table: () => table!, rowBox, pageBox, go }
}

describe('selection column', () => {
  it('comes first, with a header checkbox and one per row', () => {
    setup()
    const headers = screen.getAllByRole('columnheader')
    expect(within(headers[0]!).getByRole('checkbox')).toBe(
      screen.getByRole('checkbox', { name: 'Select all orders on this page' }),
    )
    expect(screen.getAllByRole('checkbox', { name: /^Select order ORD-/ })).toHaveLength(50)
  })

  it('header: none → all → some, with the mixed state', async () => {
    const user = userEvent.setup()
    const { pageBox, rowBox, table } = setup()
    expect(pageBox()).not.toBeChecked()

    await user.click(pageBox())
    expect(table().selection.count).toBe(50)
    expect(pageBox()).toBeChecked()

    await user.click(rowBox('ORD-000003'))
    expect(pageBox()).toBePartiallyChecked()
    expect(table().selection.count).toBe(49)

    await user.click(pageBox()) // some → all
    expect(table().selection.count).toBe(50)
    await user.click(pageBox()) // all → none
    expect(table().selection.count).toBe(0)
  })

  it('shift+click selects the range between the last click and this one', async () => {
    const user = userEvent.setup()
    const { rowBox, table } = setup()
    await user.click(rowBox('ORD-000002'))
    await user.keyboard('{Shift>}')
    await user.click(rowBox('ORD-000006'))
    await user.keyboard('{/Shift}')
    expect(table().selection.ids.sort()).toEqual([
      'ORD-000002',
      'ORD-000003',
      'ORD-000004',
      'ORD-000005',
      'ORD-000006',
    ])
  })

  it('marks selected rows with data-selected', async () => {
    const user = userEvent.setup()
    const { rowBox } = setup()
    await user.click(rowBox('ORD-000001'))
    expect(rowBox('ORD-000001').closest('tr')).toHaveAttribute('data-selected')
    expect(rowBox('ORD-000002').closest('tr')).not.toHaveAttribute('data-selected')
  })
})

describe('selection scope', () => {
  it('persists across page and page-size changes, keeping snapshots of other pages', async () => {
    const user = userEvent.setup()
    const { rowBox, table, go } = setup()
    await user.click(rowBox('ORD-000001'))

    go('?orders.page=2')
    await user.click(rowBox('ORD-000051'))
    expect(table().selection.count).toBe(2)
    // Page 1's row is off screen, but its snapshot is still there.
    expect(table().selection.rows.map((order) => order.id)).toEqual(['ORD-000001', 'ORD-000051'])

    go('?orders.size=100')
    expect(table().selection.count).toBe(2)
    go('')
    expect(rowBox('ORD-000001')).toBeChecked()
  })

  it.each([
    ['sort', '?orders.sort=-amount'],
    ['search', '?orders.q=acme'],
    ['filter', '?orders.f=status:in:paid'],
  ])('clears when the %s changes (a new result set)', async (_, search) => {
    const user = userEvent.setup()
    const { rowBox, table, go } = setup()
    await user.click(rowBox('ORD-000001'))
    go(search)
    expect(table().selection.count).toBe(0)
  })

  it('clears on Back to a different view too, but not on Back to another page', async () => {
    const user = userEvent.setup()
    const { rowBox, table, go, urlAdapter } = setup()
    go('?orders.page=2')
    await user.click(rowBox('ORD-000051'))
    act(() => urlAdapter.back()) // page 1, same view
    expect(table().selection.count).toBe(1)

    go('?orders.sort=amount')
    await user.click(rowBox('ORD-000001'))
    act(() => urlAdapter.back()) // the default sort: another view
    expect(table().selection.count).toBe(0)
  })

  it('survives a refetch (new data, same view)', async () => {
    const user = userEvent.setup()
    let table: DataTableModel<Order> | undefined
    const onTable = (next: DataTableModel<Order>) => (table = next)
    const { rerender } = renderWithProviders(
      <TableHarness selectable dataState={readyPage(120)} onTable={onTable} />,
    )
    await user.click(screen.getByRole('checkbox', { name: 'Select order ORD-000001' }))
    rerender(<TableHarness selectable dataState={readyPage(120)} onTable={onTable} />)
    expect(table!.selection.ids).toEqual(['ORD-000001'])
  })

  it("doesn't let placeholder rows (the previous key's) be selected", () => {
    renderWithProviders(
      <TableHarness selectable dataState={{ ...readyPage(120), isPlaceholder: true } as never} />,
    )
    expect(screen.getByRole('checkbox', { name: 'Select order ORD-000001' })).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: 'Select all orders on this page' })).toBeDisabled()
  })
})

describe('bulk bar', () => {
  it('appears with a selection, without taking focus, and Escape inside it clears', async () => {
    const user = userEvent.setup()
    const { rowBox, table } = setup()
    expect(screen.queryByRole('region', { name: 'Orders selection' })).toBeNull()

    await user.click(rowBox('ORD-000001'))
    const bar = screen.getByRole('region', { name: 'Orders selection' })
    expect(bar).toHaveTextContent('1 selected')
    expect(rowBox('ORD-000001')).toHaveFocus()

    await user.click(within(bar).getByRole('button', { name: 'Clear' }))
    expect(table().selection.count).toBe(0)
    expect(screen.getByRole('region', { name: 'Orders' })).toHaveFocus()

    await user.click(rowBox('ORD-000002'))
    fireEvent.keyDown(screen.getByRole('button', { name: 'Clear' }), { key: 'Escape' })
    expect(table().selection.count).toBe(0)
  })

  it('leaves room under the last row while it is visible', async () => {
    const user = userEvent.setup()
    const { rowBox, container } = setup()
    const scroller = () => container.querySelector('[data-slot="data-table-scroll"]')!
    expect(scroller()).not.toHaveClass('pb-20')
    await user.click(rowBox('ORD-000001'))
    expect(scroller()).toHaveClass('pb-20')
  })
})

describe('selection announcements', () => {
  it('announces the count once the clicking stops', async () => {
    const user = userEvent.setup()
    const { rowBox } = setup()
    await user.click(rowBox('ORD-000001'))
    await user.click(rowBox('ORD-000002'))
    await waitFor(() => expect(announce).toHaveBeenCalledWith('2 selected'))
    expect(announce).not.toHaveBeenCalledWith('1 selected') // debounced away
  })

  it('folds "Selection cleared" into the sort announcement on a view change', async () => {
    const user = userEvent.setup()
    const { rowBox } = setup()
    await user.click(rowBox('ORD-000001'))
    await waitFor(() => expect(announce).toHaveBeenCalledWith('1 selected'))

    await user.click(screen.getByRole('button', { name: 'Amount, sort descending' }))
    await waitFor(() =>
      expect(announce).toHaveBeenLastCalledWith('Sorted by Amount, descending. Selection cleared'),
    )
  })
})

describe('column visibility', () => {
  it('drops hidden columns from the header, the rows and the grid tracks', async () => {
    const user = userEvent.setup()
    const { container } = setup()
    const tracks = () =>
      (container.querySelector('table') as HTMLElement).style
        .getPropertyValue('--dt-columns')
        .split(' minmax').length

    expect(screen.getByRole('columnheader', { name: 'Channel' })).toBeInTheDocument()
    const before = tracks()
    await user.click(screen.getByRole('button', { name: 'Columns' }))
    await user.click(await screen.findByRole('menuitemcheckbox', { name: 'Channel' }))
    // The menu stays open for the next toggle.
    expect(screen.getByRole('menuitemcheckbox', { name: 'Items' })).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Channel' })).toBeNull()
    expect(tracks()).toBe(before - 1)
    expect(announce).toHaveBeenCalledWith('Channel column hidden')
  })
})
