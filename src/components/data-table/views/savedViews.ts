import { decodeListParams, listParamsKey, withDefaults, type ListParams } from '@/contracts'
import { writeNamespace } from '@/lib/url-state'

/*
 * A saved view is a stored URL query, nothing more: the canonical encoding of
 * filters, sort, q and page size (never the page). Applying one writes it back
 * to the URL; "which view am I on" is a string compare against the current
 * params. No second copy of the list state exists (docs/data-table.md#saved-views).
 */

/** A built-in view. `params` may be a function, for views relative to today ("last 7 days"). */
export interface ViewPreset {
  id: string
  name: string
  params: Partial<ListParams> | (() => Partial<ListParams>)
}

/** A user view, as stored in localStorage. */
export interface StoredView {
  id: string
  name: string
  /** viewKeyOf(params): the canonical query without the page. */
  query: string
  /** ISO timestamp. */
  createdAt: string
}

/** A preset or a user view, resolved to comparable form. */
export interface ResolvedView {
  id: string
  name: string
  kind: 'preset' | 'user'
  params: ListParams
  key: string
}

export const VIEW_NAME_MAX = 40

export const viewsStorageKey = (tableId: string) => `dtk:views:${tableId}`
const lastViewKey = (tableId: string) => `dtk:views:last:${tableId}`

/** The canonical encoding of everything a view fixes: filters, sort, q and page size. */
export function viewKeyOf(params: ListParams): string {
  return listParamsKey({ ...params, page: 1 })
}

export function paramsOfQuery(query: string): ListParams {
  return { ...decodeListParams(new URLSearchParams(query), { mode: 'lenient' }).params, page: 1 }
}

export function resolvePreset(preset: ViewPreset): ResolvedView {
  const partial = typeof preset.params === 'function' ? preset.params() : preset.params
  const params = withDefaults({ ...partial, page: 1 })
  return { id: preset.id, name: preset.name, kind: 'preset', params, key: viewKeyOf(params) }
}

export function resolveStored(view: StoredView): ResolvedView {
  const params = paramsOfQuery(view.query)
  return { id: view.id, name: view.name, kind: 'user', params, key: viewKeyOf(params) }
}

const isStoredView = (value: unknown): value is StoredView => {
  if (!value || typeof value !== 'object') return false
  const view = value as Record<string, unknown>
  return (
    typeof view.id === 'string' &&
    typeof view.name === 'string' &&
    typeof view.query === 'string' &&
    typeof view.createdAt === 'string'
  )
}

/** Unreadable storage, bad JSON or the wrong shape → []. Malformed entries are skipped. */
export function readStoredViews(tableId: string): StoredView[] {
  try {
    const raw = window.localStorage.getItem(viewsStorageKey(tableId))
    if (raw === null) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isStoredView) : []
  } catch {
    return []
  }
}

export function writeStoredViews(tableId: string, views: readonly StoredView[]): void {
  try {
    if (views.length === 0) window.localStorage.removeItem(viewsStorageKey(tableId))
    else window.localStorage.setItem(viewsStorageKey(tableId), JSON.stringify(views))
  } catch {
    // Storage unavailable: the views still work until reload.
  }
}

/** The last view the user applied, for the "(edited)" label. Session-scoped. */
export function readLastViewId(tableId: string): string | null {
  try {
    return window.sessionStorage.getItem(lastViewKey(tableId))
  } catch {
    return null
  }
}

export function writeLastViewId(tableId: string, id: string | null): void {
  try {
    if (id === null) window.sessionStorage.removeItem(lastViewKey(tableId))
    else window.sessionStorage.setItem(lastViewKey(tableId), id)
  } catch {
    // Not remembered across remounts; the in-memory state still applies.
  }
}

/**
 * A full URL that opens `params` in `namespace`, keeping every other param of
 * `search`. Size and sort are written explicitly: the stored query is relative
 * to the global defaults, the namespace may have its own, and the receiving
 * page canonicalizes the link on load anyway.
 */
export function viewLink(search: string, namespace: string, params: ListParams): string {
  const slice = new URLSearchParams(listParamsKey({ ...params, page: 1 }))
  slice.set('size', String(params.pageSize))
  slice.set('sort', params.sort)
  const { origin, pathname, hash } = window.location
  return `${origin}${pathname}${writeNamespace(search, namespace, slice)}${hash}`
}

/** Case-insensitive name clash among user views, ignoring `exceptId` (the one being renamed). */
export function nameTaken(views: readonly StoredView[], name: string, exceptId?: string): boolean {
  const wanted = name.trim().toLowerCase()
  return views.some((view) => view.id !== exceptId && view.name.trim().toLowerCase() === wanted)
}

export function newViewId(): string {
  return `view_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}
