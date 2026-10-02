import {
  decodeListParams,
  listParamsKey,
  normalizeListParams,
  withDefaults,
  type ListParams,
  type Sort,
} from '@/contracts'

/*
 * Pure helpers for one list's slice of the URL. No React.
 *
 * Several lists share one query string, so each list's keys carry a prefix:
 * ?orders.page=2&orders.f=status:in:paid&refunds.sort=amount&network=slow
 * A namespace owns every key that starts with "<namespace>." and nothing else.
 */

function prefixOf(namespace: string): string {
  // "orders" and "orders.archive" would share the "orders." prefix.
  if (namespace === '' || namespace.includes('.')) {
    throw new Error(`Invalid URL-state namespace "${namespace}": must be non-empty without "."`)
  }
  return `${namespace}.`
}

/** Decodes one raw `key=value` pair the way URLSearchParams does ("+" is a space). */
function decodeKey(rawPair: string): string {
  return new URLSearchParams(rawPair).keys().next().value ?? ''
}

/**
 * Like encodeURIComponent, but leaves ":", "," and "/" readable. They have no
 * meaning inside a query value, and a shared link reads
 * f=status:in:paid,shipped instead of f=status%3Ain%3Apaid%2Cshipped.
 */
function encodePart(value: string): string {
  return encodeURIComponent(value).replace(/%3A/gi, ':').replace(/%2C/gi, ',').replace(/%2F/gi, '/')
}

/** This namespace's keys, prefix stripped. Other keys are ignored. */
export function readNamespace(search: string, namespace: string): URLSearchParams {
  const prefix = prefixOf(namespace)
  const slice = new URLSearchParams()
  for (const [key, value] of new URLSearchParams(search)) {
    if (key.startsWith(prefix)) slice.append(key.slice(prefix.length), value)
  }
  return slice
}

/**
 * Replace this namespace's keys with `nsParams` (prefixed, in their given order).
 * Every other key is kept byte-for-byte, in its original order. The namespace
 * block goes where its first key was (or at the end), so the URL doesn't
 * reshuffle as you click. Returns "" when nothing is left, otherwise "?…".
 */
export function writeNamespace(
  search: string,
  namespace: string,
  nsParams: URLSearchParams,
): string {
  const prefix = prefixOf(namespace)
  const block = [...nsParams].map(
    ([key, value]) => `${encodePart(prefix + key)}=${encodePart(value)}`,
  )

  const pairs: string[] = []
  let insertAt = -1
  const raw = search.startsWith('?') ? search.slice(1) : search
  for (const pair of raw.split('&')) {
    if (pair === '') continue
    if (decodeKey(pair).startsWith(prefix)) {
      if (insertAt === -1) insertAt = pairs.length
    } else {
      pairs.push(pair)
    }
  }
  pairs.splice(insertAt === -1 ? pairs.length : insertAt, 0, ...block)
  return pairs.length === 0 ? '' : `?${pairs.join('&')}`
}

// ── Per-namespace defaults ───────────────────────────────────────────────────

/**
 * What a list may override. Page always starts at 1, and default filters or q
 * would need an explicit "none" marker in the URL, so those aren't allowed.
 */
export interface ListDefaults {
  pageSize?: number
  sort?: Sort
}

export function resolveDefaults(defaults: ListDefaults = {}): ListParams {
  return withDefaults({ pageSize: defaults.pageSize, sort: defaults.sort })
}

function isValidScalar(slice: URLSearchParams, key: 'size' | 'sort'): boolean {
  const only = new URLSearchParams(slice.getAll(key).map((value) => [key, value]))
  return decodeListParams(only, { mode: 'strict' }).ok
}

/**
 * Lenient decode of a namespace slice. Missing or invalid size/sort fall back
 * to this list's defaults (not the global ones); everything else is
 * decodeListParams as-is.
 */
export function decodeSlice(
  slice: URLSearchParams,
  defaults: ListParams,
): { params: ListParams; dropped: string[] } {
  const { params, dropped } = decodeListParams(slice, { mode: 'lenient' })
  return {
    params: normalizeListParams({
      ...params,
      pageSize:
        slice.has('size') && isValidScalar(slice, 'size') ? params.pageSize : defaults.pageSize,
      sort: slice.has('sort') && isValidScalar(slice, 'sort') ? params.sort : defaults.sort,
    }),
    dropped,
  }
}

/**
 * Canonical slice for `params`: encodeListParams' order and formatting, but
 * size and sort are omitted when they equal THIS list's defaults (and written
 * when they don't, even if they equal the global ones).
 */
export function encodeSlice(params: ListParams, defaults: ListParams): URLSearchParams {
  const canonical = new URLSearchParams(listParamsKey(params))
  const slice = new URLSearchParams()
  if (params.page !== 1) slice.set('page', String(params.page))
  if (params.pageSize !== defaults.pageSize) slice.set('size', String(params.pageSize))
  if (params.sort !== defaults.sort) slice.set('sort', params.sort)
  for (const key of ['q', 'f']) {
    for (const value of canonical.getAll(key)) slice.append(key, value)
  }
  return slice
}

/** The params a canonical key (listParamsKey) stands for. */
export function paramsFromKey(key: string): ListParams {
  return decodeListParams(new URLSearchParams(key), { mode: 'lenient' }).params
}

// ── Updates ──────────────────────────────────────────────────────────────────

/**
 * The page-reset rule: changing what the list shows (filters, sort, q, page
 * size) goes back to page 1, unless the update also set the page itself.
 *
 * "Changed" means canonically different: comparing listParamsKey with the page
 * held equal covers each part at once, so reordered filters or an untrimmed q
 * aren't a change.
 */
export function applyParamsUpdate(prev: ListParams, next: ListParams): ListParams {
  const pageChanged = prev.page !== next.page
  if (pageChanged) return next
  const restChanged = listParamsKey({ ...prev, page: 1 }) !== listParamsKey({ ...next, page: 1 })
  return restChanged && next.page !== 1 ? { ...next, page: 1 } : next
}
