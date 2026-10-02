import { DEFAULT_LIST_PARAMS, listParamsKey, type ListParams } from '@/contracts'

/*
 * Row selection, as pure functions over an immutable state. useDataTable holds
 * the state; everything it can do is here, so every rule is a unit test.
 *
 * Scope: a selection belongs to a VIEW, i.e. one result set (filters, sort, q).
 *  - It persists across pages and page sizes: paging through a result set to
 *    pick rows is the point of a cross-page selection.
 *  - It clears when the view changes: "12 selected" from a different filter is
 *    a trap. Bulk actions would hit rows the user can no longer see or reason
 *    about.
 *  - It survives refetches: same view, same selection.
 */

/** Selection counts are announced once the clicking stops (DataTable.Grid). */
export const SELECTION_ANNOUNCE_DELAY_MS = 400

/** The canonical params key with page and page size left out: what decides "same result set". */
export function viewKeyOf(params: ListParams): string {
  return listParamsKey({
    ...params,
    page: DEFAULT_LIST_PARAMS.page,
    pageSize: DEFAULT_LIST_PARAMS.pageSize,
  })
}

/** One page within a view. The range-select anchor only applies on the page it was set on. */
export function pageKeyOf(params: Pick<ListParams, 'page' | 'pageSize'>): string {
  return `${params.page}:${params.pageSize}`
}

export interface PageRows<T> {
  key: string
  /** The rows on screen, in display order. */
  rows: readonly { id: string; row: T }[]
}

export interface SelectionState<T> {
  viewKey: string
  /**
   * id → row snapshot. Snapshots let later stages act on rows that are on
   * other pages (CSV export of the selection, 4c) without refetching them.
   */
  rows: ReadonlyMap<string, T>
  /** The last row toggled by a click, for shift+click ranges. */
  anchor: { pageKey: string; id: string } | null
}

export function emptySelection<T>(viewKey: string): SelectionState<T> {
  return { viewKey, rows: new Map(), anchor: null }
}

function withRows<T>(
  state: SelectionState<T>,
  ids: readonly { id: string; row: T }[],
  selected: boolean,
): Map<string, T> {
  const rows = new Map(state.rows)
  for (const { id, row } of ids) {
    if (selected) rows.set(id, row)
    else rows.delete(id)
  }
  return rows
}

/**
 * Toggle one row. With `range` (shift+click), every row between the anchor and
 * this one, on the current page, takes this row's NEW state: shift-clicking a
 * selected row deselects the range, an unselected one selects it. Without an
 * anchor on this page, a range click is a plain toggle that sets the anchor.
 */
export function toggleRow<T>(
  state: SelectionState<T>,
  id: string,
  page: PageRows<T>,
  { range = false }: { range?: boolean } = {},
): SelectionState<T> {
  const selected = !state.rows.has(id)
  const index = page.rows.findIndex((entry) => entry.id === id)
  const anchor = state.anchor?.pageKey === page.key ? state.anchor : null
  const anchorIndex = anchor ? page.rows.findIndex((entry) => entry.id === anchor.id) : -1

  let affected: readonly { id: string; row: T }[]
  if (range && index !== -1 && anchorIndex !== -1) {
    const [from, to] = index < anchorIndex ? [index, anchorIndex] : [anchorIndex, index]
    affected = page.rows.slice(from, to + 1)
  } else if (index !== -1) {
    affected = [page.rows[index]!]
  } else if (!selected) {
    // A selected row that isn't on this page (no snapshot needed to remove it).
    affected = [{ id, row: state.rows.get(id)! }]
  } else {
    return state // can't select a row we don't have
  }

  return {
    ...state,
    rows: withRows(state, affected, selected),
    anchor: index === -1 ? state.anchor : { pageKey: page.key, id },
  }
}

export function selectPage<T>(state: SelectionState<T>, page: PageRows<T>): SelectionState<T> {
  return { ...state, rows: withRows(state, page.rows, true) }
}

export function clearPage<T>(state: SelectionState<T>, page: PageRows<T>): SelectionState<T> {
  return { ...state, rows: withRows(state, page.rows, false) }
}

export function removeIds<T>(state: SelectionState<T>, ids: readonly string[]): SelectionState<T> {
  if (!ids.some((id) => state.rows.has(id))) return state
  const rows = new Map(state.rows)
  for (const id of ids) rows.delete(id)
  return { ...state, rows }
}

export type PageSelection = 'none' | 'some' | 'all'

/** The header checkbox: checked when every row on the page is selected, mixed when some are. */
export function pageSelectionState(
  pageIds: readonly string[],
  isSelected: (id: string) => boolean,
): PageSelection {
  const count = pageIds.filter(isSelected).length
  if (count === 0) return 'none'
  return count === pageIds.length ? 'all' : 'some'
}
