import { useCallback, useLayoutEffect, useMemo, useSyncExternalStore } from 'react'
import { listParamsKey, type ListParams } from '@/contracts'
import {
  applyParamsUpdate,
  decodeSlice,
  encodeSlice,
  paramsFromKey,
  readNamespace,
  resolveDefaults,
  writeNamespace,
  type ListDefaults,
} from './namespace'
import { useUrlAdapter } from './context'
import type { UrlAdapter } from './adapter'

const NOTHING_DROPPED: readonly string[] = Object.freeze([])

/*
 * Canonicalizing a messy link removes its invalid parts from the URL, so the
 * decoder can't report them afterwards. This remembers what was dropped,
 * per adapter, keyed by the namespace and the URL entry the rewrite produced.
 * It isn't a copy of the params: it's a note about one history entry, and any
 * later navigation lands on a different search string that has no note.
 */
const dropNotes = new WeakMap<UrlAdapter, Map<string, readonly string[]>>()
const noteKey = (namespace: string, search: string) => `${namespace}\n${search}`

function recordDropped(adapter: UrlAdapter, namespace: string, search: string, dropped: string[]) {
  if (dropped.length === 0) return
  let notes = dropNotes.get(adapter)
  if (!notes) {
    notes = new Map<string, readonly string[]>()
    dropNotes.set(adapter, notes)
  }
  notes.set(noteKey(namespace, search), dropped)
}

export type HistoryMode = 'push' | 'replace'
export interface NavigateOptions {
  /** Default 'push'. Use 'replace' for keystroke-level changes (search). */
  history?: HistoryMode
}
export type ParamsUpdater = ListParams | ((prev: ListParams) => ListParams)

export interface UseListParamsResult {
  /** Canonical params. Same object for as long as this namespace's params are equal. */
  params: ListParams
  setParams: (updater: ParamsUpdater, opts?: NavigateOptions) => void
  /** Clear this namespace from the URL (back to defaults). */
  resetParams: (opts?: NavigateOptions) => void
  /** Parts of the link the lenient decoder threw away, for an optional UI hint. */
  dropped: readonly string[]
  /** listParamsKey(params): the query key for this list. */
  key: string
}

/**
 * One list's params, read from and written to the URL. The URL is the only
 * copy: there is no useState here, and nothing syncs it into React state.
 * See docs/url-state.md.
 */
export function useListParams(
  namespace: string,
  { defaults }: { defaults?: ListDefaults } = {},
): UseListParamsResult {
  const adapter = useUrlAdapter()
  // The snapshot is the raw search string: a primitive, so React's equality
  // check is a string compare and unchanged URLs never re-render.
  const search = useSyncExternalStore(adapter.subscribe, adapter.getSearch, adapter.getSearch)

  const pageSizeDefault = defaults?.pageSize
  const sortDefault = defaults?.sort
  const nsDefaults = useMemo(
    () => resolveDefaults({ pageSize: pageSizeDefault, sort: sortDefault }),
    [pageSizeDefault, sortDefault],
  )

  // This namespace's slice, as written in the URL right now (maybe messy).
  const slice = readNamespace(search, namespace).toString()
  const decoded = useMemo(
    () => decodeSlice(new URLSearchParams(slice), nsDefaults),
    [slice, nsDefaults],
  )
  const key = listParamsKey(decoded.params)

  // Referential stability: `params` is memoized on the CANONICAL key, not on
  // the search string. Changing another namespace, ?network, or reordering
  // this namespace's filters yields the same key, so the same object comes
  // back. Downstream useMemo deps and query keys see "no change" and do no work.
  const params = useMemo(() => paramsFromKey(key), [key])
  const canonicalSlice = encodeSlice(params, nsDefaults).toString()

  // Rebuilds the params from the URL as it is at call time, not from this
  // render's closure, so two setParams calls in one tick compose instead of
  // the second overwriting the first.
  const readCurrent = useCallback(() => {
    const current = adapter.getSearch()
    const { params: prev, dropped } = decodeSlice(readNamespace(current, namespace), nsDefaults)
    return { current, prev, dropped }
  }, [adapter, namespace, nsDefaults])

  const setParams = useCallback(
    (updater: ParamsUpdater, opts?: NavigateOptions) => {
      const { current, prev } = readCurrent()
      const next = applyParamsUpdate(prev, typeof updater === 'function' ? updater(prev) : updater)
      if (listParamsKey(next) === listParamsKey(prev)) return
      adapter.navigate(
        writeNamespace(current, namespace, encodeSlice(next, nsDefaults)),
        opts?.history ?? 'push',
      )
    },
    [adapter, namespace, nsDefaults, readCurrent],
  )

  const resetParams = useCallback(
    (opts?: NavigateOptions) => {
      const current = adapter.getSearch()
      adapter.navigate(
        writeNamespace(current, namespace, new URLSearchParams()),
        opts?.history ?? 'push',
      )
    },
    [adapter, namespace],
  )

  // Canonicalize on load: the ONLY effect in the URL layer.
  //
  // A link may carry this namespace in a non-canonical form (shuffled filters,
  // defaults written out, invalid parts). We rewrite it once, with 'replace',
  // so the address bar, shared links and Back all show one spelling per state.
  //
  // Why it can't loop: it only acts while the slice in the URL differs from
  // its canonical encoding. After the rewrite the URL IS the canonical
  // encoding, so on the next render `slice === canonicalSlice` and it does
  // nothing. Encoding is idempotent (canonical in → same canonical out), and
  // the adapter ignores navigation to the URL it's already on, so even a
  // second instance of this hook racing in the same commit is a no-op.
  //
  // Why a layout effect: it runs before paint, so the messy URL is never shown.
  // It is not a sync: there's no second copy of the state, only the URL.
  useLayoutEffect(() => {
    if (slice === canonicalSlice) return
    const { current, prev, dropped } = readCurrent()
    const next = writeNamespace(current, namespace, encodeSlice(prev, nsDefaults))
    recordDropped(adapter, namespace, next, dropped)
    adapter.navigate(next, 'replace')
  }, [adapter, namespace, nsDefaults, readCurrent, slice, canonicalSlice])

  const dropped =
    decoded.dropped.length > 0
      ? decoded.dropped
      : (dropNotes.get(adapter)?.get(noteKey(namespace, search)) ?? NOTHING_DROPPED)

  return { params, setParams, resetParams, dropped, key }
}
