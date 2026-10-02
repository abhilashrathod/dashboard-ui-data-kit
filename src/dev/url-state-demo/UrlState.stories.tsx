import { expect, waitFor, within } from 'storybook/test'
import preview, { storyUrl } from '../../../.storybook/preview'
import { UrlBar } from '../UrlBar'
import { ListParamsDemo } from './ListParamsDemo'

/*
 * Data/URL state: the URL-as-state store with throwaway controls. Each story
 * runs on its own in-memory URL (parameters.url), shown in the UrlBar, so
 * every click is visible as a URL change and Back/Forward work in the iframe.
 * See docs/url-state.md.
 */

function OrdersDemo() {
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <UrlBar />
      <ListParamsDemo namespace="orders" />
    </div>
  )
}

function TwoTablesDemo() {
  return (
    <div className="flex max-w-6xl flex-col gap-4">
      <UrlBar />
      <div className="grid gap-grid lg:grid-cols-2">
        <ListParamsDemo namespace="orders" />
        <ListParamsDemo namespace="refunds" defaults={{ pageSize: 25 }} />
      </div>
    </div>
  )
}

const meta = preview.meta({
  title: 'Data/URL state',
  component: OrdersDemo,
  parameters: {
    docs: {
      description: {
        component:
          'The URL is the single source of truth for list params. Every control calls `setParams`; the UrlBar shows the resulting URL and history. Search writes with `replace` (debounced 300ms); everything else pushes.',
      },
    },
  },
})

const currentUrl = () => within(document.body).getByRole('status', { name: 'Current URL' })
const paramsJson = (root: HTMLElement) => within(root).getByTestId('params')
const region = (name: string) => within(document.body).getByRole('region', { name })

/** Back restores the previous params, and the controls follow. */
export const Default = meta.story({
  play: async ({ canvas, canvasElement, userEvent, loaded, step }) => {
    const url = storyUrl(loaded)

    await step('Next page twice: two history entries', async () => {
      await userEvent.click(canvas.getByRole('button', { name: 'Next page' }))
      await userEvent.click(canvas.getByRole('button', { name: 'Next page' }))
      await expect(url.entries).toEqual(['', '?orders.page=2', '?orders.page=3'])
      await expect(canvas.getByTestId('page')).toHaveTextContent('Page 3')
    })

    await step('Back restores page 2', async () => {
      await userEvent.click(canvas.getByRole('button', { name: 'Back' }))
      await expect(url.getSearch()).toBe('?orders.page=2')
      await expect(canvas.getByTestId('page')).toHaveTextContent('Page 2')
      await expect(paramsJson(canvasElement)).toHaveTextContent('"page": 2')
      await expect(currentUrl()).toHaveTextContent('/?orders.page=2')
    })

    await step('Forward returns to page 3', async () => {
      await userEvent.click(canvas.getByRole('button', { name: 'Forward' }))
      await expect(canvas.getByTestId('page')).toHaveTextContent('Page 3')
    })
  },
})

/** Typing commits once (debounced) and replaces: no new history entries. */
export const SearchReplaces = meta.story({
  tags: ['!autodocs'],
  play: async ({ canvas, userEvent, loaded }) => {
    const url = storyUrl(loaded)
    await userEvent.type(canvas.getByRole('searchbox', { name: 'Search orders' }), 'acme corp')

    await waitFor(() => expect(url.getSearch()).toBe('?orders.q=acme%20corp'))
    await expect(url.entries).toHaveLength(1)
    await expect(canvas.getByRole('searchbox', { name: 'Search orders' })).toHaveValue('acme corp')
  },
})

/** A shared link opens straight into its state. Changing a filter on page 3 goes to page 1, in one entry. */
export const FromSharedLink = meta.story({
  parameters: { url: '?orders.page=3&orders.sort=-amount&orders.f=status:in:paid' },
  play: async ({ canvas, userEvent, loaded }) => {
    const url = storyUrl(loaded)
    await expect(canvas.getByTestId('page')).toHaveTextContent('Page 3')
    await expect(canvas.getByRole('checkbox', { name: 'Paid only' })).toBeChecked()
    // Already canonical: nothing rewritten.
    await expect(url.navigateCount).toBe(0)

    await userEvent.click(canvas.getByRole('checkbox', { name: 'Paid only' }))

    await expect(url.entries).toEqual([
      '?orders.page=3&orders.sort=-amount&orders.f=status:in:paid',
      '?orders.sort=-amount',
    ])
    await expect(canvas.getByTestId('page')).toHaveTextContent('Page 1')
  },
})

/**
 * Shuffled filters, an invalid filter, defaults written out and a foreign
 * key. On load the namespace is rewritten once, in place (replace), and the
 * dropped part is listed.
 */
export const MessyLink = meta.story({
  parameters: {
    url: '?orders.f=status:in:shipped,paid&orders.page=1&network=slow&orders.size=50&orders.f=amount:gt:lots&orders.f=channel:in:web',
  },
  play: async ({ canvas, loaded }) => {
    const url = storyUrl(loaded)
    await expect(url.entries).toEqual([
      '?orders.f=channel:in:web&orders.f=status:in:paid,shipped&network=slow',
    ])
    await expect(url.navigateCount).toBe(1)
    await expect(canvas.getByText('f[1] "amount:gt:lots": "lots" is not a number')).toBeVisible()
  },
})

/** Two namespaces in one URL, fully independent. Refunds uses its own page-size default (25). */
export const TwoTables = meta.story({
  render: () => <TwoTablesDemo />,
  parameters: { url: '?refunds.page=2&refunds.sort=amount' },
  play: async ({ userEvent, loaded }) => {
    const url = storyUrl(loaded)
    const orders = region('orders list')
    const refunds = region('refunds list')
    const refundsBefore = paramsJson(refunds).textContent

    await userEvent.click(within(orders).getByRole('button', { name: 'Next page' }))
    await userEvent.click(within(orders).getByRole('button', { name: 'Sort by amount' }))
    await userEvent.click(within(orders).getByRole('checkbox', { name: 'Paid only' }))

    await expect(url.getSearch()).toBe(
      '?refunds.page=2&refunds.sort=amount&orders.sort=-amount&orders.f=status:in:paid',
    )
    await expect(paramsJson(refunds).textContent).toBe(refundsBefore)
    await expect(within(refunds).getByTestId('page')).toHaveTextContent('Page 2')
  },
})

/** Page size goes through the Select; it resets the page like any other view change. */
export const PageSize = meta.story({
  tags: ['!autodocs'],
  parameters: { url: '?orders.page=4' },
  play: async ({ canvas, userEvent, loaded }) => {
    const url = storyUrl(loaded)
    await userEvent.click(canvas.getByRole('combobox', { name: 'Rows per page' }))
    await userEvent.click(await within(document.body).findByRole('option', { name: '25 rows' }))
    await expect(url.entries).toEqual(['?orders.page=4', '?orders.size=25'])

    // Radix un-hides the page just after the list closes.
    await userEvent.click(await canvas.findByRole('button', { name: 'Reset' }))
    await expect(url.getSearch()).toBe('')
    await expect(url.entries).toHaveLength(3)
  },
})
