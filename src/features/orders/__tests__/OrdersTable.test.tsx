import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/test/render'
import { OrdersTable } from '../OrdersTable'

const AMOUNT = 6

async function setup() {
  const user = userEvent.setup()
  renderWithProviders(<OrdersTable />)
  const grid = await screen.findByRole('grid', { name: 'Orders' }, { timeout: 4000 })
  await waitFor(() => expect(within(grid).getAllByRole('row')).toHaveLength(51))
  // Tab in from the filter row's last control, then across to `col` on row `row`.
  const goTo = async (row: number, col: number) => {
    within(screen.getByRole('group', { name: 'Filters' })).getAllByRole('button').at(-1)!.focus()
    await user.tab()
    for (let i = 0; i < col; i++) await user.keyboard('{ArrowRight}')
    for (let i = 0; i < row; i++) await user.keyboard('{ArrowDown}')
  }
  const focusedCell = () => {
    const cell = document.activeElement?.closest('[data-grid-row]')
    return {
      row: cell?.closest('[role="row"]')?.getAttribute('aria-rowindex'),
      col: cell?.getAttribute('aria-colindex'),
    }
  }
  return { user, grid, goTo, focusedCell }
}

describe('OrdersTable: the details drawer', () => {
  it('Enter on a text cell opens it; closing returns focus to that cell', async () => {
    const { user, grid, goTo, focusedCell } = await setup()
    await goTo(2, AMOUNT)
    const before = focusedCell()
    const id = within(grid)
      .getAllByRole('row')[3]!
      .querySelector('[aria-colindex="2"]')!.textContent

    await user.keyboard('{Enter}')
    const drawer = await screen.findByRole('dialog', { name: id })
    expect(within(drawer).getByText('Reference')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(focusedCell()).toEqual(before))
    expect(before).toEqual({ row: '4', col: String(AMOUNT + 1) })
  })

  it('"Mark as…" in the drawer: confirm, back to its button, then back to the grid row', async () => {
    const { user, goTo, focusedCell } = await setup()
    await goTo(0, AMOUNT)
    await user.keyboard('{Enter}')
    const drawer = await screen.findByRole('dialog')
    const markAs = within(drawer).getByRole('button', { name: 'Mark as…' })

    await user.click(markAs)
    const item = (await screen.findAllByRole('menuitem'))[0]!
    const status = item.textContent.toLowerCase()
    await user.click(item)
    const confirm = await screen.findByRole('alertdialog', { name: /^Mark order ORD-\d+ as / })
    await user.click(within(confirm).getByRole('button', { name: `Mark as ${status}` }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    expect(
      await screen.findByText(/^Order ORD-\d+ (marked as|couldn't be changed)/),
    ).toBeInTheDocument()
    await waitFor(() => expect(markAs).toHaveFocus())

    // The footer's Close. (Escape here would first dismiss the result toast:
    // Radix toasts are dismissable layers above the drawer.)
    await user.click(within(drawer).getAllByRole('button', { name: 'Close' }).at(-1)!)
    await waitFor(() => expect(focusedCell()).toEqual({ row: '2', col: String(AMOUNT + 1) }))
  })
})
