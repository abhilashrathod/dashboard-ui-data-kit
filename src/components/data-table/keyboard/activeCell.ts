import { clampPos, HEADER_ROW, type Pos } from './gridNav'

/*
 * Where the grid's active cell goes when the data under it changes. Pure, like
 * gridNav: useDataTable stores the position, these rules adjust it.
 *
 *  | Change                                   | Active cell                       |
 *  | ---------------------------------------- | --------------------------------- |
 *  | Page or page size                        | row 0, column kept                |
 *  | View (sort, filters, q)                  | row 0, column kept                |
 *  | Refetch, same key                        | kept, clamped to the new rows     |
 *  | Column shown / hidden                    | column clamped                    |
 *  | Any of the above while on the header row | stays on the header               |
 *
 * The header exception: a sort is a view change, and it's usually made FROM
 * the header (Enter on a sort button). Moving the active cell to row 0 would
 * leave focus on the sort button while the grid thinks it's elsewhere, so the
 * next ArrowDown would skip a row.
 */

export const INITIAL_ACTIVE: Pos = { row: 0, col: 0 }

export interface StoredActiveCell {
  pos: Pos
  /** The page the position belongs to: listKeyOf(viewKey, page, pageSize). */
  listKey: string
}

/** One page of one view. A change to it resets the active row. */
export function listKeyOf(viewKey: string, page: number, pageSize: number): string {
  return `${viewKey}#${page}:${pageSize}`
}

/** The stored position for a (possibly new) list key: a new page or view resets the row. */
export function rekeyActiveCell(stored: StoredActiveCell, listKey: string): StoredActiveCell {
  if (stored.listKey === listKey) return stored
  const row = stored.pos.row === HEADER_ROW ? HEADER_ROW : 0
  return { listKey, pos: { row, col: stored.pos.col } }
}

/**
 * What's shown: the stored position clamped to the grid that exists now.
 * Clamping is read-side only, never written back, so a refetch that briefly
 * has fewer rows (or none, while loading) doesn't lose the position.
 */
export function effectiveActiveCell(
  stored: StoredActiveCell,
  dims: { rowCount: number; colCount: number },
): Pos {
  return clampPos(stored.pos, dims)
}
