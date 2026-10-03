import type { RowData } from '@tanstack/react-table'
import type { FocusEvent, KeyboardEvent, MouseEvent } from 'react'
import { pageSelectionState } from '../selection'
import type { DataTableModel } from '../useDataTable'
import { CELL_CONTROL_ATTR, cellControls, posOf, type CellKind } from './focusTarget'
import { DEFAULT_PAGE_STEP, gridNav, HEADER_ROW, samePos, toNavKey } from './gridNav'
import { cycleIndex, interactingAfterPointer, interactionKey } from './interaction'

const hasModifier = (event: KeyboardEvent) => event.ctrlKey || event.metaKey || event.altKey

/** Ctrl+A, or Cmd+A on a Mac. */
const isSelectAll = (event: KeyboardEvent) =>
  (event.ctrlKey || event.metaKey) &&
  !event.altKey &&
  !event.shiftKey &&
  event.key.toLowerCase() === 'a'

const isSpace = (event: KeyboardEvent) => event.key === ' ' && !hasModifier(event)
const isEnter = (event: KeyboardEvent) =>
  event.key === 'Enter' && !hasModifier(event) && !event.shiftKey
/** "?" is Shift+/ on most layouts: check the produced character, not the key. */
const isHelp = (event: KeyboardEvent) => event.key === '?' && !hasModifier(event)

const kindOf = (cell: HTMLElement) => (cell.dataset.cellKind ?? 'text') as CellKind

/**
 * The grid's keyboard model, the behavior half (focusTarget.ts is the markup
 * half; the state lives in useDataTable via useGridState). One delegated
 * onKeyDown / onClick / onFocus / onBlur on the <table>: cells carry their
 * coordinates in data attributes, so there's no handler per cell and nothing
 * that would break the rows' memo.
 *
 * Key handling, in order:
 *  1. Interaction mode (a composite cell's controls): Escape / F2 leave it,
 *     Tab cycles the cell's controls, everything else belongs to the control.
 *  2. Enter / F2 on a composite cell: enter interaction mode.
 *  3. "?": the keyboard help, when the table has one.
 *  4. Ctrl/Cmd+A, Space (selection), Enter on a text cell (open the row).
 *  5. Navigation keys (gridNav).
 */
export function useGridKeyboard(
  table: DataTableModel<RowData>,
  { pageStep = DEFAULT_PAGE_STEP, openHelp }: { pageStep?: number; openHelp?: () => boolean } = {},
) {
  const { activeCell, interacting, rows, selection, selectable, onOpenRow, grid } = table
  const colCount = table.instance.getVisibleLeafColumns().length

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
    const kind = kindOf(cell)
    const onCell = event.target === cell
    const inMode = interacting && samePos(pos, activeCell)

    const mode = interactionKey(event, { interacting: inMode, kind, onCell, row: pos.row })
    if (mode === 'pass') return // the focused control's key (arrows, Space, Enter…)
    if (mode === 'exit') {
      event.preventDefault()
      table.focusCell(pos, { interacting: false })
      return
    }
    if (mode === 'next' || mode === 'prev') {
      // Tab stays inside the cell while interacting: cycle, wrapping.
      event.preventDefault()
      const controls = cellControls(cell)
      const index = controls.indexOf(event.target as HTMLElement)
      controls[cycleIndex(index, controls.length, mode)]?.focus()
      return
    }
    if (mode === 'enter') {
      event.preventDefault()
      table.focusCell(pos, { interacting: true })
      return
    }

    if (isHelp(event) && openHelp?.()) {
      event.preventDefault()
      return
    }

    if (selectable && isSelectAll(event)) {
      // The page, not the document's text. Again (all selected): clear the page.
      event.preventDefault()
      const state = pageSelectionState(selection.pageIds, selection.isSelected)
      if (state === 'all') selection.clearPage()
      else selection.selectPage()
      return
    }

    const row = pos.row === HEADER_ROW ? undefined : rows[pos.row]
    if (isSpace(event)) {
      // A widget handles its own Space: the checkbox toggles (Shift+Space: a
      // range, 4b), a button presses. On the header, the sort button is the
      // widget, so Space there sorts and a text header does nothing.
      if (!onCell) return
      event.preventDefault() // no scroll
      if (selectable && row) selection.toggle(row.id, { range: event.shiftKey })
      return
    }

    if (isEnter(event) && onCell && kind === 'text' && row && onOpenRow) {
      // Enter on a text cell opens the row (the order drawer). Widgets have
      // their own Enter; composite cells use it for interaction mode.
      event.preventDefault()
      onOpenRow(row.original)
      return
    }

    const key = toNavKey(event)
    if (!key) return
    event.preventDefault() // arrows and PageUp/Down would scroll the container
    table.focusCell(gridNav(pos, key, { rowCount: rows.length, colCount, pageStep }))
  }

  const onClick = (event: MouseEvent<HTMLTableElement>) => {
    const hit = cellOf(event)
    if (!hit) return
    // A click on a composite cell's control: onFocus already made it active,
    // in interaction mode. Anything else makes the clicked cell active, with
    // interaction mode off ("clicking elsewhere exits").
    if ((event.target as Element).closest(`[${CELL_CONTROL_ATTR}]`)) return
    table.focusCell(hit.pos, { interacting: false })
  }

  // Focus that arrives without our keys (a click, a screen reader, Tab back
  // in, a script) syncs the active cell and interaction mode, without moving
  // focus again.
  const onFocus = (event: FocusEvent<HTMLTableElement>) => {
    grid.setFocusInside(true)
    const hit = cellOf(event)
    if (!hit) return
    const onControl = (event.target as Element).closest(`[${CELL_CONTROL_ATTR}]`) !== null
    const next = interactingAfterPointer({ kind: kindOf(hit.cell), onControl })
    if (!samePos(hit.pos, activeCell) || next !== interacting) {
      table.setActiveCell(hit.pos, { interacting: next })
    }
  }

  // Focus leaving the grid ends interaction mode (the controls go back to
  // tabIndex -1, so the grid is one Tab stop again). Tracks whether focus is
  // inside, including when the focused element is removed from the DOM
  // (browsers differ on whether that fires a blur), for useGridState's rescue.
  const onBlur = (event: FocusEvent<HTMLTableElement>) => {
    const next = event.relatedTarget
    if (next instanceof Node && event.currentTarget.contains(next)) return
    if (interacting) table.setActiveCell(activeCell, { interacting: false })
    if (next) {
      grid.setFocusInside(false)
      return
    }
    // No new target: the user blurred to nothing (the element is still
    // connected) or the element was removed (it isn't). Only the first means
    // focus really left.
    const target = event.target
    queueMicrotask(() => {
      if (target.isConnected) grid.setFocusInside(false)
    })
  }

  return { gridProps: { ref: grid.ref, onKeyDown, onClick, onFocus, onBlur } }
}
