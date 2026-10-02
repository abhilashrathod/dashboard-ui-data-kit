import type { ApiError } from '@/lib/api'

/**
 * Every state a data component can be in. Derive it with toDataState(), render
 * it with <DataBoundary>, or branch on it with matchDataState().
 */
export type DataState<T> =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'no-results'; clear?: () => void }
  | { status: 'error'; error: ApiError; retry: () => Promise<unknown> }
  | {
      status: 'ready'
      data: T
      /** A background fetch is in flight. */
      isRefetching: boolean
      /** Showing the previous key's results while the new key loads (keepPreviousData). */
      isPlaceholder: boolean
      /** The last refresh failed; the data shown is older (see updatedAt). */
      staleError?: ApiError
      /** When the data shown was fetched (dataUpdatedAt, ms). */
      updatedAt: number
      retry: () => Promise<unknown>
    }

export type DataStatus = DataState<unknown>['status']

type StateOf<T, S extends DataStatus> = Extract<DataState<T>, { status: S }>

/** What a ready render receives besides the data. */
export type ReadyMeta = Pick<
  StateOf<unknown, 'ready'>,
  'isRefetching' | 'isPlaceholder' | 'staleError' | 'updatedAt'
>

export interface DataStateHandlers<T, R> {
  loading: (state: StateOf<T, 'loading'>) => R
  empty: (state: StateOf<T, 'empty'>) => R
  noResults: (state: StateOf<T, 'no-results'>) => R
  error: (state: StateOf<T, 'error'>) => R
  ready: (state: StateOf<T, 'ready'>) => R
}

function assertNever(value: never): never {
  throw new Error(`Unhandled data state: ${JSON.stringify(value)}`)
}

/**
 * Exhaustive branching on a DataState. Every handler is required, and the
 * `never` check below means adding a status to DataState breaks the compile
 * here and at every call site until it's handled.
 */
export function matchDataState<T, R>(state: DataState<T>, handlers: DataStateHandlers<T, R>): R {
  switch (state.status) {
    case 'loading':
      return handlers.loading(state)
    case 'empty':
      return handlers.empty(state)
    case 'no-results':
      return handlers.noResults(state)
    case 'error':
      return handlers.error(state)
    case 'ready':
      return handlers.ready(state)
    default:
      return assertNever(state)
  }
}
