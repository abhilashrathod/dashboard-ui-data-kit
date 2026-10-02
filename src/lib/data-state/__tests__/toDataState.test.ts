import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api'
import { toDataState, type QueryLike, type ToDataStateOptions } from '../toDataState'
import type { DataState } from '../types'

type Rows = string[]

const serverError = new ApiError({
  status: 500,
  code: 'SERVER_ERROR',
  message: 'Boom',
  requestId: 'req_000123',
})
const UPDATED_AT = 1_727_000_000_000

/** A fake query result: everything idle and empty unless overridden. */
function query(overrides: Partial<QueryLike<Rows>> = {}): QueryLike<Rows> {
  return {
    data: undefined,
    error: null,
    isPending: overrides.data === undefined,
    isError: false,
    isFetching: false,
    isPlaceholderData: false,
    dataUpdatedAt: overrides.data === undefined ? 0 : UPDATED_AT,
    refetch: vi.fn(() => Promise.resolve()) as unknown as QueryLike<Rows>['refetch'],
    ...overrides,
  }
}

const clear = () => {}
const opts = (overrides: Partial<ToDataStateOptions<Rows>> = {}): ToDataStateOptions<Rows> => ({
  isEmpty: (rows) => rows.length === 0,
  ...overrides,
})

interface Row {
  name: string
  query: Partial<QueryLike<Rows>>
  opts?: Partial<ToDataStateOptions<Rows>>
  expected: Partial<DataState<Rows>> & { status: DataState<Rows>['status'] }
}

/*
 * One row per rule in toDataState.ts, plus the precedence edges between them.
 * Rule numbers refer to the comment at the top of that file.
 */
const TABLE: Row[] = [
  {
    name: 'rule 2: pending, no data → loading',
    query: { isPending: true, isFetching: true },
    expected: { status: 'loading' },
  },
  {
    name: 'rule 1: error, no data → error',
    query: { isError: true, error: serverError },
    expected: { status: 'error', error: serverError },
  },
  {
    // TanStack v5 resets an errored, data-less query to pending when it refetches, so
    // this combination is rare; the rules still give error precedence over loading.
    name: 'rule 1 beats 2: isError + isFetching with no data → error',
    query: { isError: true, error: serverError, isFetching: true },
    expected: { status: 'error', error: serverError },
  },
  {
    name: 'rule 3: empty + error → error, not "no data"',
    query: { data: [], isError: true, error: serverError },
    expected: { status: 'error', error: serverError },
  },
  {
    name: 'rule 3 beats 5: empty + error + filtered → error, not "no results"',
    query: { data: [], isError: true, error: serverError },
    opts: { isFiltered: true, clear },
    expected: { status: 'error' },
  },
  {
    name: 'rule 4: empty + placeholder → loading (old key, new key pending)',
    query: { data: [], isPlaceholderData: true, isFetching: true },
    expected: { status: 'loading' },
  },
  {
    name: 'rule 4 beats 5: empty + placeholder + filtered → loading, not "no results"',
    query: { data: [], isPlaceholderData: true, isFetching: true },
    opts: { isFiltered: true, clear },
    expected: { status: 'loading' },
  },
  {
    name: 'rule 5: empty + filtered → no-results with clear',
    query: { data: [] },
    opts: { isFiltered: true, clear },
    expected: { status: 'no-results', clear },
  },
  {
    name: 'rule 5: empty + unfiltered → empty',
    query: { data: [] },
    expected: { status: 'empty' },
  },
  {
    name: 'rule 5: empty while refetching (not placeholder) → empty',
    query: { data: [], isFetching: true },
    expected: { status: 'empty' },
  },
  {
    name: 'rule 6: data → ready',
    query: { data: ['a'] },
    expected: {
      status: 'ready',
      data: ['a'],
      isRefetching: false,
      isPlaceholder: false,
      staleError: undefined,
      updatedAt: UPDATED_AT,
    },
  },
  {
    name: 'rule 6: data + fetching → ready, isRefetching',
    query: { data: ['a'], isFetching: true },
    expected: { status: 'ready', isRefetching: true, isPlaceholder: false },
  },
  {
    name: 'rule 6: data + placeholder → ready, isPlaceholder',
    query: { data: ['a'], isPlaceholderData: true, isFetching: true },
    expected: { status: 'ready', isRefetching: true, isPlaceholder: true },
  },
  {
    name: 'rule 6: data + error → ready with staleError (stale-while-error)',
    query: { data: ['a'], isError: true, error: serverError },
    expected: { status: 'ready', data: ['a'], staleError: serverError, updatedAt: UPDATED_AT },
  },
  {
    name: 'rule 6: data + filtered (non-empty) → ready, filters are irrelevant',
    query: { data: ['a'] },
    opts: { isFiltered: true, clear },
    expected: { status: 'ready' },
  },
]

describe('toDataState', () => {
  it.each(TABLE)('$name', ({ query: overrides, opts: optOverrides, expected }) => {
    expect(toDataState(query(overrides), opts(optOverrides))).toMatchObject(expected)
  })

  it('normalizes a non-ApiError error into UNAVAILABLE with status 0', () => {
    const cause = new TypeError('Failed to fetch')
    const state = toDataState(query({ isError: true, error: cause }), opts())
    expect(state.status).toBe('error')
    if (state.status !== 'error') return
    expect(state.error).toBeInstanceOf(ApiError)
    expect(state.error).toMatchObject({
      status: 0,
      code: 'UNAVAILABLE',
      message: 'Failed to fetch',
    })
    expect(state.error.cause).toBe(cause)
  })

  it('normalizes a thrown non-Error value too', () => {
    const state = toDataState(query({ isError: true, error: 'nope' }), opts())
    expect(state).toMatchObject({
      status: 'error',
      error: { code: 'UNAVAILABLE', message: 'Unknown error' },
    })
  })

  it('normalizes a staleError the same way', () => {
    const state = toDataState(
      query({ data: ['a'], isError: true, error: new Error('offline') }),
      opts(),
    )
    expect(state).toMatchObject({ status: 'ready', staleError: { status: 0, code: 'UNAVAILABLE' } })
  })

  it.each([
    ['error', query({ isError: true, error: serverError })],
    ['ready', query({ data: ['a'] })],
  ])('retry on %s calls refetch and returns its promise', async (_, fake) => {
    const state = toDataState(fake, opts())
    if (state.status !== 'error' && state.status !== 'ready') throw new Error('unexpected state')
    const result = state.retry()
    expect(fake.refetch).toHaveBeenCalledOnce()
    await expect(result).resolves.toBeUndefined()
  })

  it('is pure: the same input gives an equal state', () => {
    const fake = query({ data: ['a'], isFetching: true })
    expect(toDataState(fake, opts())).toStrictEqual(
      expect.objectContaining({ status: 'ready', isRefetching: true }),
    )
    expect(fake.refetch).not.toHaveBeenCalled()
  })
})
