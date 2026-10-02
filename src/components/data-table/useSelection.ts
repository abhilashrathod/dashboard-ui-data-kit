import { useMemo, useState } from 'react'
import type { ListParams } from '@/contracts'
import {
  clearPage,
  emptySelection,
  pageKeyOf,
  removeIds,
  selectPage,
  toggleRow,
  viewKeyOf,
  type PageRows,
  type SelectionState,
} from './selection'

export interface DataTableSelection<TData> {
  /** Selected ids, in the order they were selected. */
  ids: string[]
  /** Their rows: fresh from the current page when it has them, else the snapshot taken on selection. */
  rows: TData[]
  count: number
  isSelected: (id: string) => boolean
  /** `range: true` for shift+click: selects (or deselects) from the last clicked row to this one. */
  toggle: (id: string, opts?: { range?: boolean }) => void
  selectPage: () => void
  clearPage: () => void
  clear: () => void
  remove: (ids: readonly string[]) => void
  /** The ids on the current page (empty while a placeholder page is shown). */
  pageIds: string[]
}

/**
 * Row selection for one table. Local React state, deliberately not the URL:
 * a selection is a transient working set ("these 12 rows, right now"), not a
 * view anyone would share or come back to with Back. Rules live in selection.ts.
 */
export function useSelection<TData>(
  params: ListParams,
  pageRows: readonly TData[],
  getRowId: (row: TData) => string,
): DataTableSelection<TData> {
  const viewKey = viewKeyOf(params)
  const pageKey = pageKeyOf(params)
  const [stored, setStored] = useState<SelectionState<TData>>(() => emptySelection(viewKey))

  /*
   * The view-key clear rule. When the result set changes (filters, sort or q:
   * a new view key), the selection resets, whatever caused the change: a
   * header click, Clear filters, Back, a pasted link. This is derived state,
   * reset during render (React's documented "storing information from previous
   * renders" pattern), not an effect: there is no render that shows the old
   * selection against the new view, and no extra commit.
   *
   * Why it can't loop: it only runs while stored.viewKey !== viewKey, and the
   * update sets stored.viewKey to viewKey, so the next render skips it.
   * Page and page-size changes don't touch the view key, so they keep it.
   */
  const current = stored.viewKey === viewKey ? stored : emptySelection<TData>(viewKey)
  if (stored !== current) setStored(current)

  const page = useMemo<PageRows<TData>>(
    () => ({ key: pageKey, rows: pageRows.map((row) => ({ id: getRowId(row), row })) }),
    [pageKey, pageRows, getRowId],
  )

  return useMemo(() => {
    // Every write re-checks the view: an update queued for an old view is dropped.
    const update = (change: (state: SelectionState<TData>) => SelectionState<TData>) =>
      setStored((state) => (state.viewKey === viewKey ? change(state) : state))
    const fresh = new Map(page.rows.map((entry) => [entry.id, entry.row]))
    const ids = [...current.rows.keys()]

    return {
      ids,
      rows: ids.map((id) => fresh.get(id) ?? current.rows.get(id)!),
      count: ids.length,
      isSelected: (id) => current.rows.has(id),
      toggle: (id, opts) => update((state) => toggleRow(state, id, page, opts)),
      selectPage: () => update((state) => selectPage(state, page)),
      clearPage: () => update((state) => clearPage(state, page)),
      clear: () => update(() => emptySelection(viewKey)),
      remove: (removed) => update((state) => removeIds(state, removed)),
      pageIds: page.rows.map((entry) => entry.id),
    }
  }, [current, page, viewKey])
}
