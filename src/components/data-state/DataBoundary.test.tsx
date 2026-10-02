import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api'
import type { DataState } from '@/lib/data-state'
import { renderWithProviders } from '@/test/render'
import type * as AnnouncerModule from '../announcer'
import { DataBoundary } from './DataBoundary'

const announce = vi.hoisted(() => vi.fn())
vi.mock('../announcer', async (importOriginal) => ({
  ...(await importOriginal<typeof AnnouncerModule>()),
  useAnnounce: () => announce,
}))

const error = new ApiError({
  status: 500,
  code: 'SERVER_ERROR',
  message: 'Boom',
  requestId: 'req_000123',
})
const retry = vi.fn(() => Promise.resolve())

const STATES = {
  loading: { status: 'loading' },
  empty: { status: 'empty' },
  noResults: { status: 'no-results', clear: vi.fn() },
  error: { status: 'error', error, retry },
  ready: {
    status: 'ready',
    data: 1284,
    isRefetching: false,
    isPlaceholder: false,
    updatedAt: Date.now() - 120_000,
    retry,
  },
} satisfies Record<string, DataState<number>>

function Boundary({ state }: { state: DataState<number> }) {
  return (
    <DataBoundary state={state} label="Orders" skeleton={<div data-testid="skeleton" />}>
      {(count, meta) => (
        <p data-testid="value" data-refetching={meta.isRefetching}>
          {count}
        </p>
      )}
    </DataBoundary>
  )
}

const region = () => screen.getByRole('region', { name: 'Orders' })

function setup(state: DataState<number>) {
  const result = renderWithProviders(<Boundary state={state} />)
  return {
    ...result,
    update: (next: DataState<number>) => result.rerender(<Boundary state={next} />),
  }
}

beforeEach(() => announce.mockClear())

describe('DataBoundary: states', () => {
  afterEach(() => vi.useRealTimers())

  it('loading: reserves the space, then shows the skeleton after 150ms; aria-busy', () => {
    vi.useFakeTimers()
    setup(STATES.loading)
    expect(region()).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByTestId('skeleton').parentElement).toHaveClass('invisible')

    void act(() => {
      vi.advanceTimersByTime(150)
    })
    expect(screen.getByTestId('skeleton').parentElement).toBe(region())
  })

  it('loading: once visible, the skeleton stays at least 300ms even if data arrives', () => {
    vi.useFakeTimers()
    const { update } = setup(STATES.loading)
    void act(() => {
      vi.advanceTimersByTime(150) // skeleton appears
    })
    update(STATES.ready) // data arrives 0ms later
    expect(screen.getByTestId('skeleton')).toBeInTheDocument()
    expect(region()).toHaveAttribute('aria-busy', 'true')
    void act(() => {
      vi.advanceTimersByTime(299)
    })
    expect(screen.queryByTestId('value')).toBeNull()
    void act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(screen.getByTestId('value')).toBeInTheDocument()
    expect(region()).toHaveAttribute('aria-busy', 'false')
  })

  it('loading: a fast response never shows the skeleton', () => {
    vi.useFakeTimers()
    const { update } = setup(STATES.loading)
    void act(() => {
      vi.advanceTimersByTime(100)
    })
    update(STATES.ready)
    expect(screen.getByTestId('value')).toBeInTheDocument()
  })

  it('empty: the generic "No {label} yet"', () => {
    setup(STATES.empty)
    expect(screen.getByText('No orders yet')).toBeInTheDocument()
    expect(region()).toHaveAttribute('aria-busy', 'false')
  })

  it('no-results: "No {label} match these filters" with a working Clear filters', async () => {
    setup(STATES.noResults)
    expect(screen.getByText('No orders match these filters')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(STATES.noResults.clear).toHaveBeenCalledOnce()
  })

  it('error: copy by code, request ID, Retry; no role="alert"', async () => {
    setup(STATES.error)
    expect(screen.getByText('Something went wrong on our side')).toBeInTheDocument()
    expect(screen.getByText('req_000123')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy request ID' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(retry).toHaveBeenCalled()
  })

  it('ready: renders children with the data and meta', () => {
    setup(STATES.ready)
    expect(screen.getByTestId('value')).toHaveTextContent('1284')
    expect(region()).toHaveAttribute('aria-busy', 'false')
    expect(region()).toHaveAttribute('data-state', 'ready')
  })

  it('ready + refetching: aria-busy, and meta.isRefetching', () => {
    setup({ ...STATES.ready, isRefetching: true })
    expect(region()).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByTestId('value')).toHaveAttribute('data-refetching', 'true')
  })

  it('ready + placeholder: data-placeholder on the content wrapper (grayscale, not faded)', () => {
    setup({ ...STATES.ready, isPlaceholder: true })
    const wrapper = screen.getByTestId('value').parentElement
    expect(wrapper).toHaveAttribute('data-placeholder')
    expect(wrapper).toHaveClass('data-placeholder:grayscale')
  })

  it('ready + staleError: the stale banner above the (still visible) data', () => {
    setup({ ...STATES.ready, staleError: error })
    expect(
      screen.getByText(/Couldn't refresh · showing data from 2 minutes ago/),
    ).toBeInTheDocument()
    expect(screen.getByTestId('value')).toBeVisible()
  })

  it('custom empty and no-results UIs replace the defaults', () => {
    renderWithProviders(
      <DataBoundary
        state={STATES.empty}
        label="Revenue"
        skeleton={null}
        empty={<p>Custom empty</p>}
      >
        {() => null}
      </DataBoundary>,
    )
    expect(screen.getByText('Custom empty')).toBeInTheDocument()
  })
})

describe('DataBoundary: announcements (transitions only)', () => {
  it('announces entering error, once', () => {
    const { update } = setup(STATES.loading)
    update(STATES.error)
    update({ ...STATES.error }) // still error: no repeat
    expect(announce.mock.calls).toEqual([['Orders failed to load']])
  })

  it('announces error → ready', () => {
    const { update } = setup(STATES.error)
    announce.mockClear()
    update(STATES.ready)
    expect(announce.mock.calls).toEqual([['Orders loaded']])
  })

  it('announces entering staleError, once', () => {
    const { update } = setup(STATES.ready)
    update({ ...STATES.ready, staleError: error })
    update({ ...STATES.ready, staleError: error, isRefetching: true })
    expect(announce.mock.calls).toEqual([["Orders couldn't refresh"]])
  })

  it('does not announce ordinary loads or refetches', () => {
    const { update } = setup(STATES.loading)
    update(STATES.ready)
    update({ ...STATES.ready, isRefetching: true })
    update(STATES.ready)
    update(STATES.empty)
    expect(announce).not.toHaveBeenCalled()
  })
})

describe('DataBoundary: retry (TanStack v5: error → loading → ready)', () => {
  it('keeps the error UI with a busy Retry while reloading, then lands focus on the region', async () => {
    const { update } = setup(STATES.error)
    const retryButton = screen.getByRole('button', { name: 'Retry' })
    retryButton.focus()

    update(STATES.loading) // the refetch reset the query to pending
    expect(screen.getByRole('button', { name: 'Retry' })).toBe(retryButton)
    expect(retryButton).toHaveAttribute('aria-busy', 'true')
    expect(retryButton).toHaveFocus()
    expect(screen.queryByTestId('skeleton')).toBeNull()
    expect(region()).toHaveAttribute('aria-busy', 'true')

    update(STATES.ready)
    await act(() => Promise.resolve())
    expect(region()).toHaveFocus()
    expect(announce.mock.calls).toContainEqual(['Orders loaded'])
  })

  it('announces again when a retry fails', () => {
    const { update } = setup(STATES.error)
    announce.mockClear()
    update(STATES.loading)
    update({ ...STATES.error })
    expect(announce.mock.calls).toEqual([['Orders failed to load']])
  })

  it('shows the skeleton for an ordinary first load (no previous error)', () => {
    setup(STATES.loading)
    expect(screen.getByTestId('skeleton')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull()
  })
})

describe('DataBoundary: focus after retry', () => {
  it('moves focus to the region when the focused Retry button unmounts', async () => {
    const { update } = setup(STATES.error)
    const retryButton = screen.getByRole('button', { name: 'Retry' })
    retryButton.focus()
    expect(retryButton).toHaveFocus()

    update(STATES.ready)
    await act(() => Promise.resolve())
    expect(region()).toHaveFocus()
  })

  it('leaves focus alone when it was outside the boundary', () => {
    const { update } = setup(STATES.error)
    const outside = document.createElement('button')
    document.body.append(outside)
    outside.focus()

    update(STATES.ready)
    expect(outside).toHaveFocus()
    outside.remove()
  })
})
