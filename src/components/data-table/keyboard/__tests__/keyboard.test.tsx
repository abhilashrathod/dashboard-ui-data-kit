import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Order } from '@/contracts'
import { renderWithProviders } from '@/test/render'
import { DataTableBulkBar } from '../../DataTableBulkBar'
import type { DataTableModel } from '../../useDataTable'
import { readyPage, TableHarness } from '../../__tests__/harness'
import { HEADER_ROW } from '../gridNav'
import { RenderCounterContext } from '../renderCounter'

/**
 * Pages out of 4,213, for whatever page the URL asks for. Cached per page, as
 * the query layer's data is: a new rows array on every render would make
 * every row "new" and defeat the rows' memo (the render-count test).
 */
const pages = new Map<string, ReturnType<typeof readyPage>>()
const byParams = ({ page, pageSize }: { page: number; pageSize: number }) => {
  const key = `${page}:${pageSize}`
  if (!pages.has(key)) pages.set(key, readyPage(4213, pageSize, page))
  return pages.get(key)!
}

function setup({
  url = '',
  selectable = true,
  dataState = byParams,
  onOpenRow,
}: {
  url?: string
  selectable?: boolean
  dataState?: Parameters<typeof TableHarness>[0]['dataState']
  onOpenRow?: (order: Order) => void
} = {}) {
  let table: DataTableModel<Order> | undefined
  const renders: string[] = []
  const ui = (state: typeof dataState) => (
    <RenderCounterContext value={(id) => renders.push(id)}>
      <TableHarness
        selectable={selectable}
        dataState={state}
        onOpenRow={onOpenRow}
        onTable={(next) => (table = next)}
      >
        <DataTableBulkBar>{() => null}</DataTableBulkBar>
      </TableHarness>
    </RenderCounterContext>
  )
  const utils = renderWithProviders(ui(dataState), { url })
  const grid = () => screen.getByRole('grid', { name: 'Orders' })
  return {
    ...utils,
    user: userEvent.setup(),
    table: () => table!,
    grid,
    renders,
    rerenderWith: (state: typeof dataState) => utils.rerender(ui(state)),
    go: (search: string) => act(() => utils.urlAdapter.navigate(search, 'push')),
    /** Every element inside the grid with tabIndex 0. */
    tabStops: () => [...grid().querySelectorAll('[tabindex="0"]')],
    /** The grid row (aria-rowindex) and cell coordinates of the focused element. */
    focused: () => {
      const active = document.activeElement!
      const cell = active.closest<HTMLElement>('[data-grid-row]')
      return {
        row: Number(cell?.dataset.gridRow),
        col: Number(cell?.dataset.gridCol),
        ariaRowIndex: active.closest('[role="row"]')?.getAttribute('aria-rowindex'),
      }
    },
  }
}

/** Focus the grid the way a keyboard user would: Tab from the last toolbar control (keyboard help). */
async function tabIntoGrid(user: ReturnType<typeof userEvent.setup>) {
  screen.getByRole('button', { name: 'Keyboard shortcuts' }).focus()
  await user.tab()
}

describe('grid semantics', () => {
  it('is a grid with row/column counts, page-global row indices and column indices', () => {
    const { grid } = setup({ url: '?orders.page=2' })
    expect(grid()).toHaveAttribute('aria-rowcount', String(4213 + 1))
    expect(grid()).toHaveAttribute('aria-colcount', '9')
    expect(grid()).toHaveAttribute('aria-multiselectable', 'true')

    const rows = within(grid()).getAllByRole('row')
    expect(rows[0]).toHaveAttribute('aria-rowindex', '1')
    // Page 2, size 50: the first data row is result row 51, grid row 52.
    expect(rows[1]).toHaveAttribute('aria-rowindex', '52')
    expect(rows[2]).toHaveAttribute('aria-rowindex', '53')
    expect(rows[1]).toHaveAttribute('aria-selected', 'false')

    const headers = within(rows[0]!).getAllByRole('columnheader')
    expect(headers.map((th) => th.getAttribute('aria-colindex'))).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
    ])
    const cells = within(rows[1]!).getAllByRole('gridcell')
    expect(cells.map((td) => td.getAttribute('aria-colindex'))).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
    ])
  })

  it('has no aria-selected or aria-multiselectable when not selectable', () => {
    const { grid } = setup({ selectable: false })
    expect(grid()).not.toHaveAttribute('aria-multiselectable')
    expect(within(grid()).getAllByRole('row')[1]).not.toHaveAttribute('aria-selected')
  })

  it('renders no grid while loading; the skeleton is hidden from assistive tech', () => {
    const { container } = setup({ dataState: { status: 'loading' } as never })
    expect(screen.queryByRole('grid')).toBeNull()
    expect(container.querySelector('table')).toHaveAttribute('aria-hidden', 'true')
  })
})

describe('roving tabindex', () => {
  it('has exactly one Tab stop in the grid, before and after navigating', async () => {
    const { user, tabStops } = setup()
    expect(tabStops()).toHaveLength(1)
    // The first data cell: the selection checkbox (a widget cell's control, not the <td>).
    expect(tabStops()[0]).toBe(screen.getByRole('checkbox', { name: 'Select order ORD-000001' }))

    await tabIntoGrid(user)
    for (const key of ['{ArrowRight}', '{ArrowDown}', '{ArrowDown}', '{End}', '{ArrowUp}']) {
      await user.keyboard(key)
      expect(tabStops()).toHaveLength(1)
      expect(tabStops()[0]).toBe(document.activeElement)
    }
  })

  it('every checkbox and sort button that is not the target has tabIndex -1', () => {
    const { grid } = setup()
    const controls = [...grid().querySelectorAll<HTMLElement>('input, button')]
    expect(controls.length).toBeGreaterThan(50)
    expect(controls.filter((control) => control.tabIndex !== -1)).toHaveLength(1)
  })

  it('Tab enters on the active cell and the next Tab leaves the grid', async () => {
    const { user, grid } = setup()
    await tabIntoGrid(user)
    expect(document.activeElement).toBe(
      screen.getByRole('checkbox', { name: 'Select order ORD-000001' }),
    )
    await user.tab()
    expect(grid().contains(document.activeElement)).toBe(false)
    await user.tab({ shift: true })
    expect(document.activeElement).toBe(
      screen.getByRole('checkbox', { name: 'Select order ORD-000001' }),
    )
  })

  it('arrows, Home/End, Ctrl+End, PageDown; Up from row 0 is the sort button', async () => {
    const { user, focused } = setup()
    await tabIntoGrid(user)
    await user.keyboard('{ArrowRight}')
    expect(focused()).toMatchObject({ row: 0, col: 1 })
    expect(document.activeElement?.tagName).toBe('TD') // a text cell focuses itself
    await user.keyboard('{End}{ArrowLeft}{ArrowLeft}') // Amount
    expect(focused()).toMatchObject({ row: 0, col: 6 })
    await user.keyboard('{ArrowUp}')
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Amount, sort descending' }),
    )
    await user.keyboard('{ArrowDown}{PageDown}')
    expect(focused()).toMatchObject({ row: 10, col: 6, ariaRowIndex: '12' })
    await user.keyboard('{Control>}{End}{/Control}')
    expect(focused()).toMatchObject({ row: 49, col: 8, ariaRowIndex: '51' })
    await user.keyboard('{Meta>}{ArrowUp}{/Meta}')
    expect(focused()).toMatchObject({ row: 0, col: 0 })
    await user.keyboard('{Home}')
    expect(focused()).toMatchObject({ row: 0, col: 0 })
  })

  it('a click makes the cell active, so the keyboard continues from there', async () => {
    const { user, focused, table } = setup()
    await user.click(screen.getByText('ORD-000004'))
    expect(table().activeCell).toEqual({ row: 3, col: 1 })
    await user.keyboard('{ArrowDown}')
    expect(focused()).toMatchObject({ row: 4, col: 1 })
  })
})

describe('active cell persistence', () => {
  it('a page change: row 0, column kept, focus not moved', async () => {
    const { user, table, go } = setup()
    await tabIntoGrid(user)
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowRight}{ArrowRight}{ArrowRight}')
    expect(table().activeCell).toEqual({ row: 2, col: 3 })
    const search = screen.getByRole('searchbox', { name: 'Search orders' })
    search.focus()

    go('?orders.page=2')
    expect(table().activeCell).toEqual({ row: 0, col: 3 })
    expect(document.activeElement).toBe(search) // never stolen by a data change
  })

  it('a view change (sort): row 0, column kept', async () => {
    const { user, table, go } = setup()
    await tabIntoGrid(user)
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{ArrowRight}')
    go('?orders.sort=amount')
    expect(table().activeCell).toEqual({ row: 0, col: 1 })
  })

  it('a sort from the header keeps the header active and focus on the button', async () => {
    const { user, table, focused } = setup()
    await tabIntoGrid(user)
    await user.keyboard('{End}{ArrowLeft}{ArrowLeft}{ArrowUp}{Enter}')
    expect(table().params.sort).toBe('-amount')
    expect(table().activeCell).toEqual({ row: HEADER_ROW, col: 6 })
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Amount, sort ascending' }),
    )
    await user.keyboard('{ArrowDown}')
    expect(focused()).toMatchObject({ row: 0, col: 6 })
  })

  it('a refetch with the same key keeps the position, clamped to the new row count', async () => {
    const { user, table, rerenderWith } = setup({ dataState: readyPage(40, 50) })
    await tabIntoGrid(user)
    await user.keyboard('{PageDown}{PageDown}{PageDown}{ArrowRight}') // row 30
    expect(table().activeCell).toEqual({ row: 30, col: 1 })

    rerenderWith(readyPage(45, 50)) // more rows: same position
    expect(table().activeCell).toEqual({ row: 30, col: 1 })
    rerenderWith(readyPage(12, 50)) // fewer: clamped
    expect(table().activeCell).toEqual({ row: 11, col: 1 })
  })

  it('a column visibility change clamps the column', async () => {
    const { user, table } = setup()
    await tabIntoGrid(user)
    await user.keyboard('{End}')
    expect(table().activeCell).toEqual({ row: 0, col: 8 })
    act(() => table().columnVisibility.apply({ channel: false, itemCount: false }))
    expect(table().activeCell).toEqual({ row: 0, col: 6 })
    expect(screen.getByRole('grid')).toHaveAttribute('aria-colcount', '7')
  })
})

describe('keyboard selection', () => {
  it('Space toggles the row and Shift+Space selects the range from it', async () => {
    const { user, table, grid } = setup()
    await tabIntoGrid(user)
    await user.keyboard('{ArrowRight}{ArrowDown}') // Order column, row 1
    await user.keyboard(' ')
    expect(table().selection.ids).toEqual(['ORD-000002'])
    const row = (index: number) => within(grid()).getAllByRole('row')[index + 1]!
    expect(row(1)).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('region', { name: 'Orders selection' })).toBeInTheDocument()

    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{Shift>} {/Shift}')
    expect(table().selection.ids.sort()).toEqual([
      'ORD-000002',
      'ORD-000003',
      'ORD-000004',
      'ORD-000005',
    ])
    await user.keyboard(' ')
    expect(table().selection.ids).not.toContain('ORD-000005')
  })

  it('Space on the header row does nothing to the selection', async () => {
    const { user, table } = setup()
    await tabIntoGrid(user)
    await user.keyboard('{ArrowRight}{ArrowUp} ') // the "Order" header: a text cell
    expect(table().selection.count).toBe(0)
  })

  it('Ctrl+A selects the page; again clears it. Cmd+A too.', async () => {
    const { user, table } = setup()
    await tabIntoGrid(user)
    await user.keyboard('{Control>}a{/Control}')
    expect(table().selection.count).toBe(50)
    await user.keyboard('{Control>}a{/Control}')
    expect(table().selection.count).toBe(0)
    await user.keyboard('{Meta>}a{/Meta}')
    expect(table().selection.count).toBe(50)
  })

  it("doesn't bind Ctrl+A or Space when the table isn't selectable", async () => {
    const { user, table } = setup({ selectable: false })
    screen.getByRole('button', { name: 'Keyboard shortcuts' }).focus()
    await user.tab()
    await user.keyboard('{Control>}a{/Control} ')
    expect(table().selection.count).toBe(0)
  })
})

describe('render performance', () => {
  it('moving the active cell re-renders at most the two rows involved', async () => {
    const { user, renders } = setup()
    await tabIntoGrid(user)
    await user.keyboard('{ArrowRight}')

    for (let move = 0; move < 5; move++) {
      renders.length = 0
      await user.keyboard('{ArrowDown}')
      expect(renders.length).toBeLessThanOrEqual(2)
      expect(new Set(renders)).toEqual(new Set([order(move + 1), order(move + 2)]))
    }

    // Within a row: just that row.
    renders.length = 0
    await user.keyboard('{ArrowRight}')
    expect(renders).toEqual([order(6)])
  })
})

const order = (n: number) => `ORD-${String(n).padStart(6, '0')}`

// ── 5b: composite cells, Enter to open, keyboard help ──────────────────────

const CUSTOMER = 2
const AMOUNT = 6
const ACTIONS = 8

/** From the first data cell (the checkbox), to `col` in row 0. */
async function goToColumn(user: ReturnType<typeof userEvent.setup>, col: number) {
  await tabIntoGrid(user)
  for (let i = 0; i < col; i++) await user.keyboard('{ArrowRight}')
}

describe('interaction mode (composite cells)', () => {
  it('Enter enters; Tab cycles inside the cell, wrapping; Escape returns to the cell', async () => {
    const { user, table, grid } = setup()
    await goToColumn(user, CUSTOMER)
    const cell = document.activeElement as HTMLElement
    expect(cell).toHaveAttribute('data-cell-kind', 'composite')
    const name = screen.getByRole('button', { name: 'Filter by Customer 1' })
    const copy = screen.getByRole('button', { name: 'Copy email for Customer 1' })
    expect([name.tabIndex, copy.tabIndex]).toEqual([-1, -1])

    await user.keyboard('{Enter}')
    expect(name).toHaveFocus()
    expect(table().interacting).toBe(true)
    expect([name.tabIndex, copy.tabIndex]).toEqual([0, 0])
    expect(cell).toHaveAttribute('data-interacting')

    await user.tab()
    expect(copy).toHaveFocus()
    await user.tab()
    expect(name).toHaveFocus() // wrapped
    await user.tab({ shift: true })
    expect(copy).toHaveFocus() // wrapped backwards
    expect(grid().contains(document.activeElement)).toBe(true)

    await user.keyboard('{Escape}')
    expect(cell).toHaveFocus()
    expect(table().interacting).toBe(false)
    expect([name.tabIndex, copy.tabIndex]).toEqual([-1, -1])
    await user.keyboard('{ArrowDown}') // arrows move cells again
    expect(table().activeCell).toEqual({ row: 1, col: CUSTOMER })
  })

  it('F2 enters and F2 leaves', async () => {
    const { user, table } = setup()
    await goToColumn(user, CUSTOMER)
    await user.keyboard('{F2}')
    expect(screen.getByRole('button', { name: 'Filter by Customer 1' })).toHaveFocus()
    await user.keyboard('{F2}')
    expect(table().interacting).toBe(false)
    expect(document.activeElement).toHaveAttribute('data-grid-col', String(CUSTOMER))
  })

  it('ignores navigation keys while interacting', async () => {
    const { user, table } = setup()
    await goToColumn(user, CUSTOMER)
    await user.keyboard('{Enter}{ArrowDown}{ArrowRight}{End}{PageDown}{Control>}{End}{/Control}')
    expect(table().activeCell).toEqual({ row: 0, col: CUSTOMER })
    expect(screen.getByRole('button', { name: 'Filter by Customer 1' })).toHaveFocus()
  })

  it('Space: selects the row on the cell, belongs to the control while interacting', async () => {
    const { user, table } = setup()
    await goToColumn(user, CUSTOMER)
    await user.keyboard(' ')
    expect(table().selection.ids).toEqual(['ORD-000001'])
    await user.keyboard('{Enter}{Tab} ') // Space on the copy button: copies, no selection change
    expect(table().selection.ids).toEqual(['ORD-000001'])
    expect(await screen.findByText('Email copied')).toBeInTheDocument()
  })

  it('a click elsewhere in the grid exits; a click on a control enters', async () => {
    const { user, table } = setup()
    await user.click(screen.getByRole('button', { name: 'Copy email for Customer 3' }))
    expect(table().activeCell).toEqual({ row: 2, col: CUSTOMER })
    expect(table().interacting).toBe(true)
    await user.click(screen.getByText('ORD-000005'))
    expect(table().activeCell).toEqual({ row: 4, col: 1 })
    expect(table().interacting).toBe(false)
  })

  it('focus leaving the grid ends interaction mode', async () => {
    const { user, table } = setup()
    await goToColumn(user, CUSTOMER)
    await user.keyboard('{Enter}')
    act(() => screen.getByRole('searchbox', { name: 'Search orders' }).focus())
    expect(table().interacting).toBe(false)
  })

  it('composite cells, and only they, point at the one interaction hint', () => {
    const { grid } = setup()
    const described = grid().querySelectorAll('[aria-describedby]')
    expect(described).toHaveLength(50) // one Customer cell per row
    const ids = new Set([...described].map((cell) => cell.getAttribute('aria-describedby')))
    expect(ids.size).toBe(1)
    expect(document.getElementById([...ids][0]!)).toHaveTextContent(
      'Press Enter to interact with the cell, Escape to exit',
    )
  })

  it('the name filters the table to that customer, with history push', async () => {
    const { user, urlAdapter, table } = setup()
    await goToColumn(user, CUSTOMER)
    await user.keyboard('{Enter}{Enter}')
    expect(new URLSearchParams(urlAdapter.getSearch()).get('orders.q')).toBe('Customer 1')
    expect(urlAdapter.entries).toHaveLength(2)
    expect(table().activeCell).toEqual({ row: 0, col: CUSTOMER }) // a view change: row 0
    // The view change ended interaction mode. The row stayed (this harness
    // ignores q), so focus is moved off its name button back onto the cell.
    expect(table().interacting).toBe(false)
    expect(document.activeElement?.tagName).toBe('TD')
    expect(document.activeElement).toHaveAttribute('data-grid-col', String(CUSTOMER))
    await waitFor(() =>
      expect(screen.getByTestId('announcer-polite')).toHaveTextContent('Filtered by Customer 1'),
    )
  })

  it("rescues focus when the focused control's row unmounts", async () => {
    const { user, rerenderWith } = setup({ dataState: readyPage(10) })
    await goToColumn(user, CUSTOMER)
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{Enter}')
    expect(screen.getByRole('button', { name: 'Filter by Customer 4' })).toHaveFocus()
    rerenderWith(readyPage(2)) // a refetch: rows 3+ are gone
    // Clamped to the last row, on the cell (interaction mode ended with it).
    expect(document.activeElement).toHaveAttribute('data-grid-row', '1')
    expect(document.activeElement).toHaveAttribute('data-grid-col', String(CUSTOMER))
  })
})

describe('Enter opens the row', () => {
  it('on a text cell: onOpenRow with that row; not on the header or a widget cell', async () => {
    const onOpenRow = vi.fn()
    const { user } = setup({ onOpenRow })
    await goToColumn(user, AMOUNT)
    await user.keyboard('{ArrowDown}{Enter}')
    expect(onOpenRow).toHaveBeenCalledTimes(1)
    expect(onOpenRow.mock.calls[0]![0]).toMatchObject({ id: 'ORD-000002' })

    // The "Order" header (a text cell on the header row): nothing to open.
    await user.keyboard('{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowUp}{ArrowUp}')
    expect(document.activeElement).toHaveAttribute('data-grid-row', '-1')
    await user.keyboard('{Enter}')
    await user.keyboard('{Home}{ArrowDown}{Enter}') // the checkbox: a widget
    expect(onOpenRow).toHaveBeenCalledTimes(1)
  })

  it('a click on a row does not open it', async () => {
    const onOpenRow = vi.fn()
    const { user } = setup({ onOpenRow })
    await user.click(screen.getByText('ORD-000003'))
    await user.dblClick(screen.getByText('ORD-000003'))
    expect(onOpenRow).not.toHaveBeenCalled()
  })

  it('the Actions cell is a widget: its ⋯ button takes focus directly', async () => {
    const { user } = setup()
    await goToColumn(user, ACTIONS)
    expect(screen.getByRole('button', { name: 'Actions for order ORD-000001' })).toHaveFocus()
  })
})

describe('keyboard help', () => {
  it('"?" in the grid opens it; closing returns focus to the active cell', async () => {
    const { user } = setup()
    await goToColumn(user, AMOUNT)
    const cell = document.activeElement
    await user.keyboard('?')
    const dialog = await screen.findByRole('dialog', { name: 'Keyboard shortcuts' })
    expect(within(dialog).getByRole('heading', { name: 'Navigation' })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(cell).toHaveFocus())
  })

  it('"?" while interacting belongs to the control', async () => {
    const { user } = setup()
    await goToColumn(user, CUSTOMER)
    await user.keyboard('{Enter}?')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('opened from its button, focus returns to the button', async () => {
    const { user } = setup()
    const button = screen.getByRole('button', { name: 'Keyboard shortcuts' })
    await user.click(button)
    await screen.findByRole('dialog', { name: 'Keyboard shortcuts' })
    await user.keyboard('{Escape}')
    await waitFor(() => expect(button).toHaveFocus())
  })
})
