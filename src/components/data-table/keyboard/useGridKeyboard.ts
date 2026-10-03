import type { RowData } from '@tanstack/react-table'
import {
  useCallback,
  useLayoutEffect,
  useRef,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
} from 'react'
import { pageSelectionState } from '../selection'
import type { DataTableModel } from '../useDataTable'
import { focusTargetAt, posOf } from './focusTarget'
import { DEFAULT_PAGE_STEP, gridNav, HEADER_ROW, samePos, toNavKey, type Pos } from './gridNav'

/** Ctrl+A, or Cmd+A on a Mac. */
const isSelectAll = (event: KeyboardEvent) =>
  (event.ctrlKey || event.metaKey) &&
  !event.altKey &&
  !event.shiftKey &&
  event.key.toLowerCase() === 'a'

const isSpace = (event: KeyboardEvent) =>
  event.key === ' ' && !event.ctrlKey && !event.metaKey && !event.altKey

/**
 * The grid's keyboard model, the behavior half (focusTarget.ts is the markup
 * half). The active cell lives in useDataTable; this hook moves it and moves
 * FOCUS with it, through one delegated onKeyDown / onClick / onFocus on the
 * <table>. Cells carry their coordinates in data attributes, so there's no
 * handler per cell and nothing that would break the rows' memo.
 *
 * Focus follows the active cell only when the change came from the user
 * inside the grid (a key, a click). Data loads, page changes from the
 * pagination bar and refetches move the active cell (row 0, clamping) but
 * never focus: the grid doesn't steal focus from wherever the user is.
 */
export function useGridKeyboard(
  table: DataTableModel<RowData>,
  { pageStep = DEFAULT_PAGE_STEP }: { pageStep?: number } = {},
) {
  const gridRef = useRef<HTMLTableElement>(null)
  const { activeCell, setActiveCell, rows, selection, selectable } = table
  const colCount = table.instance.getVisibleLeafColumns().length
  // Set by a user move; read (and cleared) by the layout effect after the commit.
  const focusRequested = useRef(false)

  const focusCell = useCallback((pos: Pos) => {
    const target = gridRef.current && focusTargetAt(gridRef.current, pos)
    if (target && target !== document.activeElement) target.focus()
  }, [])

  // After the commit that re-rendered the old and new active rows (so the new
  // target already has tabIndex 0), move focus to it. Layout effect: before
  // paint, so there's no frame with the ring in the old place.
  useLayoutEffect(() => {
    if (!focusRequested.current) return
    focusRequested.current = false
    focusCell(activeCell)
  }, [activeCell.row, activeCell.col, focusCell]) // eslint-disable-line react-hooks/exhaustive-deps

  const moveTo = (next: Pos) => {
    if (samePos(next, activeCell)) {
      // No state change, so no commit and no effect: focus directly. (E.g. a
      // click on a widget cell's padding, which focused the region instead.)
      setActiveCell(next)
      focusCell(next)
      return
    }
    focusRequested.current = true
    setActiveCell(next)
  }

  /** The cell an event happened in, if it's this grid's (portals bubble through React too). */
  const cellOf = (event: { target: EventTarget; currentTarget: Element }) => {
    const target = event.target
    if (!(target instanceof Element) || !event.currentTarget.contains(target)) return null
    return posOf(target)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTableElement>) => {
    if (event.defaultPrevented) return
    const hit = cellOf(event)
    if (!hit) return
    const { pos, cell } = hit

    if (selectable && isSelectAll(event)) {
      // The page, not the document's text. Again (all selected): clear the page.
      event.preventDefault()
      const state = pageSelectionState(selection.pageIds, selection.isSelected)
      if (state === 'all') selection.clearPage()
      else selection.selectPage()
      return
    }

    if (isSpace(event)) {
      // A widget handles its own Space: the checkbox toggles (Shift+Space: a
      // range, 4b), a button presses. On the header, the sort button is the
      // widget, so Space there sorts and a text header does nothing.
      if (event.target !== cell) return
      event.preventDefault() // no scroll
      const row = pos.row === HEADER_ROW ? undefined : rows[pos.row]
      if (selectable && row) selection.toggle(row.id, { range: event.shiftKey })
      return
    }

    const key = toNavKey(event)
    if (!key) return
    event.preventDefault() // arrows and PageUp/Down would scroll the container
    moveTo(gridNav(pos, key, { rowCount: rows.length, colCount, pageStep }))
  }

  const onClick = (event: MouseEvent<HTMLTableElement>) => {
    const hit = cellOf(event)
    if (hit) moveTo(hit.pos)
  }

  // Focus that arrives some other way (a screen reader moving focus, a
  // programmatic focus()) makes that cell active, without moving focus again.
  const onFocus = (event: FocusEvent<HTMLTableElement>) => {
    const hit = cellOf(event)
    if (hit && !samePos(hit.pos, activeCell)) setActiveCell(hit.pos)
  }

  return { gridRef, gridProps: { ref: gridRef, onKeyDown, onClick, onFocus } }
}
