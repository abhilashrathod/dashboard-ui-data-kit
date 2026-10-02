import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api'
import { matchDataState, type DataState } from '../types'

const retry = () => Promise.resolve()
const error = new ApiError({ status: 500, code: 'SERVER_ERROR', message: 'Boom' })

const STATES: DataState<number>[] = [
  { status: 'loading' },
  { status: 'empty' },
  { status: 'no-results' },
  { status: 'error', error, retry },
  { status: 'ready', data: 42, isRefetching: false, isPlaceholder: false, updatedAt: 1, retry },
]

const handlers = () => ({
  loading: vi.fn(() => 'loading'),
  empty: vi.fn(() => 'empty'),
  noResults: vi.fn(() => 'noResults'),
  error: vi.fn(() => 'error'),
  ready: vi.fn(() => 'ready'),
})

describe('matchDataState', () => {
  it.each(STATES)('calls the "$status" handler, and only that one, with the state', (state) => {
    const h = handlers()
    const key = state.status === 'no-results' ? 'noResults' : state.status
    expect(matchDataState(state, h)).toBe(key)
    expect(h[key]).toHaveBeenCalledWith(state)
    const others = Object.entries(h).filter(([name]) => name !== key)
    for (const [, handler] of others) expect(handler).not.toHaveBeenCalled()
  })

  it('narrows the state for each handler', () => {
    const state = STATES[4]!
    const value = matchDataState(state, {
      loading: () => 0,
      empty: () => 0,
      noResults: () => 0,
      error: (s) => s.error.status,
      ready: (s) => s.data + 1,
    })
    expect(value).toBe(43)
  })

  it('requires every handler at the type level', () => {
    const state = STATES[0]!
    const incomplete = { loading: () => 1, empty: () => 1, noResults: () => 1, error: () => 1 }
    // `pnpm typecheck` fails if this stops being an error.
    // @ts-expect-error the "ready" handler is missing
    const call = () => matchDataState(state, incomplete)
    expect(call).toBeTypeOf('function')
  })
})
