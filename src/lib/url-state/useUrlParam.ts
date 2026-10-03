import { useCallback, useMemo, useSyncExternalStore } from 'react'
import { useUrlAdapter } from './context'
import type { NavigateOptions } from './useListParams'

export interface UrlParamOptions<T> {
  /** Raw value → T. Return undefined for a missing or invalid value (the default is used). */
  parse: (raw: string) => T | undefined
  serialize: (value: T) => string
  defaultValue: T
}

/**
 * Rewrites one key of `search`, keeping every other key byte-for-byte and in
 * place. `value` null removes it. Returns "" when nothing is left.
 */
export function writeParam(search: string, key: string, value: string | null): string {
  const raw = search.startsWith('?') ? search.slice(1) : search
  const encoded = value === null ? null : `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
  const keyOf = (pair: string) => new URLSearchParams(pair).keys().next().value ?? ''

  const next: string[] = []
  let written = false
  for (const pair of raw.split('&')) {
    if (pair === '') continue
    if (keyOf(pair) !== key) next.push(pair)
    else if (!written && encoded !== null) {
      // The first occurrence keeps its position; duplicates are dropped.
      next.push(encoded)
      written = true
    }
  }
  if (!written && encoded !== null) next.push(encoded)
  return next.length === 0 ? '' : `?${next.join('&')}`
}

/**
 * One scalar URL param (e.g. `?view=orders`) as [value, setValue]. The URL is
 * the only copy, as with useListParams. The param is omitted when it equals
 * the default, and every other param is preserved. Setting defaults to push.
 *
 * `parse` and `serialize` should be stable (module scope): they're deps of the
 * returned setter.
 */
export function useUrlParam<T>(
  key: string,
  { parse, serialize, defaultValue }: UrlParamOptions<T>,
): [T, (value: T, opts?: NavigateOptions) => void] {
  const adapter = useUrlAdapter()
  const search = useSyncExternalStore(adapter.subscribe, adapter.getSearch, adapter.getSearch)
  const raw = new URLSearchParams(search).get(key)
  const value = useMemo(
    () => (raw === null ? defaultValue : (parse(raw) ?? defaultValue)),
    [raw, parse, defaultValue],
  )

  const setValue = useCallback(
    (next: T, opts?: NavigateOptions) => {
      const serialized = serialize(next)
      const encoded = serialized === serialize(defaultValue) ? null : serialized
      adapter.navigate(writeParam(adapter.getSearch(), key, encoded), opts?.history ?? 'push')
    },
    [adapter, key, serialize, defaultValue],
  )

  return [value, setValue]
}

/** A param restricted to a fixed set of strings, e.g. `enumParam(['7d', '30d', '90d'], '30d')`. */
export function enumParam<const T extends string>(
  values: readonly T[],
  defaultValue: T,
): UrlParamOptions<T> {
  return {
    parse: (raw) => (values as readonly string[]).includes(raw) ? (raw as T) : undefined,
    serialize: (value) => value,
    defaultValue,
  }
}
