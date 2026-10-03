import { expect, waitFor, within } from 'storybook/test'
import preview from '../../../.storybook/preview'
import { DataTableDemo } from '@/dev/data-table-demo/DataTableDemo'
import { columnStorageKey } from './useColumnVisibility'

/*
 * Data/DataTable/Keyboard: the grid's keyboard model (docs/keyboard-grid.md)
 * against the live MSW API, with the focus trace above the table. The play
 * function drives it with the keyboard only: no clicks.
 */

const meta = preview.meta({
  title: 'Data/DataTable/Keyboard',
  component: DataTableDemo,
  tags: ['autodocs'],
  args: { focusTrace: true },
  beforeEach: () => {
    window.localStorage.removeItem(columnStorageKey('orders'))
  },
  parameters: {
    docs: {
      description: {
        component: `The Orders grid by keyboard (docs/keyboard-grid.md). One Tab stop; arrows, Home/End, Ctrl+Home/End (Cmd+Arrow on a Mac) and PageUp/PageDown move the active cell; Space selects the row, Shift+Space a range, Ctrl/Cmd+A the page. The focus trace above the table shows the active cell, its row's aria-rowindex and the last key.

**Do**
- Mark a column \`meta.cellKind: 'widget'\` when its cell holds exactly one control, and spread \`useFocusTargetProps()\` onto that control.

**Don't**
- Don't give anything inside a cell its own \`tabIndex\`: the grid owns focusability (roving tabindex).`,
      },
    },
  },
})

const TIMEOUT = { timeout: 8000 }
const body = () => within(document.body)
const grid = () => body().getByRole('grid', { name: 'Orders' })
const bulkBar = () => body().queryByRole('region', { name: 'Orders selection' })
const settled = () =>
  waitFor(async () => {
    const region = body().getByRole('region', { name: 'Orders' })
    await expect(region).toHaveAttribute('data-state', 'ready')
    await expect(region).toHaveAttribute('aria-busy', 'false')
    await expect(region.querySelector('[data-placeholder]')).toBeNull()
  }, TIMEOUT)

/** Where focus is, in grid terms. */
function focused() {
  const element = document.activeElement as HTMLElement
  const cell = element.closest<HTMLElement>('[data-grid-row]')
  return {
    element,
    inGrid: grid().contains(element),
    row: cell ? Number(cell.dataset.gridRow) : null,
    col: cell ? Number(cell.dataset.gridCol) : null,
    rowEl: element.closest('[role="row"]'),
  }
}
const expectAt = (row: number, col: number) =>
  expect({ row: focused().row, col: focused().col }).toEqual({ row, col })

const AMOUNT = 6
const LAST_COL = 7
const STATUS = 3

/** The grid with only the focus trace: for trying it by hand (and the Loom). */
export const FocusTrace = meta.story({})

/**
 * Keyboard only, end to end: Tab in and out (one Tab stop), every navigation
 * key, sorting from the header, Space / Shift+Space / Ctrl+A selection, and a
 * page change from the pagination bar with the active cell's row reset.
 */
export const KeyboardOnly = meta.story({
  play: async ({ canvas, step, userEvent }) => {
    await settled()
    const firstBox = () => within(grid()).getAllByRole('checkbox', { name: /^Select order/ })[0]!

    await step('Tab from the toolbar lands on the active cell; the next Tab leaves', async () => {
      // The toolbar's last control (programmatic focus, not a click).
      canvas.getByRole('radio', { name: 'Comfortable' }).focus()
      await userEvent.tab()
      await expect(firstBox()).toHaveFocus() // row 0, col 0: a widget cell → its checkbox
      await userEvent.tab()
      await expect(canvas.getByRole('combobox', { name: 'Rows per page' })).toHaveFocus()
      await userEvent.tab({ shift: true })
      await expect(firstBox()).toHaveFocus()
    })

    await step('Arrows move one cell; Up from row 0 enters the header', async () => {
      await userEvent.keyboard('{ArrowRight}')
      await expectAt(0, 1)
      await expect(focused().element.tagName).toBe('TD') // a text cell focuses itself
      await userEvent.keyboard('{ArrowLeft}')
      await expect(firstBox()).toHaveFocus()
      await userEvent.keyboard('{ArrowDown}')
      await expectAt(1, 0)
      await userEvent.keyboard('{ArrowUp}')
      await expectAt(0, 0)
    })

    await step('Up from Amount focuses its sort button; Enter sorts; Down returns', async () => {
      await userEvent.keyboard('{End}{ArrowLeft}')
      await expectAt(0, AMOUNT)
      await userEvent.keyboard('{ArrowUp}')
      await expect(canvas.getByRole('button', { name: 'Amount, sort descending' })).toHaveFocus()
      await userEvent.keyboard('{Enter}')
      const amountHeader = within(grid()).getByRole('columnheader', { name: /^Amount/ })
      await expect(amountHeader).toHaveAttribute('aria-sort', 'descending')
      await settled()
      // Still on the header's button, now offering the next step of the cycle.
      await expect(canvas.getByRole('button', { name: 'Amount, sort ascending' })).toHaveFocus()
      await userEvent.keyboard('{ArrowDown}')
      await expectAt(0, AMOUNT)
    })

    await step('Home / End, Ctrl+End, Cmd+ArrowUp, PageDown', async () => {
      await userEvent.keyboard('{Home}')
      await expectAt(0, 0)
      await userEvent.keyboard('{End}')
      await expectAt(0, LAST_COL)
      await userEvent.keyboard('{Control>}{End}{/Control}')
      await expectAt(49, LAST_COL)
      await expect(focused().rowEl).toHaveAttribute('aria-rowindex', '51')
      await userEvent.keyboard('{Meta>}{ArrowUp}{/Meta}') // the Mac alias for Ctrl+Home
      await expectAt(0, 0)
      await userEvent.keyboard('{PageDown}')
      await expectAt(10, 0)
      await userEvent.keyboard('{Control>}{Home}{/Control}')
      await expectAt(0, 0)
    })

    await step(
      'Space toggles the row; Shift+Space selects the range; Ctrl+A the page',
      async () => {
        const row = (index: number) => within(grid()).getAllByRole('row')[index + 1]!
        await userEvent.keyboard('{ArrowRight}') // the Order cell: a text cell
        await userEvent.keyboard(' ')
        await expect(row(0)).toHaveAttribute('aria-selected', 'true')
        await expect(bulkBar()).toHaveTextContent('1 selected')

        await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{Shift>} {/Shift}')
        await expect(bulkBar()).toHaveTextContent('4 selected')
        await expect(row(3)).toHaveAttribute('aria-selected', 'true')
        await expect(row(4)).toHaveAttribute('aria-selected', 'false')

        await userEvent.keyboard('{Control>}a{/Control}')
        await expect(bulkBar()).toHaveTextContent('50 selected')
        await userEvent.keyboard('{Control>}a{/Control}') // all selected → clears the page
        await expect(bulkBar()).toBeNull()
        await expectAt(3, 1) // focus never moved
      },
    )

    await step('Page 2 from the pagination bar: row 0, column kept', async () => {
      await userEvent.keyboard('{Control>}{Home}{/Control}')
      for (let i = 0; i < STATUS; i++) await userEvent.keyboard('{ArrowRight}')
      await expectAt(0, STATUS)

      await userEvent.tab() // Rows per page
      await userEvent.tab() // Previous is disabled on page 1: Next
      await expect(canvas.getByRole('button', { name: 'Next page' })).toHaveFocus()
      await userEvent.keyboard('{Enter}')
      await settled()
      await expect(canvas.getByRole('button', { name: 'Next page' })).toHaveFocus() // not stolen

      for (let i = 0; i < 5 && !focused().inGrid; i++) await userEvent.tab({ shift: true })
      await expectAt(0, STATUS)
      // Page-global: result row 51 is grid row 52 ("row 52 of 10,001").
      await expect(focused().rowEl).toHaveAttribute('aria-rowindex', '52')
      await userEvent.keyboard('{ArrowDown}')
      await expect(focused().rowEl).toHaveAttribute('aria-rowindex', '53')
    })
  },
})
