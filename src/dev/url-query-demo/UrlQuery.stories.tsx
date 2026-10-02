import { expect, waitFor, within } from 'storybook/test'
import preview, {
  type NetworkParameter,
  type QueryParameter,
  storyUrl,
} from '../../../.storybook/preview'
import { UrlQueryDemo } from './UrlQueryDemo'

/*
 * Data/URL ↔ Query: the URL-state controls driving real queries against the
 * MSW API, with a live request log. Use it to check the claims in
 * docs/url-state.md by hand: one change = one request, Back = none, fast
 * clicks = aborts, next page = prefetched.
 */

const meta = preview.meta({
  title: 'Data/URL ↔ Query',
  // Keeps story URLs ASCII (the title alone would give data-url-↔-query--default).
  id: 'data-url-query',
  component: UrlQueryDemo,
  parameters: {
    docs: {
      description: {
        component:
          'useOrdersTableData end to end: URL → canonical key → TanStack Query → MSW. The request log tags aborted requests, next-page prefetches and retries. Flip the Network toolbar to slow to see placeholder dimming and aborts.',
      },
    },
  },
})

const TIMEOUT = { timeout: 5000 }
const rows = () => within(document.body).queryAllByTestId('request-row')
const searchOf = (row: HTMLElement) => new URLSearchParams(row.dataset.search)
const tagsOf = (row: HTMLElement) => (row.dataset.tags ?? '').split(' ').filter(Boolean)
/** Every logged request has a status (or was aborted): nothing in flight. */
const allSettled = () =>
  rows().every((row) => !row.textContent?.includes('…') || tagsOf(row).includes('aborted'))

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** One filter change = one list request (plus its next-page prefetch); Back = no request. */
export const Default = meta.story({
  play: async ({ canvas, userEvent, loaded, step }) => {
    const url = storyUrl(loaded)

    await step('Initial load: page 1 + the page-2 prefetch', async () => {
      await waitFor(async () => {
        await expect(rows()).toHaveLength(2)
        await expect(allSettled()).toBe(true)
      }, TIMEOUT)
      await expect(rows().filter((row) => tagsOf(row).includes('prefetch'))).toHaveLength(1)
    })

    await step('Filter on paid: exactly one new list request', async () => {
      await userEvent.click(canvas.getByRole('checkbox', { name: 'Paid only' }))
      await waitFor(async () => {
        await expect(rows()).toHaveLength(4)
        await expect(allSettled()).toBe(true)
      }, TIMEOUT)
      const paid = rows().filter((row) => searchOf(row).getAll('f').includes('status:in:paid'))
      const visible = paid.filter((row) => !tagsOf(row).includes('prefetch'))
      await expect(visible).toHaveLength(1)
      await expect(searchOf(visible[0]!).get('page')).toBeNull()
      await expect(paid.filter((row) => tagsOf(row).includes('prefetch'))).toHaveLength(1)
    })

    await step('Back: served from cache, no request', async () => {
      await userEvent.click(canvas.getByRole('button', { name: 'Back' }))
      await expect(url.getSearch()).toBe('')
      await expect(canvas.getByRole('checkbox', { name: 'Paid only' })).not.toBeChecked()
      await pause(800) // longer than the mock's max latency
      await expect(rows()).toHaveLength(4)
    })
  },
})

/** Slow network: old rows dim while the next key loads, and fast clicks abort stale requests. */
export const Slow = meta.story({
  parameters: { network: { mode: 'slow' } satisfies NetworkParameter },
})

/** 30% of requests fail with 503 and the app's retry policy is on: the log shows the retries. */
export const Flaky = meta.story({
  parameters: {
    network: { mode: 'flaky' } satisfies NetworkParameter,
    query: { retry: true } satisfies QueryParameter,
  },
})

/** Opens straight into a shared view: page 3, largest first, paid only. */
export const FromSharedLink = meta.story({
  parameters: { url: '?orders.page=3&orders.sort=-amount&orders.f=status:in:paid' },
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId('page')).toHaveTextContent('Page 3')
    await waitFor(
      () => expect(canvas.getByRole('region', { name: 'Orders' })).toHaveTextContent(/page 3 of/),
      TIMEOUT,
    )
  },
})
