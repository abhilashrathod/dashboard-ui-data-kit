import { expect, waitFor, within } from 'storybook/test'
import preview, { storyUrl } from '../../../.storybook/preview'
import { openOverlayA11y } from '@/dev/a11y'
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
        component: `The Orders grid by keyboard (docs/keyboard-grid.md). One Tab stop; arrows, Home/End, Ctrl+Home/End (Cmd+Arrow on a Mac) and PageUp/PageDown move the active cell; Space selects the row, Shift+Space a range, Ctrl/Cmd+A the page. Enter on the Customer cell steps into its controls (Tab cycles, Escape leaves); Enter on a text cell opens the order's drawer; ? lists every shortcut. The focus trace above the table shows the active cell, its row's aria-rowindex and the last key.

**Do**
- Mark a column \`meta.cellKind: 'widget'\` when its cell holds exactly one control, and spread \`useFocusTargetProps()\` onto that control.
- Mark it \`'composite'\` when it holds several, and spread \`useCellInteractive()\` onto each.

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
/** The last control before the grid in tab order: the filter row's last button. */
const lastControlBeforeGrid = () =>
  within(body().getByRole('group', { name: 'Filters' })).getAllByRole('button').at(-1)!
const expectAt = (row: number, col: number) =>
  expect({ row: focused().row, col: focused().col }).toEqual({ row, col })

const AMOUNT = 6
const LAST_COL = 8
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

    await step('Tab from the filter row lands on the active cell; the next Tab leaves', async () => {
      // The last control before the grid (programmatic focus, not a click).
      lastControlBeforeGrid().focus()
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
      await userEvent.keyboard('{End}{ArrowLeft}{ArrowLeft}')
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

// ── 5b: composite cells, row actions, the drawer, keyboard help ─────────────

const CUSTOMER = 2
const ACTIONS = 8

/** Tab into the grid from the last control before it (programmatic focus, not a click). */
async function tabIn(userEvent: { tab: () => Promise<void> }) {
  lastControlBeforeGrid().focus()
  await userEvent.tab()
}
const rowAt = (index: number) => within(grid()).getAllByRole('row')[index + 1]!
const orderIdAt = (index: number) => rowAt(index).querySelector('[aria-colindex="2"]')!.textContent

/**
 * The Customer cell holds two controls. Enter steps in (focus on the name),
 * Tab cycles name → copy → name, Escape steps out, and the arrows move cells
 * again. Space selects the row on the cell, but belongs to the control inside
 * it. Then the name filters the table to that customer.
 */
export const CompositeCell = meta.story({
  play: async ({ canvas, step, userEvent, loaded }) => {
    await settled()
    await tabIn(userEvent)
    await userEvent.keyboard('{ArrowRight}{ArrowRight}')
    await expectAt(0, CUSTOMER)
    const cell = focused().element
    const name = within(cell).getByRole('button', { name: /^Filter by / })
    const copy = within(cell).getByRole('button', { name: /^Copy email for / })
    const customer = name.getAttribute('aria-label')!.replace('Filter by ', '')

    await step('Space on the cell selects the row', async () => {
      await userEvent.keyboard(' ')
      await expect(rowAt(0)).toHaveAttribute('aria-selected', 'true')
      await expect(bulkBar()).toHaveTextContent('1 selected')
    })

    await step('Enter → the name; Tab → copy; Tab wraps; Shift+Tab wraps back', async () => {
      await userEvent.keyboard('{Enter}')
      await expect(name).toHaveFocus()
      await expect(cell).toHaveAttribute('data-interacting')
      await userEvent.tab()
      await expect(copy).toHaveFocus()
      await expect(copy).toBeVisible()
      await userEvent.tab()
      await expect(name).toHaveFocus()
      await userEvent.tab({ shift: true })
      await expect(copy).toHaveFocus()
    })

    await step('Space inside belongs to the control, not the row', async () => {
      await userEvent.keyboard(' ') // the copy button: copies (or says it couldn't)
      await expect(bulkBar()).toHaveTextContent('1 selected')
    })

    await step('Escape → back on the cell; the arrows move cells again', async () => {
      await userEvent.keyboard('{Escape}')
      await expect(cell).toHaveFocus()
      await expect(cell).not.toHaveAttribute('data-interacting')
      await userEvent.keyboard('{ArrowDown}')
      await expectAt(1, CUSTOMER)
      await userEvent.keyboard('{ArrowUp}')
      await expectAt(0, CUSTOMER)
    })

    await step('Enter on the name filters the table to that customer', async () => {
      await userEvent.keyboard('{Enter}{Enter}')
      await expect(new URLSearchParams(storyUrl(loaded).getSearch()).get('orders.q')).toBe(customer)
      await settled()
      const rows = within(grid()).getAllByRole('row').slice(1)
      await expect(rows.length).toBeGreaterThan(0)
      for (const row of rows) await expect(row).toHaveTextContent(customer)
      await expect(canvas.getByRole('searchbox', { name: 'Search orders' })).toHaveValue(customer)
      // The focused name button unmounted with its row: focus is rescued to the cell.
      await waitFor(() => expectAt(0, CUSTOMER))
    })
  },
})

/** Ends in interaction mode, so axe checks the cell with its controls in the tab order. */
export const InteractionModeActive = meta.story({
  play: async ({ userEvent }) => {
    await settled()
    await tabIn(userEvent)
    await userEvent.keyboard('{ArrowRight}{ArrowRight}{Enter}')
    await expect(focused().element).toHaveAccessibleName(/^Filter by /)
  },
})

/**
 * Row actions by keyboard: the Actions cell is a widget, so its ⋯ button takes
 * focus directly; Enter opens the menu; View details opens the drawer; Escape
 * returns focus to ⋯. Then Enter on the Amount cell opens that order's drawer,
 * and closing it returns to the same cell.
 */
export const RowActionsAndDrawer = meta.story({
  parameters: openOverlayA11y,
  play: async ({ step, userEvent }) => {
    await settled()
    await tabIn(userEvent)

    await step('⋯ → View details → Escape: back on ⋯', async () => {
      await userEvent.keyboard('{End}')
      await expectAt(0, ACTIONS)
      const id = orderIdAt(0)
      const trigger = body().getByRole('button', { name: `Actions for order ${id}` })
      await expect(trigger).toHaveFocus()
      await userEvent.keyboard('{Enter}')
      const menu = await body().findByRole('menu')
      await waitFor(() =>
        expect(within(menu).getByRole('menuitem', { name: 'View details' })).toHaveFocus(),
      )
      await userEvent.keyboard('{Enter}')
      const drawer = await body().findByRole('dialog', { name: id })
      await expect(drawer).toBeVisible()
      // As a person would: once the menu has gone (it's a dismissable layer too,
      // and the newest layer gets Escape while it animates out).
      await waitFor(() => expect(body().queryByRole('menu')).toBeNull())
      await waitFor(() => expect(drawer.contains(document.activeElement)).toBe(true))
      await userEvent.keyboard('{Escape}')
      await waitFor(() => expect(body().queryByRole('dialog')).toBeNull(), TIMEOUT)
      await waitFor(() => expect(trigger).toHaveFocus())
    })

    await step(
      'Enter on Amount (row 3) → that order’s drawer → Escape: back on the same cell',
      async () => {
        await userEvent.keyboard('{ArrowLeft}{ArrowLeft}{ArrowDown}{ArrowDown}')
        await expectAt(2, AMOUNT)
        const cell = focused().element
        const id = orderIdAt(2)
        await userEvent.keyboard('{Enter}')
        const drawer = await body().findByRole('dialog', { name: id })
        await expect(within(drawer).getByText('Reference')).toBeVisible()
        await waitFor(() => expect(drawer.contains(document.activeElement)).toBe(true))
        await userEvent.keyboard('{Escape}')
        await waitFor(() => expect(cell).toHaveFocus(), TIMEOUT)
        await expect(cell).toHaveAttribute('aria-colindex', String(AMOUNT + 1))
        await expect(cell.closest('[role="row"]')).toHaveAttribute('aria-rowindex', '4')
      },
    )
  },
})

/** The drawer left open (axe with the drawer up). */
export const DrawerOpen = meta.story({
  parameters: openOverlayA11y,
  play: async ({ userEvent }) => {
    await settled()
    await tabIn(userEvent)
    const id = orderIdAt(0) // before the drawer hides the grid from assistive tech
    await userEvent.keyboard('{ArrowRight}{Enter}') // the Order cell
    const drawer = await body().findByRole('dialog', { name: id })
    await waitFor(() => expect(drawer).toBeVisible())
  },
})

/** The same, dark + compact. */
export const DrawerOpenDarkCompact = meta.story({
  globals: { theme: 'dark', density: 'compact' },
  parameters: openOverlayA11y,
  play: DrawerOpen.input.play,
})

/** The row actions menu left open, with its status submenu (axe with the menus up). */
export const RowActionsMenuOpen = meta.story({
  parameters: openOverlayA11y,
  play: async ({ userEvent }) => {
    await settled()
    await tabIn(userEvent)
    await userEvent.keyboard('{End}{Enter}')
    const menu = await body().findByRole('menu')
    await waitFor(() =>
      expect(within(menu).getByRole('menuitem', { name: 'View details' })).toHaveFocus(),
    )
    await userEvent.keyboard('{ArrowDown}{ArrowRight}') // Mark as… → its submenu
    await waitFor(() => expect(body().getAllByRole('menu')).toHaveLength(2))
  },
})

/** "?" in the grid opens the shortcuts; Escape returns focus to the active cell. */
export const KeyboardHelp = meta.story({
  play: async ({ userEvent }) => {
    await settled()
    await tabIn(userEvent)
    await userEvent.keyboard('{ArrowDown}{ArrowRight}')
    const cell = focused().element
    await userEvent.keyboard('?')
    const dialog = await body().findByRole('dialog', { name: 'Keyboard shortcuts' })
    await waitFor(() => expect(dialog).toBeVisible()) // after the enter animation
    for (const group of ['Navigation', 'Selection', 'Cells & actions']) {
      await expect(within(dialog).getByRole('heading', { name: group })).toBeVisible()
    }
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true))
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(cell).toHaveFocus(), TIMEOUT)
  },
})

/** The shortcuts dialog left open (axe), in dark mode. */
export const KeyboardHelpOpenDark = meta.story({
  globals: { theme: 'dark' },
  parameters: openOverlayA11y,
  play: async ({ userEvent }) => {
    await settled()
    await tabIn(userEvent)
    await userEvent.keyboard('?')
    await waitFor(() =>
      expect(body().getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible(),
    )
  },
})
