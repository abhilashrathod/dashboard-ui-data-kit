import { expect, spyOn, waitFor, within } from 'storybook/test'
import preview, { type NetworkParameter, storyUrl } from '../../../.storybook/preview'
import { openOverlayA11y } from '@/dev/a11y'
import { DataTableDemo } from '@/dev/data-table-demo/DataTableDemo'
import { setNetworkConfig } from '@/mocks/network'
import { columnStorageKey } from './useColumnVisibility'

/*
 * Data/DataTable: the Orders table end to end (URL → query → DataState →
 * DataTable) against the live MSW API. The dev drawer below the table shows
 * the in-memory URL (with Back/Forward) and every request it costs.
 */

const meta = preview.meta({
  title: 'Data/DataTable',
  component: DataTableDemo,
  tags: ['autodocs'],
  // Column preferences live in localStorage: start every story from the defaults.
  beforeEach: () => {
    window.localStorage.removeItem(columnStorageKey('orders'))
  },
  parameters: {
    docs: {
      description: {
        component: `The kit's data table (docs/data-table.md). Sorting, paging and search live in the URL; the table derives TanStack's state from it and never fetches.

**Do**
- Compose features as children: \`<DataTable.Toolbar>\`, \`<DataTable.Search />\`, \`<DataTable.Grid />\`, \`<DataTable.Pagination />\`.
- Put column behavior (label, alignment, width, sort field) in the column's \`meta\`, once.
- Define columns at module scope.

**Don't**
- Don't add boolean feature props to \`<DataTable>\`: it takes \`table\`, \`aria-label\` and \`children\`, nothing else.
- Don't fetch inside the table, or copy URL params into table state.`,
      },
    },
  },
})

const TIMEOUT = { timeout: 8000 }
const body = () => within(document.body)
const table = () => body().getByRole('table', { name: 'Orders' })
const bodyRows = () => within(table()).getAllByRole('row').slice(1)
const header = (name: string) =>
  within(table()).getByRole('columnheader', { name: new RegExp(`^${name}`) })
const announcer = () => body().getByTestId('announcer-polite')
const logRows = () => body().queryAllByTestId('request-row')
const listRequestsFor = (page: number) =>
  logRows().filter((row) => {
    const search = new URLSearchParams(row.dataset.search)
    return row.dataset.path === '/api/orders' && (search.get('page') ?? '1') === String(page)
  })
const rangeText = () => body().getByTestId('data-table-range').textContent
/** Ready, not dimmed, nothing in flight. */
const settled = () =>
  waitFor(async () => {
    const region = body().getByRole('region', { name: 'Orders' })
    await expect(region).toHaveAttribute('data-state', 'ready')
    await expect(region).toHaveAttribute('aria-busy', 'false')
    await expect(region.querySelector('[data-placeholder]')).toBeNull()
  }, TIMEOUT)

/**
 * The full composition. Play: the sort cycle on Amount, a debounced search,
 * then Back twice (the URL bar's), with the header and the search box
 * following the URL each time.
 */
export const Default = meta.story({
  play: async ({ canvas, userEvent, loaded, step }) => {
    const url = storyUrl(loaded)
    const sortParam = () => new URLSearchParams(url.getSearch()).get('orders.sort')
    await settled()
    const firstRowBefore = bodyRows()[0]!.textContent

    await step('Amount: descending, then ascending, then back to the default', async () => {
      await userEvent.click(canvas.getByRole('button', { name: 'Amount, sort descending' }))
      await expect(sortParam()).toBe('-amount')
      await expect(header('Amount')).toHaveAttribute('aria-sort', 'descending')
      await settled()
      await waitFor(() => expect(announcer()).toHaveTextContent('Sorted by Amount, descending'))

      await userEvent.click(canvas.getByRole('button', { name: 'Amount, sort ascending' }))
      await expect(sortParam()).toBe('amount')
      await expect(header('Amount')).toHaveAttribute('aria-sort', 'ascending')
      await settled()

      await userEvent.click(canvas.getByRole('button', { name: 'Amount, clear sort' }))
      await expect(sortParam()).toBeNull()
      await expect(header('Amount')).not.toHaveAttribute('aria-sort')
      await expect(header('Created')).toHaveAttribute('aria-sort', 'descending')
      await settled()
    })

    await step('Search "acme": one debounced commit, at most one history entry', async () => {
      await userEvent.click(canvas.getByRole('button', { name: 'Amount, sort descending' }))
      await settled()
      const entriesBefore = url.entries.length
      const search = canvas.getByRole('searchbox', { name: 'Search orders' })
      await userEvent.type(search, 'acme')
      await waitFor(
        () => expect(new URLSearchParams(url.getSearch()).get('orders.q')).toBe('acme'),
        TIMEOUT,
      )
      // Typing replaces the current entry instead of pushing one per keystroke.
      await expect(url.entries.length - entriesBefore).toBeLessThanOrEqual(1)
      await settled()
    })

    await step('Back: the previous sort and search come back from the URL', async () => {
      const back = body().getByRole('button', { name: 'Back' })
      await userEvent.click(back) // before the Amount click: default sort, no search
      await expect(header('Amount')).not.toHaveAttribute('aria-sort')
      await expect(header('Created')).toHaveAttribute('aria-sort', 'descending')
      await expect(canvas.getByRole('searchbox', { name: 'Search orders' })).toHaveValue('')
      await settled()

      await userEvent.click(back) // Amount ascending
      await expect(header('Amount')).toHaveAttribute('aria-sort', 'ascending')
      await userEvent.click(back) // Amount descending
      await userEvent.click(back) // the initial view
      await expect(url.getSearch()).toBe('')
      await settled()
      await expect(bodyRows()[0]!.textContent).toBe(firstRowBefore)
    })
  },
})

/** Slow network: the old rows go grayscale while the next sort or page loads. */
export const Slow = meta.story({
  parameters: { network: { mode: 'slow' } satisfies NetworkParameter },
})

/** Every request fails: the ErrorState sits inside the card, and the toolbar still works. */
export const ErrorStory = meta.story({
  name: 'Error',
  parameters: { network: { mode: 'error' } satisfies NetworkParameter },
  play: async ({ canvas, userEvent, loaded }) => {
    const region = canvas.getByRole('region', { name: 'Orders' })
    await waitFor(() => expect(region).toHaveAttribute('data-state', 'error'), TIMEOUT)
    // The skeleton, once shown, is held for its 300ms minimum before the error replaces it.
    await expect(
      await within(region).findByRole('button', { name: 'Retry' }, TIMEOUT),
    ).toBeVisible()
    await expect(body().queryByTestId('data-table-range')).toBeNull()

    await userEvent.type(canvas.getByRole('searchbox', { name: 'Search orders' }), 'acme{Enter}')
    await expect(new URLSearchParams(storyUrl(loaded).getSearch()).get('orders.q')).toBe('acme')
  },
})

/** Loads, then a background refetch fails: the banner appears over the rows, which stay. */
export const StaleAfterFailure = meta.story({
  play: async ({ canvas, userEvent }) => {
    await settled()
    const firstRow = bodyRows()[0]!.textContent
    setNetworkConfig({ mode: 'error' })
    await userEvent.click(body().getByRole('button', { name: 'Refetch' }))

    await expect(
      await canvas.findByText(/Couldn't refresh · showing data from/, {}, TIMEOUT),
    ).toBeVisible()
    await expect(bodyRows()[0]!.textContent).toBe(firstRow)
  },
})

/** The data set itself is empty: "No orders yet", and no pagination. */
export const Empty = meta.story({
  parameters: { network: { mode: 'empty' } satisfies NetworkParameter },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('No orders yet', {}, TIMEOUT)).toBeVisible()
    await expect(body().queryByTestId('data-table-range')).toBeNull()
  },
})

/** Filters nothing can match (amounts top out at $5,000). Clear filters brings the rows back. */
export const NoResults = meta.story({
  parameters: { url: '?orders.f=status:in:failed&orders.f=amount:gt:5000' },
  play: async ({ canvas, userEvent, loaded }) => {
    await expect(
      await canvas.findByText('No orders match these filters', {}, TIMEOUT),
    ).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Clear filters' }))
    await expect(storyUrl(loaded).getSearch()).toBe('')
    await settled()
    await expect(bodyRows()).toHaveLength(50)
  },
})

/**
 * A shared link: largest amounts first, page 3. Play: Next is served from the
 * prefetch cache (no new request for page 4), and the range follows.
 */
export const FromSharedLink = meta.story({
  parameters: { url: '?orders.page=3&orders.sort=-amount' },
  play: async ({ canvas, userEvent, loaded }) => {
    await settled()
    await expect(header('Amount')).toHaveAttribute('aria-sort', 'descending')
    await expect(rangeText()).toBe('Showing 101–150 of 10,000')

    // Wait for the page-4 prefetch to land.
    await waitFor(async () => {
      const prefetches = listRequestsFor(4)
      await expect(prefetches).toHaveLength(1)
      await expect(prefetches[0]).not.toHaveTextContent('…')
    }, TIMEOUT)

    await userEvent.click(canvas.getByRole('button', { name: 'Next page' }))
    await expect(new URLSearchParams(storyUrl(loaded).getSearch()).get('orders.page')).toBe('4')
    await expect(rangeText()).toBe('Showing 151–200 of 10,000')
    await settled()
    await expect(listRequestsFor(4)).toHaveLength(1) // still just the prefetch
    await waitFor(() => expect(announcer()).toHaveTextContent('Showing 151–200 of 10,000'))
  },
})

/**
 * Compact density, opened on page 2. Play: page size 100 resets to page 1 and
 * renders 100 rows.
 */
export const Compact = meta.story({
  globals: { density: 'compact' },
  parameters: { url: '?orders.page=2' },
  play: async ({ canvas, userEvent, loaded }) => {
    await settled()
    await expect(canvas.getByRole('radio', { name: 'Compact' })).toBeChecked()

    await userEvent.click(canvas.getByRole('combobox', { name: 'Rows per page' }))
    await userEvent.click(await body().findByRole('option', { name: '100' }))

    const search = new URLSearchParams(storyUrl(loaded).getSearch())
    await expect(search.get('orders.size')).toBe('100')
    await expect(search.has('orders.page')).toBe(false)
    await settled()
    await expect(bodyRows()).toHaveLength(100)
    await expect(rangeText()).toBe('Showing 1–100 of 10,000')
  },
})

/** Dark theme (and the a11y check in it). */
export const Dark = meta.story({ globals: { theme: 'dark' } })

/** Dark + compact. */
export const DarkCompact = meta.story({ globals: { theme: 'dark', density: 'compact' } })

/**
 * A 375px-wide container: the grid scrolls horizontally inside the card, and
 * the header stays stuck to the top of its scroll container.
 */
export const Narrow = meta.story({
  args: { width: 375, gridClassName: 'max-h-[24rem]' },
  play: async () => {
    await settled()
    const scroller = table().closest<HTMLElement>('[data-slot="data-table-scroll"]')!
    await expect(scroller.scrollWidth).toBeGreaterThan(scroller.clientWidth)

    scroller.scrollTop = 400
    const head = table().querySelector('thead')!
    await waitFor(() =>
      expect(head.getBoundingClientRect().top).toBeCloseTo(scroller.getBoundingClientRect().top, 0),
    )
  },
})

// ── 4b: selection, bulk actions, column visibility ──────────────────────────

const rowBoxes = () => body().getAllByRole('checkbox', { name: /^Select order/ })
const pageBox = () => body().getByRole('checkbox', { name: 'Select all orders on this page' })
/** `hidden`: while a modal (dialog, menu) is open, Radix hides the page from the a11y tree. */
const bulkBar = (hidden = false) =>
  body().queryByRole('region', { name: 'Orders selection', hidden })
const menuClosed = () => waitFor(() => expect(body().queryByRole('menu')).toBeNull())
const statusOf = (box: HTMLElement) =>
  box.closest('tr')!.querySelector('[data-status]')!.getAttribute('data-status')

/**
 * The selection rules, in a real browser: the header checkbox, shift+click
 * ranges, persistence across pages, clearing on a new sort, and Escape in the
 * bulk bar.
 */
export const SelectionRules = meta.story({
  play: async ({ canvas, userEvent, step }) => {
    await settled()

    await step('Header checkbox: the whole page, then mixed after one is removed', async () => {
      await userEvent.click(pageBox())
      await expect(bulkBar()).toHaveTextContent('50 selected')
      await userEvent.click(rowBoxes()[4]!)
      await expect(pageBox()).toBePartiallyChecked()
      await expect(bulkBar()).toHaveTextContent('49 selected')
      await userEvent.click(pageBox()) // some → all
      await userEvent.click(pageBox()) // all → none
      await expect(bulkBar()).toBeNull()
    })

    await step('Shift+click selects the range in between', async () => {
      await userEvent.click(rowBoxes()[1]!)
      await userEvent.keyboard('{Shift>}')
      await userEvent.click(rowBoxes()[5]!)
      await userEvent.keyboard('{/Shift}')
      const checked = rowBoxes().map((box) => (box as HTMLInputElement).checked)
      await expect(checked.slice(0, 7)).toEqual([false, true, true, true, true, true, false])
      await expect(bulkBar()).toHaveTextContent('5 selected')
    })

    await step('Persists to page 2 and back', async () => {
      await userEvent.click(canvas.getByRole('button', { name: 'Next page' }))
      await settled()
      await userEvent.click(rowBoxes()[0]!)
      await expect(bulkBar()).toHaveTextContent('6 selected')
      await userEvent.click(canvas.getByRole('button', { name: 'Previous page' }))
      await settled()
      await expect(rowBoxes()[1]).toBeChecked()
      await expect(bulkBar()).toHaveTextContent('6 selected')
    })

    await step('A new sort clears it, and says so', async () => {
      await userEvent.click(canvas.getByRole('button', { name: 'Amount, sort descending' }))
      await expect(bulkBar()).toBeNull()
      await settled()
      await waitFor(() => expect(announcer()).toHaveTextContent(/Selection cleared/), TIMEOUT)
    })

    await step('Escape inside the bulk bar clears the selection', async () => {
      await userEvent.click(rowBoxes()[0]!)
      const clear = within(bulkBar()!).getByRole('button', { name: 'Clear' })
      clear.focus()
      await userEvent.keyboard('{Escape}')
      await expect(bulkBar()).toBeNull()
      await expect(body().getByRole('region', { name: 'Orders' })).toHaveFocus()
    })
  },
})

/** Rows picked on two pages: the bar counts both, the rows show the accent tint and bar. */
export const WithSelection = meta.story({
  play: async ({ canvas, userEvent }) => {
    await settled()
    await userEvent.click(rowBoxes()[0]!)
    await userEvent.keyboard('{Shift>}')
    await userEvent.click(rowBoxes()[2]!)
    await userEvent.keyboard('{/Shift}')
    await userEvent.click(canvas.getByRole('button', { name: 'Next page' }))
    await settled()
    await userEvent.click(rowBoxes()[1]!)
    await userEvent.click(rowBoxes()[3]!)
    await userEvent.click(canvas.getByRole('button', { name: 'Previous page' }))
    await settled()
    await expect(bulkBar()).toHaveTextContent('5 selected')
  },
})

/** The same, in dark + compact: the bar inverts to a light pill. */
export const WithSelectionDarkCompact = meta.story({
  globals: { theme: 'dark', density: 'compact' },
  play: WithSelection.input.play,
})

/**
 * "Mark as shipped" on the first 8 rows, which mix paid (allowed) with
 * shipped, pending and failed (not allowed). The server updates the paid ones
 * and rejects the rest: the toast says so, "View details" lists the reasons,
 * and only the rejected rows stay selected.
 */
export const BulkPartialSuccess = meta.story({
  parameters: openOverlayA11y,
  play: async ({ userEvent, step }) => {
    await settled()
    const before = rowBoxes().slice(0, 8).map(statusOf)
    await expect(before).toContain('paid')
    await expect(before.some((status) => status !== 'paid')).toBe(true)

    await step('Select rows 1–8 and mark them as shipped', async () => {
      await userEvent.click(rowBoxes()[0]!)
      await userEvent.keyboard('{Shift>}')
      await userEvent.click(rowBoxes()[7]!)
      await userEvent.keyboard('{/Shift}')
      await userEvent.click(within(bulkBar()!).getByRole('button', { name: 'Mark as…' }))
      await userEvent.click(await body().findByRole('menuitem', { name: 'Shipped' }))
      const dialog = await body().findByRole('alertdialog', { name: 'Mark 8 orders as shipped?' })
      await userEvent.click(within(dialog).getByRole('button', { name: 'Mark as shipped' }))
      await waitFor(() => expect(body().queryByRole('alertdialog')).toBeNull(), TIMEOUT)
    })

    const paid = before.filter((status) => status === 'paid').length
    await step('The toast reports the partial result', async () => {
      const toast = await body().findByText(/updated, \d+ couldn't be changed/, {}, TIMEOUT)
      await expect(toast).toHaveTextContent(`${paid} updated, ${8 - paid} couldn't be changed`)
    })

    await step('Only the rows that failed stay selected', async () => {
      await settled()
      await waitFor(async () => {
        const checked = rowBoxes()
          .slice(0, 8)
          .map((box) => (box as HTMLInputElement).checked)
        await expect(checked).toEqual(before.map((status) => status !== 'paid'))
      }, TIMEOUT)
      await expect(bulkBar()).toHaveTextContent(`${8 - paid} selected`)
    })

    await step('View details lists the server reasons', async () => {
      await userEvent.click(body().getByRole('button', { name: 'View details' }))
      const details = await body().findByRole('dialog', { name: "Orders that couldn't be changed" })
      await expect(within(details).getAllByRole('row')).toHaveLength(1 + 8 - paid)
      await expect(details).toHaveTextContent(/Can't move \w+ → shipped/)
    })
  },
})

/** The bulk endpoint fails: the error shows inside the dialog, which stays open; nothing is deselected. */
export const BulkServerError = meta.story({
  parameters: {
    network: { failEndpoints: ['orders.bulkStatus'] } satisfies NetworkParameter,
    ...openOverlayA11y,
  },
  play: async ({ userEvent }) => {
    await settled()
    await userEvent.click(rowBoxes()[0]!)
    await userEvent.click(rowBoxes()[1]!)
    await userEvent.click(within(bulkBar()!).getByRole('button', { name: 'Mark as…' }))
    await userEvent.click(await body().findByRole('menuitem', { name: 'Paid' }))
    const dialog = await body().findByRole('alertdialog', { name: 'Mark 2 orders as paid?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Mark as paid' }))

    await expect(await within(dialog).findByRole('alert', {}, TIMEOUT)).toHaveTextContent(
      'Something went wrong on our side',
    )
    await expect(dialog).toBeVisible()
    await expect(bulkBar(true)).toHaveTextContent('2 selected')
  },
})

/** The same failure, in dark mode (the dialog and the inverted bar). */
export const BulkServerErrorDark = meta.story({
  globals: { theme: 'dark' },
  parameters: BulkServerError.input.parameters,
  play: BulkServerError.input.play,
})

const columnItem = (name: string) => body().getByRole('menuitemcheckbox', { name })
const columnHeaders = () =>
  within(table())
    .getAllByRole('columnheader')
    .map((th) => th.textContent)

/**
 * Hide Channel and Items from the menu (it stays open between toggles), then
 * remount the table as a reload would: still hidden. Reset restores them, and
 * the last visible column can't be hidden.
 */
export const ColumnsCustomized = meta.story({
  parameters: openOverlayA11y,
  play: async ({ canvas, userEvent, step }) => {
    await settled()
    const openMenu = async () => {
      await userEvent.click(canvas.getByRole('button', { name: 'Columns' }))
      return body().findByRole('menu')
    }

    await step('Hide Channel and Items; the menu stays open', async () => {
      await openMenu()
      await userEvent.click(columnItem('Channel'))
      await expect(columnItem('Items')).toBeVisible() // still open
      await userEvent.click(columnItem('Items'))
      await expect(columnItem('Channel')).not.toBeChecked()
      await userEvent.keyboard('{Escape}')
      await menuClosed()
      await expect(columnHeaders()).not.toContain('Channel')
      await expect(columnHeaders()).not.toContain('Items')
    })

    await step('After a remount (a reload), they are still hidden', async () => {
      await userEvent.click(body().getByRole('button', { name: 'Remount table' }))
      await settled()
      await expect(columnHeaders()).not.toContain('Channel')
      await expect(columnHeaders()).not.toContain('Items')
    })

    await step('Reset to default restores them', async () => {
      await openMenu()
      await userEvent.click(body().getByRole('menuitem', { name: 'Reset to default' }))
      await menuClosed()
      await expect(columnHeaders()).toContain('Channel')
      await expect(columnHeaders()).toContain('Items')
    })

    await step('The last visible column cannot be hidden', async () => {
      await openMenu()
      for (const name of ['Order', 'Customer', 'Status', 'Channel', 'Items', 'Amount']) {
        await userEvent.click(columnItem(name))
      }
      await expect(columnItem('Created')).toBeChecked()
      await expect(columnItem('Created')).toHaveAttribute('aria-disabled', 'true')
      // The menu is left open, so the a11y check covers it.
    })
  },
})

/** The column menu open, in dark + compact. */
export const ColumnsMenuDarkCompact = meta.story({
  globals: { theme: 'dark', density: 'compact' },
  parameters: openOverlayA11y,
  play: async ({ canvas, userEvent }) => {
    await settled()
    await userEvent.click(canvas.getByRole('button', { name: 'Columns' }))
    const menu = await body().findByRole('menu')
    await waitFor(() => expect(menu).toBeVisible()) // after the enter animation
  },
})

// ── 4c: CSV export ──────────────────────────────────────────────────────────

/**
 * Captures what Export downloads: the Blob handed to URL.createObjectURL
 * (the real one still runs), with the link click stubbed so no file is saved.
 * Returns the BOM flag and the text after it.
 */
function captureDownloads() {
  const blobs: Blob[] = []
  const create = spyOn(URL, 'createObjectURL').mockImplementation((object) => {
    blobs.push(object as Blob)
    return 'blob:story-export'
  })
  const revoke = spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  const click = spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  return {
    count: () => blobs.length,
    last: async () => {
      const bytes = new Uint8Array(await blobs.at(-1)!.arrayBuffer())
      const text = new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes)
      return {
        bom: text.startsWith('\uFEFF'),
        lines: text.replace(/^\uFEFF/, '').split('\r\n'),
        text,
      }
    },
    restore: () => {
      create.mockRestore()
      revoke.mockRestore()
      click.mockRestore()
    },
  }
}

/** The toast list (Radix's viewport, "Notifications"), not the announcer's hidden copy of the text. */
const toastWith = (text: string) =>
  waitFor(
    () =>
      expect(
        within(body().getByRole('region', { name: /Notifications/ })).getByText(text),
      ).toBeVisible(),
    TIMEOUT,
  )

const idOf = (box: HTMLElement) => box.getAttribute('aria-label')!.replace('Select order ', '')

/**
 * Export the page (BOM, header = the visible columns, 50 rows, CRLF), with
 * Channel hidden (no Channel column), and a selection across two pages.
 */
export const ExportCsv = meta.story({
  play: async ({ canvas, userEvent, step }) => {
    const downloads = captureDownloads()
    try {
      await settled()

      await step('Export the page', async () => {
        await userEvent.click(canvas.getByRole('button', { name: 'Export' }))
        const { bom, lines, text } = await downloads.last()
        await expect(bom).toBe(true)
        await expect(lines[0]).toBe('Order,Customer,Status,Channel,Items,Amount,Created')
        await expect(lines).toHaveLength(1 + 50 + 1) // header + rows + the empty string after the final CRLF
        await expect(lines.at(-1)).toBe('')
        await expect(text.replaceAll('\r\n', '').includes('\n')).toBe(false) // CRLF only
        await expect(lines[1]).toMatch(/^ORD-\d{6},[^,]+ <[^>]+>,\w+,\w+,\d+,\d+\.\d{2},\d{4}-/)
        await toastWith('Exported 50 orders')
      })

      await step('Hide Channel: the export follows', async () => {
        await userEvent.click(canvas.getByRole('button', { name: 'Columns' }))
        await userEvent.click(await body().findByRole('menuitemcheckbox', { name: 'Channel' }))
        await userEvent.keyboard('{Escape}')
        await menuClosed()
        await userEvent.click(canvas.getByRole('button', { name: 'Export' }))
        const { lines } = await downloads.last()
        await expect(lines[0]).toBe('Order,Customer,Status,Items,Amount,Created')
      })

      await step('Export a selection across two pages', async () => {
        const picked: string[] = []
        for (const index of [0, 2, 4]) {
          const box = rowBoxes()[index]!
          picked.push(idOf(box))
          await userEvent.click(box)
        }
        await userEvent.click(canvas.getByRole('button', { name: 'Next page' }))
        await settled()
        for (const index of [1, 3]) {
          const box = rowBoxes()[index]!
          picked.push(idOf(box))
          await userEvent.click(box)
        }

        await userEvent.click(canvas.getByRole('button', { name: 'Export' }))
        await userEvent.click(await body().findByRole('menuitem', { name: 'Export selected (5)' }))
        const { lines } = await downloads.last()
        const rows = lines.slice(1, -1)
        await expect(rows).toHaveLength(5)
        await expect(rows.map((line) => line.split(',')[0]).sort()).toEqual([...picked].sort())
        // Page 2 is on screen, so its two rows come first, in page order.
        await expect(rows.slice(0, 2).map((line) => line.split(',')[0])).toEqual(picked.slice(3))
        await toastWith('Exported 5 orders')
      })
    } finally {
      downloads.restore()
    }
  },
})

/** Nothing to export: the button is disabled (focusable) and says why. */
export const ExportUnavailable = meta.story({
  parameters: { network: { mode: 'empty' } satisfies NetworkParameter },
  play: async ({ canvas }) => {
    await canvas.findByText('No orders yet', {}, TIMEOUT)
    const button = canvas.getByRole('button', { name: 'Export' })
    await expect(button).toHaveAttribute('aria-disabled', 'true')
    await expect(button).toHaveAccessibleDescription('There are no orders to export')
  },
})
