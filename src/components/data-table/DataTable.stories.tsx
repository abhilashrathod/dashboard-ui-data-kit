import { expect, waitFor, within } from 'storybook/test'
import preview, { type NetworkParameter, storyUrl } from '../../../.storybook/preview'
import { DataTableDemo } from '@/dev/data-table-demo/DataTableDemo'
import { setNetworkConfig } from '@/mocks/network'

/*
 * Data/DataTable: the Orders table end to end (URL → query → DataState →
 * DataTable) against the live MSW API. The dev drawer below the table shows
 * the in-memory URL (with Back/Forward) and every request it costs.
 */

const meta = preview.meta({
  title: 'Data/DataTable',
  component: DataTableDemo,
  tags: ['autodocs'],
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
