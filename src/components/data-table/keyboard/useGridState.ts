import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import {
  effectiveActiveCell,
  INITIAL_ACTIVE,
  rekeyActiveCell,
  type StoredActiveCell,
} from './activeCell'
import { CELL_CONTROL_ATTR, focusTargetAt, type CellKind } from './focusTarget'
import { HEADER_ROW, samePos, type Pos } from './gridNav'
import { resolveFocusReturn } from './interaction'

export interface GridState {
  /** The active cell, clamped to the grid on screen. Row -1 is the header. */
  activeCell: Pos
  /** The active cell is a composite cell in interaction mode. */
  interacting: boolean
  /** Moves the active cell without moving focus (interaction mode off unless asked). */
  setActiveCell: (pos: Pos, opts?: { interacting?: boolean }) => void
  /** A user move: the active cell changes, then focus follows it after the commit. */
  focusCell: (pos: Pos, opts?: { interacting?: boolean }) => void
  /**
   * Focus back into the grid after an overlay opened from it closes. With
   * `rowId`, the row the overlay was about, if it's still on the page;
   * otherwise the active cell, clamped. See resolveFocusReturn.
   */
  returnFocus: (opts?: { rowId?: string }) => void
  /** Plumbing for DataTable.Grid. */
  grid: {
    ref: RefObject<HTMLTableElement | null>
    /** Focus is inside the grid (tracked by its focus / blur handlers). */
    setFocusInside: (inside: boolean) => void
  }
}

/**
 * The grid's keyboard state: the active cell, interaction mode, and focus
 * moves that wait for the commit. Called by useDataTable, so the state
 * outlives the grid element (it unmounts while a new key loads) and overlays
 * outside the grid (the order drawer) can return focus to it.
 *
 * Focus moves in exactly two cases (docs/keyboard-grid.md):
 *  1. requested: a user move inside the grid (focusCell, returnFocus);
 *  2. rescued: focus WAS in the grid and fell to <body> because the focused
 *     element unmounted (its row was filtered away or refetched), or it's
 *     stranded on a cell's control after a page or view change ended
 *     interaction mode. It goes to the active cell instead of leaving the
 *     keyboard user at the top of the page (or on a control with tabIndex -1).
 * A data load alone never moves it.
 */
export function useGridState({
  listKey,
  rowIds,
  colKinds,
}: {
  /** listKeyOf(viewKey, page, pageSize): a change resets the active row. */
  listKey: string
  /** The rows on screen, in order. */
  rowIds: readonly string[]
  /** The visible columns' cell kinds, in order. */
  colKinds: readonly CellKind[]
}): GridState {
  const gridRef = useRef<HTMLTableElement>(null)
  const [stored, setStored] = useState<StoredActiveCell>(() => ({
    pos: INITIAL_ACTIVE,
    listKey,
    interacting: false,
  }))
  // A new page or view resets the row: derived during render (activeCell.ts).
  const current = rekeyActiveCell(stored, listKey)
  if (current !== stored) setStored(current)

  const colCount = colKinds.length
  const activeCell = effectiveActiveCell(current, { rowCount: rowIds.length, colCount })
  // Interaction mode only exists on a composite data cell; a column change
  // that moves the active cell onto another kind ends it.
  const interacting =
    current.interacting && activeCell.row !== HEADER_ROW && colKinds[activeCell.col] === 'composite'

  const focusRequested = useRef(false)
  const focusInside = useRef(false)

  const focusNow = (pos: Pos, inCell: boolean) => {
    const grid = gridRef.current
    const target = grid && focusTargetAt(grid, pos, { interacting: inCell })
    if (target && target !== document.activeElement) target.focus()
  }

  // No dependency list: it must see every commit, since either a request or a
  // lost focus can come with any render. Both checks are cheap.
  useLayoutEffect(() => {
    const requested = focusRequested.current
    focusRequested.current = false
    const focused = document.activeElement
    const lost = focusInside.current && (focused === null || focused === document.body)
    // Interaction mode ended under the focused control (a page or view
    // change, e.g. its own "Filter by name"): it now has tabIndex -1, so put
    // focus back on its cell, where the grid's keys work.
    const stranded =
      !interacting &&
      focused instanceof HTMLElement &&
      gridRef.current?.contains(focused) === true &&
      focused.closest(`[${CELL_CONTROL_ATTR}]`) !== null
    // A rescue lands on the cell, not inside it: the control that had focus is
    // gone, so interaction mode ends (onFocus syncs that state).
    if (requested) focusNow(activeCell, interacting)
    else if (lost || stranded) focusNow(activeCell, false)
  })

  const setActiveCell = useCallback(
    (pos: Pos, { interacting: next = false }: { interacting?: boolean } = {}) =>
      setStored((state) =>
        samePos(state.pos, pos) && state.interacting === next
          ? state
          : { ...state, pos, interacting: next },
      ),
    [setStored],
  )

  const focusCell: GridState['focusCell'] = (pos, { interacting: next = false } = {}) => {
    if (samePos(current.pos, pos) && current.interacting === next) {
      // Nothing to commit, so no effect would run: focus directly. (E.g. a
      // click on a widget cell's padding, which focused the region instead.)
      focusNow(pos, next)
      return
    }
    focusRequested.current = true
    setActiveCell(pos, { interacting: next })
  }

  const returnFocus: GridState['returnFocus'] = ({ rowId } = {}) =>
    focusCell(resolveFocusReturn({ rowId, rowIds, active: activeCell, colCount }))

  return {
    activeCell,
    interacting,
    setActiveCell,
    focusCell,
    returnFocus,
    grid: {
      ref: gridRef,
      setFocusInside: (inside) => {
        focusInside.current = inside
      },
    },
  }
}
