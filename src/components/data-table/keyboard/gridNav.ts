/*
 * Keyboard navigation for the data grid, as pure functions: a key and a
 * position in, a position out. No DOM, no React, so every rule is a row in a
 * table-driven test (gridNav.test.ts). See docs/keyboard-grid.md.
 *
 * Positions are grid coordinates, not DOM indices: row -1 is the header row,
 * rows 0..rowCount-1 are the data rows on the current page, and columns
 * 0..colCount-1 are the VISIBLE columns, in display order.
 */

/** row -1 = the header row; 0..rowCount-1 = data rows. */
export type Pos = { row: number; col: number }

export type Dims = {
  rowCount: number
  colCount: number
  /** Rows moved by PageUp / PageDown. */
  pageStep: number
}

export const HEADER_ROW = -1

/** PageUp / PageDown step until 5c measures the visible row count. */
export const DEFAULT_PAGE_STEP = 10

export type NavKey =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  /** Home: first column, same row. */
  | 'rowStart'
  /** End: last column, same row. */
  | 'rowEnd'
  /** Ctrl+Home (Cmd+ArrowUp, Cmd+Home): first cell of the first data row. */
  | 'gridStart'
  /** Ctrl+End (Cmd+ArrowDown, Cmd+End): last cell of the last data row. */
  | 'gridEnd'
  | 'pageUp'
  | 'pageDown'

/** The parts of a keyboard event toNavKey reads. DOM and React events both fit. */
export type NavKeyEvent = Pick<KeyboardEvent, 'key' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'>

const PLAIN: Record<string, NavKey> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  Home: 'rowStart',
  End: 'rowEnd',
  PageUp: 'pageUp',
  PageDown: 'pageDown',
}

/** With Ctrl or Cmd held. Cmd+Arrow is the Mac alias: Mac keyboards often have no Home/End. */
const WITH_MOD: Record<string, NavKey> = {
  Home: 'gridStart',
  End: 'gridEnd',
}
const WITH_META_ONLY: Record<string, NavKey> = {
  ArrowUp: 'gridStart',
  ArrowDown: 'gridEnd',
}

/**
 * A keyboard event → the navigation it asks for, or null when it isn't a
 * grid navigation key (let the browser or another handler have it).
 *
 *  - Alt + anything: null (OS and browser shortcuts, e.g. Alt+Arrow history on Windows).
 *  - Shift + anything: null. Shift+Arrow is reserved for extending a selection
 *    (not implemented); Shift+Space is selection, handled separately.
 *  - Ctrl/Cmd+Home/End: grid start/end. Cmd+ArrowUp/Down: the same (Mac).
 *  - Ctrl+ArrowUp/Down: null (macOS Mission Control); any other Ctrl/Cmd combo:
 *    null (Ctrl+PageUp/PageDown switch browser tabs).
 */
export function toNavKey(event: NavKeyEvent): NavKey | null {
  if (event.altKey || event.shiftKey) return null
  if (event.metaKey && !event.ctrlKey) {
    return WITH_MOD[event.key] ?? WITH_META_ONLY[event.key] ?? null
  }
  if (event.ctrlKey) return event.metaKey ? null : (WITH_MOD[event.key] ?? null)
  return PLAIN[event.key] ?? null
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

/** The last data row, or the header when there are none. */
const lastRow = (dims: Pick<Dims, 'rowCount'>) =>
  dims.rowCount > 0 ? dims.rowCount - 1 : HEADER_ROW

/**
 * Any position → the nearest one that exists: the column into 0..colCount-1,
 * the row into -1..rowCount-1 (the header when there are no rows).
 */
export function clampPos(pos: Pos, dims: Pick<Dims, 'rowCount' | 'colCount'>): Pos {
  return {
    row: clamp(pos.row, HEADER_ROW, lastRow(dims)),
    col: clamp(pos.col, 0, Math.max(dims.colCount - 1, 0)),
  }
}

/**
 * Where `key` moves from `pos`. Moves clamp at the edges, never wrap.
 *
 *  - up / down: one row. Up from row 0 enters the header; down from the header
 *    is row 0.
 *  - left / right: one column.
 *  - rowStart / rowEnd: first / last column of the current row.
 *  - gridStart / gridEnd: first cell of the first data row / last cell of the
 *    last data row (the header when there are no rows).
 *  - pageUp / pageDown: `pageStep` rows. PageUp stops at row 0, never entering
 *    the header; from the header, PageUp stays and PageDown counts from it.
 */
export function gridNav(pos: Pos, key: NavKey, dims: Dims): Pos {
  const { row, col } = clampPos(pos, dims)
  const last = lastRow(dims)
  const lastCol = Math.max(dims.colCount - 1, 0)

  switch (key) {
    case 'up':
      return { row: Math.max(row - 1, HEADER_ROW), col }
    case 'down':
      return { row: Math.min(row + 1, last), col }
    case 'left':
      return { row, col: Math.max(col - 1, 0) }
    case 'right':
      return { row, col: Math.min(col + 1, lastCol) }
    case 'rowStart':
      return { row, col: 0 }
    case 'rowEnd':
      return { row, col: lastCol }
    case 'gridStart':
      return { row: dims.rowCount > 0 ? 0 : HEADER_ROW, col: 0 }
    case 'gridEnd':
      return { row: last, col: lastCol }
    case 'pageUp':
      return { row: row === HEADER_ROW ? HEADER_ROW : Math.max(row - dims.pageStep, 0), col }
    case 'pageDown':
      return { row: Math.min(row + dims.pageStep, last), col }
  }
}

export function samePos(a: Pos, b: Pos): boolean {
  return a.row === b.row && a.col === b.col
}
