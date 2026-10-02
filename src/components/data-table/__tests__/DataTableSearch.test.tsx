import { act, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/render'
import { DataTableSearch } from '../DataTableSearch'
import { SEARCH_DEBOUNCE_MS } from '../model'
import { ParamsOnlyTable } from './harness'

/*
 * fireEvent, not userEvent: userEvent's own scheduling doesn't run under fake
 * timers here, and the debounce is the thing under test. One change event per
 * keystroke, as a browser sends.
 */

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
})

function setup(url = '') {
  const utils = renderWithProviders(
    <ParamsOnlyTable>
      <DataTableSearch />
    </ParamsOnlyTable>,
    { url },
  )
  const input = screen.getByRole('searchbox', { name: 'Search orders' })
  const q = () => new URLSearchParams(utils.urlAdapter.getSearch()).get('orders.q')
  /** Types `text` after the current value, one keystroke at a time. */
  const type = (text: string) => {
    for (const char of text) {
      fireEvent.change(input, { target: { value: (input as HTMLInputElement).value + char } })
    }
  }
  const wait = (ms: number) => {
    act(() => {
      vi.advanceTimersByTime(ms)
    })
  }
  return { ...utils, input, q, type, wait }
}

describe('DataTable.Search', () => {
  it('commits after the debounce, replacing the history entry', () => {
    const { input, q, type, wait, urlAdapter } = setup()

    type('acme')
    wait(SEARCH_DEBOUNCE_MS - 1)
    expect(q()).toBeNull() // still a draft
    expect(input).toHaveValue('acme')

    wait(1)
    expect(q()).toBe('acme')
    expect(urlAdapter.entries).toHaveLength(1) // replace, not push
    expect(urlAdapter.navigateCount).toBe(1) // one commit, not one per keystroke
  })

  it('commits immediately on Enter', () => {
    const { input, q, type, wait, urlAdapter } = setup()
    type('acme')
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(q()).toBe('acme')

    wait(SEARCH_DEBOUNCE_MS) // the pending debounce was cancelled, not re-run
    expect(urlAdapter.navigateCount).toBe(1)
  })

  it('follows an outside change of q (Back, Clear filters, a link)', () => {
    const { input, urlAdapter } = setup('?orders.q=acme')
    expect(input).toHaveValue('acme')

    act(() => urlAdapter.navigate('?orders.q=globex', 'push'))
    expect(input).toHaveValue('globex')

    act(() => urlAdapter.back())
    expect(input).toHaveValue('acme')

    act(() => urlAdapter.navigate('', 'push'))
    expect(input).toHaveValue('')
  })

  it("doesn't reset the draft after its own commit (the URL trims; the draft keeps typing)", () => {
    const { input, q, type, wait, urlAdapter } = setup()

    type('acme ')
    wait(SEARCH_DEBOUNCE_MS)
    expect(q()).toBe('acme') // trimmed in the URL
    expect(input).toHaveValue('acme ') // the trailing space survives

    type('co')
    expect(input).toHaveValue('acme co')
    wait(SEARCH_DEBOUNCE_MS)
    expect(q()).toBe('acme co')
    expect(input).toHaveValue('acme co')
    expect(urlAdapter.navigateCount).toBe(2) // no extra writes: no loop
  })

  it('drops a pending commit when the URL changes from outside first', () => {
    const { input, q, type, wait, urlAdapter } = setup()

    type('ac')
    act(() => urlAdapter.navigate('?orders.q=globex', 'push'))
    wait(SEARCH_DEBOUNCE_MS)

    expect(q()).toBe('globex')
    expect(input).toHaveValue('globex')
  })

  it('clears q when the box is cleared', () => {
    const { q, wait } = setup('?orders.q=acme')
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }))
    wait(SEARCH_DEBOUNCE_MS)
    expect(q()).toBeNull()
  })
})
