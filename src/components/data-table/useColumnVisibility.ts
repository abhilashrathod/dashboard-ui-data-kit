import type { ColumnVisibilityState } from '@tanstack/react-table'
import { useCallback, useMemo, useState } from 'react'
import { columnIdOf, type ColumnLike } from './model'

/*
 * Column visibility is a per-user PREFERENCE, so it lives in localStorage,
 * not in the URL. The URL says WHAT data you're looking at (and is shared);
 * which columns one person likes to see isn't part of that. A shared link
 * shouldn't hide the recipient's columns.
 */

export const columnStorageKey = (tableId: string) => `dtk:columns:${tableId}`

const isHideable = (column: ColumnLike) => column.meta?.hideable !== false

/**
 * The stored hidden ids, cleaned up: unknown or non-hideable ids are ignored,
 * and anything unreadable (bad JSON, the wrong shape, no storage at all) falls
 * back to the default (everything visible). So does a stored state that would
 * hide every hideable column.
 */
function readHidden(key: string, hideable: readonly string[]): ReadonlySet<string> {
  try {
    const raw = window.localStorage.getItem(key)
    if (raw === null) return new Set()
    const parsed: unknown = JSON.parse(raw)
    const stored =
      parsed && typeof parsed === 'object' && Array.isArray((parsed as { hidden?: unknown }).hidden)
        ? (parsed as { hidden: unknown[] }).hidden.filter(
            (id): id is string => typeof id === 'string',
          )
        : []
    const hidden = new Set(stored.filter((id) => hideable.includes(id)))
    return hidden.size >= hideable.length ? new Set() : hidden
  } catch {
    return new Set()
  }
}

function writeHidden(key: string, hidden: ReadonlySet<string>) {
  try {
    if (hidden.size === 0) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, JSON.stringify({ hidden: [...hidden] }))
  } catch {
    // Storage can be unavailable (private mode, quota); the in-memory state still applies.
  }
}

export interface ColumnVisibility {
  /** For TanStack's state.columnVisibility: id → visible. */
  state: ColumnVisibilityState
  isVisible: (id: string) => boolean
  /** meta.hideable !== false. */
  isHideable: (id: string) => boolean
  /** Hideable, and not the last visible hideable column. */
  canHide: (id: string) => boolean
  /** Ignored when it would break a rule (non-hideable, or the last visible column). */
  setVisible: (id: string, visible: boolean) => void
  /** Apply a whole visibility map, e.g. from TanStack's updater. Same rules. */
  apply: (next: ColumnVisibilityState) => void
  /** Everything visible again; forgets the stored preference. */
  reset: () => void
}

/**
 * Which columns are shown, persisted per table under `dtk:columns:${tableId}`.
 * Columns with meta.hideable === false are always visible, and at least one
 * hideable column always stays visible.
 */
export function useColumnVisibility(
  tableId: string,
  columns: readonly ColumnLike[],
): ColumnVisibility {
  const key = columnStorageKey(tableId)
  const ids = useMemo(
    () => columns.map(columnIdOf).filter((id): id is string => id !== undefined),
    [columns],
  )
  const hideable = useMemo(
    () =>
      columns
        .filter(isHideable)
        .map(columnIdOf)
        .filter((id): id is string => id !== undefined),
    [columns],
  )

  const [hidden, setHidden] = useState(() => readHidden(key, hideable))

  const commit = useCallback(
    (next: ReadonlySet<string>) => {
      const cleaned = new Set([...next].filter((id) => hideable.includes(id)))
      // The last-visible guard: refuse a change that would hide every hideable column.
      if (cleaned.size >= hideable.length && hideable.length > 0) return
      writeHidden(key, cleaned)
      setHidden(cleaned)
    },
    [key, hideable],
  )

  return useMemo(() => {
    const visibleHideable = hideable.filter((id) => !hidden.has(id)).length
    const isVisible = (id: string) => !hidden.has(id)
    return {
      state: Object.fromEntries(ids.map((id) => [id, !hidden.has(id)])),
      isVisible,
      isHideable: (id) => hideable.includes(id),
      canHide: (id) => hideable.includes(id) && !(isVisible(id) && visibleHideable <= 1),
      setVisible: (id, visible) => {
        const next = new Set(hidden)
        if (visible) next.delete(id)
        else next.add(id)
        commit(next)
      },
      apply: (next) => commit(new Set(ids.filter((id) => next[id] === false))),
      reset: () => commit(new Set()),
    }
  }, [ids, hideable, hidden, commit])
}
